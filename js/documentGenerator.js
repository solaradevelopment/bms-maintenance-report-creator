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

  // Detect photo orientation - simplified and more reliable
  detectPhotoOrientation(photo) {
    if (!photo) return false;
    
    const width = photo.width || 200;
    const height = photo.height || 150;
    
    // Simple but effective: if height > width, it's vertical
    const isVertical = height > width;
    
    console.log(`📸 Photo: ${width}x${height} → ${isVertical ? 'VERTICAL' : 'HORIZONTAL'}`);
    return isVertical;
  }
  
  // Helper method to convert base64 to buffer for DOCX
  base64ToBuffer(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      throw new Error('Invalid base64 string: not a string or empty');
    }
    
    try {
      // Remove data URL prefix if present
      const base64Data = base64String.includes(',') 
        ? base64String.split(',')[1] 
        : base64String;
      
      if (!base64Data || base64Data.trim() === '') {
        throw new Error('Empty base64 data after processing');
      }
      
      // Convert base64 to binary string
      const binaryString = atob(base64Data);
      
      if (binaryString.length === 0) {
        throw new Error('Empty binary string after base64 decode');
      }
      
      // Convert binary string to Uint8Array
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`✅ Successfully converted base64 to buffer, size: ${bytes.length} bytes`);
      return bytes;
    } catch (error) {
      console.error('❌ Error in base64ToBuffer:', error.message);
      console.error('Base64 string preview:', base64String.substring(0, 100) + '...');
      throw new Error(`Failed to convert base64 to buffer: ${error.message}`);
    }
  }

  // Calculate image dimensions preserving original aspect ratio
  calculateImageDimensions(
    originalWidth,
    originalHeight,
    maxWidth = 400,
    maxHeight = 250
  ) {
    if (!originalWidth || !originalHeight) {
      return { width: 240, height: 135 };
    }

    // Always preserve the original aspect ratio exactly
    const aspectRatio = originalWidth / originalHeight;
    
    // Scale to fit within constraints while preserving aspect ratio
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const scaleFactor = Math.min(widthRatio, heightRatio, 1); // Never scale up
    
    const finalWidth = Math.round(originalWidth * scaleFactor);
    const finalHeight = Math.round(originalHeight * scaleFactor);
    
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
      console.log('🔍 Checking logo for PDF:', {
        hasLogo: !!reportData.company.logo,
        logoType: typeof reportData.company.logo,
        logoKeys: reportData.company.logo ? Object.keys(reportData.company.logo) : 'none'
      });
      
      if (reportData.company.logo) {
        try {
          // Get logo data using centralized method
          const logoSrc = this.getLogoData(reportData.company.logo);
          console.log('🔍 Logo source extracted:', logoSrc ? logoSrc.substring(0, 50) + '...' : 'null');

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

            // Detect image format from data URL and try adding image
            let imageAdded = false;
            let detectedFormat = "JPEG"; // Default
            
            // Detect format from data URL
            if (logoSrc.includes('data:image/png')) {
              detectedFormat = "PNG";
            } else if (logoSrc.includes('data:image/jpeg') || logoSrc.includes('data:image/jpg')) {
              detectedFormat = "JPEG";
            } else if (logoSrc.includes('data:image/webp')) {
              detectedFormat = "WEBP";
            } else if (logoSrc.includes('data:image/gif')) {
              detectedFormat = "GIF";
            }
            
            // Try detected format first, then fallback to other formats
            const formats = [detectedFormat, "JPEG", "PNG", "WEBP", "GIF"].filter((f, i, arr) => arr.indexOf(f) === i);

            for (const format of formats) {
              try {
                // Logo positioned on the LEFT with margin (like flex start)
                const logoX = margin;
                doc.addImage(logoSrc, format, logoX, yPos, logoW, logoH);
                logoWidth = logoW;
                logoHeight = logoH;
                imageAdded = true;
                console.log(`✅ Logo added successfully as ${format}`);
                break;
              } catch (formatError) {
                console.warn(`❌ Failed to add logo as ${format}:`, formatError.message);
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

      // Introduction - Usando el texto personalizado del usuario
      yPos = addWrappedText(
        reportData.introduction || "Por medio del presente documento, se presenta el informe técnico correspondiente a las actividades realizadas:",
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

        // Add photos exactly as they come - no orientation logic
        if (stage.photos && stage.photos.length > 0) {
          for (let i = 0; i < stage.photos.length; i++) {
            try {
              const photo = stage.photos[i];
              
              console.log(`📸 Photo ${i + 1}: ${photo.width || 'unknown'}x${photo.height || 'unknown'}`);
              
              // Use photo dimensions exactly as they are
              const photoDimensions = this.calculateImageDimensions(
                photo.width || 200,
                photo.height || 150,
                contentWidth * 0.9, // 90% of page width
                (400 * 25.4) / 96 // Large max height
              );
              
              // Check if we need a new page
              if (yPos + photoDimensions.height > 280) {
                doc.addPage();
                yPos = 20;
              }
              
              // Add border for photo
              doc.setDrawColor(200, 200, 200);
              doc.setLineWidth(0.5);
              const tableY = yPos - 5;
              const tableHeight = photoDimensions.height + 10;
              doc.rect(margin - 2, tableY, contentWidth + 4, tableHeight);
              
              // Center the photo
              doc.addImage(
                photo.data,
                "JPEG",
                margin + (contentWidth - photoDimensions.width) / 2,
                yPos,
                photoDimensions.width,
                photoDimensions.height
              );
              
              yPos += photoDimensions.height + 15;
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

      // Introduction - Usando el texto personalizado del usuario
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: reportData.introduction || "Por medio del presente documento, se presenta el informe técnico correspondiente a las actividades realizadas:",
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
    const hasValidLogo = logoSrc && (logoSrc.startsWith('data:image/') || logoSrc.startsWith('data:'));
    
    console.log('🔍 Logo validation for Word:', {
      logoSrc: logoSrc ? logoSrc.substring(0, 50) + '...' : 'null',
      hasValidLogo,
      startsWithDataImage: logoSrc ? logoSrc.startsWith('data:image/') : false
    });

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
    let logoCell;
    if (hasValidLogo) {
      try {
        console.log('🔍 Processing logo for Word document:', {
          hasLogo: !!reportData.company.logo,
          logoType: typeof reportData.company.logo,
          logoSrc: logoSrc ? logoSrc.substring(0, 50) + '...' : 'null',
          dimensions: logoDimensions
        });
        
        const logoBuffer = this.base64ToBuffer(logoSrc);
        console.log('✅ Logo buffer created successfully, size:', logoBuffer.length);
        
        logoCell = [
          new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: logoDimensions,
              }),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ];
        console.log('✅ Logo cell created successfully for Word');
      } catch (logoError) {
        console.error('❌ Error processing logo for Word:', logoError);
        // Fallback to empty cell if logo fails
        logoCell = [
          new Paragraph({
            children: [
              new TextRun({
                text: "", // Empty if logo fails
                size: 12,
              }),
            ],
            alignment: AlignmentType.LEFT,
          }),
        ];
      }
    } else {
      console.log('⚠️ No valid logo found for Word document');
      logoCell = [
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
    }

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

      // Add photos exactly as they come - no orientation logic
      if (stage.photos && stage.photos.length > 0) {
        for (let i = 0; i < stage.photos.length; i++) {
          try {
            const photo = stage.photos[i];
            
            console.log(`📝 Word Photo ${i + 1}: ${photo.width || 'unknown'}x${photo.height || 'unknown'}`);
            
            // Use photo dimensions exactly as they are
            const photoDimensions = this.calculateImageDimensions(
              photo.width || 200,
              photo.height || 150,
              500, // Large max width
              500  // Large max height
            );
            
            children.push(
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: this.base64ToBuffer(photo.data),
                                transformation: photoDimensions,
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          }),
                        ],
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1, color: "D3D3D3" },
                          bottom: { style: BorderStyle.SINGLE, size: 1, color: "D3D3D3" },
                          left: { style: BorderStyle.SINGLE, size: 1, color: "D3D3D3" },
                          right: { style: BorderStyle.SINGLE, size: 1, color: "D3D3D3" },
                        },
                      }),
                    ],
                  }),
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          } catch (e) {
            console.error("Error processing photo:", e);
          }
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
