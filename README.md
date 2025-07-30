# 📋 Sistema de Generación de Informes Técnicos - Willis

Sistema web para la generación automatizada de informes técnicos con autenticación y control de acceso.

## 🔐 Credenciales de Acceso

### Usuarios del Sistema

| Usuario         | Contraseña  | Rol           | Permisos        |
| --------------- | ----------- | ------------- | --------------- |
| `willy_admin`   | `admin2024` | Administrador | Acceso completo |
| `inspectorasst` | `emp123`    | Empleado      | Crear informes  |
| `tecnicolider`  | `tech123`   | Empleado      | Crear informes  |

## 🚀 Características Principales

- **Generación de Informes:** Creación paso a paso de informes técnicos
- **Exportación:** Documentos en formato PDF y DOCX
- **Gestión de Datos:** Almacenamiento local persistente
- **Autenticación:** Sistema de usuarios con roles diferenciados
- **Responsive Design:** Compatible con dispositivos móviles y desktop

## 📁 Estructura del Proyecto

```
willis/
├── index.html              # Página principal de la aplicación
├── styles.css              # Estilos CSS personalizados
├── manifest.json           # Configuración PWA
├── README.md               # Este archivo
├── TODO.md                 # Lista de tareas pendientes
└── js/
    ├── app.js              # Clase principal y inicialización
    ├── database.js         # Gestión de base de datos local (Dexie)
    ├── formManager.js      # Manejo de formularios y validación
    ├── navigation.js       # Navegación entre pasos
    ├── documentGenerator.js # Generación de PDF/DOCX
    └── fileHandler.js      # Manejo de archivos e imágenes
```

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Frameworks:** Bootstrap 5
- **Base de Datos:** Dexie.js (IndexedDB)
- **Generación PDF:** jsPDF
- **Generación DOCX:** docx.js
- **Iconos:** Ionicons
- **PWA:** Service Worker compatible

## 📋 Proceso de Generación de Informes

### Paso 1: Información de la Empresa

- Razón Social
- NIT o Identificación
- Datos de Contacto
- Ciudad
- Nombre del Autor
- Cargo del Autor
- Departamento
- Logo de la empresa

### Paso 2: Información del Destinatario

- Nombre del Responsable
- Cargo del Responsable
- Asunto del Informe

### Paso 3: Etapas del Informe

- Descripción de actividades
- Fotografías de evidencia
- Observaciones técnicas
- Recomendaciones finales

### Paso 4: Revisión y Exportación

- Vista previa del informe
- Selección de formato (PDF/DOCX)
- Descarga del documento

## 🔧 Configuración Técnica

### Almacenamiento Local

- **Base de datos:** Dexie (IndexedDB)
- **Tablas principales:**
  - `formData`: Datos actuales del formulario
  - `companyOptions`: Opciones guardadas de empresas
  - `recipientOptions`: Opciones guardadas de destinatarios

### Formato de Documentos

- **Encabezado:** Logo + información de contacto
- **Márgenes:** 1 pulgada en todos los lados
- **Fuente:** Arial/Helvetica para PDF, Calibri para DOCX
- **Imágenes:** Redimensionadas automáticamente

## 📱 Compatibilidad

- **Navegadores:** Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Dispositivos:** Desktop, tablet, móvil
- **Resoluciones:** Responsive desde 320px hasta 1920px+

## 🔐 Seguridad y Autenticación

### Implementación Actual

- **Almacenamiento:** localStorage para sesiones
- **Tokens:** JWT para autenticación
- **Validación:** Cliente-side con JavaScript

### Funciones de Seguridad

- Control de acceso por roles
- Seguimiento de sesiones
- Registro de actividades
- Validación de formularios

## 🚧 Funcionalidades en Desarrollo

Ver `TODO.md` para la lista completa de mejoras planificadas:

1. **Sistema de Autenticación:** Login con usuarios hardcoded
2. **Mejoras en PDF:** Formato de encabezado y logo
3. **Campos de Texto:** Escritura libre sin restricciones
4. **Estructura de Texto:** Preservación de formato y saltos de línea

## 🔄 Backup y Mantenimiento

### Respaldo de Datos

- **Ubicación:** `/backup` (creada automáticamente)
- **Frecuencia:** Antes de cada actualización mayor
- **Contenido:** Código fuente completo + datos de usuario

### Actualizaciones

1. Crear backup en `/backup`
2. Probar funcionalidad en entorno de desarrollo
3. Obtener aprobación antes de continuar
4. Implementar cambios paso a paso

## 📞 Soporte Técnico

### Administrador del Sistema

- **Usuario:** willy_admin
- **Nombre:** Willis Andres Rivera Perez
- **Rol:** Administrador Principal
- **Acceso:** Completo al sistema y gestión de usuarios

### Resolución de Problemas

#### Problemas Comunes

1. **Error de carga:** Verificar conexión a CDN externos
2. **Datos no guardan:** Limpiar localStorage del navegador
3. **PDF malformado:** Verificar imágenes y formato de texto
4. **DOCX corrupto:** Validar caracteres especiales en texto

#### Logs del Sistema

- Consola del navegador (F12)
- Almacenamiento local (DevTools > Application > Local Storage)
- Datos de Dexie (DevTools > Application > IndexedDB)

## 📄 Licencia y Uso

Sistema propietario para uso interno de la empresa. Prohibida la distribución o modificación sin autorización expresa del administrador.

---

**Última actualización:** 2024
**Versión:** 2.0.0
**Desarrollado para:** Willis Andres Rivera Perez
