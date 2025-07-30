// formManager.js - Módulo para gestión de formularios y datos

class FormManager {
  constructor(database, fileHandler) {
    this.database = database;
    this.fileHandler = fileHandler;
    this.reportData = {
      company: {},
      recipient: {},
      stages: [],
      recommendations: "",
      introduction: "Por medio del presente documento, se presenta el informe técnico correspondiente a las actividades realizadas:",
    };

    this.stagesContainer = document.getElementById("stages-container");
    this.stageTemplate = document.getElementById("stage-template");

    this.initializeFormBindings();
    this.initializeStageManagement();
  }

  // toTitleCase method disabled to allow free text input without formatting restrictions
  // This allows users to write "S.A.S", abbreviations, and custom capitalization exactly as they want
  /*
  toTitleCase(str) {
    if (!str || typeof str !== "string") return str;

    return str
      .toLowerCase()
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ")
      .trim();
  }
  */

  // Initialize form data bindings - Updated to allow free text input without restrictions
  initializeFormBindings() {
    document
      .getElementById("report-form")
      .addEventListener("input", async (e) => {
        const { id, value, classList } = e.target;

        // CRITICAL: Preserve logo before any form updates
        const currentLogo = this.reportData.company?.logo;

        // Store the value in reportData exactly as the user types it (no formatting restrictions)
        // Skip companyLogo as it's handled specially by fileHandler
        if (
          (id.startsWith("company") || id.startsWith("author")) &&
          id !== "companyLogo"
        ) {
          this.reportData.company[id] = value;

          // CRITICAL: Restore logo if it was accidentally lost during form update
          if (currentLogo && !this.reportData.company.logo) {
            console.log("🔧 Restoring logo after form input event for:", id);
            this.reportData.company.logo = currentLogo;
          }
        } else if (
          id.startsWith("recipient") ||
          id.startsWith("reportSubject")
        ) {
          this.reportData.recipient[id] = value;
        } else if (id === "recommendations") {
          this.reportData.recommendations = value;
        } else if (id === "introduction") {
          this.reportData.introduction = value;
        } else if (
          classList.contains("stage-title") ||
          classList.contains("stage-description")
        ) {
          const stageId = e.target.closest(".stage-item").dataset.id;
          const stageData = this.reportData.stages.find(
            (s) => s.id === stageId
          );
          if (stageData) {
            if (classList.contains("stage-title")) stageData.title = value;
            else stageData.description = value;
          }
        }

        // Note: Data is saved exactly as user enters it - no automatic formatting applied
        // This allows free writing of text like "S.A.S", abbreviations, and custom capitalization
      });
  }

  // Initialize stage management
  initializeStageManagement() {
    document.getElementById("add-stage-btn").addEventListener("click", () => {
      this.addStage();
    });
  }

