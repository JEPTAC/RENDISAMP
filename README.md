# Portal de Rendición de Cuentas de San Pedro — V11.23

Portal multipágina para publicar vigencias, resultados, documentos, noticias, indicadores e iniciativas ciudadanas del municipio de San Pedro, Valle del Cauca.

## Actualización V11.23

La portada fue recuperada desde su estructura estable y rediseñada sin la capa experimental de V11.22. La composición actual mantiene el contenido institucional a la izquierda y el recurso visual administrable a la derecha, con el explorador ubicado después del hero y sin superposiciones.

Cambios principales:

- Estructura del hero normalizada; el panel visual vuelve a ser hermano de la cuadrícula de contenido.
- Jerarquía tipográfica limpia en Century Gothic y palabra «confianza» completamente visible.
- Diseño editorial institucional, con profundidad moderada y movimiento no invasivo.
- Fotografía del administrador conservada dentro del panel visual.
- Explorador independiente del hero en escritorio, tableta y celular.
- Respeto por `prefers-reduced-motion`.
- Eliminación de scripts, recursos duplicados e informes históricos que no intervenían en la ejecución.

## Páginas

- `index.html`: portada.
- `vigencias.html`: archivo histórico.
- `rendicion-2025.html`, `rendicion-2026.html`, `rendicion-2027.html`: vigencias publicadas.
- `rendicion.html?year=AAAA`: plantilla de vigencias futuras.
- `recursos.html`: centro de recursos.
- `noticias.html` y `noticia.html`: publicaciones.
- `ideas.html`: laboratorio ciudadano.

## Componentes de ejecución

- `shared.js`: estado, encabezado, pie, accesibilidad, administración e integraciones.
- `claude-design.css` y `claude-design.js`: composición visual y comportamiento de presentación.
- `firebase-service.js`: autenticación y persistencia Firebase.
- `drive-service.js` y `drive-config.js`: integración con Google Drive/Picker.
- `territory-experience.js`: experiencia territorial y mapa.
- `admin-popup.js`: consola administrativa.

## Publicación en GitHub Pages

Suba el contenido completo de esta carpeta a la raíz del repositorio y configure:

`Settings → Pages → Deploy from a branch → main → / (root)`

Después de reemplazar una versión anterior, haga una recarga completa con `Ctrl + Shift + R`.

## Configuración

Consulte:

- `FIREBASE_SETUP.md`
- `FIREBASE_USUARIOS_SETUP.md`
- `GOOGLE_DRIVE_SETUP.md`

Las credenciales y reglas de producción deben configurarse en los servicios correspondientes; no se incluyen secretos en el paquete.
