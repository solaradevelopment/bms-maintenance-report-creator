// fileHandler.js - Módulo para manejo de archivos y fotos

class FileHandler {
  constructor(database) {
    this.database = database;
    this.lightbox = document.getElementById("lightbox");
    this.lightboxImage = document.getElementById("lightbox-image");
    this.lightboxClose = document.getElementById("lightbox-close");

    this.initializeLightbox();
  }

  // Initialize lightbox functionality
  initializeLightbox() {
    this.lightboxClose.addEventListener("click", () => this.closeLightbox());
    this.lightbox.addEventListener("click", (e) => {
      if (e.target === this.lightbox) {
        this.closeLightbox();
      }
    });
  }

  // Lightbox operations
  openLightbox(src) {
    this.lightboxImage.src = src;
    this.lightbox.classList.add("show");
  }

  closeLightbox() {
    this.lightbox.classList.remove("show");
  }

  // Generic File Upload UI
  createFileDropZone(container, input) {
    console.log("🎨 Creating file drop zone for container:", container?.id);
    container.innerHTML = `
      <div class="file-drop-zone">
        <ion-icon name="add-circle" class="fs-4 text-primary"></ion-icon>
        <span class="ms-2 fw-semibold">Añadir archivo</span>
      </div>
    `;
    const dropZone = container.querySelector(".file-drop-zone");
    if (dropZone) {
      console.log("🎯 Adding click event to drop zone");
      dropZone.addEventListener("click", () => {
        console.log("🖱️ Drop zone clicked, triggering input click");
        input.click();
      });
    } else {
      console.error("❌ Could not find drop zone element after creation");
    }
  }

  createFilePreview(file, dataUrl, container, onRemove) {
    // Calculate file size display - handle cases where file.size might not exist
    let fileSizeDisplay = "Tamaño desconocido";
    if (file.size && typeof file.size === "number" && !isNaN(file.size)) {
      const sizeInKB = (file.size / 1024).toFixed(1);
      fileSizeDisplay = `${sizeInKB} KB`;
    } else if (dataUrl && typeof dataUrl === "string") {
      // Estimate size from base64 data for saved files
      const base64Length = dataUrl.length;
      const estimatedBytes = (base64Length * 3) / 4; // Rough base64 to bytes conversion
      const estimatedKB = (estimatedBytes / 1024).toFixed(1);
      fileSizeDisplay = `~${estimatedKB} KB (guardado)`;
    }

    container.innerHTML = `
      <div class="file-preview">
        <div class="file-preview-img-wrapper">
          <img src="${dataUrl}" class="file-preview-img">
        </div>
        <div class="ms-3 flex-grow-1">
          <p class="small fw-bold m-0 file-name-text">${file.name}</p>
          <small class="text-muted">${fileSizeDisplay}</small>
        </div>
        <button type="button" class="btn-close btn-sm ms-2 remove-file-btn"></button>
      </div>
    `;
    container
      .querySelector(".remove-file-btn")
      .addEventListener("click", onRemove);
    container
      .querySelector(".file-preview-img-wrapper")
      .addEventListener("click", () => this.openLightbox(dataUrl));
  }

