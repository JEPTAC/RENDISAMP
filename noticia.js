(() => {
  "use strict";
  const fallbackImage = "assets/cinematica/parque-himno-1600.webp";
  const escape = value => window.Portal?.helpers?.escape?.(String(value ?? "")) || String(value ?? "");
  const safeUrl = value => window.Portal?.helpers?.safeUrl?.(String(value || "")) || "#";
  const mediaUrl = (value, fallback = "") => window.DriveMedia?.resolveUrl?.(value, fallback)
    || (value && typeof value === "object" ? value.thumbnailUrl || value.webContentLink || value.webViewLink || value.url : String(value || fallback));

  function currentItem() {
    const id = new URLSearchParams(location.search).get("id");
    return (window.Portal?.state?.news || []).find(item => String(item.id) === String(id));
  }

  function formatDate(value) {
    const date = value ? new Date(String(value).includes("T") ? value : `${value}T12:00:00`) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("es-CO", { day:"numeric", month:"long", year:"numeric" })
      : "Sin fecha";
  }

  function renderBody(value) {
    const blocks = String(value || "").split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
    return blocks.map(block => {
      if (/^###\s+/.test(block)) return `<h3>${escape(block.replace(/^###\s+/, ""))}</h3>`;
      if (/^##\s+/.test(block)) return `<h2>${escape(block.replace(/^##\s+/, ""))}</h2>`;
      const lines = block.split(/\n/).map(line => line.trim()).filter(Boolean);
      if (lines.every(line => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map(line => `<li>${escape(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${escape(block).replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  function activeNews() {
    const admin = Boolean(window.Portal?.state?.admin);
    return (window.Portal?.state?.news || [])
      .filter(item => admin || (item.active !== false && !item.hidden))
      .sort((a,b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0));
  }

  function navigation(item) {
    const list = activeNews();
    const index = list.findIndex(entry => String(entry.id) === String(item.id));
    return { previous:list[index + 1] || null, next:list[index - 1] || null };
  }

  function related(item) {
    return activeNews()
      .filter(entry => entry.id !== item.id)
      .sort((a,b) => Number(b.category === item.category) - Number(a.category === item.category))
      .slice(0,3);
  }

  function gallery(item) {
    const references = Array.isArray(item.galleryRefs) ? item.galleryRefs : Array.isArray(item.gallery) ? item.gallery : [];
    const images = references.map(ref => mediaUrl(ref, "")).filter(Boolean);
    return images.length ? `<div class="news-detail__gallery">${images.map((src,index) => `
      <img src="${escape(src)}" alt="Fotografía ${index + 1} de ${escape(item.title)}" loading="lazy" data-image-fallback="${fallbackImage}">`).join("")}</div>` : "";
  }

  function attachments(item) {
    const values = Array.isArray(item.attachments) ? item.attachments : [];
    if (item.url && item.url !== "#") values.unshift({ name:"Documento relacionado", url:item.url, mimeType:"Enlace institucional" });
    const unique = values.filter(Boolean).filter((entry,index,array) => array.findIndex(other => (other.driveFileId || other.url) === (entry.driveFileId || entry.url)) === index);
    if (!unique.length) return "";
    return `<section class="news-detail__attachments" aria-label="Documentos adjuntos">
      <h2>Documentos adjuntos</h2>
      ${unique.map(entry => {
        const href = mediaUrl(entry, entry.url || "#");
        return `<a class="news-detail__attachment" href="${escape(safeUrl(href))}" target="_blank" rel="noopener">
          <span><strong>${escape(entry.name || entry.title || "Abrir documento")}</strong><small>${escape(entry.mimeType || entry.type || "Archivo en Google Drive")}</small></span><b aria-hidden="true">↗</b>
        </a>`;
      }).join("")}
    </section>`;
  }

  function backUrl() {
    const stored = sessionStorage.getItem("news:return") || "";
    if (stored) return stored;
    return "noticias.html";
  }

  function card(item) {
    const image = mediaUrl(item.imageRef || item.image, fallbackImage);
    return `<li><article class="news-card" data-admin-entity="news" data-entity-id="${escape(item.id)}">
      <a class="news-card__media has-image" href="noticia.html?id=${encodeURIComponent(item.id)}" style="background-image:linear-gradient(180deg,rgba(5,31,70,.03),rgba(5,31,70,.36)),url('${escape(image)}')"></a>
      <div class="news-card__body"><div class="news-meta-row"><span>${escape(item.category || "Gestión")}</span><time>${escape(formatDate(item.publishedAt))}</time></div>
      <h3><a href="noticia.html?id=${encodeURIComponent(item.id)}">${escape(item.title)}</a></h3><p>${escape(item.excerpt || "")}</p></div></article></li>`;
  }

  function render() {
    const holder = document.querySelector("#newsArticle");
    const item = currentItem();
    if (!holder) return;
    const admin = Boolean(window.Portal?.state?.admin);
    if (!item || ((!item.active || item.hidden) && !admin)) {
      holder.innerHTML = `<section class="site-shell news-not-found"><span class="section-kicker">NOTICIA NO DISPONIBLE</span><h1>No encontramos esta publicación</h1><p>La noticia fue retirada, está oculta o el enlace no es válido.</p><a class="button button-primary" href="noticias.html">Volver a Noticias</a></section>`;
      document.querySelector("#relatedNewsSection")?.setAttribute("hidden", "");
      return;
    }

    document.title = `${item.title} | Rendición de Cuentas`;
    const image = mediaUrl(item.imageRef || item.image, fallbackImage);
    const { previous, next } = navigation(item);
    const advances = Array.isArray(item.highlights) ? item.highlights : [];

    holder.innerHTML = `<div class="site-shell">
      <a class="news-detail__back" id="newsBack" href="${escape(backUrl())}">← Volver a Noticias</a>
      <section class="news-detail__hero" data-admin-entity="news" data-entity-id="${escape(item.id)}">
        <div class="news-detail__hero-copy">
          <span class="news-detail__category">${escape(item.category || "Información institucional")}</span>
          <h1>${escape(item.title)}</h1>
          <p class="news-detail__summary">${escape(item.excerpt || item.summary || "")}</p>
          <div class="news-detail__meta"><span>${escape(formatDate(item.publishedAt))}</span><span>${escape(item.author || item.source || "Alcaldía Municipal de San Pedro")}</span><span>${escape(item.agency || item.dependency || item.source || "Gestión municipal")}</span></div>
        </div>
        <figure class="news-detail__image"><img src="${escape(image)}" alt="${escape(item.imageAlt || item.title)}" data-image-fallback="${fallbackImage}"></figure>
      </section>

      <div class="news-detail__content-layout">
        <article class="news-detail__content">
          ${renderBody(item.body || item.content || item.description)}
          ${advances.length ? `<h2>Aspectos destacados</h2><ul>${advances.map(value => `<li>${escape(value)}</li>`).join("")}</ul>` : ""}
          ${gallery(item)}
          ${attachments(item)}
          <nav class="news-detail__pager" aria-label="Navegación entre noticias">
            ${previous ? `<a href="noticia.html?id=${encodeURIComponent(previous.id)}"><small>Noticia anterior</small><strong>${escape(previous.title)}</strong></a>` : `<span></span>`}
            ${next ? `<a href="noticia.html?id=${encodeURIComponent(next.id)}"><small>Noticia siguiente</small><strong>${escape(next.title)}</strong></a>` : ""}
          </nav>
        </article>
        <aside class="news-detail__sidebar">
          <section class="news-detail__sidebar-card"><span class="section-kicker">PUBLICACIÓN</span><p><strong>Dependencia:</strong><br>${escape(item.agency || item.dependency || item.source || "Alcaldía Municipal")}</p><p><strong>Última actualización:</strong><br>${escape(formatDate(item.updatedAt || item.publishedAt))}</p></section>
          <section class="news-detail__sidebar-card"><strong>Herramientas</strong><div class="news-detail__tools"><button type="button" id="shareNews">Compartir</button><button type="button" id="copyNewsLink">Copiar enlace</button><button type="button" id="printNews">Imprimir</button></div></section>
        </aside>
      </div>
    </div>`;

    holder.querySelector("#newsBack")?.addEventListener("click", event => {
      const stored = sessionStorage.getItem("news:return");
      if (!stored) return;
      event.preventDefault();
      location.href = stored;
    });
    holder.querySelector("#printNews")?.addEventListener("click", () => window.print());
    holder.querySelector("#copyNewsLink")?.addEventListener("click", async () => {
      await navigator.clipboard?.writeText(location.href);
      window.Portal?.helpers?.toast?.("Enlace copiado.");
    });
    holder.querySelector("#shareNews")?.addEventListener("click", async () => {
      if (navigator.share) await navigator.share({ title:item.title, text:item.excerpt || "", url:location.href }).catch(() => {});
      else { await navigator.clipboard?.writeText(location.href); window.Portal?.helpers?.toast?.("Enlace copiado para compartir."); }
    });

    const relatedItems = related(item);
    const relatedSection = document.querySelector("#relatedNewsSection");
    if (relatedSection) relatedSection.hidden = !relatedItems.length;
    const relatedHolder = document.querySelector("#relatedNews");
    if (relatedHolder) relatedHolder.innerHTML = relatedItems.map(card).join("");
    window.dispatchEvent(new CustomEvent("portal:rendered", { detail:{ source:"news-detail" } }));
  }

  document.addEventListener("DOMContentLoaded", render, { once:true });
  window.addEventListener("portal:datachange", render);
})();
