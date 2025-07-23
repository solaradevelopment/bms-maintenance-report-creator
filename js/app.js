// app.js - Archivo principal de la aplicación

class ReportGeneratorApp {
  constructor() {
    this.database = null;
    this.fileHandler = null;
    this.formManager = null;
    this.navigation = null;
    this.documentGenerator = null;
    this.isGenerating = false; // Track generation state
  }

  // Initialize the application
  async initialize() {
    try {
      // Initialize modules in dependency order
      this.database = new DatabaseManager();
      this.fileHandler = new FileHandler(this.database);
      this.formManager = new FormManager(this.database, this.fileHandler);
      this.navigation = new NavigationManager(this.database, this.formManager);
      this.documentGenerator = new DocumentGenerator(this.fileHandler);

      // Set up document generation callback
      this.navigation.setDocumentGenerationCallback(() =>
        this.showFormatSelectionModal()
      );

      // Initialize format selection modal
      this.initializeFormatModal();

      // Initialize components
      this.navigation.initializeStepper();
      this.formManager.initializeLogoHandler();

      // Load saved data and populate form
      await this.loadSavedData();

      // Initialize dropdowns with saved options
      await this.formManager.initializeOptionsDropdowns();

      // Show initial step
      await this.navigation.showStep(1);

      console.log("Report Generator App initialized successfully");
    } catch (error) {
      console.error("Error initializing app:", error);
      this.showError(
        "Error al inicializar la aplicación. Por favor, recarga la página."
      );
    }
  }

