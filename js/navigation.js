// navigation.js - Módulo para manejo de navegación y steppers

class NavigationManager {
  constructor(database, formManager) {
    this.database = database;
    this.formManager = formManager;
    this.currentStep = 1;
    this.totalSteps = 4;
    this.stepInfo = [
      { title: "Empresa", icon: "business-outline" },
      { title: "Destinatario", icon: "person-outline" },
      { title: "Etapas", icon: "list-outline" },
      { title: "Revisar", icon: "checkmark-done-outline" },
    ];

    // DOM Elements
    this.headerTitle = document.getElementById("header-title");
    this.headerBackBtn = document.getElementById("header-back-btn");
    this.headerDeleteBtn = document.getElementById("header-delete-btn");
    this.mainActionBtn = document.getElementById("main-action-btn");
    this.stepperContainer = document.getElementById("stepper");
    this.reviewContainer = document.getElementById("review-container");
    this.deleteModal = new bootstrap.Modal(
      document.getElementById("deleteModal")
    );
    this.confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Main action button
    this.mainActionBtn.addEventListener("click", async () => {
      if (this.currentStep === this.totalSteps) {
        // Trigger document generation through external callback
        if (this.onGenerateDocument) {
          this.onGenerateDocument();
        }
      } else {
        // Save current form data before advancing to next step
        await this.saveCurrentStepData();
        await this.showStep(this.currentStep + 1);
      }
    });

    // Back button
    this.headerBackBtn.addEventListener("click", async () => {
      if (this.currentStep > 1) await this.showStep(this.currentStep - 1);
    });

    // Delete functionality
    this.headerDeleteBtn.addEventListener("click", () => {
      this.deleteModal.show();
    });

    this.confirmDeleteBtn.addEventListener("click", async () => {
      await this.clearCurrentData();
      this.deleteModal.hide();
    });
  }

  // Initialize Stepper with click navigation
  initializeStepper() {
    this.stepperContainer.innerHTML = "";
    const container = document.createElement("div");
    container.className = "d-flex align-items-start w-100";

    this.stepInfo.forEach((info, index) => {
      const isLast = index === this.stepInfo.length - 1;
      const stepNumber = index + 1;
      container.innerHTML += `
        <div class="stepper-node" data-step="${stepNumber}">
          <div class="stepper-square"><ion-icon name="${
            info.icon
          }"></ion-icon></div>
          <p class="stepper-label">${info.title}</p>
        </div>
        ${!isLast ? '<div class="stepper-line"></div>' : ""}
      `;
    });

    this.stepperContainer.appendChild(container);

    // Add click listeners to stepper nodes
    this.stepperContainer.querySelectorAll(".stepper-node").forEach((node) => {
      node.addEventListener("click", async () => {
        const targetStep = parseInt(node.dataset.step);

        // Only allow navigation to previous steps or current step
        if (targetStep <= this.currentStep) {
          await this.showStep(targetStep);
        } else {
          // If trying to go forward, save current step data first
          await this.saveCurrentStepData();
          await this.showStep(targetStep);
        }
      });
    });
  }

  // Update UI elements based on current step
  updateUI() {
    this.headerTitle.textContent = "Crear Informe";
    this.headerBackBtn.style.visibility =
      this.currentStep === 1 ? "hidden" : "visible";
    this.mainActionBtn.textContent =
      this.currentStep === this.totalSteps ? "Enviar Reporte" : "Continuar";

    const nodes = this.stepperContainer.querySelectorAll(".stepper-node");
    nodes.forEach((node, index) => {
      node.classList.remove("active", "completed");
      const line = node.nextElementSibling;
      if (line && line.classList.contains("stepper-line")) {
        line.classList.remove("border-primary");
      }

      if (index < this.currentStep - 1) {
        node.classList.add("completed");
        if (line) line.classList.add("border-primary");
      } else if (index === this.currentStep - 1) {
        node.classList.add("active");
      }
    });
  }

  // Navigate to specific step
  async showStep(stepNumber) {
    if (stepNumber > this.totalSteps || stepNumber < 1) return;

    // Note: Data is only saved when "Continue" is clicked or when advancing steps

    if (stepNumber === this.totalSteps) {
      this.generateReviewScreen();
    } else {
      // When navigating away from review, ensure form is populated with current data
      if (this.currentStep === this.totalSteps && this.formManager) {
        this.formManager.ensureFormPopulated();
      }
    }

    document
      .querySelectorAll(".step")
      .forEach((step) => step.classList.remove("active"));
    document.getElementById(`step-${stepNumber}`).classList.add("active");
    this.currentStep = stepNumber;
    this.updateUI();
  }

