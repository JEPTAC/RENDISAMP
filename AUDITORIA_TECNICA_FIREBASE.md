# Auditoría técnica y reconstrucción de Firebase

**Proyecto:** Rendición de Cuentas de San Pedro  
**Firebase Project ID:** `rendicion-de-cuentas-6aceb`  
**Número de proyecto:** `509564686428`  
**Versión técnica:** `11.41.0-firebase-rebuild`  
**Fecha:** 18 de julio de 2026

## Criterio principal

La interfaz actual se conservó. No se rediseñaron ni sustituyeron los estilos, el hero, el mapa, las animaciones, las tarjetas, los banners ni la composición editorial. Los archivos visuales principales fueron comparados por SHA-256 contra el ZIP recibido y permanecen idénticos:

- `styles.css`
- `claude-design.css`
- `claude-design.js`
- `territory-experience.js`
- `motion-studio.js`
- `stack-motion.js`

Los cambios se limitaron a Firebase, permisos, activación del editor, sincronización, limpieza técnica y recuperación del módulo de proyectos.

## Causas encontradas

1. `firebase.json` intentaba desplegar `firestore.rules`, pero el archivo no existía.
2. No existían `.firebaserc` ni una configuración completa de Firebase Hosting.
3. Había varias copias antiguas del mismo servicio Firebase y del núcleo del portal, lo que hacía ambiguo cuál archivo era realmente el activo.
4. El acceso de edición dependía de encontrar el rol en Firestore, pero no existía un flujo sólido para documentos canónicos `users/{UID}` ni para migrar perfiles antiguos identificados por correo.
5. Existía una contraseña administrativa escrita directamente en el JavaScript. Ese acceso era local, inseguro y no otorgaba permisos reales de Firestore.
6. Una bandera antigua de `sessionStorage` podía dejar un estado administrativo obsoleto sin que Firebase lo hubiera validado.
7. Los cambios de autenticación no se propagaban de manera uniforme al mapa territorial y a todos los editores contextuales.
8. `proyectos.html` no contenía el módulo que sus propios archivos `projects-psp.css/js` esperaban encontrar.
9. El indicador inicial de carga dependía exclusivamente del evento global `load`; un recurso externo lento podía mantener el portal cubierto demasiado tiempo.

## Reconstrucción aplicada

### Firebase

- Se consolidó toda la integración en `firebase-service.js`.
- Se actualizó el SDK web modular a `12.16.0` mediante el CDN oficial.
- Se agregó inicialización idempotente de Firebase App, Authentication y Firestore.
- Se agregó persistencia local oficial de Authentication.
- Se agregó detección automática de long polling para redes o proxies que interrumpen WebChannel.
- Se agregó recuperación después de un fallo de inicialización y diagnóstico con `FirebasePortal.diagnose()`.
- Se normalizaron los roles `super_admin`, `admin`, `editor` y `guest`.
- Se implementó lectura canónica por `users/{UID}` y migración controlada desde perfiles antiguos `users/{correo}`.
- Las cuentas nuevas se crean únicamente como `guest`.
- La edición solo se activa cuando Firebase devuelve un usuario con rol activo autorizado.

### Reglas y despliegue

Se añadieron:

- `firestore.rules`
- `.firebaserc`
- `.firebaseignore`
- configuración completa de Firestore y Hosting en `firebase.json`
- workflow `.github/workflows/firebase-deploy.yml`

Las reglas permiten lectura pública del contenido publicado, creación validada de ideas ciudadanas, escritura editorial solo para roles autorizados y gestión de usuarios solo para `super_admin`.

### Editor

- Se eliminó el acceso local con contraseña incrustada.
- Se eliminó la concesión de permisos mediante `sessionStorage`.
- Se sincroniza el estado administrativo con el encabezado, el editor contextual y el mapa territorial.
- El editor aparece al recibir `firebase:auth` con `canWrite: true` y desaparece inmediatamente al cerrar sesión o perder permisos.

### Proyectos

- Se reconstruyó la estructura HTML faltante de `proyectos.html` utilizando los archivos visuales existentes.
- Se corrigió `projects-psp.js` para ejecutarse en `data-page="projects"`.
- Se conservaron sus carpetas, transiciones, panel de detalle y administrador.

### Limpieza

Se eliminaron copias antiguas o huérfanas del núcleo, Firebase, archivos de versión, service worker experimental, scripts sin referencias y recursos asociados exclusivamente a esos scripts. También se consolidaron seis GIF duplicados byte por byte sin cambiar su presentación: las mismas imágenes canónicas continúan utilizándose en las capas visuales correspondientes.

El paquete pasó de 116 archivos originales a 55 archivos funcionales antes de generar los informes finales, sin eliminar recursos activos.

## Validaciones realizadas

- Sintaxis correcta en todos los JavaScript activos mediante `node --check`.
- JSON válido en configuración, manifiesto y QA.
- Sin referencias locales rotas en HTML o CSS.
- Sin identificadores HTML duplicados.
- Sin imágenes estáticas carentes de atributo `alt`.
- Sin archivos vacíos.
- Sin archivos actuales idénticos byte por byte.
- Sin contraseña administrativa antigua ni referencias al service worker eliminado.
- Prueba Chromium en 1440 × 900: Inicio renderiza encabezado, pie, siete secciones y territorio; sin overflow horizontal.
- Prueba Chromium en 390 × 844: Proyectos renderiza cinco carpetas; sin overflow horizontal.
- Sin errores de consola, errores de página ni solicitudes locales fallidas durante las pruebas.
- Simulación de sesión:
  - indicador administrativo obsoleto: rechazado y eliminado;
  - visitante: 0 controles de edición;
  - superadministrador validado: 26 controles de edición y control del mapa visible;
  - cierre de sesión: 0 controles de edición.

El detalle automatizado está en `QA_FIREBASE_REBUILD.json`.

## Acción indispensable en Firebase Console

El código no puede otorgarse a sí mismo el primer rol administrativo. Después de publicar las reglas, el documento del administrador principal debe existir en:

`users/{UID_REAL_DE_AUTHENTICATION}`

con `role: "super_admin"` y `active: true`. Las instrucciones exactas están en `FIREBASE_SETUP.md`.

## Límite de la validación

No se realizó un despliegue sobre el proyecto real ni se inició sesión con credenciales del propietario, porque esas operaciones requieren autorización de la cuenta Firebase. El paquete quedó preparado para desplegarse con Firebase CLI o automáticamente desde GitHub Actions.
