(() => {
  const escape = value => window.Portal.helpers.escape(value);

  function itemById() {
    const id = new URLSearchParams(location.search).get("id");
    return (window.Portal.state.news || []).find(item => item.id === id);
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value || "Sin fecha";
    return date.toLocaleDateString("es-CO",{
      day:"numeric",
      month:"long",
      year:"numeric"
    });
  }

  function paragraphs(value) {
    return String(value || "")
      .split(/\n\s*\n/)
      .map(text => text.trim())
      .filter(Boolean)
      .map(text => `<p>${escape(text)}</p>`)
      .join("");
  }

  function visual(item) {
    if (item.image) {
      return `
        <figure class="news-detail__image">
          <img src="${escape(item.image)}"
            alt="${escape(item.imageAlt || item.title)}">
        </figure>`;
    }

    return `
      <div class="news-detail__image news-detail__image--placeholder"
        role="img"
        aria-label="${escape(item.imageAlt || `Imagen representativa de ${item.category}`)}">
        <span>${escape((item.category || "N").slice(0,1).toUpperCase())}</span>
      </div>`;
  }

  function related(item) {
    return (window.Portal.state.news || [])
      .filter(news =>
        news.id !== item.id
        && news.active !== false
        && !news.hidden
      )
      .sort((a,b) => {
        const sameA = a.category === item.category ? 1 : 0;
        const sameB = b.category === item.category ? 1 : 0;
        if (sameA !== sameB) return sameB - sameA;
        return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
      })
      .slice(0,3);
  }

  function relatedCard(item) {
    const style = item.image
      ? `style="background-image:linear-gradient(180deg,rgba(5,31,70,.04),rgba(5,31,70,.38)),url('${escape(item.image)}')"`
      : "";
    return `
      <li>
        <article class="news-card"
          data-admin-entity="news"
          data-entity-id="${escape(item.id)}">
          <a class="news-card__media ${item.image ? "has-image" : ""}"
            ${style}
            href="${window.Portal.helpers.newsUrl(item.id)}">
            ${item.image ? "" : `<span class="news-related-letter">${escape((item.category || "N")[0])}</span>`}
          </a>
          <div class="news-card__body">
            <div class="news-meta-row">
              <span>${escape(item.category)}</span>
              <time datetime="${escape(item.publishedAt)}">${escape(formatDate(item.publishedAt))}</time>
            </div>
            <h3><a href="${window.Portal.helpers.newsUrl(item.id)}">${escape(item.title)}</a></h3>
            <p>${escape(item.excerpt)}</p>
            <footer>
              <a class="news-read-link" href="${window.Portal.helpers.newsUrl(item.id)}">Leer noticia <b aria-hidden="true">→</b></a>
            </footer>
          </div>
        </article>
      </li>`;
  }

  function render() {
    const holder = document.querySelector("#newsArticle");
    const item = itemById();
    const admin = Boolean(window.Portal.state.admin);

    if (!item || ((!item.active || item.hidden) && !admin)) {
      holder.innerHTML = `
        <section class="site-shell news-not-found">
          <span class="section-kicker">NOTICIA NO DISPONIBLE</span>
          <h1>No encontramos esta publicación</h1>
          <p>La noticia fue retirada, está oculta o el enlace no es válido.</p>
          <a class="button button-primary" href="noticias.html">Volver a noticias</a>
        </section>`;
      document.querySelector("#relatedNewsSection").hidden = true;
      return;
    }

    document.title = `${item.title} | Rendición de Cuentas`;

    const attachment = item.url && item.url !== "#"
      ? `<a class="news-attachment" href="${escape(item.url)}" target="_blank" rel="noopener">
          <span aria-hidden="true">▤</span>
          <span><strong>Documento relacionado</strong><small>Abrir archivo o enlace institucional</small></span>
          <b aria-hidden="true">↗</b>
        </a>`
      : "";

    holder.innerHTML = `
      <div class="site-shell">
        <nav class="news-breadcrumb" aria-label="Migas de pan">
          <a href="index.html">Inicio</a>
          <span aria-hidden="true">/</span>
          <a href="noticias.html">Noticias</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">${escape(item.category || "Noticia")}</span>
        </nav>

        <header class="news-detail__header"
          data-admin-entity="news"
          data-entity-id="${escape(item.id)}">
          <div class="news-meta-row">
            <span>${escape(item.category || "Gestión municipal")}</span>
            <time datetime="${escape(item.publishedAt)}">${escape(formatDate(item.publishedAt))}</time>
          </div>
          <h1>${escape(item.title)}</h1>
          <p>${escape(item.excerpt)}</p>
          <div class="news-detail__byline">
            <span><strong>Fuente:</strong> ${escape(item.source || "Alcaldía Municipal de San Pedro")}</span>
            <span><strong>Autor:</strong> ${escape(item.author || "Equipo institucional")}</span>
          </div>
        </header>

        ${visual(item)}

        <div class="news-detail__layout">
          <aside class="news-detail__tools">
            <strong>Herramientas</strong>
            <button type="button" id="shareNews">Compartir noticia</button>
            <button type="button" id="copyNewsLink">Copiar enlace</button>
            <button type="button" id="printNews">Imprimir</button>
            ${item.tags?.length
              ? `<div class="news-detail__tags">${item.tags.map(tag => `<span>${escape(tag)}</span>`).join("")}</div>`
              : ""}
          </aside>

          <div class="news-detail__content">
            ${paragraphs(item.body)}
            ${attachment}
          </div>
        </div>
      </div>`;

    document.querySelector("#printNews")?.addEventListener("click",() => window.print());

    document.querySelector("#copyNewsLink")?.addEventListener("click",async () => {
      await navigator.clipboard?.writeText(location.href);
      window.Portal.helpers.toast("Enlace copiado.");
    });

    document.querySelector("#shareNews")?.addEventListener("click",async () => {
      if (navigator.share) {
        await navigator.share({
          title:item.title,
          text:item.excerpt,
          url:location.href
        }).catch(() => {});
      } else {
        await navigator.clipboard?.writeText(location.href);
        window.Portal.helpers.toast("Enlace copiado para compartir.");
      }
    });

    const relatedItems = related(item);
    const relatedHolder = document.querySelector("#relatedNews");
    document.querySelector("#relatedNewsSection").hidden = !relatedItems.length;
    relatedHolder.innerHTML = relatedItems.map(relatedCard).join("");

    window.dispatchEvent(new CustomEvent("portal:rendered"));
  }

  document.addEventListener("DOMContentLoaded",render);
  window.addEventListener("portal:datachange",render);
})();