(() => {
  "use strict";
  const fallbackCover = "assets/cinematica/parque-himno-1600.webp";
  const mediaUrl = (value, fallback = "") => window.DriveMedia?.resolveUrl?.(value, fallback)
    || (value && typeof value === "object" ? value.thumbnailUrl || value.webContentLink || value.webViewLink || value.url || fallback : String(value || fallback));

  document.addEventListener("DOMContentLoaded", () => {
    const { state, helpers, openDialog } = window.Portal;
    const query = new URLSearchParams(location.search).get("q") || "";
    const search = document.querySelector("#resourcePageSearch");
    const yearFilter = document.querySelector("#resourcePageYear");
    const typeFilter = document.querySelector("#resourcePageType");
    search.value = query;

    function options() {
      yearFilter.innerHTML = `<option value="all">Todas las vigencias</option>${[...state.years].sort((a,b)=>Number(b.year)-Number(a.year)).map(y => `<option value="${helpers.escape(y.year)}">${helpers.escape(y.year)}</option>`).join("")}`;
    }

    function render() {
      const q = search.value.toLowerCase().trim();
      const year = yearFilter.value;
      const type = typeFilter.value;
      const list = state.resources.filter(item => {
        const text = `${item.title} ${item.description} ${item.meta} ${item.year} ${item.type}`.toLowerCase();
        return (!q || text.includes(q)) && (year === "all" || Number(year) === Number(item.year)) && (type === "all" || type === item.type);
      });
      document.querySelector("#resourceResultsCount").textContent = list.length;
      document.querySelector("#resourcePageGrid").innerHTML = list.length ? list.map(item => {
        const cover = mediaUrl(item.imageRef || item.image, "");
        return `<article class="resource-library-card reveal visible" data-admin-entity="resource" data-entity-id="${helpers.escape(item.id)}">
          <div class="resource-library-card__cover${cover ? " has-cover-image" : ""}" ${cover ? `style="background-image:linear-gradient(rgba(6,43,101,.12),rgba(6,43,101,.28)),url('${helpers.escape(cover)}')"` : ""}><span>${cover ? "" : helpers.typeIcon(item.type)}</span><small>${helpers.escape(item.year)}</small></div>
          <div class="resource-library-card__body"><small>${helpers.typeLabel(item.type)}</small><h3>${helpers.escape(item.title)}</h3><p>${helpers.escape(item.description)}</p><div><span>${helpers.escape(item.meta)}</span><button type="button" data-resource-open="${helpers.escape(item.id)}">Ver recurso →</button></div></div>
        </article>`;
      }).join("") : `<div class="empty-library"><strong>No encontramos recursos.</strong><p>Cambie los filtros o utilice otra palabra clave.</p></div>`;
      window.dispatchEvent(new CustomEvent("portal:rendered", { detail:{ source:"resources" } }));
    }

    options();
    [search, yearFilter, typeFilter].forEach(el => el.addEventListener("input", render));
    render();
    window.addEventListener("portal:datachange", () => { options(); render(); });

    document.addEventListener("click", event => {
      const button = event.target.closest("[data-resource-open]");
      if (!button) return;
      const item = state.resources.find(r => String(r.id) === String(button.dataset.resourceOpen));
      if (!item) return;
      const file = item.fileRef || item.driveRef || null;
      const href = mediaUrl(file, item.url || "#");
      const cover = mediaUrl(item.imageRef || item.image, "");
      document.querySelector("#libraryDialogContent").innerHTML = `<div class="resource-preview">
        ${cover ? `<img class="resource-preview__image" src="${helpers.escape(cover)}" alt="Miniatura de ${helpers.escape(item.title)}" loading="lazy" data-image-fallback="${fallbackCover}">` : `<div class="resource-preview__icon">${helpers.typeIcon(item.type)}</div>`}
        <div><span class="section-kicker">${helpers.escape(item.year)} · ${helpers.typeLabel(item.type).toUpperCase()}</span><h2>${helpers.escape(item.title)}</h2><p>${helpers.escape(item.description)}</p><div class="resource-preview__meta">${helpers.escape(item.meta)}</div><a class="button button-primary" href="${helpers.safeUrl(href)}" target="_blank" rel="noopener">Abrir recurso en Drive</a></div>
      </div>`;
      openDialog("libraryDialog");
    });
  }, { once:true });
})();
