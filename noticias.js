(() => {
  const ui = {
    query:"",
    category:"all",
    year:"all",
    page:1,
    perPage:6
  };

  const escape = value => window.Portal.helpers.escape(value);

  function normalizedNews() {
    return (window.Portal.state.news || [])
      .map(item => ({
        ...item,
        tags:Array.isArray(item.tags) ? item.tags : [],
        active:item.active !== false,
        hidden:Boolean(item.hidden)
      }))
      .filter(item => item.active && !item.hidden)
      .sort((a,b) => {
        const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (featured) return featured;
        return new Date(b.publishedAt || b.createdAt || 0)
          - new Date(a.publishedAt || a.createdAt || 0);
      });
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

  function readingTime(item) {
    const words = String(item.body || item.excerpt || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 190));
  }

  function latestUpdate(items) {
    const item = [...items].sort((a,b) => (
      new Date(b.publishedAt || b.createdAt || 0)
      - new Date(a.publishedAt || a.createdAt || 0)
    ))[0];

    return item ? formatDate(item.publishedAt || item.createdAt) : "Sin publicaciones";
  }

  function visual(item,className = "") {
    const image = item.image
      ? `style="background-image:linear-gradient(180deg,rgba(5,31,70,.04),rgba(5,31,70,.34)),url('${escape(item.image)}')"`
      : "";
    return `
      <div class="news-visual ${className} ${item.image ? "has-image" : ""}" ${image}>
        ${item.image
          ? ""
          : `<span aria-hidden="true">${escape((item.category || "N").slice(0,1).toUpperCase())}</span>`}
      </div>`;
  }

  function renderFeatured(items) {
    const holder = document.querySelector("#newsFeatured");
    if (!holder) return;

    const item = items.find(news => news.featured) || items[0];
    if (!item) {
      holder.innerHTML = `
        <div class="news-empty-state">
          <strong>No hay una noticia destacada.</strong>
          <p>El administrador puede publicar la primera noticia directamente desde esta sección.</p>
        </div>`;
      return;
    }

    holder.innerHTML = `
      <article class="news-feature-card"
        data-admin-entity="news"
        data-entity-id="${escape(item.id)}">
        <a class="news-feature-card__media"
          href="${window.Portal.helpers.newsUrl(item.id)}"
          aria-label="Leer ${escape(item.title)}">
          ${visual(item,"news-visual--feature")}
        </a>
        <div class="news-feature-card__content">
          <div class="news-meta-row">
            <span>${escape(item.category || "Gestión municipal")}</span>
            <time datetime="${escape(item.publishedAt)}">${escape(formatDate(item.publishedAt))}</time>
          </div>
          <div class="news-reading-meta">
            <span>${readingTime(item)} min de lectura</span>
            <span>${escape(item.source || item.author || "Alcaldía Municipal")}</span>
          </div>
          <h3><a href="${window.Portal.helpers.newsUrl(item.id)}">${escape(item.title)}</a></h3>
          <p>${escape(item.excerpt)}</p>
          <div class="news-feature-card__footer">
            <span>Información oficial y verificable</span>
            <a class="news-read-link" href="${window.Portal.helpers.newsUrl(item.id)}">Leer noticia <b aria-hidden="true">→</b></a>
          </div>
        </div>
      </article>`;
  }

  function filteredItems(items) {
    const query = ui.query.trim().toLowerCase();

    return items.filter(item => {
      const text = [
        item.title,
        item.excerpt,
        item.body,
        item.category,
        item.source,
        ...(item.tags || [])
      ].join(" ").toLowerCase();

      const matchesQuery = !query || text.includes(query);
      const matchesCategory =
        ui.category === "all" || item.category === ui.category;
      const matchesYear =
        ui.year === "all"
        || String(item.publishedAt || "").startsWith(String(ui.year));

      return matchesQuery && matchesCategory && matchesYear;
    });
  }

  function card(item) {
    return `
      <li>
        <article class="news-card"
          data-admin-entity="news"
          data-entity-id="${escape(item.id)}">
          <a href="${window.Portal.helpers.newsUrl(item.id)}"
            class="news-card__media"
            aria-label="Leer ${escape(item.title)}">
            ${visual(item)}
            ${item.featured ? '<span class="news-featured-badge">Destacada</span>' : ""}
          </a>
          <div class="news-card__body">
            <div class="news-meta-row">
              <span>${escape(item.category || "Gestión municipal")}</span>
              <time datetime="${escape(item.publishedAt)}">${escape(formatDate(item.publishedAt))}</time>
            </div>
            <div class="news-reading-meta">
              <span>${readingTime(item)} min</span>
              <span>${escape(item.source || item.author || "Alcaldía Municipal")}</span>
            </div>
            <h3><a href="${window.Portal.helpers.newsUrl(item.id)}">${escape(item.title)}</a></h3>
            <p>${escape(item.excerpt)}</p>
            <footer>
              <span>${escape((item.tags || []).slice(0,2).join(" · ") || "Información pública")}</span>
              <a class="news-read-link" href="${window.Portal.helpers.newsUrl(item.id)}">Conozca más <b aria-hidden="true">→</b></a>
            </footer>
          </div>
        </article>
      </li>`;
  }

  function pagination(totalPages) {
    const holder = document.querySelector("#newsPagination");
    if (!holder) return;

    if (totalPages <= 1) {
      holder.innerHTML = "";
      return;
    }

    const pages = [];
    const start = Math.max(1,Math.min(ui.page - 2,totalPages - 4));
    const end = Math.min(totalPages,start + 4);

    pages.push(`
      <button type="button" data-page="${Math.max(1,ui.page - 1)}"
        ${ui.page === 1 ? "disabled" : ""}>Anterior</button>`);

    if (start > 1) {
      pages.push(`<button type="button" data-page="1">1</button>`);
      if (start > 2) pages.push(`<span>…</span>`);
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(`
        <button type="button"
          data-page="${page}"
          ${page === ui.page ? 'class="active" aria-current="page"' : ""}>
          ${page}
        </button>`);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(`<span>…</span>`);
      pages.push(`<button type="button" data-page="${totalPages}">${totalPages}</button>`);
    }

    pages.push(`
      <button type="button" data-page="${Math.min(totalPages,ui.page + 1)}"
        ${ui.page === totalPages ? "disabled" : ""}>Siguiente</button>`);

    holder.innerHTML = pages.join("");
  }

  function renderFilters(items) {
    const category = document.querySelector("#newsCategory");
    const year = document.querySelector("#newsYear");

    const categories = [...new Set(items.map(item => item.category).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b,"es"));
    const years = [...new Set(
      items.map(item => String(item.publishedAt || "").slice(0,4)).filter(Boolean)
    )].sort((a,b) => Number(b) - Number(a));

    category.innerHTML =
      '<option value="all">Todas las categorías</option>'
      + categories.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join("");
    year.innerHTML =
      '<option value="all">Todos los años</option>'
      + years.map(value => `<option value="${escape(value)}">${escape(value)}</option>`).join("");

    category.value = ui.category;
    year.value = ui.year;
  }

  function renderQuickCategories(items) {
    const toolbar = document.querySelector(".news-toolbar");
    if (!toolbar) return;

    let holder = document.querySelector("#newsQuickCategories");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "newsQuickCategories";
      holder.className = "news-quick-categories";
      holder.setAttribute("aria-label", "Categorías rápidas");
      toolbar.insertAdjacentElement("afterend", holder);
    }

    const categories = [...new Set(
      items.map(item => item.category).filter(Boolean)
    )].slice(0,6);

    holder.innerHTML = [
      `<button type="button" data-quick-category="all"
        class="${ui.category === "all" ? "active" : ""}">
        Todas
      </button>`,
      ...categories.map(category => `
        <button type="button"
          data-quick-category="${escape(category)}"
          class="${ui.category === category ? "active" : ""}">
          ${escape(category)}
        </button>`)
    ].join("");
  }

  let newsMotionObserver = null;

  function initNewsMotion(root = document) {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const targets = root.querySelectorAll([
      ".news-page-hero__grid > *",
      ".news-section-heading",
      ".news-toolbar",
      ".news-quick-categories",
      ".news-feature-card",
      ".news-card",
      ".news-subscription-card"
    ].join(","));

    if (!reduced && !newsMotionObserver && "IntersectionObserver" in window) {
      newsMotionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-news-visible");
          newsMotionObserver.unobserve(entry.target);
        });
      }, {
        threshold:0.08,
        rootMargin:"0px 0px -5% 0px"
      });
    }

    targets.forEach((target,index) => {
      target.classList.add("news-motion-item");
      target.style.setProperty("--news-delay", `${Math.min(index % 8,7) * 55}ms`);

      if (reduced || !newsMotionObserver) {
        target.classList.add("is-news-visible");
      } else {
        newsMotionObserver.observe(target);
      }
    });
  }

  function updateNewsSummary(items) {
    const summary = document.querySelector(".news-hero-summary");
    if (!summary) return;

    let meta = summary.querySelector(".news-summary-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "news-summary-meta";
      summary.appendChild(meta);
    }

    const categoryCount = new Set(
      items.map(item => item.category).filter(Boolean)
    ).size;

    meta.innerHTML = `
      <div>
        <strong>${categoryCount}</strong>
        <span>Categorías</span>
      </div>
      <div>
        <strong>${escape(latestUpdate(items))}</strong>
        <span>Última actualización</span>
      </div>`;

    window.Portal?.mountNewsHoverCat?.(summary);
  }

  function render() {
    const items = normalizedNews();
    renderFeatured(items);
    renderFilters(items);
    renderQuickCategories(items);
    updateNewsSummary(items);

    const filtered = filteredItems(items);
    const totalPages = Math.max(1,Math.ceil(filtered.length / ui.perPage));
    if (ui.page > totalPages) ui.page = totalPages;

    const start = (ui.page - 1) * ui.perPage;
    const visible = filtered.slice(start,start + ui.perPage);

    document.querySelector("#newsTotalCount").textContent = String(items.length);
    document.querySelector("#newsResultSummary").innerHTML =
      `<strong>${filtered.length}</strong> ${filtered.length === 1 ? "noticia encontrada" : "noticias encontradas"}.`;

    const grid = document.querySelector("#newsGrid");
    grid.innerHTML = visible.length
      ? visible.map(card).join("")
      : `<li class="news-empty-state">
          <strong>No encontramos noticias con estos filtros.</strong>
          <p>Pruebe otra categoría, año o palabra clave.</p>
        </li>`;

    pagination(totalPages);
    initNewsMotion(document);
    window.dispatchEvent(new CustomEvent("portal:rendered"));
  }


  function renderWithFeedback(message = "Actualizando noticias…") {
    window.Portal.helpers.showLoading?.(message);
    window.requestAnimationFrame(() => {
      render();
      window.setTimeout(() => {
        window.Portal.helpers.hideLoading?.("Noticias actualizadas correctamente.");
      }, 180);
    });
  }

  function bind() {
    document.querySelector("#newsSearch")?.addEventListener("input",event => {
      ui.query = event.target.value;
      ui.page = 1;
      render();
    });

    document.querySelector("#newsCategory")?.addEventListener("change",event => {
      ui.category = event.target.value;
      ui.page = 1;
      renderWithFeedback("Filtrando noticias por categoría…");
    });

    document.querySelector("#newsYear")?.addEventListener("change",event => {
      ui.year = event.target.value;
      ui.page = 1;
      renderWithFeedback("Cargando noticias de la vigencia seleccionada…");
    });

    document.addEventListener("click",event => {
      const button = event.target.closest("[data-quick-category]");
      if (!button) return;

      ui.category = button.dataset.quickCategory || "all";
      ui.page = 1;

      const select = document.querySelector("#newsCategory");
      if (select) select.value = ui.category;

      renderWithFeedback(
        ui.category === "all"
          ? "Cargando todas las noticias…"
          : `Filtrando noticias de ${ui.category}…`
      );
    });

    document.querySelector("#newsClearFilters")?.addEventListener("click",() => {
      ui.query = "";
      ui.category = "all";
      ui.year = "all";
      ui.page = 1;
      document.querySelector("#newsSearch").value = "";
      renderWithFeedback("Restableciendo filtros…");
    });

    document.querySelector("#newsPagination")?.addEventListener("click",event => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      ui.page = Number(button.dataset.page);
      renderWithFeedback("Cargando más noticias…");
      document.querySelector("#ultimas-noticias")?.scrollIntoView({
        behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block:"start"
      });
    });

    document.querySelector("#newsSubscriptionForm")?.addEventListener("submit",event => {
      event.preventDefault();
      event.currentTarget.reset();
      window.Portal.helpers.hideLoading?.("Suscripción registrada correctamente.");
      window.Portal.helpers.toast(
        "Suscripción registrada en esta demostración. Conecte un servicio de correo para envíos reales."
      );
    });

    window.addEventListener("portal:datachange",render);
  }

  document.addEventListener("DOMContentLoaded",() => {
    bind();
    render();
    window.setTimeout(() => {
      window.Portal.helpers.hideLoading?.("Noticias listas para consultar.");
    }, 220);
  });
})();