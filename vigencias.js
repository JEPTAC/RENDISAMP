(() => {
  "use strict";
  const ui = { query:"", status:"all", year:"all" };
  const fallbackCover = "assets/cinematica/parque-himno-1600.webp";
  const escape = value => window.Portal?.helpers?.escape?.(String(value ?? "")) || String(value ?? "");
  const mediaUrl = (value, fallback = "") => window.DriveMedia?.resolveUrl?.(value, fallback)
    || (value && typeof value === "object" ? value.thumbnailUrl || value.webContentLink || value.webViewLink || value.url || fallback : String(value || fallback));

  function years() {
    return [...(window.Portal?.state?.years || [])].sort((a,b) => Number(b.year) - Number(a.year));
  }

  function installFilters(items) {
    const grid = document.querySelector("#archiveGrid");
    if (!grid || document.querySelector("#archiveFilters")) return;
    const holder = document.createElement("div");
    holder.id = "archiveFilters";
    holder.className = "archive-filterbar";
    holder.innerHTML = `<label>Buscar<input id="archiveSearch" type="search" placeholder="Año, estado o tema"></label>
      <label>Vigencia<select id="archiveYear"><option value="all">Todas</option>${items.map(item => `<option value="${escape(item.year)}">${escape(item.year)}</option>`).join("")}</select></label>
      <label>Estado<select id="archiveStatus"><option value="all">Todos</option>${[...new Set(items.map(item => item.status).filter(Boolean))].map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join("")}</select></label>`;
    grid.before(holder);
    holder.addEventListener("input", event => {
      if (event.target.id === "archiveSearch") ui.query = event.target.value.toLowerCase().trim();
      if (event.target.id === "archiveYear") ui.year = event.target.value;
      if (event.target.id === "archiveStatus") ui.status = event.target.value;
      render();
    });
  }

  function card(item,index) {
    const cover = mediaUrl(item.coverRef || item.cover, fallbackCover);
    const resourceTotal = Number(item.documents || 0) + Number(item.videos || 0);
    return `<article class="archive-card reveal visible" data-admin-entity="year" data-entity-id="${escape(item.year)}">
      <div class="archive-card__visual archive-${index % 3} has-cover-image" style="background-image:linear-gradient(180deg,rgba(6,43,101,.04),rgba(6,43,101,.46)),url('${escape(cover)}')">
        <span>${escape(item.progress ?? 0)}%</span><small>${escape(item.status || "Sin estado")}</small>
      </div>
      <div class="archive-card__body">
        <div><small>EDICIÓN ${escape(item.year)}</small><strong>${escape(item.year)}</strong></div>
        <h2>Rendición de Cuentas ${escape(item.year)}</h2>
        <p>${escape(item.summary || item.headline || "Información de la vigencia disponible para consulta ciudadana.")}</p>
        <ul><li>${escape(item.documents || 0)} documentos</li><li>${escape(item.videos || 0)} videos</li><li>${escape(item.commitments || 0)} compromisos</li></ul>
        <footer><span>${resourceTotal} recursos</span><a class="button button-primary" href="${escape(window.Portal.helpers.yearUrl(item.year))}">Abrir edición</a></footer>
      </div>
    </article>`;
  }

  function render() {
    const all = years();
    installFilters(all);
    const filtered = all.filter(item => {
      const text = `${item.year} ${item.status} ${item.summary} ${item.headline}`.toLowerCase();
      return (!ui.query || text.includes(ui.query))
        && (ui.year === "all" || String(item.year) === ui.year)
        && (ui.status === "all" || item.status === ui.status);
    });
    const count = document.querySelector("#archiveCount");
    if (count) count.textContent = String(filtered.length);
    const grid = document.querySelector("#archiveGrid");
    if (!grid) return;
    grid.innerHTML = filtered.length ? filtered.map(card).join("") : `<div class="archive-empty"><strong>No encontramos ediciones con esos filtros.</strong><p>Pruebe otro año, estado o palabra clave.</p></div>`;
    window.dispatchEvent(new CustomEvent("portal:rendered", { detail:{ source:"archive" } }));
  }

  document.addEventListener("DOMContentLoaded", render, { once:true });
  window.addEventListener("portal:datachange", render);
})();
