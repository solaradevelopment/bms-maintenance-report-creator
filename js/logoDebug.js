// logoDebug.js - Herramienta de diagnóstico para problemas de logo

class LogoDebugger {
  static diagnose() {
    console.log('🔍 === DIAGNÓSTICO DE LOGO ===');
    
    // 1. Verificar elementos DOM
    const logoInput = document.getElementById('companyLogo');
    const logoPreviewWrapper = document.getElementById('logo-preview-wrapper');
    
    console.log('📋 Elementos DOM:', {
      logoInput: !!logoInput,
      logoPreviewWrapper: !!logoPreviewWrapper,
      logoInputType: logoInput?.type,
      logoInputAccept: logoInput?.accept
    });
    
    // 2. Verificar datos guardados
    const reportData = window.app?.formManager?.getReportData();
    console.log('💾 Datos del reporte:', {
      hasReportData: !!reportData,
      hasCompany: !!reportData?.company,
      hasLogo: !!reportData?.company?.logo,
      logoType: typeof reportData?.company?.logo,
      logoKeys: reportData?.company?.logo ? Object.keys(reportData.company.logo) : 'none'
    });
    
    // 3. Verificar instancias de clases
    console.log('🏗️ Instancias de clases:', {
      hasApp: !!window.app,
      hasFormManager: !!window.app?.formManager,
      hasFileHandler: !!window.app?.fileHandler,
      hasDatabase: !!window.app?.database
    });
    
    // 4. Verificar event listeners
    if (logoInput) {
      const hasChangeHandler = !!logoInput._logoChangeHandler;
      console.log('🎯 Event listeners:', {
        hasChangeHandler,
        eventListeners: logoInput.getEventListeners ? logoInput.getEventListeners() : 'No disponible'
      });
    }
    
    // 5. Verificar contenido del preview wrapper
    if (logoPreviewWrapper) {
      console.log('🖼️ Preview wrapper:', {
        innerHTML: logoPreviewWrapper.innerHTML,
        hasChildren: logoPreviewWrapper.children.length > 0,
        childrenCount: logoPreviewWrapper.children.length
      });
    }
    
    console.log('🔍 === FIN DIAGNÓSTICO ===');
  }
  
  static async testLogoUpload() {
    console.log('🧪 === PRUEBA DE CARGA DE LOGO ===');
    
    const logoInput = document.getElementById('companyLogo');
    if (!logoInput) {
      console.error('❌ No se encontró el input del logo');
      return;
    }
    
    // Simular click en el input
    console.log('🖱️ Simulando click en input de logo...');
    logoInput.click();
    
    console.log('📝 Instrucciones: Selecciona una imagen para probar la carga del logo');
  }
  
  static forceReinitialize() {
    console.log('🔄 === REINICIALIZACIÓN FORZADA ===');
    
    if (window.app?.formManager) {
      console.log('🔧 Reinicializando logo handler...');
      window.app.formManager.initializeLogoHandler();
      console.log('✅ Logo handler reinicializado');
    } else {
      console.error('❌ No se puede reinicializar - FormManager no disponible');
    }
  }
  
  static clearLogo() {
    console.log('🗑️ === LIMPIEZA DE LOGO ===');
    
    const reportData = window.app?.formManager?.getReportData();
    if (reportData?.company) {
      reportData.company.logo = null;
      console.log('✅ Logo eliminado de los datos');
      
      // Limpiar preview
      const logoPreviewWrapper = document.getElementById('logo-preview-wrapper');
      const logoInput = document.getElementById('companyLogo');
      
      if (logoPreviewWrapper && logoInput && window.app?.fileHandler) {
        window.app.fileHandler.createFileDropZone(logoPreviewWrapper, logoInput);
        logoInput.value = '';
        console.log('✅ Preview limpiado');
        
        // Reinicializar
        this.forceReinitialize();
      }
    }
  }
}

// Hacer disponible globalmente para debugging
window.LogoDebugger = LogoDebugger;

// Auto-ejecutar diagnóstico cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    console.log('🚀 Logo Debugger cargado. Usa LogoDebugger.diagnose() para diagnosticar problemas.');
    console.log('🛠️ Comandos disponibles:');
    console.log('  - LogoDebugger.diagnose() - Diagnóstico completo');
    console.log('  - LogoDebugger.testLogoUpload() - Probar carga de logo');
    console.log('  - LogoDebugger.forceReinitialize() - Reinicializar logo handler');
    console.log('  - LogoDebugger.clearLogo() - Limpiar logo actual');
  }, 2000);
});