  // Company Logo handler
  initializeLogoHandler(reportData, saveCallback) {
    const logoInput = document.getElementById("companyLogo");
    const logoPreviewWrapper = document.getElementById("logo-preview-wrapper");

    console.log('🔧 Initializing logo handler:', {
      logoInput: !!logoInput,
      logoPreviewWrapper: !!logoPreviewWrapper,
      currentLogo: !!reportData?.company?.logo
    });

    if (!logoInput || !logoPreviewWrapper) {
      console.error('❌ Logo elements not found:', {
        logoInput: !!logoInput,
        logoPreviewWrapper: !!logoPreviewWrapper
      });
      return null;
    }

    // Remove any existing event listeners to prevent duplicates
    if (logoInput._logoChangeHandler) {
      logoInput.removeEventListener("change", logoInput._logoChangeHandler);
    }

    // Only create drop zone if no logo exists
    if (!reportData?.company?.logo) {
      this.createFileDropZone(logoPreviewWrapper, logoInput);
    }

    // Create the event handler function and store reference for later removal
    const logoChangeHandler = async (e) => {
      console.log('📁 Logo file selected:', e.target.files[0]?.name);
      const file = e.target.files[0];
      if (file) {
        console.log('📖 Reading logo file...');
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            console.log('🖼️ Logo file read, creating image...');
            // Create image to get original dimensions
            const img = new Image();
            img.onload = async () => {
              console.log('✅ Logo image loaded, dimensions:', img.naturalWidth, 'x', img.naturalHeight);
              // Store logo data with dimensions (same format as stage photos)
              const logoId = `logo-${Date.now()}`;
              reportData.company.logo = {
                id: logoId,
                data: event.target.result,
                name: file.name,
                width: img.naturalWidth,
                height: img.naturalHeight,
              };
              
              console.log('💾 Logo data stored:', {
                id: logoId,
                name: file.name,
                dataLength: event.target.result.length,
                width: img.naturalWidth,
                height: img.naturalHeight
              });

              this.createFilePreview(
                file,
                event.target.result,
                logoPreviewWrapper,
                async () => {
                  console.log("🗑️ Logo removed");
                  reportData.company.logo = null;
                  logoInput.value = "";
                  this.createFileDropZone(logoPreviewWrapper, logoInput);

                  // CRITICAL: Reinitialize logo handler to restore event listeners
                  console.log(
                    "🔄 Reinitializing logo handler after removal (img.onload)"
                  );
                  window.app?.formManager?.initializeLogoHandler();

                  if (saveCallback) {
                    try {
                      await saveCallback();
                    } catch (saveError) {
                      console.warn("Error saving logo removal:", saveError);
                    }
                  }
                }
              );
              if (saveCallback) {
                try {
                  console.log("💾 Calling save callback after logo upload");
                  await saveCallback();
                  console.log("✅ Save callback completed");
                } catch (saveError) {
                  console.warn("❌ Error in save callback:", saveError);
                }
              }
            };
            img.onerror = async () => {
              // If image fails to load, save without dimensions (same format as stage photos)
              const logoId = `logo-${Date.now()}`;
              reportData.company.logo = {
                id: logoId,
                data: event.target.result,
                name: file.name,
                width: null,
                height: null,
              };

              this.createFilePreview(
                file,
                event.target.result,
                logoPreviewWrapper,
                async () => {
                  reportData.company.logo = null;
                  logoInput.value = "";
                  this.createFileDropZone(logoPreviewWrapper, logoInput);

                  // Reinitialize logo handler to restore event listeners
                  window.app?.formManager?.initializeLogoHandler();

                  if (saveCallback) {
                    try {
                      await saveCallback();
                    } catch (saveError) {
                      console.warn("Error saving logo removal:", saveError);
                    }
                  }
                }
              );
              if (saveCallback) {
                try {
                  await saveCallback();
                } catch (saveError) {
                  console.warn("Error in save callback:", saveError);
                }
              }
            };
            img.src = event.target.result;
          } catch (error) {
            console.error("Error processing logo file:", error);
          }
        };
        reader.onerror = () => {
          console.error("FileReader failed");
        };
        reader.readAsDataURL(file);
      }
    };

    // Add the event listener and store reference for future removal
    logoInput.addEventListener("change", logoChangeHandler);
    logoInput._logoChangeHandler = logoChangeHandler; // Store reference for removal

    return { logoInput, logoPreviewWrapper };
  }

  // Restore logo preview from saved data
  restoreLogoPreview(logoData) {
    console.log('🔄 Attempting to restore logo preview:', {
      hasLogoData: !!logoData,
      logoType: typeof logoData,
      logoData: logoData
    });
    
    if (logoData) {
      const logoPreviewWrapper = document.getElementById(
        "logo-preview-wrapper"
      );
      const logoInput = document.getElementById("companyLogo");

      console.log('🔍 Logo elements found:', {
        logoPreviewWrapper: !!logoPreviewWrapper,
        logoInput: !!logoInput
      });

      if (!logoPreviewWrapper || !logoInput) {
        console.error('❌ Cannot restore logo - missing elements');
        return;
      }

      // Handle different formats: string (old), object with 'src' (old), object with 'data' (new)
      const logoSrc =
        typeof logoData === "string" ? logoData : logoData.data || logoData.src; // Prefer 'data' (new format) over 'src' (old format)
      const logoName =
        typeof logoData === "string"
          ? "Logo guardado"
          : logoData.name || "Logo guardado";

      console.log('🔍 Logo source extracted:', {
        logoSrc: logoSrc ? logoSrc.substring(0, 50) + '...' : 'null',
        logoName
      });

      if (logoSrc) {
        console.log('✅ Creating logo preview with valid source');
        this.createFilePreview(
          { name: logoName },
          logoSrc,
          logoPreviewWrapper,
          () => {
            console.log('🗑️ Logo removal triggered');
            // Handle logo removal
            const reportData = window.app?.formManager?.getReportData();
            if (reportData) {
              reportData.company.logo = null;
              logoInput.value = "";
              this.createFileDropZone(logoPreviewWrapper, logoInput);

              // Reinitialize logo handler to restore event listeners
              window.app?.formManager?.initializeLogoHandler();

              // Save changes - call method with proper context
              const database = window.app?.database;
              if (database && database.saveCurrentData) {
                try {
                  database.saveCurrentData(reportData);
                } catch (saveError) {
                  console.warn("Error saving logo removal:", saveError);
                }
              }
            }
          }
        );
      } else {
        console.error('❌ Cannot create logo preview - no valid source');
      }
    } else {
      console.log('ℹ️ No logo data to restore');
    }
  }

  // Stage Photos handler
  handleStagePhotoUpload(event, stageId, reportData, saveCallback) {
    const stageElement = document.querySelector(
      `.stage-item[data-id="${stageId}"]`
    );
    const listContainer = stageElement.querySelector(".photo-list-container");
    const stageData = reportData.stages.find((s) => s.id === stageId);

    Array.from(event.target.files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const photoId = `photo-${stageId}-${Date.now()}-${index}`;

          // Create image to get dimensions
          const img = new Image();
          img.onload = async () => {
            stageData.photos.push({
              id: photoId,
              data: e.target.result,
              name: file.name,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });

            this.createPhotoListItem(
              e.target.result,
              file.name,
              photoId,
              listContainer,
              stageData,
              saveCallback
            );
            if (saveCallback) {
              try {
                await saveCallback();
              } catch (saveError) {
                console.warn("Error saving photo data:", saveError);
              }
            }
          };

          img.onerror = async () => {
            // If image fails to load, save without dimensions
            stageData.photos.push({
              id: photoId,
              data: e.target.result,
              name: file.name,
              width: null,
              height: null,
            });

            this.createPhotoListItem(
              e.target.result,
              file.name,
              photoId,
              listContainer,
              stageData,
              saveCallback
            );
            if (saveCallback) {
              try {
                await saveCallback();
              } catch (saveError) {
                console.warn("Error saving photo data:", saveError);
              }
            }
          };

          img.src = e.target.result;
        } catch (error) {
          console.error("Error processing photo file:", error);
        }
      };
      reader.readAsDataURL(file);
    });
    event.target.value = ""; // Reset file input
  }

  // Create photo list item for stages
  createPhotoListItem(
    imageData,
    fileName,
    photoId,
    container,
    stageData,
    saveCallback
  ) {
    const listItem = document.createElement("div");
    listItem.className = "file-preview mt-2";
    listItem.innerHTML = `
      <div class="file-preview-img-wrapper">
        <img src="${imageData}" class="file-preview-img">
      </div>
      <div class="ms-3 flex-grow-1">
        <p class="small fw-bold m-0 file-name-text">${fileName}</p>
      </div>
      <button type="button" class="btn-close btn-sm ms-2 remove-photo-btn" data-photoid="${photoId}"></button>
    `;
    container.appendChild(listItem);

    listItem
      .querySelector(".file-preview-img-wrapper")
      .addEventListener("click", () => this.openLightbox(imageData));
    listItem
      .querySelector(".remove-photo-btn")
      .addEventListener("click", async () => {
        const photoIndex = stageData.photos.findIndex((p) => p.id === photoId);
        if (photoIndex > -1) {
          stageData.photos.splice(photoIndex, 1);
          listItem.remove();
          if (saveCallback) {
            try {
              await saveCallback();
            } catch (saveError) {
              console.warn("Error saving after photo removal:", saveError);
            }
          }
        }
      });
  }

  // Restore stage photos from saved data
  restoreStagePhotos(stageElement, stageData, saveCallback) {
    const listContainer = stageElement.querySelector(".photo-list-container");
    stageData.photos.forEach((photo) => {
      this.createPhotoListItem(
        photo.data,
        photo.name,
        photo.id,
        listContainer,
        stageData,
        saveCallback
      );
    });
  }

  // Helper to convert base64 to ArrayBuffer for document generation
  base64ToBuffer(base64) {
    const binaryString = window.atob(base64.split(",")[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Validate file type
  isValidImageType(file) {
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    return validTypes.includes(file.type);
  }

  // Validate file size (in MB)
  isValidFileSize(file, maxSizeMB = 5) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  // Show file validation error
  showFileError(message) {
    console.warn("File validation error:", message);
  }

  // Process file with validation
  processFileWithValidation(file, onSuccess, onError) {
    if (!this.isValidImageType(file)) {
      onError?.(
        "Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, GIF, WebP)."
      );
      return false;
    }

    if (!this.isValidFileSize(file)) {
      onError?.(
        "El archivo es demasiado grande. El tamaño máximo permitido es 5MB."
      );
      return false;
    }

    const reader = new FileReader();
    reader.onload = (event) => onSuccess?.(event.target.result);
    reader.onerror = () => onError?.("Error al leer el archivo.");
    reader.readAsDataURL(file);
    return true;
  }
}

// Export class
window.FileHandler = FileHandler;
