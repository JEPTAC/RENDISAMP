# Auditoría técnica y visual — V11.23

Fecha: 16 de julio de 2026

## Diagnóstico de V11.22

El fallo principal no era únicamente de estilos. `claude-design.js` trasladaba físicamente `.home-hero__visual` al interior de `.home-hero__copy` y añadía la clase `home-hero--banner-inside`. Esa mutación alteraba la estructura original del hero, generaba filas y alturas imprevistas y facilitaba recortes y superposiciones en resoluciones intermedias.

Además, `shared.js` incorporaba una segunda capa de experiencia para la portada con nodos ambientales, observadores, reflejos y movimiento de puntero. La acumulación de esa capa sobre el diseño existente produjo exceso visual y aumentó el riesgo de conflictos.

## Corrección aplicada

- Se eliminó la inicialización específica de V11.22 en `shared.js`.
- Se retiró el bloque CSS de V11.22 y se sustituyó por una dirección visual V11.23 más contenida.
- Se reemplazó la función que reubicaba el panel por `normalizeHomeHeroStructure()`, que restaura el panel visual como hijo directo del hero.
- El modo predeterminado del hero pasó de `compact` a `balanced`; una preferencia antigua `compact` se migra a `balanced` salvo que se solicite expresamente mediante URL.
- Se corrigió la puntuación de «confianza.» para impedir que el punto quedara aislado en otra línea.
- Se actualizaron identificadores de caché a V11.23.

## Preservación funcional

No se alteraron las interfaces de:

- Firebase y autenticación.
- Google Drive y Picker.
- Consola administrativa.
- Fotografía administrable del hero.
- Mapa Leaflet y experiencia territorial.
- Narrador, accesibilidad, carga y diálogos globales.

La preservación se verificó mediante revisión de dependencias y referencias. Las conexiones externas reales dependen de las credenciales y reglas del entorno de despliegue.

## Limpieza segura

Se retiraron archivos inequívocamente huérfanos o sustituidos:

- `app.js`
- `script.js`
- `inline-admin.js`
- `san-pedro-connected.js`
- `san-pedro-connected.css`
- `territory-map-engine.js`
- `ui-audio/notification.mp3` — duplicado de `ui-sounds/notification.mp3`
- `assets/marca-san-pedro-color.png` — recurso del script retirado
- `ui-gifs/cat-hello.gif`, `ui-gifs/click-effect.gif` y `hero-gifs/chiva.gif` — sin referencias de ejecución
- respaldos V11.22, QA históricos e informes de versiones anteriores

No se hizo una eliminación agresiva de selectores dentro de `styles.css`, porque parte de ellos puede activarse con contenido dinámico, administración o datos remotos. Se priorizó no romper funciones por una depuración especulativa.

## Verificaciones

- Sintaxis JavaScript: correcta en todos los scripts activos.
- Parseo CSS: sin errores en `styles.css` y `claude-design.css`.
- Referencias locales HTML: sin rutas faltantes.
- HTML: sin identificadores duplicados ni imágenes sin atributo `alt` en las páginas estáticas.
- Layout probado con la composición final en 1728 × 900, 1024 × 768 y 390 × 844:
  - hero y explorador sin superposición;
  - sin desbordamiento horizontal;
  - panel visual dentro de los límites;
  - Century Gothic aplicada al titular y a «confianza».
- Movimiento reducido: reglas específicas conservadas.
