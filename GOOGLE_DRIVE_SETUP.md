# Activación de Google Drive API — Portal de Rendición de Cuentas V8

## Qué está implementado

El portal ya incluye:

- Google Identity Services;
- OAuth 2.0 para aplicaciones web;
- alcance `drive.file`;
- carga reanudable con porcentaje de avance;
- creación automática de carpeta principal;
- creación de subcarpetas;
- selección de carpeta mediante Google Picker;
- compatibilidad con unidades compartidas;
- permisos públicos para archivos publicados;
- apertura directa de la carpeta;
- almacenamiento de enlaces en Firestore;
- funcionamiento local si Drive todavía no está configurado.

## 1. Abrir el proyecto de Google Cloud

Use el proyecto asociado a Firebase:

```text
rendicion-de-cuentas-6aceb
Número del proyecto: 103022555921
```

## 2. Activar APIs

En Google Cloud Console → APIs y servicios → Biblioteca, active:

1. Google Drive API.
2. Google Picker API.

## 3. Configurar la pantalla de consentimiento OAuth

En Google Auth Platform:

1. Configure el nombre de la aplicación.
2. Agregue un correo de soporte.
3. Seleccione audiencia interna si la cuenta pertenece a Google Workspace institucional.
4. Si utiliza audiencia externa y la app está en pruebas, agregue como usuarios de prueba a los administradores.
5. Agregue el alcance:

```text
https://www.googleapis.com/auth/drive.file
```

Este alcance limita el portal a los archivos creados o seleccionados expresamente mediante la aplicación.

## 4. Crear el ID de cliente OAuth

1. Credenciales.
2. Crear credenciales.
3. ID de cliente OAuth.
4. Tipo: Aplicación web.
5. En Orígenes autorizados de JavaScript agregue:

```text
https://USUARIO.github.io
```

No agregue la ruta del repositorio en el origen. El origen contiene únicamente protocolo y dominio.

Para pruebas locales puede agregar:

```text
http://localhost:5500
http://127.0.0.1:5500
```

Copie el ID terminado en:

```text
.apps.googleusercontent.com
```

## 5. Restringir la API key

La configuración incluye inicialmente esta API key del proyecto:

```text
AIzaSyD02YaIMxLO2IPAJYZdPY2cWUvpkZDRo2U
```

En Google Cloud Console puede restringirla:

- Restricción de aplicación: Sitios web.
- Referentes autorizados:
  - `https://USUARIO.github.io/*`
  - la URL definitiva del portal.
- Restricciones de API:
  - Google Drive API.
  - Google Picker API.

La API key identifica el proyecto; el acceso a los archivos depende del token OAuth del administrador.

## 6. Configurar el portal

Existen dos formas.

### Opción A — Archivo permanente

Edite `drive-config.js` y pegue el ID de cliente:

```js
clientId: "103022555921-i7cqb3o8tc4lbtf7n9endse1d423ck4m.apps.googleusercontent.com"
```

También puede definir una carpeta existente:

```js
rootFolderId: "ID_DE_LA_CARPETA"
```

### Opción B — Desde la barra administrativa

1. Abra el portal.
2. Inicie sesión como administrador.
3. Active la edición directa.
4. Abra `Google Drive`.
5. Pegue:
   - ID de cliente OAuth;
   - API key;
   - número del proyecto;
   - nombre o ID de carpeta.
6. Pulse `Conectar Drive`.

La configuración se guarda en el navegador. Para que todos los administradores reciban la misma configuración sin escribirla nuevamente, colóquela en `drive-config.js`.

## 7. Carpeta principal

Si deja vacío `rootFolderId`, el portal crea:

```text
Rendición de Cuentas San Pedro
```

Dentro se crean automáticamente carpetas como:

```text
Rendición de Cuentas San Pedro
├── 2025
│   ├── Portal Público
│   │   ├── Imágenes
│   │   └── Documentos
│   ├── Recursos
│   └── Compromisos
├── 2026
└── 2027
```

También puede pulsar `Elegir carpeta` para usar Google Picker o `Crear carpeta` para generar una nueva.

## 8. Permisos públicos

La opción:

```text
Publicar archivos para cualquier persona con el enlace
```

crea un permiso `anyone / reader` sin permitir descubrimiento en búsquedas.

Debe mantenerse activada para los documentos e imágenes que deban ver los visitantes.

Algunas organizaciones de Google Workspace bloquean el uso compartido público. En ese caso el archivo se carga, pero debe cambiarse la política del dominio o compartirse manualmente.

## 9. Imágenes del diseño

Drive se utiliza para guardar imágenes cargadas desde el administrador. El portal genera una URL de visualización pública.

Para logos y recursos permanentes de la identidad institucional sigue siendo recomendable conservar una copia optimizada en la carpeta `assets` de GitHub, porque GitHub funciona mejor como alojamiento estático de elementos esenciales del diseño.

## 10. Seguridad

- No se almacena ningún token de acceso en Firestore ni en GitHub.
- El token permanece en memoria y vence automáticamente.
- El portal utiliza el modelo de tokens de Google Identity Services.
- La aplicación solicita acceso únicamente cuando el administrador pulsa conectar o intenta cargar un archivo.
- El alcance `drive.file` evita acceso general a todo el Drive.
- El administrador debe seguir autenticado en Firebase y tener un rol autorizado para cargar archivos desde el editor.

## 11. Archivos que reemplaza esta versión

```text
shared.js
inline-admin.js
firebase-service.js
styles.css
firebase.json
FIREBASE_SETUP.md
```

Archivos nuevos:

```text
drive-config.js
drive-service.js
GOOGLE_DRIVE_SETUP.md
```
