// database.js - Módulo para manejo de base de datos con Dexie

class DatabaseManager {
  constructor() {
    this.db = new Dexie("ReportGeneratorDB");
    this.db.version(1).stores({
      formData: "++id, company, recipient, stages, recommendations, timestamp",
      companyOptions:
        "++id, companyName, companyNit, companyContact, companyCity, authorName, authorRole, authorDepartment, logo",
      recipientOptions: "++id, recipientName, recipientRole, reportSubject",
    });

    // Upgrade to version 2 with better duplicate handling
    this.db.version(2).stores({
      formData: "++id, company, recipient, stages, recommendations, timestamp",
      companyOptions:
        "++id, companyName, companyNit, companyContact, companyCity, authorName, authorRole, authorDepartment, logo, [companyName+companyNit+companyContact]",
      recipientOptions:
        "++id, recipientName, recipientRole, reportSubject, [recipientName+recipientRole+reportSubject]",
    });
  }

  // Guardar datos actuales del formulario
  async saveCurrentData(reportData) {
    try {
      // Validate context - ensure 'this' is properly bound
      if (!this || !this.db) {
        console.error(
          "❌ DatabaseManager context lost - 'this' is not properly bound"
        );
        throw new Error(
          "Database context lost. Method must be called with proper context."
        );
      }

      console.log("💾 Database saving data:", reportData);
      console.log("🖼️ Logo in database save:", {
        hasLogo: !!reportData.company?.logo,
        logoType: typeof reportData.company?.logo,
        logoSummary: reportData.company?.logo
          ? typeof reportData.company.logo === "string"
            ? `String (${reportData.company.logo.length} chars)`
            : `Object (width: ${reportData.company.logo.width}, height: ${
                reportData.company.logo.height
              }, hasSrc: ${!!reportData.company.logo.src})`
          : "null",
      });

      // Save current form data
      await this.db.formData.clear(); // Only keep one active session
      const dataToSave = {
        company: reportData.company,
        recipient: reportData.recipient,
        stages: reportData.stages,
        recommendations: reportData.recommendations,
        timestamp: new Date(),
      };
      console.log("💾 Actual data being saved to DB:", dataToSave);
      await this.db.formData.add(dataToSave);

      // Save company data as option if it has meaningful data
      if (
        reportData.company.companyName &&
        reportData.company.companyName.trim()
      ) {
        try {
          const existingCompany = await this.db.companyOptions
            .where("companyName")
            .equals(reportData.company.companyName)
            .and(
              (item) =>
                item.companyNit === reportData.company.companyNit &&
                item.companyContact === reportData.company.companyContact
            )
            .first();

          if (!existingCompany) {
            // Create a clean copy without undefined values
            const companyData = {
              companyName: reportData.company.companyName,
              companyNit: reportData.company.companyNit || "",
              companyContact: reportData.company.companyContact || "",
              companyCity: reportData.company.companyCity || "",
              authorName: reportData.company.authorName || "",
              authorRole: reportData.company.authorRole || "",
              authorDepartment: reportData.company.authorDepartment || "",
              logo: reportData.company.logo || null,
            };
            // Use put instead of add to handle potential duplicates
            await this.db.companyOptions.put(companyData);
          }
        } catch (companyError) {
          console.warn("Could not save company option:", companyError);
        }
      }

      // Save recipient data as option if it has meaningful data
      if (
        reportData.recipient.recipientName &&
        reportData.recipient.recipientName.trim()
      ) {
        try {
          const existingRecipient = await this.db.recipientOptions
            .where("recipientName")
            .equals(reportData.recipient.recipientName)
            .and(
              (item) =>
                item.recipientRole === reportData.recipient.recipientRole &&
                item.reportSubject === reportData.recipient.reportSubject
            )
            .first();

          if (!existingRecipient) {
            // Create a clean copy without undefined values
            const recipientData = {
              recipientName: reportData.recipient.recipientName,
              recipientRole: reportData.recipient.recipientRole || "",
              reportSubject: reportData.recipient.reportSubject || "",
            };
            // Use put instead of add to handle potential duplicates
            await this.db.recipientOptions.put(recipientData);
          }
        } catch (recipientError) {
          console.warn("Could not save recipient option:", recipientError);
        }
      }
    } catch (error) {
      console.error("Error saving data:", error);
      // Don't throw the error to prevent disrupting the app flow
      // Just log it for debugging purposes
    }
  }