  // Load saved data and populate form
  async loadSavedData() {
    try {
      const savedData = await this.database.loadSavedData();
      if (savedData) {
        this.formManager.populateFormFromData(savedData);
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
  }

  // (generateDocument method removed - now using generateDocumentWithFormat with modal selection)

  // Show validation errors with visible modal
  showValidationErrors(errors) {
    console.warn("Validation errors:", errors);

    // Create and show validation error modal
    const errorModalHtml = `
      <div class="modal fade" id="validationErrorModal" tabindex="-1" aria-labelledby="validationErrorModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-danger">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title" id="validationErrorModalLabel">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Campos Requeridos
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-danger border-0 mb-3" role="alert">
                <strong>Por favor, completa los siguientes campos antes de generar el documento:</strong>
              </div>
              <ul class="list-unstyled mb-0">
                ${errors
                  .map((error) => `<li class="mb-2 text-danger">${error}</li>`)
                  .join("")}
              </ul>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                <i class="bi bi-check-circle me-1"></i>
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById("validationErrorModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to document
    document.body.insertAdjacentHTML("beforeend", errorModalHtml);

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("validationErrorModal")
    );
    modal.show();

    // Clean up modal after it's hidden
    document
      .getElementById("validationErrorModal")
      .addEventListener("hidden.bs.modal", function () {
        this.remove();
      });
  }

  // Show error message (replaced alert with console logging)
  showError(message) {
    console.error("Application error:", message);
    // Could be replaced with a toast notification system in the future
  }

  // Get database instance
  getDatabase() {
    return this.database;
  }

  // Get file handler instance
  getFileHandler() {
    return this.fileHandler;
  }

  // Get form manager instance
  getFormManager() {
    return this.formManager;
  }

  // Get navigation instance
  getNavigation() {
    return this.navigation;
  }

  // Get document generator instance
  getDocumentGenerator() {
    return this.documentGenerator;
  }

  // Show format selection modal
  showFormatSelectionModal() {
    const formatModal = new bootstrap.Modal(
      document.getElementById("formatModal")
    );
    formatModal.show();
  }

  // Initialize format selection modal
  initializeFormatModal() {
    const generateWordBtn = document.getElementById("generateWordBtn");
    const generatePdfBtn = document.getElementById("generatePdfBtn");

    generateWordBtn.addEventListener("click", () => {
      // Set loading state immediately
      this.setLoadingState(true, "Preparando documento Word...");

      const formatModal = bootstrap.Modal.getInstance(
        document.getElementById("formatModal")
      );
      if (formatModal) {
        formatModal.hide();
      }

      // Small delay to allow modal to close and show loading state
      setTimeout(() => {
        this.generateDocumentWithFormat("word");
      }, 100);
    });

    generatePdfBtn.addEventListener("click", () => {
      // Set loading state immediately
      this.setLoadingState(true, "Preparando documento PDF...");

      const formatModal = bootstrap.Modal.getInstance(
        document.getElementById("formatModal")
      );
      if (formatModal) {
        formatModal.hide();
      }

      // Small delay to allow modal to close and show loading state
      setTimeout(() => {
        this.generateDocumentWithFormat("pdf");
      }, 100);
    });
  }

  // Set loading state for all buttons
  setLoadingState(isLoading, progressText = "") {
    console.log("Setting loading state:", isLoading, progressText); // Debug log
    this.isGenerating = isLoading;

    // Main action button
    const mainActionBtn = document.getElementById("main-action-btn");

    // Format modal buttons
    const generateWordBtn = document.getElementById("generateWordBtn");
    const generatePdfBtn = document.getElementById("generatePdfBtn");
    const cancelBtn = document.querySelector("#formatModal .btn-secondary");

    if (isLoading) {
      console.log("Enabling loading state for buttons"); // Debug log
      // Disable and show loading state
      mainActionBtn.disabled = true;
      mainActionBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${
        progressText || "Generando..."
      }`;

      generateWordBtn.disabled = true;
      generateWordBtn.innerHTML = `<div class="d-flex align-items-center justify-content-center">
        <span class="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
        <div class="text-start">
          <div class="fw-bold">Generando...</div>
          <small class="text-light">${
            progressText || "Procesando documento"
          }</small>
        </div>
      </div>`;

      generatePdfBtn.disabled = true;
      generatePdfBtn.innerHTML = `<div class="d-flex align-items-center justify-content-center">
        <span class="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></span>
        <div class="text-start">
          <div class="fw-bold">Generando...</div>
          <small class="text-muted">${
            progressText || "Procesando documento"
          }</small>
        </div>
      </div>`;

      if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.textContent = "Procesando...";
      }
    } else {
      console.log("Disabling loading state for buttons"); // Debug log
      // Restore normal state
      mainActionBtn.disabled = false;
      mainActionBtn.textContent = "Enviar Reporte";

      generateWordBtn.disabled = false;
      generateWordBtn.innerHTML = `<div class="d-flex align-items-center justify-content-center">
        <ion-icon name="document-text-outline" class="fs-4 me-3"></ion-icon>
        <div class="text-start">
          <div class="fw-bold">Documento Word</div>
          <small class="text-light">Formato .docx editable</small>
        </div>
      </div>`;

      generatePdfBtn.disabled = false;
      generatePdfBtn.innerHTML = `<div class="d-flex align-items-center justify-content-center">
        <ion-icon name="document-outline" class="fs-4 me-3"></ion-icon>
        <div class="text-start">
          <div class="fw-bold">Documento PDF</div>
          <small class="text-muted">Formato .pdf para compartir</small>
        </div>
      </div>`;

      if (cancelBtn) {
        cancelBtn.disabled = false;
        cancelBtn.textContent = "Cancelar";
      }
    }
  }

  // Generate document with specified format
  async generateDocumentWithFormat(format = "word") {
    const reportData = this.formManager.getReportData();
    const errors = this.documentGenerator.validateDocumentData(reportData);

    if (errors.length > 0) {
      this.showValidationErrors(errors);
      // Reset loading state if validation fails
      this.setLoadingState(false);
      return;
    }

    // Update loading state (if not already set)
    if (!this.isGenerating) {
      this.setLoadingState(true, "Iniciando generación...");
    }

    try {
      if (format === "pdf") {
        await this.documentGenerator.generatePdf(
          reportData,
          (progress) => {
            // Update loading state with progress
            this.setLoadingState(true, progress);
          },
          () => {
            // On complete
            this.setLoadingState(false);
          },
          (error) => {
            // On error
            this.showError(error);
            this.setLoadingState(false);
          }
        );
      } else {
        await this.documentGenerator.generateDocx(
          reportData,
          (progress) => {
            // Update loading state with progress
            this.setLoadingState(true, progress);
          },
          () => {
            // On complete
            this.setLoadingState(false);
          },
          (error) => {
            // On error
            this.showError(error);
            this.setLoadingState(false);
          }
        );
      }
    } catch (error) {
      console.error("Error generating document:", error);
      this.showError("Error al generar el documento");
      this.setLoadingState(false);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Create global app instance
  window.app = new ReportGeneratorApp();

  // Initialize the application
  await window.app.initialize();
});
