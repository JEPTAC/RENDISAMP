# Portal de Rendición de Cuentas de San Pedro

Versión técnica: `11.41.0-firebase-rebuild`

Portal multipágina para vigencias, noticias, recursos, participación ciudadana, proyectos y administración de contenido.

## Diseño preservado

La reconstrucción no modifica la capa gráfica principal. `styles.css`, `claude-design.css/js`, el mapa territorial, las animaciones y los adaptadores visuales conservan el mismo contenido recibido. Los cambios se concentran en Firebase, permisos, edición, sincronización, limpieza segura y recuperación funcional de Proyectos.

## Estructura activa

- `portal-core-v11409.js`: núcleo único del portal.
- `firebase-service.js`: única implementación Firebase.
- `firestore.rules`: reglas de acceso.
- `.firebaserc`, `.firebaseignore` y `firebase.json`: configuración de proyecto y despliegue.
- `admin-popup.js`: editor contextual.
- `territory-experience.js`: experiencia territorial y mapa.
- `proyectos.html`, `projects-psp.css`, `projects-psp.js`: módulo de proyectos.
- `FIREBASE_SETUP.md`: activación del primer administrador y despliegue.
- `AUDITORIA_TECNICA_FIREBASE.md`: diagnóstico y cambios.
- `QA_FIREBASE_REBUILD.json`: resultados de validación.

## Ejecución local

```bash
python -m http.server 8080
```

Abra `http://localhost:8080/index.html`. No abra los HTML con doble clic, porque los módulos y servicios web requieren un servidor HTTP.

## Despliegue manual

```bash
npm install -g firebase-tools
firebase login
firebase use rendicion-de-cuentas-6aceb
firebase deploy --only firestore:rules,hosting
```

El despliegue automático desde GitHub está configurado en `.github/workflows/firebase-deploy.yml`.