  // Generate review screen
  generateReviewScreen() {
    if (!this.formManager) return;

    const reportData = this.formManager.getReportData();
    const createReviewSection = (title, data, step) => `
      <div class="card">
        <div class="card-body">
          <div class="d-flex w-100 justify-content-between align-items-center">
            <h5 class="card-title fs-6 fw-semibold">${title}</h5>
            <button class="edit-btn btn btn-sm btn-light bg-white border" data-step="${step}">
              <ion-icon name="pencil" class="text-primary"></ion-icon> Editar
            </button>
          </div>
          <div class="mt-3 small text-muted">${data}</div>
        </div>
      </div>
    `;

    const companyData = `<p><strong>Razón Social:</strong> ${
      reportData.company.companyName || "N/A"
    }</p><p><strong>NIT:</strong> ${
      reportData.company.companyNit || "N/A"
    }</p>`;
    const recipientData = `<p><strong>Nombre:</strong> ${
      reportData.recipient.recipientName || "N/A"
    }</p><p><strong>Asunto:</strong> ${
      reportData.recipient.reportSubject || "N/A"
    }</p>`;
    const stagesData = `<p>${reportData.stages.length} etapa(s) registrada(s).</p>`;

    this.reviewContainer.innerHTML = createReviewSection(
      "Información de la Empresa",
      companyData,
      1
    );
    this.reviewContainer.innerHTML += createReviewSection(
      "Información del Destinatario",
      recipientData,
      2
    );
    this.reviewContainer.innerHTML += createReviewSection(
      "Etapas",
      stagesData,
      3
    );

    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event bubbling

        const targetStep = parseInt(e.currentTarget.dataset.step);

        // Save current step data before navigating (same as stepper behavior)
        await this.saveCurrentStepData();

        // Ensure form is populated with current data when going back
        if (this.formManager) {
          this.formManager.ensureFormPopulated();
        }

        // Navigate to target step
        await this.showStep(targetStep);
      });
    });
  }

  // Clear current data
  async clearCurrentData() {
    try {
      // Save current data as options before clearing (only if complete)
      if (this.database && this.formManager) {
        try {
          const reportData = this.formManager.getReportData();

          // Save company options if complete
          if (
            reportData.company &&
            reportData.company.companyName &&
            reportData.company.companyNit
          ) {
            await this.database.saveCompanyOption(reportData.company);
          }

          // Save recipient options if complete
          if (
            reportData.recipient &&
            reportData.recipient.recipientName &&
            reportData.recipient.recipientRole
          ) {
            await this.database.saveRecipientOption(reportData.recipient);
          }
        } catch (saveError) {
          console.warn("Error saving options before clearing:", saveError);
        }
      }

      // Clear current form data
      await this.database.clearCurrentData();

      // Reset form manager data
      if (this.formManager) {
        this.formManager.resetData();
        this.formManager.clearFormFields();
      }

      // Reset to first step
      this.showStep(1);
    } catch (error) {
      console.error("Error clearing data:", error);
    }
  }

  // Getters
  getCurrentStep() {
    return this.currentStep;
  }

  getTotalSteps() {
    return this.totalSteps;
  }

  // Save current step data when advancing
  async saveCurrentStepData() {
    try {
      if (this.formManager && this.formManager.reportData) {
        console.log("💾 Saving step data - Current step:", this.currentStep);
        console.log("📊 Company data:", this.formManager.reportData.company);
        console.log("🖼️ Logo status BEFORE operations:", {
          hasLogo: !!this.formManager.reportData.company.logo,
          logoType: typeof this.formManager.reportData.company.logo,
          logoData: this.formManager.reportData.company.logo,
        });

        // Save form data to database
        console.log("💾 About to call database.saveCurrentData...");
        await this.database.saveCurrentData(this.formManager.reportData);
        console.log("✅ database.saveCurrentData completed");
        console.log("🖼️ Logo status AFTER database.saveCurrentData:", {
          hasLogo: !!this.formManager.reportData.company.logo,
          logoData: this.formManager.reportData.company.logo,
        });

        // Save company and recipient options only when they have complete data
        if (this.currentStep === 1) {
          // Save company options when leaving step 1
          const companyData = this.formManager.reportData.company;
          console.log(
            "🏢 Leaving step 1 - Company data being saved:",
            companyData
          );
          if (companyData.companyName && companyData.companyNit) {
            console.log("💾 About to call database.saveCompanyOption...");
            await this.database.saveCompanyOption(companyData);
            console.log("✅ database.saveCompanyOption completed");
            console.log("🖼️ Logo status AFTER database.saveCompanyOption:", {
              hasLogo: !!this.formManager.reportData.company.logo,
              logoData: this.formManager.reportData.company.logo,
            });

            // Refresh company dropdowns for future use - PRESERVE LOGO
            console.log(
              "🔄 About to call formManager.createCompanyOptionsDropdown..."
            );

            // CRITICAL: Preserve logo before dropdown refresh
            const currentLogo = this.formManager.reportData.company.logo;
            console.log(
              "🛡️ Preserving logo before dropdown refresh:",
              currentLogo
            );

            await this.formManager.createCompanyOptionsDropdown();

            // CRITICAL: Restore logo after dropdown refresh if it was lost
            if (currentLogo && !this.formManager.reportData.company.logo) {
              console.log("🔧 Restoring logo after dropdown refresh");
              this.formManager.reportData.company.logo = currentLogo;
            }

            console.log(
              "✅ formManager.createCompanyOptionsDropdown completed"
            );
            console.log("🖼️ Logo status AFTER createCompanyOptionsDropdown:", {
              hasLogo: !!this.formManager.reportData.company.logo,
              logoData: this.formManager.reportData.company.logo,
            });
          }
        } else if (this.currentStep === 2) {
          // Save recipient options when leaving step 2
          const recipientData = this.formManager.reportData.recipient;
          if (recipientData.recipientName && recipientData.recipientRole) {
            await this.database.saveRecipientOption(recipientData);
            // Refresh recipient dropdowns for future use
            await this.formManager.createRecipientOptionsDropdown();
          }
        }

        console.log("🖼️ Logo status FINAL:", {
          hasLogo: !!this.formManager.reportData.company.logo,
          logoData: this.formManager.reportData.company.logo,
        });
      }
    } catch (error) {
      console.warn("Error saving step data:", error);
    }
  }

  // Callback for document generation (to be set externally)
  setDocumentGenerationCallback(callback) {
    this.onGenerateDocument = callback;
  }
}

// Export class
window.NavigationManager = NavigationManager;
