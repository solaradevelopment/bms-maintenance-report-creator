// documentGenerator.js - Módulo para generación de documentos

/**
 * DocumentGenerator class for generating PDF and Word documents
 *
 * Logo format expectations:
 * - PREFERRED: Object with structure matching stage photos:
 *   { id: "logo-timestamp", data: "data:image/jpeg;base64,...", name: "filename.jpg", width: 2448, height: 3264 }
 * - LEGACY: Object with src: { src: "data:image/jpeg;base64,...", width: 100, height: 100 }
 * - OLD: Direct base64 string: "data:image/jpeg;base64,..."
 */
class DocumentGenerator {
  constructor(fileHandler) {
    this.fileHandler = fileHandler;
  }

  // Helper method to extract logo data from different formats
  getLogoData(logoObject) {
    if (!logoObject) return null;

    // Preferred format - object with data (same as stage photos)
    if (typeof logoObject === "object" && logoObject.data) {
      return logoObject.data;
    }

    // Legacy format - object with src (backwards compatibility)
    if (typeof logoObject === "object" && logoObject.src) {
      return logoObject.src;
    }

    // Old format - direct base64 string (backwards compatibility)
    if (typeof logoObject === "string") {
      return logoObject;
    }

    return null;
  }

  // Calculate image dimensions using original proportions
  calculateImageDimensions(
    originalWidth,
    originalHeight,
    maxWidth = 400,
    maxHeight = 250
  ) {
    if (!originalWidth || !originalHeight) {
      // Fallback dimensions if no original size provided
      return { width: 240, height: 135 };
    }

    // Use original proportions, but scale down if too large
    let finalWidth = originalWidth;
    let finalHeight = originalHeight;

    // Scale down if image is too wide
    if (finalWidth > maxWidth) {
      const ratio = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = Math.round(finalHeight * ratio);
    }

    // Scale down if image is too tall after width scaling
    if (finalHeight > maxHeight) {
      const ratio = maxHeight / finalHeight;
      finalHeight = maxHeight;
      finalWidth = Math.round(finalWidth * ratio);
    }

    return {
      width: finalWidth,
      height: finalHeight,
    };
  }

  // Calculate logo dimensions with maximum width and height constraints for DOCX
  calculateLogoImageDimensions(
    originalWidth,
    originalHeight,
    fallbackSize = 70
  ) {
    if (!originalWidth || !originalHeight) {
      return { width: fallbackSize, height: fallbackSize };
    }

    // Calculate maximum allowed logo dimensions for DOCX
    // A4 page width ≈ 8.27 inches = 794 pixels @ 96 DPI
    // With 1-inch margins (96px each side): available = 794 - 192 = 602px
    // Half of available width: 301px maximum
    const maxLogoWidthDocx = 300; // pixels - conservative estimate for half page width
    const maxLogoHeightDocx = 100; // pixels - maximum height constraint

    // Calculate scaling ratios for both width and height constraints
    const widthRatio =
      originalWidth > maxLogoWidthDocx ? maxLogoWidthDocx / originalWidth : 1;
    const heightRatio =
      originalHeight > maxLogoHeightDocx
        ? maxLogoHeightDocx / originalHeight
        : 1;

    // Use the most restrictive ratio to maintain aspect ratio
    const finalRatio = Math.min(widthRatio, heightRatio);

    if (finalRatio < 1) {
      // Scaling is needed
      const scaledWidth = Math.round(originalWidth * finalRatio);
      const scaledHeight = Math.round(originalHeight * finalRatio);

      const constraintUsed = widthRatio < heightRatio ? "width" : "height";
      const maxUsed =
        constraintUsed === "width" ? maxLogoWidthDocx : maxLogoHeightDocx;

      return {
        width: scaledWidth,
        height: scaledHeight,
      };
    } else {
      // Use original dimensions if they fit within constraints

      return {
        width: originalWidth,
        height: originalHeight,
      };
    }
  }

