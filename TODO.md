# TODO List - Sistema de Documentos Willis

## 🔐 1. Sistema de Autenticación y Control de Acceso

- [ ] **Implementar sistema de usuarios con login y autenticación**

  - Crear formulario de login en JavaScript
  - Implementar validación de credenciales
  - Gestión de sesiones con JWT y localStorage

- [ ] **Crear dos usuarios quemados en el código de la aplicación**

  - **Usuario 1:** WILLIS ANDRES RIVERA PEREZ (Administrador)
  - **Usuario 2:** Usuario secundario (empleado)
  - Hardcodear credenciales directamente en el código JavaScript

## 📄 2. Generación de PDF y Formato del Documento

- [ ] **Corregir generación de PDF para mantener formato del encabezado**

  - Preservar la estructura original del encabezado
  - Evitar que se dañe el formato al generar PDF

- [ ] **Implementar logo en el encabezado**
  - Colocar logo en la parte izquierda del encabezado
  - añadir linea debajo del ancabezado
  - Reducir 2px el tamaño de letra en el encabezado

## 📝 3. Campos de Información de la Empresa

- [ ] **Permitir texto libre en campos de información**

  - Todos los campos de texto deben permitir la escritura libre de caracteres sin restricción (ej: "S.A.S" con puntos y mayúsculas, añadir saltos de linea en text areas signos de escritura básica en campos de texto)
  - Eliminar restricciones de mayúsculas/minúsculas automáticas, la información se debe guardar como el usuario la escribió.
  - Permitir formato libre, no debe haber impedimento para guardar o presentar ninguna información.

- [ ] **Preservar estructura de texto organizado por el usuario**

  - Reconocer enters y saltos de línea
  - Reconocer espacios y tabulaciones
  - Preservar viñetas y listas numeradas
  - Mantener formato de listas y viñetas en el documento final
  - Respetar separaciones y organización visual creada por el usuario
  - Asegurar que la estructura se refleje correctamente en el PDF

- [ ] **Corregir formato en campos de contacto y ubicación**
  - Evitar que se peguen las palabras a "Contacto" y "Ubicación" en el PDF
  - Añadir espacio después de "Contacto:" y "Ubicación:"

---

## 📋 Notas Importantes

- **Backup:** Realizar respaldo del sistema actual durante la migración en la carpeta /backup.
- **Enfoque en UX:** Mantener la facilidad de uso mientras se agregan controles de seguridad
- **Testing:** Probar cada funcionalidad antes de marcar como completada y esperar la aprobación para continuar con la siguiente funcionalidad
- **Usuarios Hardcoded:** Los usuarios deben estar directamente en el código JavaScript, no en base de datos externa