  // Add new stage
  addStage() {
    const stageClone = this.stageTemplate.content.cloneNode(true);
    const stageId = `stage-${Date.now()}`;
    const newStageElement = stageClone.querySelector(".stage-item");
    newStageElement.dataset.id = stageId;
    this.stagesContainer.appendChild(stageClone);

    const newStageData = {
      id: stageId,
      title: "",
      description: "",
      photos: [],
    };
    this.reportData.stages.push(newStageData);

    // Add event listeners
    newStageElement
      .querySelector(".remove-stage-btn")
      .addEventListener("click", () => {
        this.removeStage(stageId, newStageElement);
      });

    const fileInput = newStageElement.querySelector(".photo-upload-input");
    const fileLabel = newStageElement.querySelector(".photo-upload-label");
    fileLabel.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      this.handleStagePhotoUpload(e, stageId);
    });

    return { stageId, newStageElement };
  }

  // Remove stage
  removeStage(stageId, element) {
    this.reportData.stages = this.reportData.stages.filter(
      (stage) => stage.id !== stageId
    );
    element.remove();

    // Auto-save after removal
    if (this.database) {
      this.database.saveCurrentData(this.reportData);
    }
  }

  // Handle stage photo upload
  handleStagePhotoUpload(event, stageId) {
    if (this.fileHandler) {
      this.fileHandler.handleStagePhotoUpload(
        event,
        stageId,
        this.reportData,
        () => this.database?.saveCurrentData(this.reportData)
      );
    }
  }

  // Populate form from loaded data
  populateFormFromData(savedData) {
    if (!savedData) return;

    console.log("🔄 Populating form from saved data:", savedData);
    console.log("🖼️ Logo in saved data:", {
      hasLogo: !!savedData.company?.logo,
      logoType: typeof savedData.company?.logo,
      logoData: savedData.company?.logo,
    });

    this.reportData = savedData;

    // Populate company fields
    if (savedData.company.companyName)
      document.getElementById("companyName").value =
        savedData.company.companyName;
    if (savedData.company.companyNit)
      document.getElementById("companyNit").value =
        savedData.company.companyNit;
    if (savedData.company.companyContact)
      document.getElementById("companyContact").value =
        savedData.company.companyContact;
    if (savedData.company.companyCity)
      document.getElementById("companyCity").value =
        savedData.company.companyCity;
    if (savedData.company.authorName)
      document.getElementById("authorName").value =
        savedData.company.authorName;
    if (savedData.company.authorRole)
      document.getElementById("authorRole").value =
        savedData.company.authorRole;
    if (savedData.company.authorDepartment)
      document.getElementById("authorDepartment").value =
        savedData.company.authorDepartment;

    // Populate recipient fields
    if (savedData.recipient.recipientName)
      document.getElementById("recipientName").value =
        savedData.recipient.recipientName;
    if (savedData.recipient.recipientRole)
      document.getElementById("recipientRole").value =
        savedData.recipient.recipientRole;
    if (savedData.recipient.reportSubject)
      document.getElementById("reportSubject").value =
        savedData.recipient.reportSubject;

    // Populate introduction
    if (savedData.introduction)
      document.getElementById("introduction").value =
        savedData.introduction;

    // Populate recommendations
    if (savedData.recommendations)
      document.getElementById("recommendations").value =
        savedData.recommendations;

    // Populate logo
    console.log(
      "🖼️ Attempting to restore logo preview:",
      !!savedData.company.logo
    );
    if (this.fileHandler && savedData.company.logo) {
      console.log(
        "✅ Calling restoreLogoPreview with:",
        savedData.company.logo
      );
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        this.fileHandler.restoreLogoPreview(savedData.company.logo);
      }, 100);
    } else {
      console.log(
        "❌ Cannot restore logo - fileHandler:",
        !!this.fileHandler,
        "logo:",
        !!savedData.company.logo
      );
      // Initialize logo handler even if no saved logo
      if (this.fileHandler) {
        setTimeout(() => {
          this.initializeLogoHandler();
        }, 100);
      }
    }

    // Populate stages
    this.populateStages(savedData.stages);
  }

  // Populate stages from saved data
  populateStages(stagesData) {
    this.stagesContainer.innerHTML = "";
    this.reportData.stages = [];

    if (stagesData && stagesData.length > 0) {
      stagesData.forEach((stageData) => {
        const { stageId, newStageElement } = this.addStageFromData(stageData);

        // Set title and description
        newStageElement.querySelector(".stage-title").value = stageData.title;
        newStageElement.querySelector(".stage-description").value =
          stageData.description;

        // Restore photos
        if (this.fileHandler && stageData.photos) {
          this.fileHandler.restoreStagePhotos(newStageElement, stageData, () =>
            this.database?.saveCurrentData(this.reportData)
          );
        }
      });
    } else {
      this.addStage(); // Add default stage if none exist
    }
  }

  // Add stage from existing data
  addStageFromData(stageData) {
    const stageClone = this.stageTemplate.content.cloneNode(true);
    const newStageElement = stageClone.querySelector(".stage-item");
    newStageElement.dataset.id = stageData.id;

    this.stagesContainer.appendChild(stageClone);
    this.reportData.stages.push(stageData);

    // Add event listeners
    newStageElement
      .querySelector(".remove-stage-btn")
      .addEventListener("click", () => {
        this.removeStage(stageData.id, newStageElement);
      });

    const fileInput = newStageElement.querySelector(".photo-upload-input");
    const fileLabel = newStageElement.querySelector(".photo-upload-label");
    fileLabel.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      this.handleStagePhotoUpload(e, stageData.id);
    });

    return { stageId: stageData.id, newStageElement };
  }

  // Clear all form fields
  clearFormFields() {
    // Clear company fields
    document.getElementById("companyName").value = "";
    document.getElementById("companyNit").value = "";
    document.getElementById("companyContact").value = "";
    document.getElementById("companyCity").value = "";
    document.getElementById("authorName").value = "";
    document.getElementById("authorRole").value = "";
    document.getElementById("authorDepartment").value = "";
    document.getElementById("companyLogo").value = "";

    // Clear recipient fields
    document.getElementById("recipientName").value = "";
    document.getElementById("recipientRole").value = "";
    document.getElementById("reportSubject").value = "";

    // Clear introduction and recommendations
    document.getElementById("introduction").value = "";
    document.getElementById("recommendations").value = "";

    // Clear stages
    this.stagesContainer.innerHTML = "";
    this.reportData.stages = [];
    this.addStage(); // Add one default stage

    // Reset logo preview
    if (this.fileHandler) {
      const logoPreviewWrapper = document.getElementById(
        "logo-preview-wrapper"
      );
      const logoInput = document.getElementById("companyLogo");
      this.fileHandler.createFileDropZone(logoPreviewWrapper, logoInput);
    }
  }

  // Reset data object
  resetData() {
    this.reportData = {
      company: {},
      recipient: {},
      stages: [],
      recommendations: "",
      introduction: "Por medio del presente documento, se presenta el informe técnico correspondiente a las actividades realizadas:",
    };
  }

  // Initialize logo handler
  initializeLogoHandler() {
    if (this.fileHandler) {
      // Capture the database reference to ensure proper context
      const database = this.database;
      const reportData = this.reportData;
      return this.fileHandler.initializeLogoHandler(reportData, async () => {
        if (database && database.saveCurrentData) {
          try {
            await database.saveCurrentData(reportData);
          } catch (error) {
            console.warn("Error saving data in logo handler:", error);
          }
        }
      });
    }
    return null;
  }

  // Get current report data
  getReportData() {
    return this.reportData;
  }

  // Set report data
  setReportData(data) {
    this.reportData = data;
  }

  // Update specific field
  updateField(section, field, value) {
    if (this.reportData[section]) {
      this.reportData[section][field] = value;
    }
  }

  // Get form validation status
  isFormValid() {
    const hasCompanyName =
      this.reportData.company.companyName &&
      this.reportData.company.companyName.trim();
    const hasRecipientName =
      this.reportData.recipient.recipientName &&
      this.reportData.recipient.recipientName.trim();
    const hasSubject =
      this.reportData.recipient.reportSubject &&
      this.reportData.recipient.reportSubject.trim();
    const hasStages = this.reportData.stages.length > 0;

    return hasCompanyName && hasRecipientName && hasSubject && hasStages;
  }

  // Get validation errors
  getValidationErrors() {
    const errors = [];

    if (
      !this.reportData.company.companyName ||
      !this.reportData.company.companyName.trim()
    ) {
      errors.push("El nombre de la empresa es requerido");
    }

    if (
      !this.reportData.recipient.recipientName ||
      !this.reportData.recipient.recipientName.trim()
    ) {
      errors.push("El nombre del destinatario es requerido");
    }

    if (
      !this.reportData.recipient.reportSubject ||
      !this.reportData.recipient.reportSubject.trim()
    ) {
      errors.push("El asunto del informe es requerido");
    }

    if (this.reportData.stages.length === 0) {
      errors.push("Debe agregar al menos una etapa");
    }

    return errors;
  }

  // Ensure form is populated with current data (for navigation back from review)
  ensureFormPopulated() {
    this.populateFormFromData(this.reportData);
  }

  // Initialize options dropdowns
  async initializeOptionsDropdowns() {
    try {
      if (this.database) {
        await this.createCompanyOptionsDropdown();
        await this.createRecipientOptionsDropdown();
      }
    } catch (error) {
      console.warn("Error initializing dropdowns:", error);
    }
  }

  // Create company options dropdown
  async createCompanyOptionsDropdown() {
    try {
      const companyOptions = await this.database.getCompanyOptions();
      if (companyOptions.length > 0) {
        this.addDropdownToField("companyName", companyOptions, "companyName");
        this.addDropdownToField("companyNit", companyOptions, "companyNit");
        this.addDropdownToField("companyCity", companyOptions, "companyCity");
        this.addDropdownToField("authorName", companyOptions, "authorName");
        this.addDropdownToField("authorRole", companyOptions, "authorRole");
        this.addDropdownToField(
          "authorDepartment",
          companyOptions,
          "authorDepartment"
        );
      }
    } catch (error) {
      console.warn("Error creating company options:", error);
    }
  }

  // Create recipient options dropdown
  async createRecipientOptionsDropdown() {
    try {
      const recipientOptions = await this.database.getRecipientOptions();
      if (recipientOptions.length > 0) {
        this.addDropdownToField(
          "recipientName",
          recipientOptions,
          "recipientName"
        );
        this.addDropdownToField(
          "recipientRole",
          recipientOptions,
          "recipientRole"
        );
        this.addDropdownToField(
          "reportSubject",
          recipientOptions,
          "reportSubject"
        );
      }
    } catch (error) {
      console.warn("Error creating recipient options:", error);
    }
  }

  // Add dropdown to a specific field
  addDropdownToField(fieldId, options, valueKey) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Get unique values
    const uniqueValues = [
      ...new Set(options.map((option) => option[valueKey]).filter(Boolean)),
    ];
    if (uniqueValues.length === 0) return;

    // Store values for filtering
    field.setAttribute("data-dropdown-values", JSON.stringify(uniqueValues));

    // Remove native datalist and its tooltips (we use custom dropdowns)
    const existingDatalist = document.getElementById(`${fieldId}-options`);
    if (existingDatalist) {
      existingDatalist.remove();
    }
    field.removeAttribute("list");

    // Disable browser autocomplete to prevent native tooltips
    field.setAttribute("autocomplete", "off");

    // Add dropdown functionality if not already initialized
    if (!field.hasAttribute("data-dropdown-initialized")) {
      field.setAttribute("data-dropdown-initialized", "true");

      // Create dropdown button
      const dropdownBtn = document.createElement("button");
      dropdownBtn.type = "button";
      dropdownBtn.className =
        "btn btn-outline-secondary btn-sm dropdown-toggle-field";
      dropdownBtn.innerHTML =
        '<ion-icon name="chevron-down-outline"></ion-icon>';
      dropdownBtn.style.cssText =
        "position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: none; background: none; padding: 4px 6px; z-index: 10; display: flex; align-items: center; justify-content: center; height: 24px; width: 24px;";

      // Position field container relatively
      field.style.paddingRight = "35px";
      field.parentNode.style.position = "relative";
      field.parentNode.appendChild(dropdownBtn);

      // Show dropdown on field focus/click
      field.addEventListener("focus", () => {
        this.showFieldDropdown(field, uniqueValues, fieldId);
      });

      field.addEventListener("click", () => {
        this.showFieldDropdown(field, uniqueValues, fieldId);
      });

      // Filter dropdown on input
      field.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const allValues = JSON.parse(
          field.getAttribute("data-dropdown-values") || "[]"
        );

        if (query === "") {
          // Show all options when field is empty
          this.showFieldDropdown(field, allValues, fieldId, false);
        } else {
          // Filter options based on query
          const filteredValues = allValues.filter((value) =>
            value.toLowerCase().includes(query)
          );

          if (filteredValues.length > 0) {
            this.showFieldDropdown(field, filteredValues, fieldId, true);
          } else {
            // Show "no results" message
            this.showFieldDropdown(field, [], fieldId, true);
          }
        }
      });

      // Dropdown button functionality
      dropdownBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const existingDropdown = document.querySelector(".field-dropdown-menu");
        if (existingDropdown) {
          existingDropdown.remove();
        } else {
          field.focus();
          this.showFieldDropdown(field, uniqueValues, fieldId);
        }
      });

      // Hide dropdown on blur (with delay to allow clicking on dropdown items)
      field.addEventListener("blur", () => {
        setTimeout(() => {
          const dropdown = document.querySelector(".field-dropdown-menu");
          if (dropdown && !dropdown.matches(":hover")) {
            dropdown.remove();
          }
        }, 200);
      });
    }
  }

  // Show dropdown menu for field
  showFieldDropdown(field, values, fieldId, isFiltering = false) {
    // Remove existing dropdown
    const existingDropdown = document.querySelector(".field-dropdown-menu");
    if (existingDropdown) {
      existingDropdown.remove();
    }

    // Don't show dropdown if no values and not filtering
    if ((!values || values.length === 0) && !isFiltering) return;

    // Create dropdown menu
    const dropdown = document.createElement("div");
    dropdown.className = "field-dropdown-menu";
    dropdown.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      margin-top: 2px;
    `;

    // Add "No results" message if filtering and no results
    if (isFiltering && values.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "dropdown-item text-muted";
      noResults.style.cssText = `
        padding: 8px 12px;
        font-size: 14px;
        font-style: italic;
      `;
      noResults.textContent = "No se encontraron resultados";
      dropdown.appendChild(noResults);
    } else {
      values.forEach((value, index) => {
        const item = document.createElement("div");
        item.className = "dropdown-item";
        item.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: ${
            index < values.length - 1 ? "1px solid #f1f5f9" : "none"
          };
          font-size: 14px;
          transition: background-color 0.15s ease;
        `;
        item.textContent = value;

        // Highlight search term if filtering
        if (isFiltering && field.value.trim()) {
          const query = field.value.toLowerCase();
          const valueText = value.toLowerCase();
          const index = valueText.indexOf(query);

          if (index !== -1) {
            const beforeMatch = value.substring(0, index);
            const match = value.substring(index, index + query.length);
            const afterMatch = value.substring(index + query.length);

            item.innerHTML = `${beforeMatch}<mark style="background-color: #fef3c7; padding: 0;">${match}</mark>${afterMatch}`;
          }
        }

        item.addEventListener("mouseenter", () => {
          item.style.backgroundColor = "#f8fafc";
        });

        item.addEventListener("mouseleave", () => {
          item.style.backgroundColor = "white";
        });

        item.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent field blur
        });

        item.addEventListener("click", () => {
          // Use value exactly as stored - no formatting restrictions
          field.value = value;
          field.dispatchEvent(new Event("input", { bubbles: true }));
          dropdown.remove();

          // Auto-fill related fields if this is a complete company/recipient selection
          this.autoFillRelatedFields(fieldId, value);

          // Focus back to field for better UX
          field.focus();
        });

        dropdown.appendChild(item);
      });
    }

    field.parentNode.appendChild(dropdown);

    // Close dropdown when clicking outside
    if (!isFiltering) {
      setTimeout(() => {
        document.addEventListener("click", function closeDropdown(e) {
          if (
            !dropdown.contains(e.target) &&
            e.target !== field &&
            !e.target.closest(".dropdown-toggle-field")
          ) {
            dropdown.remove();
            document.removeEventListener("click", closeDropdown);
          }
        });
      }, 0);
    }
  }

  // Hide field dropdown
  hideFieldDropdown() {
    const existingDropdown = document.querySelector(".field-dropdown-menu");
    if (existingDropdown) {
      existingDropdown.remove();
    }
  }

  // Auto-fill related fields when selecting from options
  async autoFillRelatedFields(fieldId, selectedValue) {
    try {
      if (fieldId.startsWith("company") || fieldId.startsWith("author")) {
        console.log(
          "🔄 Auto-filling company fields for:",
          fieldId,
          selectedValue
        );

        // CRITICAL: Preserve current logo before auto-fill
        const currentLogo = this.reportData.company.logo;
        console.log("🛡️ Preserving logo before auto-fill:", currentLogo);

        const companyOptions = await this.database.getCompanyOptions();
        const matchingCompany = companyOptions.find(
          (option) => option[fieldId] === selectedValue
        );

        if (matchingCompany) {
          console.log("✅ Found matching company option:", matchingCompany);

          // Fill company fields
          const companyFields = [
            "companyName",
            "companyNit",
            "companyContact",
            "companyCity",
            "authorName",
            "authorRole",
            "authorDepartment",
          ];
          companyFields.forEach((field) => {
            const element = document.getElementById(field);
            if (element && matchingCompany[field] && !element.value) {
              console.log(`🔧 Setting ${field} to:`, matchingCompany[field]);
              // Use stored value exactly as it is - no formatting restrictions
              element.value = matchingCompany[field];
              element.dispatchEvent(new Event("input", { bubbles: true }));
            }
          });

          // CRITICAL: Restore current logo if it was lost during auto-fill
          if (currentLogo && !this.reportData.company.logo) {
            console.log("🔧 Restoring logo after auto-fill (logo was lost)");
            this.reportData.company.logo = currentLogo;
          }

          // Handle logo from saved options only if no current logo exists
          if (
            matchingCompany.logo &&
            !this.reportData.company.logo &&
            this.fileHandler
          ) {
            console.log("🖼️ Setting logo from saved company option");
            this.reportData.company.logo = matchingCompany.logo;
            this.fileHandler.restoreLogoPreview(matchingCompany.logo);
          } else if (currentLogo) {
            console.log("🛡️ Keeping current logo (not overriding)");
          }
        } else {
          console.log("❌ No matching company option found");
        }
      } else if (
        fieldId.startsWith("recipient") ||
        fieldId === "reportSubject"
      ) {
        const recipientOptions = await this.database.getRecipientOptions();
        const matchingRecipient = recipientOptions.find(
          (option) => option[fieldId] === selectedValue
        );

        if (matchingRecipient) {
          // Fill recipient fields
          const recipientFields = [
            "recipientName",
            "recipientRole",
            "reportSubject",
          ];
          recipientFields.forEach((field) => {
            const element = document.getElementById(field);
            if (element && matchingRecipient[field] && !element.value) {
              // Use stored value exactly as it is - no formatting restrictions
              element.value = matchingRecipient[field];
              element.dispatchEvent(new Event("input", { bubbles: true }));
            }
          });
        }
      }
    } catch (error) {
      console.warn("Error auto-filling fields:", error);
    }
  }
}

// Export class
window.FormManager = FormManager;
