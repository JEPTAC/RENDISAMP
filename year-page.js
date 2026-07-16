document.addEventListener("DOMContentLoaded", () => {
  const { state, helpers, openDialog } = window.Portal;
  const bodyYear = document.body.dataset.year;
  const queryYear = new URLSearchParams(location.search).get("year");
  const yearNumber = Number(bodyYear || queryYear || 2025);
  const year = helpers.getYear(yearNumber);

  if (!year) {
    document.querySelector("#main-content").innerHTML = `
      <section class="missing-page"><span class="section-kicker">VIGENCIA NO DISPONIBLE</span><h1>No encontramos la edición solicitada.</h1><a class="button button-primary" href="vigencias.html">Volver al archivo histórico</a></section>`;
    return;
  }

  document.title = `Rendición de Cuentas ${year.year} | San Pedro`;

  const pageHero = document.querySelector(".page-hero");
  const yearThemes = {
    2025: "celebration",
    2026: "mobility",
    2027: "sports"
  };
  const selectedTheme = yearThemes[year.year] || ["celebration", "mobility", "sports"][Math.abs(year.year) % 3];

  const heroScenes = {
    celebration: `
      <div class="page-hero__scene page-hero__scene--gif page-hero__scene--celebration" aria-hidden="true">
        <div class="hero-gif-canvas">
          <span class="hero-gif-glow hero-gif-glow--a"></span>
          <span class="hero-gif-glow hero-gif-glow--b"></span>
          <img class="hero-gif hero-gif--festival-main" src="hero-gifs/festival-main.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--music-parade" src="hero-gifs/music-parade.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--notes-a" src="hero-gifs/notes.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--notes-b" src="hero-gifs/notes.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sparkle-a" src="hero-gifs/sparkle.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sparkle-b" src="hero-gifs/sparkle.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--stream-a" src="hero-gifs/party-band.gif" alt="" loading="eager" decoding="async">
        </div>
      </div>`,
    mobility: `
      <div class="page-hero__scene page-hero__scene--gif page-hero__scene--mobility" aria-hidden="true">
        <div class="hero-gif-canvas">
          <span class="hero-gif-glow hero-gif-glow--a"></span>
          <span class="hero-gif-glow hero-gif-glow--c"></span>
          <img class="hero-gif hero-gif--mobility-festival" src="hero-gifs/mobility-festival.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--bus-main" src="hero-gifs/bus.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--bus-accent" src="hero-gifs/bus-accent.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--headline-festival" src="hero-gifs/headline-festival.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sparkle-route" src="hero-gifs/sparkle.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sparkle-route-b" src="hero-gifs/sparkle.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--stream-route" src="hero-gifs/streamer.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--stream-route-b" src="hero-gifs/streamer.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--notes-route" src="hero-gifs/notes.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--notes-route-b" src="hero-gifs/notes.gif" alt="" loading="eager" decoding="async">
        </div>
      </div>`,
    sports: `
      <div class="page-hero__scene page-hero__scene--gif page-hero__scene--sports" aria-hidden="true">
        <div class="hero-gif-canvas">
          <span class="hero-gif-glow hero-gif-glow--a"></span>
          <span class="hero-gif-glow hero-gif-glow--d"></span>
          <img class="hero-gif hero-gif--sports-main" src="hero-gifs/sports-main.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--football" src="hero-gifs/football.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sports-accent" src="hero-gifs/sports-accent.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--basketball" src="hero-gifs/basketball.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--headline-festival" src="hero-gifs/headline-festival.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--music-parade" src="hero-gifs/music-parade.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sparkle-sport" src="hero-gifs/sparkle.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--sparkle-sport-b" src="hero-gifs/sparkle.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--stream-sport" src="hero-gifs/streamer.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--stream-sport-b" src="hero-gifs/streamer.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--notes-sport" src="hero-gifs/notes.gif" alt="" loading="eager" decoding="async">
          <img class="hero-gif hero-gif--notes-sport-b" src="hero-gifs/notes.gif" alt="" loading="eager" decoding="async">
        </div>
      </div>`
  };

  document.body.classList.remove(
    "year-theme--celebration",
    "year-theme--mobility",
    "year-theme--sports"
  );
  document.body.classList.add(`year-theme--${selectedTheme}`);
  document.body.dataset.yearTheme = selectedTheme;

  if (pageHero) {
    pageHero.classList.remove(
      "page-hero--celebration",
      "page-hero--mobility",
      "page-hero--sports"
    );
    pageHero.classList.add(`page-hero--${selectedTheme}`);
    pageHero.dataset.heroTheme = selectedTheme;

    if (!pageHero.querySelector(".page-hero__scene")) {
      pageHero.insertAdjacentHTML("afterbegin", heroScenes[selectedTheme]);
    }

    const heroAssets = [...pageHero.querySelectorAll(".hero-gif")];
    pageHero.classList.add("is-hero-loading");

    const markHeroReady = () => {
      pageHero.classList.remove("is-hero-loading");
      pageHero.classList.add("is-hero-ready");
    };

    if (!heroAssets.length) {
      markHeroReady();
    } else {
      let pending = heroAssets.length;
      const assetReady = () => {
        pending -= 1;
        if (pending <= 0) markHeroReady();
      };

      heroAssets.forEach(asset => {
        if (asset.complete) {
          assetReady();
          return;
        }

        asset.addEventListener("load", assetReady, { once:true });
        asset.addEventListener("error", assetReady, { once:true });
      });

      window.setTimeout(markHeroReady, 1800);
    }
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let premiumModuleObserver = null;

  function initPremiumModuleMotion(root = document) {
    const selector = [
      ".year-metric",
      ".sector-bars > div",
      ".dashboard-panel",
      ".executive-kpi",
      ".institution-result",
      ".method-step",
      ".followup-summary > article",
      ".request-summary > article",
      ".news-story",
      ".year-resource-card",
      ".commitment-row",
      ".resource-library-card",
      ".dashboard-chart-card",
      ".year-overview",
      ".year-section__head"
    ].join(",");

    const targets = root.querySelectorAll(selector);

    if (!premiumModuleObserver && !reducedMotion && "IntersectionObserver" in window) {
      premiumModuleObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-ultra-visible");
          premiumModuleObserver.unobserve(entry.target);
        });
      }, {
        threshold: 0.09,
        rootMargin: "0px 0px -6% 0px"
      });
    }

    targets.forEach((element, index) => {
      if (element.dataset.ultraMotion === "true") return;

      element.dataset.ultraMotion = "true";
      element.classList.add("ultra-motion-item", `ultra-motion-${index % 4}`);
      element.style.setProperty("--ultra-delay", `${Math.min(index % 8, 7) * 55}ms`);

      if (reducedMotion || !premiumModuleObserver) {
        element.classList.add("is-ultra-visible");
      } else {
        premiumModuleObserver.observe(element);
      }
    });
  }

  function initHeroParallax() {
    if (!pageHero || reducedMotion || !window.matchMedia("(pointer:fine)").matches) return;

    pageHero.addEventListener("pointermove", event => {
      const rect = pageHero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      pageHero.style.setProperty("--hero-shift-x", `${(x * 10).toFixed(2)}px`);
      pageHero.style.setProperty("--hero-shift-y", `${(y * 7).toFixed(2)}px`);
      pageHero.style.setProperty("--hero-light-x", `${((x + 0.5) * 100).toFixed(1)}%`);
      pageHero.style.setProperty("--hero-light-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    }, { passive: true });

    pageHero.addEventListener("pointerleave", () => {
      pageHero.style.setProperty("--hero-shift-x", "0px");
      pageHero.style.setProperty("--hero-shift-y", "0px");
      pageHero.style.setProperty("--hero-light-x", "74%");
      pageHero.style.setProperty("--hero-light-y", "18%");
    }, { passive: true });
  }

  initHeroParallax();
  const yearMain = document.querySelector("#main-content");
  if (yearMain) {
    yearMain.dataset.adminEntity = "year";
    yearMain.dataset.entityId = String(year.year);
  }
  document.querySelectorAll("[data-year-text]").forEach(el => el.textContent = year.year);
  document.querySelector("#yearStatus").textContent = year.status;
  document.querySelector("#yearHeadline").textContent = year.headline;
  document.querySelector("#yearSummary").textContent = year.summary;
  document.querySelector("#yearProgress").textContent = `${year.progress}%`;
  document.querySelector("#yearDocuments").textContent = state.resources.filter(r => Number(r.year) === year.year).length;
  document.querySelector("#yearVideos").textContent = state.resources.filter(r => Number(r.year) === year.year && r.type === "video").length;
  document.querySelector("#yearCommitments").textContent = year.commitments;
  document.querySelector("#yearQuestions").textContent = year.questions;

  const picker = document.querySelector("#yearPagePicker");
  picker.innerHTML = [...state.years].sort((a,b)=>a.year-b.year).map(y => `<option value="${y.year}" ${y.year===year.year?"selected":""}>${y.year}</option>`).join("");
  picker.addEventListener("change", event => {
    helpers.showLoading?.(`Abriendo Rendición ${event.target.value}...`);
    window.setTimeout(() => {
      location.href = helpers.yearUrl(Number(event.target.value));
    }, 120);
  });

  const reportDashboard = state.dashboards?.[String(year.year)] || state.dashboards?.[year.year];
  const metrics = reportDashboard?.kpis?.slice(0,4).map(item => [item.label,item.display || helpers.formatNumber(item.value),item.description]) || [
    ["Cumplimiento del plan", `${year.metrics.plan}%`, "Avance consolidado de las metas estratégicas."],
    ["Proyectos ejecutados", year.metrics.projects, "Iniciativas terminadas o en operación."],
    ["Compromisos atendidos", `${year.metrics.commitments}%`, "Solicitudes con gestión documentada."],
    ["Espacios participativos", year.metrics.participation, "Mesas, audiencias y encuentros ciudadanos."]
  ];
  document.querySelector("#yearMetrics").innerHTML = metrics.map((m,index) => `
    <article class="year-metric reveal"><span>0${index+1}</span><strong>${m[1]}</strong><h3>${m[0]}</h3><p>${m[2]}</p></article>`).join("");

  document.querySelector("#sectorBars").innerHTML = year.sectors.map(item => `
    <div><span><b>${helpers.escape(item[0])}</b><strong>${item[1]}%</strong></span><i><u style="width:${item[1]}%"></u></i></div>`).join("");

  const resources = state.resources.filter(r => Number(r.year) === year.year);
  const featured = resources.slice(0,6);
  document.querySelector("#yearResources").innerHTML = featured.length ? featured.map(item => `
    <article class="year-resource-card reveal" data-resource-id="${item.id}" data-admin-entity="resource" data-entity-id="${item.id}">
      <span class="${item.image ? "has-resource-image" : ""}" ${item.image ? `style="background-image:url('${item.image}')"` : ""}>${item.image ? "" : helpers.typeIcon(item.type)}</span>
      <div><small>${helpers.typeLabel(item.type)}</small><strong>${helpers.escape(item.title)}</strong><p>${helpers.escape(item.meta)}</p></div>
      <button class="year-resource-open" type="button" aria-label="Ver recurso">↗</button>
    </article>`).join("") : `
    <div class="empty-year"><strong>La documentación todavía no está publicada.</strong><p>La estructura está preparada para incorporar los recursos cuando estén disponibles.</p></div>`;

  const stories = [
    ["Informe central", "Qué se hizo, cuánto se ejecutó y cuáles fueron los resultados principales."],
    ["La gestión en historias", "Una explicación más cercana del impacto de los proyectos y decisiones."],
    ["Preguntas de la ciudadanía", "Respuestas oficiales y aclaraciones relacionadas con la vigencia."]
  ];
  document.querySelector("#yearStories").innerHTML = stories.map((story,index) => `
    <article class="news-story reveal">
      <div class="news-story__number">0${index+1}</div>
      <small>EDICIÓN ${year.year}</small>
      <h3>${story[0]}</h3>
      <p>${story[1]}</p>
      <button data-story-index="${index}">Leer historia →</button>
    </article>`).join("");

  document.addEventListener("click", event => {
    const resourceButton = event.target.closest("[data-resource-id]");
    if (resourceButton) {
      const resource = state.resources.find(r => r.id === resourceButton.dataset.resourceId);
      if (!resource) return;
      document.querySelector("#resourcePreviewContent").innerHTML = `
        <div class="resource-preview">
          <div class="resource-preview__icon">${helpers.typeIcon(resource.type)}</div>
          <div><span class="section-kicker">${resource.year} · ${helpers.typeLabel(resource.type).toUpperCase()}</span><h2>${helpers.escape(resource.title)}</h2><p>${helpers.escape(resource.description)}</p><div class="resource-preview__meta">${helpers.escape(resource.meta)}</div><a class="button button-primary" href="${helpers.safeUrl(resource.url)}">Abrir recurso</a></div>
        </div>`;
      openDialog("resourcePreviewDialog");
    }

    const storyButton = event.target.closest("[data-story-index]");
    if (storyButton) {
      const story = stories[Number(storyButton.dataset.storyIndex)];
      document.querySelector("#storyDialogContent").innerHTML = `<span class="section-kicker">HISTORIA DE LA GESTIÓN</span><h2>${story[0]}</h2><p>${story[1]}</p><p>Este módulo puede ampliarse con fotografías, testimonios, cifras destacadas y documentos relacionados de la vigencia ${year.year}.</p>`;
      openDialog("storyDialog");
    }
  });

  const dashboardScript = document.createElement("script");
  dashboardScript.src = "dashboard.js?v=10.7-professional-repair";
  dashboardScript.onload = () => {
    window.RendicionDashboard?.init?.(year.year);
    window.setTimeout(() => initPremiumModuleMotion(document), 80);
  };
  dashboardScript.onerror = () => helpers.toast("No fue posible cargar el tablero de indicadores.");
  document.head.appendChild(dashboardScript);

  window.addEventListener("firebase:data", () => window.RendicionDashboard?.refresh?.(year.year));
  window.dispatchEvent(new CustomEvent("portal:rendered"));
  window.setTimeout(() => initPremiumModuleMotion(document), 70);

  document.querySelector("#yearNewsletter").addEventListener("submit", event => {
    event.preventDefault();
    event.target.reset();
    helpers.toast("Suscripción registrada en la demostración.");
  });
});