  // Cargar datos guardados del formulario
  async loadSavedData() {
    try {
      const savedData = await this.db.formData
        .orderBy("timestamp")
        .reverse()
        .first();
      console.log("🔄 Raw data loaded from database:", savedData);
      if (savedData) {
        const returnData = {
          company: savedData.company || {},
          recipient: savedData.recipient || {},
          stages: savedData.stages || [],
          recommendations: savedData.recommendations || "",
        };
        console.log("🔄 Processed data to return:", returnData);
        console.log("🖼️ Logo in loaded data:", {
          hasLogo: !!returnData.company?.logo,
          logoType: typeof returnData.company?.logo,
          logoSummary: returnData.company?.logo
            ? typeof returnData.company.logo === "string"
              ? `String (${returnData.company.logo.length} chars)`
              : `Object (width: ${returnData.company.logo.width}, height: ${returnData.company.logo.height})`
            : "null",
        });
        return returnData;
      }
      console.log("🔄 No saved data found in database");
      return null;
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    }
  }

  // Limpiar datos actuales del formulario
  async clearCurrentData() {
    try {
      await this.db.formData.clear();
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  }

  // Obtener opciones de empresa guardadas
  async getCompanyOptions() {
    try {
      return await this.db.companyOptions.orderBy("companyName").toArray();
    } catch (error) {
      console.error("Error getting company options:", error);
      return [];
    }
  }

  // Obtener opciones de destinatario guardadas
  async getRecipientOptions() {
    try {
      return await this.db.recipientOptions.orderBy("recipientName").toArray();
    } catch (error) {
      console.error("Error getting recipient options:", error);
      return [];
    }
  }

  // Eliminar opción de empresa específica
  async deleteCompanyOption(id) {
    try {
      await this.db.companyOptions.delete(id);
    } catch (error) {
      console.error("Error deleting company option:", error);
      throw error;
    }
  }

  // Eliminar opción de destinatario específica
  async deleteRecipientOption(id) {
    try {
      await this.db.recipientOptions.delete(id);
    } catch (error) {
      console.error("Error deleting recipient option:", error);
      throw error;
    }
  }

  // Guardar opción de empresa específica
  async saveCompanyOption(companyData) {
    try {
      if (!companyData.companyName || !companyData.companyName.trim()) {
        return; // Don't save if no company name
      }

      // Check if similar entry already exists
      const existingCompany = await this.db.companyOptions
        .where("companyName")
        .equals(companyData.companyName)
        .and(
          (item) =>
            item.companyNit === (companyData.companyNit || "") &&
            item.companyContact === (companyData.companyContact || "")
        )
        .first();

      if (!existingCompany) {
        // Create a clean copy without undefined values
        const cleanCompanyData = {
          companyName: companyData.companyName,
          companyNit: companyData.companyNit || "",
          companyContact: companyData.companyContact || "",
          companyCity: companyData.companyCity || "",
          authorName: companyData.authorName || "",
          authorRole: companyData.authorRole || "",
          authorDepartment: companyData.authorDepartment || "",
          logo: companyData.logo || null,
        };
        await this.db.companyOptions.put(cleanCompanyData);
      }
    } catch (error) {
      console.warn("Error saving company option:", error);
    }
  }

  // Guardar opción de destinatario específica
  async saveRecipientOption(recipientData) {
    try {
      if (!recipientData.recipientName || !recipientData.recipientName.trim()) {
        return; // Don't save if no recipient name
      }

      // Check if similar entry already exists
      const existingRecipient = await this.db.recipientOptions
        .where("recipientName")
        .equals(recipientData.recipientName)
        .and(
          (item) =>
            item.recipientRole === (recipientData.recipientRole || "") &&
            item.reportSubject === (recipientData.reportSubject || "")
        )
        .first();

      if (!existingRecipient) {
        // Create a clean copy without undefined values
        const cleanRecipientData = {
          recipientName: recipientData.recipientName,
          recipientRole: recipientData.recipientRole || "",
          reportSubject: recipientData.reportSubject || "",
        };
        await this.db.recipientOptions.put(cleanRecipientData);
      }
    } catch (error) {
      console.warn("Error saving recipient option:", error);
    }
  }
}

// Exportar instancia única (singleton)
window.DatabaseManager = DatabaseManager;