  // Generate PDF document
  async generatePdf(reportData, onProgress, onComplete, onError) {
    try {
      // Verify jsPDF library availability
      if (typeof window.jspdf === "undefined") {
        const error =
          "Error: La librería de generación de PDF no está disponible. Por favor, recarga la página.";
        onError?.(error);
        return;
      }

      const { jsPDF } = window.jspdf;

      onProgress?.("Generando PDF...");

      // Create new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Helper function for text wrapping
      const addWrappedText = (text, x, y, maxWidth, fontSize = 12) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + lines.length * fontSize * 0.35;
      };

      // Helper function to add formatted text preserving structure
      const addFormattedText = (text, x, y, maxWidth, fontSize = 12) => {
        if (!text) return y;

        const processedLines = this.processFormattedText(text);
        let currentY = y;

        for (const line of processedLines) {
          if (line.type === "break") {
            // Add spacing for empty lines
            currentY += fontSize * 0.4;
          } else if (line.type === "bullet") {
            // Handle bullet points
            doc.setFontSize(fontSize);
            const bulletSymbol = line.bulletType.match(/\d+\./)
              ? line.bulletType
              : "• ";
            const indentX = x + line.indent * 2; // 2mm per indent space

            // Add bullet symbol
            doc.text(bulletSymbol, indentX, currentY);

            // Add bullet content with proper wrapping
            const bulletContentX = indentX + doc.getTextWidth(bulletSymbol) + 2;
            const bulletMaxWidth = maxWidth - (bulletContentX - x);
            const contentLines = doc.splitTextToSize(
              line.content,
              bulletMaxWidth
            );
            doc.text(contentLines, bulletContentX, currentY);

            currentY += contentLines.length * fontSize * 0.35 + 2;
          } else {
            // Handle regular paragraphs
            doc.setFontSize(fontSize);
            const lines = doc.splitTextToSize(line.content, maxWidth);
            doc.text(lines, x, currentY);
            currentY += lines.length * fontSize * 0.35 + 2;
          }
        }

        return currentY;
      };

      // Date
      doc.setFontSize(12);
      doc.text(this.getFormattedDate(), margin, yPos);
      yPos += 15;

      // Company header using table-like layout (no margins)
      const headerStartY = yPos;
      let logoWidth = 0;
      let logoHeight = 0;

      // Add company logo on the LEFT side of header
      if (reportData.company.logo) {
        try {
          // Get logo data using centralized method
          const logoSrc = this.getLogoData(reportData.company.logo);

          if (logoSrc) {
            // Calculate maximum allowed logo dimensions
            const pageWidthA4 = 210; // mm
            const marginSize = 20; // mm each side
            const availableWidth = pageWidthA4 - marginSize * 2; // 170mm
            const maxLogoWidth = availableWidth / 2; // 85mm maximum width
            const maxLogoHeight = (100 * 25.4) / 96; // 100px converted to mm ≈ 26.4mm

            let logoW = 35; // Default size if no dimensions available
            let logoH = 35;

            // Use original dimensions with maximum width and height constraints
            if (
              typeof reportData.company.logo === "object" &&
              reportData.company.logo.width &&
              reportData.company.logo.height
            ) {
              // Convert pixels to mm for PDF (assuming 96 DPI: 1 inch = 96 pixels = 25.4 mm)
              const pixelsToMm = 25.4 / 96;
              let originalLogoW = reportData.company.logo.width * pixelsToMm;
              let originalLogoH = reportData.company.logo.height * pixelsToMm;

              // Calculate scaling ratios for both width and height constraints
              const widthRatio =
                originalLogoW > maxLogoWidth ? maxLogoWidth / originalLogoW : 1;
              const heightRatio =
                originalLogoH > maxLogoHeight
                  ? maxLogoHeight / originalLogoH
                  : 1;

              // Use the most restrictive ratio to maintain aspect ratio
              const finalRatio = Math.min(widthRatio, heightRatio);

              if (finalRatio < 1) {
                // Scaling is needed
                logoW = originalLogoW * finalRatio;
                logoH = originalLogoH * finalRatio;

                const constraintUsed =
                  widthRatio < heightRatio ? "width" : "height";
                const maxUsed =
                  constraintUsed === "width" ? maxLogoWidth : maxLogoHeight;
              } else {
                // Use original dimensions if they fit within constraints
                logoW = originalLogoW;
                logoH = originalLogoH;
              }
            }

            // Try different image formats for maximum compatibility
            let imageAdded = false;
            const formats = ["JPEG", "JPG", "PNG", "WEBP", "GIF"];

            for (const format of formats) {
              try {
                // Logo positioned on the LEFT with margin (like flex start)
                const logoX = margin;
                doc.addImage(logoSrc, format, logoX, yPos, logoW, logoH);
                logoWidth = logoW;
                logoHeight = logoH;
                imageAdded = true;
                break;
              } catch (formatError) {
                continue; // Try next format
              }
            }

            if (!imageAdded) {
              // Add a placeholder rectangle for logo on the LEFT
              doc.setDrawColor(100, 100, 100);
              doc.setFillColor(240, 240, 240);
              doc.setLineWidth(1);
              const logoX = margin;
              doc.rect(logoX, yPos, logoW, logoH, "FD");

              // Add placeholder text
              doc.setFontSize(10);
              doc.setTextColor(100, 100, 100);
              doc.text("LOGO", logoX + logoW / 2, yPos + logoH / 2, {
                align: "center",
              });
              doc.setTextColor(0, 0, 0); // Reset text color

              logoWidth = logoW;
              logoHeight = logoH;
            }
          }
        } catch (e) {
          console.error("Error processing logo for PDF:", e);
          // If logo fails completely, continue without it
          logoWidth = 0;
          logoHeight = 0;
        }
      }

      // Company info ALIGNED TO THE RIGHT with vertical centering (like flexbox align-items center)
      const rightMargin = pageWidth - margin; // Right edge with margin

      // Calculate the total height needed for company text
      const lineHeight = 4.5;
      const companyTextHeight = 7 + lineHeight * 3; // Title + 3 lines

      // Center company info vertically relative to logo (align-items: center equivalent)
      const logoCenter = yPos + logoHeight / 2;
      const textBlockCenter = companyTextHeight / 2;
      let textY = logoCenter - textBlockCenter;

      // Company name - RIGHT ALIGNED
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(reportData.company.companyName || "", rightMargin, textY, {
        align: "right",
      });
      textY += 7;

      // Company details with 10pt font - RIGHT ALIGNED
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");

      // NIT with bold label - RIGHT ALIGNED
      const nitFullText = `NIT: ${reportData.company.companyNit || ""}`;
      doc.text(nitFullText, rightMargin, textY, { align: "right" });
      textY += lineHeight;

      // Contact with bold label - RIGHT ALIGNED
      const contactFullText = `Contacto: ${
        reportData.company.companyContact || ""
      }`;
      doc.text(contactFullText, rightMargin, textY, { align: "right" });
      textY += lineHeight;

      // Location with bold label - RIGHT ALIGNED
      const locationFullText = `Ubicación: ${
        reportData.company.companyCity || ""
      } - Colombia`;
      doc.text(locationFullText, rightMargin, textY, { align: "right" });

      // Calculate the final yPos with max 10px separation
      const headerContentHeight = Math.max(logoHeight, companyTextHeight);
      const maxHeaderHeight = (100 * 25.4) / 96; // 100px converted to mm ≈ 26.4mm
      const finalHeaderHeight = Math.min(headerContentHeight, maxHeaderHeight);
      yPos = headerStartY + finalHeaderHeight + 2.6; // 2.6mm ≈ 10px

      // Add improved border line below header (with margins)
      doc.setDrawColor(100, 100, 100); // Darker gray for better visibility
      doc.setLineWidth(0.8); // Slightly thicker line
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 12;

      // Recipient
      doc.setFontSize(12);

      // "Para:" label in bold
      doc.setFont(undefined, "bold");
      const paraLabelWidth = doc.getTextWidth("Para: ");
      doc.text("Para: ", margin, yPos);

      // Recipient name in normal weight
      doc.setFont(undefined, "normal");
      doc.text(
        reportData.recipient.recipientName || "",
        margin + paraLabelWidth,
        yPos
      );
      yPos += 5;

      // "Cargo:" label in bold
      doc.setFont(undefined, "bold");
      const cargoLabelWidth = doc.getTextWidth("Cargo: ");
      doc.text("Cargo: ", margin, yPos);

      // Recipient role in normal weight
      doc.setFont(undefined, "normal");
      doc.text(
        reportData.recipient.recipientRole || "",
        margin + cargoLabelWidth,
        yPos
      );
      yPos += 15;

      // Subject
      doc.setFont(undefined, "bold");
      doc.text(
        `Asunto: ${reportData.recipient.reportSubject || ""}`,
        margin,
        yPos
      );
      doc.setFont(undefined, "normal");
      yPos += 15;

      // Introduction
      yPos = addWrappedText(
        "Por medio del presente documento, se presenta el informe técnico correspondiente a las actividades realizadas:",
        margin,
        yPos,
        contentWidth
      );
      yPos += 10;

      // Stages
      let sectionNumber = 1;
      for (const stage of reportData.stages) {
        if (yPos > 250) {
          // Check if we need a new page
          doc.addPage();
          yPos = 20;
        }

        doc.setFont(undefined, "bold");
        doc.setFontSize(14);
        doc.text(
          `${sectionNumber}. ${stage.title || `Etapa ${sectionNumber}`}`,
          margin,
          yPos
        );
        yPos += 10;

        doc.setFont(undefined, "normal");
        doc.setFontSize(12);
        if (stage.description) {
          yPos = addFormattedText(
            stage.description,
            margin,
            yPos,
            contentWidth,
            12
          );
          yPos += 5;
        }

        // Add photos using original dimensions
        if (stage.photos && stage.photos.length > 0) {
          for (let i = 0; i < stage.photos.length; i += 2) {
            try {
              const leftPhoto = stage.photos[i];
              const rightPhoto = stage.photos[i + 1];

              let maxImageHeight = 0;
              let leftDimensions = null;
              let rightDimensions = null;

              // Calculate dimensions for left photo
              if (leftPhoto) {
                leftDimensions = this.calculateImageDimensions(
                  leftPhoto.width || 200,
                  leftPhoto.height || 150,
                  contentWidth / 2 - 5, // Max width for side-by-side layout
                  (250 * 25.4) / 96 // Max height: 250px converted to mm
                );
                maxImageHeight = Math.max(
                  maxImageHeight,
                  leftDimensions.height
                );
              }

              // Calculate dimensions for right photo
              if (rightPhoto) {
                rightDimensions = this.calculateImageDimensions(
                  rightPhoto.width || 200,
                  rightPhoto.height || 150,
                  contentWidth / 2 - 5, // Max width for side-by-side layout
                  (250 * 25.4) / 96 // Max height: 250px converted to mm
                );
                maxImageHeight = Math.max(
                  maxImageHeight,
                  rightDimensions.height
                );
              }

              // Check if we need a new page
              if (yPos + maxImageHeight > 280) {
                doc.addPage();
                yPos = 20;
              }

              // Add border around the photo area
              doc.setDrawColor(200, 200, 200); // Light gray border
              doc.setLineWidth(0.5);

              // Draw table-like border for the photo row
              const tableY = yPos - 5;
              const tableHeight = maxImageHeight + 10;
              const leftCellWidth = contentWidth / 2;
              const rightCellWidth = contentWidth / 2;

              // Outer border
              doc.rect(margin - 2, tableY, contentWidth + 4, tableHeight);

              // Middle divider (if there are two photos)
              if (leftPhoto && rightPhoto) {
                doc.line(
                  margin + leftCellWidth + 1.5,
                  tableY,
                  margin + leftCellWidth + 1.5,
                  tableY + tableHeight
                );
              }

              // Add left photo
              if (leftPhoto && leftDimensions) {
                doc.addImage(
                  leftPhoto.data,
                  "JPEG",
                  margin + (leftCellWidth - leftDimensions.width) / 2, // Center in cell
                  yPos,
                  leftDimensions.width,
                  leftDimensions.height
                );
              }

              // Add right photo
              if (rightPhoto && rightDimensions) {
                doc.addImage(
                  rightPhoto.data,
                  "JPEG",
                  margin +
                    leftCellWidth +
                    5 +
                    (rightCellWidth - rightDimensions.width) / 2, // Center in cell
                  yPos,
                  rightDimensions.width,
                  rightDimensions.height
                );
              }

              yPos += maxImageHeight + 10;
            } catch (e) {
              console.warn("Could not add photo to PDF:", e);
            }
          }
        }

        yPos += 10;
        sectionNumber++;
      }

      // Recommendations
      if (reportData.recommendations) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont(undefined, "bold");
        doc.setFontSize(14);
        doc.text("Recomendaciones", margin, yPos);
        yPos += 10;

        doc.setFont(undefined, "normal");
        doc.setFontSize(12);
        yPos = addFormattedText(
          reportData.recommendations,
          margin,
          yPos,
          contentWidth,
          12
        );
        yPos += 15;
      }

      // Signature
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }

      // "Atentamente," with more spacing
      doc.setFont(undefined, "normal");
      doc.setFontSize(12);
      doc.text("Atentamente,", margin, yPos);
      yPos += 30; // More space after "Atentamente,"

      // Add signature line space
      yPos += 20; // Extra space for actual signature

      // Signature line
      doc.line(margin, yPos, margin + 80, yPos);
      yPos += 10;

      // Author name in uppercase and bold
      doc.setFont(undefined, "bold");
      doc.setFontSize(13);
      doc.text(
        `${(reportData.company.authorName || "").toUpperCase()}`,
        margin,
        yPos
      );
      yPos += 8;

      // Author role in bold
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text(`${reportData.company.authorRole || ""}`, margin, yPos);
      yPos += 8;

      // Author department in bold
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text(`${reportData.company.authorDepartment || ""}`, margin, yPos);

      onProgress?.("Generando archivo PDF...");

      // Generate PDF blob
      const fileName = `Informe_Tecnico_${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      try {
        // Get PDF as blob
        const pdfBlob = doc.output("blob");

        // Try to use Web Share API if available
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({
            files: [new File([pdfBlob], fileName, { type: "application/pdf" })],
          })
        ) {
          const file = new File([pdfBlob], fileName, {
            type: "application/pdf",
          });
          await navigator.share({
            title: "Informe Técnico",
            text: "Informe técnico generado",
            files: [file],
          });
          this.showMessage("PDF compartido exitosamente.");
        } else {
          // If Web Share API is not available, open PDF in new tab
          const pdfUrl = URL.createObjectURL(pdfBlob);
          const newWindow = window.open(pdfUrl, "_blank");

          if (newWindow) {
            this.showMessage("PDF abierto en nueva pestaña.");
            // Clean up the blob URL after a short delay
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
            }, 1000);
          } else {
            // If popup is blocked, fallback to download
            console.warn("Popup blocked, falling back to download");
            doc.save(fileName);
            this.showMessage("PDF descargado (popup bloqueado).");
          }
        }
      } catch (shareError) {
        console.warn(
          "Error sharing PDF, falling back to opening in new tab:",
          shareError
        );
        // Fallback to opening in new tab
        const pdfBlob = doc.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const newWindow = window.open(pdfUrl, "_blank");

        if (newWindow) {
          this.showMessage("PDF abierto en nueva pestaña.");
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        } else {
          // Final fallback to download
          doc.save(fileName);
          this.showMessage("PDF descargado (popup bloqueado).");
        }
      }

      onComplete?.();
    } catch (error) {
      console.error("Error generating PDF:", error);
      onError?.(error.message || "Hubo un error al generar el PDF.");
    }
  }

  // Helper function to preserve text formatting (line breaks, bullets, etc.)
  processFormattedText(text) {
    if (!text || typeof text !== "string") return [];

    // Split by line breaks and process each line
    const lines = text.split(/\r?\n/);
    const processedLines = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip completely empty lines but preserve them as spacing
      if (trimmedLine === "") {
        processedLines.push({ type: "break", content: "" });
        continue;
      }

      // Detect bullet points (•, -, *, numbers with dots)
      const bulletRegex = /^(\s*)([\u2022\-\*]|\d+\.)\s+(.+)$/;
      const bulletMatch = trimmedLine.match(bulletRegex);

      if (bulletMatch) {
        processedLines.push({
          type: "bullet",
          content: bulletMatch[3],
          bulletType: bulletMatch[2],
          indent: bulletMatch[1].length,
        });
      } else {
        // Regular paragraph
        processedLines.push({
          type: "paragraph",
          content: trimmedLine,
        });
      }
    }

    return processedLines;
  }

  // Helper function for formatted date
  getFormattedDate() {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const now = new Date();
    return `${now.getDate()} de ${
      months[now.getMonth()]
    } de ${now.getFullYear()}`;
  }

  // Helper function for formatted date with city
  getFormattedDateWithCity(city) {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    const now = new Date();
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const cityName = city || "Ciudad";
    return `${cityName}, ${day} de ${month} de ${year}`;
  }

  // Generate Word document
  async generateDocx(reportData, onProgress, onComplete, onError) {
    // Verify docx library availability
    if (typeof docx === "undefined") {
      const error =
        "Error: La librería de generación de documentos no está disponible. Por favor, recarga la página.";
      onError?.(error);
      return;
    }

    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      ImageRun,
      HeadingLevel,
      AlignmentType,
      Header,
      Footer,
      Table,
      TableRow,
      TableCell,
      WidthType,
      BorderStyle,
    } = docx;

    try {
      onProgress?.("Generando documento...");

      // Helper functions (getFormattedDate is now a class method)

      // Create header
      const header = this.createDocumentHeader(reportData, {
        Header,
        Table,
        TableRow,
        TableCell,
        Paragraph,
        TextRun,
        ImageRun,
        AlignmentType,
        WidthType,
        BorderStyle,
      });

      // Create footer
      const footer = new Footer({
        children: [
          new Paragraph({
            children: [new TextRun("Página 1")],
            alignment: AlignmentType.CENTER,
          }),
        ],
      });

      // Create document content
      const children = [];

      // Date
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: this.getFormattedDateWithCity(
                reportData.company.companyCity
              ),
              size: 24,
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: 400 },
        })
      );

      // Recipient block
      this.addRecipientBlock(children, reportData, { Paragraph, TextRun });

      // Subject
      this.addSubjectBlock(children, reportData, { Paragraph, TextRun });

      // Introduction
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Por medio del presente documento, se presenta el informe técnico correspondiente a las actividades realizadas:",
              size: 24,
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Stages sections
      await this.addStagesSections(
        children,
        reportData,
        {
          Paragraph,
          TextRun,
          ImageRun,
          HeadingLevel,
          AlignmentType,
          Table,
          TableRow,
          TableCell,
          WidthType,
          BorderStyle,
        },
        onProgress
      );

      // Recommendations section
      this.addRecommendationsSection(children, reportData, {
        Paragraph,
        TextRun,
        HeadingLevel,
      });

      // Signature block
      this.addSignatureBlock(children, reportData, { Paragraph, TextRun });

      // Create document with better compatibility
      const doc = new Document({
        creator: "Generador de Informes Técnicos",
        title: "Informe Técnico",
        description: "Informe técnico generado automáticamente",
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch
                  right: 1440, // 1 inch
                  bottom: 1440, // 1 inch
                  left: 1440, // 1 inch
                },
              },
            },
            headers: { default: header },
            footers: { default: footer },
            children: children,
          },
        ],
      });

      onProgress?.("Generando archivo...");

      // Generate and handle the document
      const blob = await Packer.toBlob(doc);
      await this.handleDocumentSharing(blob, reportData, onComplete);
    } catch (error) {
      console.error("Error generating document:", error);
      onError?.(error.message || "Hubo un error al generar el documento.");
    }
  }

  // Create document header with company logo positioned on LEFT
  createDocumentHeader(reportData, docxElements) {
    const {
      Header,
      Table,
      TableRow,
      TableCell,
      Paragraph,
      TextRun,
      ImageRun,
      AlignmentType,
      WidthType,
      BorderStyle,
    } = docxElements;

    // Get logo data and ensure it's valid
    const logoSrc = this.getLogoData(reportData.company.logo);
    const hasValidLogo = logoSrc && reportData.company.logo;

    // Calculate optimal logo cell width based on actual logo dimensions
    let logoCellWidth = 5; // Minimal space if no logo
    let logoDimensions = { width: 80, height: 80 }; // Default dimensions

    if (hasValidLogo) {
      // Calculate logo dimensions to determine appropriate cell width
      logoDimensions = this.calculateLogoImageDimensions(
        typeof reportData.company.logo === "object"
          ? reportData.company.logo.width || 80
          : 80,
        typeof reportData.company.logo === "object"
          ? reportData.company.logo.height || 80
          : 80
      );

      // Base cell width on logo width (conservative estimate: logo width + padding)
      // Convert pixels to percentage of page width (assuming ~600px available width)
      const estimatedCellWidth = Math.min(
        Math.max(
          Math.ceil(((logoDimensions.width + 40) / 600) * 100), // logo width + padding as % of page
          15 // minimum 15% for reasonable spacing
        ),
        40 // maximum 40% to not overwhelm the page
      );

      logoCellWidth = estimatedCellWidth;
    }

    // Create logo cell content
    const logoCell = hasValidLogo
      ? [
          new Paragraph({
            children: [
              new ImageRun({
                data: this.fileHandler.base64ToBuffer(logoSrc),
                transformation: logoDimensions, // Reuse calculated dimensions
              }),
            ],
            alignment: AlignmentType.LEFT, // ENSURE LEFT alignment
          }),
        ]
      : [
          new Paragraph({
            children: [
              new TextRun({
                text: "", // Empty if no logo
                size: 12,
              }),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ];

    return new Header({
      children: [
        new Table({
          rows: [
            new TableRow({
              children: [
                // LEFT CELL: Company Logo
                new TableCell({
                  children: logoCell,
                  width: { size: logoCellWidth, type: WidthType.PERCENTAGE },
                  verticalAlign: "center",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: {
                      style: BorderStyle.SINGLE,
                      size: 6,
                      color: "808080",
                    },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
                // RIGHT CELL: Company Information
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: reportData.company.companyName || "",
                          bold: true,
                          size: 26, // Reduced by 2px as requested
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "NIT: ",
                          bold: true,
                          size: 18, // Reduced by 2px
                        }),
                        new TextRun({
                          text: reportData.company.companyNit || "",
                          size: 18,
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Contacto: ",
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: reportData.company.companyContact || "",
                          size: 18,
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Ubicación: ",
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: `${
                            reportData.company.companyCity || ""
                          } - Colombia`,
                          size: 18,
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                  width: {
                    size: 100 - logoCellWidth,
                    type: WidthType.PERCENTAGE,
                  },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: {
                      style: BorderStyle.SINGLE,
                      size: 6,
                      color: "808080",
                    },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    });
  }

  // Add recipient block
  addRecipientBlock(children, reportData, docxElements) {
    const { Paragraph, TextRun } = docxElements;

    // "Para:" with recipient name
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Para: ",
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: reportData.recipient.recipientName || "",
            bold: false,
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // "Cargo:" with recipient role
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Cargo: ",
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: reportData.recipient.recipientRole || "",
            bold: false,
            size: 24,
          }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  // Add subject block
  addSubjectBlock(children, reportData, docxElements) {
    const { Paragraph, TextRun } = docxElements;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "ASUNTO: ",
            bold: true,
            size: 24,
          }),
          new TextRun({
            text: (reportData.recipient.reportSubject || "").toUpperCase(),
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 400 },
      })
    );
  }

  // Add stages sections
  async addStagesSections(children, reportData, docxElements, onProgress) {
    const {
      Paragraph,
      TextRun,
      ImageRun,
      HeadingLevel,
      AlignmentType,
      Table,
      TableRow,
      TableCell,
      WidthType,
      BorderStyle,
    } = docxElements;

    let sectionNumber = 1;

    for (const stage of reportData.stages) {
      onProgress?.(`Procesando etapa ${sectionNumber}...`);

      // Stage title
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sectionNumber}. ${stage.title || "Etapa sin título"}`,
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 200 },
        })
      );

      // Stage description with preserved formatting
      if (stage.description) {
        const formattedLines = this.processFormattedText(stage.description);

        for (const line of formattedLines) {
          if (line.type === "break") {
            // Add empty paragraph for spacing
            children.push(
              new Paragraph({
                children: [new TextRun("")],
                spacing: { after: 100 },
              })
            );
          } else if (line.type === "bullet") {
            // Add bullet point paragraph
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${line.bulletType} ${line.content}`,
                    size: 24,
                  }),
                ],
                spacing: { after: 150 },
                indent: {
                  left: line.indent * 200, // Convert to twips (20th of a point)
                },
              })
            );
          } else {
            // Add regular paragraph
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line.content,
                    size: 24,
                  }),
                ],
                spacing: { after: 150 },
              })
            );
          }
        }
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Sin descripción.",
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }

      // Photo table (2 columns, no borders)
      if (stage.photos && stage.photos.length > 0) {
        const photoRows = [];
        for (let i = 0; i < stage.photos.length; i += 2) {
          const leftPhoto = stage.photos[i];
          const rightPhoto = stage.photos[i + 1];

          try {
            photoRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: this.fileHandler.base64ToBuffer(
                              leftPhoto.data
                            ),
                            transformation: this.calculateImageDimensions(
                              leftPhoto.width || 200,
                              leftPhoto.height || 150,
                              400, // Max width
                              250 // Max height: 250px
                            ),
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                      bottom: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                      left: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                      right: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                    },
                  }),
                  new TableCell({
                    children: rightPhoto
                      ? [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: this.fileHandler.base64ToBuffer(
                                  rightPhoto.data
                                ),
                                transformation: this.calculateImageDimensions(
                                  rightPhoto.width || 200,
                                  rightPhoto.height || 150,
                                  400, // Max width
                                  250 // Max height: 250px
                                ),
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ]
                      : [new Paragraph("")],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: {
                      top: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                      bottom: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                      left: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                      right: {
                        style: BorderStyle.SINGLE,
                        size: 1,
                        color: "D3D3D3",
                      },
                    },
                  }),
                ],
              })
            );
          } catch (e) {
            console.error("Error processing photo:", e);
          }
        }

        if (photoRows.length > 0) {
          children.push(
            new Table({
              rows: photoRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              layout: "fixed",
            })
          );
        }
      }

      // Add spacing after each stage
      children.push(
        new Paragraph({
          children: [new TextRun("")],
          spacing: { after: 200 },
        })
      );

      sectionNumber++;
    }
  }

  // Add recommendations section
  addRecommendationsSection(children, reportData, docxElements) {
    const { Paragraph, TextRun, HeadingLevel } = docxElements;

    if (reportData.recommendations) {
      const sectionNumber = reportData.stages.length + 1;

      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sectionNumber}. Recomendaciones`,
              bold: true,
              size: 28,
            }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 200 },
        })
      );

      // Add recommendations with preserved formatting
      const formattedRecommendations = this.processFormattedText(
        reportData.recommendations
      );

      for (const line of formattedRecommendations) {
        if (line.type === "break") {
          // Add empty paragraph for spacing
          children.push(
            new Paragraph({
              children: [new TextRun("")],
              spacing: { after: 100 },
            })
          );
        } else if (line.type === "bullet") {
          // Add bullet point paragraph
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${line.bulletType} ${line.content}`,
                  size: 24,
                }),
              ],
              spacing: { after: 150 },
              indent: {
                left: line.indent * 200, // Convert to twips
              },
            })
          );
        } else {
          // Add regular paragraph
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.content,
                  size: 24,
                }),
              ],
              spacing: { after: 150 },
            })
          );
        }
      }
    }
  }

  // Add signature block
  addSignatureBlock(children, reportData, docxElements) {
    const { Paragraph, TextRun } = docxElements;

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Atentamente,",
            size: 24,
          }),
        ],
        spacing: { before: 800, after: 1000 },
      })
    );

    // Add extra spacing for signature area
    children.push(
      new Paragraph({
        children: [new TextRun("")],
        spacing: { after: 400 },
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun("")],
        spacing: { after: 400 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "___________________________",
            size: 24,
          }),
        ],
        spacing: { after: 300 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: (reportData.company.authorName || "").toUpperCase(),
            bold: true,
            size: 26,
          }),
        ],
        spacing: { after: 150 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: reportData.company.authorRole || "",
            bold: true,
            size: 24,
          }),
        ],
        spacing: { after: 150 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: reportData.company.authorDepartment || "",
            bold: true,
            size: 24,
          }),
        ],
      })
    );
  }

  // Handle document sharing and download
  async handleDocumentSharing(blob, reportData, onComplete) {
    const fileName = `informe-${
      reportData.recipient.reportSubject || "tecnico"
    }.docx`;

    try {
      // Always download the file since Web Share API requires user gesture
      // and we're calling this asynchronously after document generation
      saveAs(blob, fileName);
      this.showMessage("El documento se ha descargado correctamente.");
      onComplete?.();
    } catch (error) {
      console.error("Error downloading file:", error);
      this.showMessage("Error al descargar el documento.");
      onComplete?.();
    }
  }

  // Show message to user with toast notification
  showMessage(message) {
    console.log("Document Generator:", message);

    // Create and show toast notification
    const toastHtml = `
      <div class="toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3" 
           role="alert" aria-live="assertive" aria-atomic="true" style="z-index: 9999;">
        <div class="d-flex">
          <div class="toast-body">
            <i class="bi bi-check-circle me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                  data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    // Add toast to document
    document.body.insertAdjacentHTML("beforeend", toastHtml);

    // Get the toast element and show it
    const toastElements = document.querySelectorAll(".toast");
    const newToast = toastElements[toastElements.length - 1];
    const toast = new bootstrap.Toast(newToast, {
      autohide: true,
      delay: 4000,
    });

    toast.show();

    // Clean up toast after it's hidden
    newToast.addEventListener("hidden.bs.toast", function () {
      this.remove();
    });
  }

  // Validate document data
  validateDocumentData(reportData) {
    const errors = [];

    // Company information validation
    if (
      !reportData.company.companyName ||
      !reportData.company.companyName.trim()
    ) {
      errors.push("• El nombre de la empresa es requerido");
    }

    if (
      !reportData.company.companyNit ||
      !reportData.company.companyNit.trim()
    ) {
      errors.push("• El NIT de la empresa es requerido");
    }

    if (
      !reportData.company.companyContact ||
      !reportData.company.companyContact.trim()
    ) {
      errors.push("• El contacto de la empresa es requerido");
    }

    if (
      !reportData.company.companyCity ||
      !reportData.company.companyCity.trim()
    ) {
      errors.push("• La ciudad de la empresa es requerida");
    }

    if (
      !reportData.company.authorName ||
      !reportData.company.authorName.trim()
    ) {
      errors.push("• El nombre del autor es requerido");
    }

    if (
      !reportData.company.authorRole ||
      !reportData.company.authorRole.trim()
    ) {
      errors.push("• El cargo del autor es requerido");
    }

    if (
      !reportData.company.authorDepartment ||
      !reportData.company.authorDepartment.trim()
    ) {
      errors.push("• El departamento del autor es requerido");
    }

    // Recipient information validation
    if (
      !reportData.recipient.recipientName ||
      !reportData.recipient.recipientName.trim()
    ) {
      errors.push("• El nombre del destinatario es requerido");
    }

    if (
      !reportData.recipient.recipientRole ||
      !reportData.recipient.recipientRole.trim()
    ) {
      errors.push("• El cargo del destinatario es requerido");
    }

    if (
      !reportData.recipient.reportSubject ||
      !reportData.recipient.reportSubject.trim()
    ) {
      errors.push("• El asunto del informe es requerido");
    }

    // Stages validation
    if (!reportData.stages || reportData.stages.length === 0) {
      errors.push("• Debe agregar al menos una etapa al informe");
    } else {
      // Validate each stage has required content
      let hasValidStage = false;
      reportData.stages.forEach((stage, index) => {
        if (stage.title && stage.title.trim()) {
          hasValidStage = true;
        } else {
          errors.push(`• La etapa ${index + 1} debe tener un título`);
        }

        if (stage.description && stage.description.trim()) {
          hasValidStage = true;
        } else {
          errors.push(`• La etapa ${index + 1} debe tener una descripción`);
        }
      });

      if (!hasValidStage) {
        errors.push("• Al menos una etapa debe tener título y descripción");
      }
    }

    return errors;
  }
}

// Export class
window.DocumentGenerator = DocumentGenerator;
