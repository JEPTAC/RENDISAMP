(() => {
  "use strict";
  if (window.__RUNNING_PROJECTS_COMPONENT__) return;
  window.__RUNNING_PROJECTS_COMPONENT__ = true;

  const FALLBACK_IMAGE = "assets/cinematica/parque-himno-1600.webp";
  const CACHE_KEY = "san-pedro-running-projects-v1";
  const instances = new WeakMap();
  let dialog = null;
  let currentDialogProject = null;
  let lastDialogTrigger = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
  const safeUrl = value => {
    const url = String(value || "").trim();
    if (!url || /^(javascript|data|vbscript):/i.test(url)) return "";
    return /^(https?:\/\/|\/|\.\/|\.\.\/|[a-z0-9_-]+\.html(?:[?#].*)?$)/i.test(url) ? url : "";
  };
  const hexToRgb = hex => {
    const clean = String(hex || "#1769a8").replace("#", "");
    const value = clean.length === 3 ? clean.split("").map(char => char + char).join("") : clean;
    const number = Number.parseInt(value, 16);
    if (!Number.isFinite(number)) return "23,105,168";
    return `${number >> 16},${(number >> 8) & 255},${number & 255}`;
  };
  const normalize = (project = {}, index = 0) => {
    const accent = /^#[0-9a-f]{6}$/i.test(String(project.accent || project.color || ""))
      ? String(project.accent || project.color)
      : "#1769a8";
    return {
      id: String(project.id || `running-${index + 1}`),
      title: String(project.title || `Proyecto en ejecución ${index + 1}`).trim(),
      image: String(project.image || FALLBACK_IMAGE).trim(),
      description: String(project.description || "Información del proyecto en preparación.").trim(),
      status: String(project.status || "En ejecución").trim(),
      progress: clamp(Number(project.progress ?? 0), 0, 100),
      startDate: String(project.startDate || project.start || "Por registrar").trim(),
      endDate: String(project.endDate || project.end || "Por registrar").trim(),
      location: String(project.location || "San Pedro").trim(),
      area: String(project.area || project.responsible || "Administración Municipal").trim(),
      category: String(project.category || "Proyecto").trim(),
      objective: String(project.objective || "Objetivo por registrar.").trim(),
      result: String(project.result || "Resultado por registrar.").trim(),
      next: String(project.next || "Próximo hito por registrar.").trim(),
      url: safeUrl(project.url),
      accent,
      rgb: hexToRgb(accent)
    };
  };

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function writeCache(projects) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(projects)); } catch (_) {}
  }

  function getProjects() {
    const configured = window.Portal?.state?.content?.runningProjects;
    const defaults = window.PROYECTOS_EN_EJECUCION_DEFAULTS || [];
    const cached = readCache();
    const source = Array.isArray(configured) && configured.length
      ? configured
      : (cached.length ? cached : defaults);
    const normalized = (Array.isArray(source) ? source : []).map(normalize).slice(0, 12);
    if (normalized.length) writeCache(normalized);
    return normalized;
  }

  function imageMarkup(project, className = "") {
    return `<img class="${className}" src="${escapeHtml(project.image)}" alt="Fotografía de ${escapeHtml(project.title)}" loading="lazy" data-running-project-image>`;
  }

  function cardMarkup(project, index) {
    return `
      <article class="running-projects__card" style="--card-accent:${escapeHtml(project.accent)}" data-running-card="${index}">
        <div class="running-projects__card-media">
          ${imageMarkup(project)}
          <span class="running-projects__status">${escapeHtml(project.status)}</span>
          <strong class="running-projects__percent">${project.progress}%</strong>
        </div>
        <div class="running-projects__card-body">
          <span class="running-projects__category">${escapeHtml(project.category)}</span>
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.description)}</p>
          <div class="running-projects__bar" aria-label="Avance ${project.progress}%"><i data-progress="${project.progress}"></i></div>
          <div class="running-projects__card-footer">
            <span class="running-projects__dates">${escapeHtml(project.startDate)}<br>hasta ${escapeHtml(project.endDate)}</span>
            <button class="running-projects__open" type="button" data-running-open="${index}">Ver más</button>
          </div>
        </div>
      </article>`;
  }

  function compactMarkup(projects) {
    const visible = projects.slice(0, 3);
    return `
      <div class="running-projects__shell">
        <header class="running-projects__head">
          <div class="running-projects__head-copy">
            <span class="running-projects__kicker">Seguimiento activo</span>
            <h2 class="running-projects__title">Proyectos en <em>ejecución</em></h2>
            <p class="running-projects__lead">Conozca los proyectos que avanzan actualmente, su estado y el porcentaje de ejecución reportado.</p>
          </div>
          <a class="running-projects__all" href="proyectos.html#proyectos-en-ejecucion">Ver todos los proyectos →</a>
        </header>
        <div class="running-projects__grid">${visible.map(cardMarkup).join("")}</div>
      </div>`;
  }

  function railMarkup(projects, active) {
    return projects.map((project, index) => `
      <button class="running-projects__rail-button ${index === active ? "is-active" : ""}" type="button" data-running-select="${index}" aria-pressed="${index === active}">
        ${imageMarkup(project)}
        <span><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.status)} · ${project.progress}%</small></span>
      </button>`).join("");
  }

  function fullMarkup(projects, active = 0) {
    const project = projects[active] || projects[0];
    return `
      <div class="running-projects__shell">
        <header class="running-projects__head">
          <div class="running-projects__head-copy">
            <span class="running-projects__kicker">Seguimiento institucional</span>
            <h2 class="running-projects__title">Proyectos en <em>ejecución</em></h2>
            <p class="running-projects__lead">Recorra los proyectos activos, consulte su avance y abra una ficha ampliada con información relevante.</p>
          </div>
        </header>
        <div class="running-projects__stage" data-running-stage>
          <div class="running-projects__visual">
            ${imageMarkup(project, "running-projects__active-image")}
            <div class="running-projects__visual-overlay"><span data-running-category>${escapeHtml(project.category)}</span><h3 data-running-title>${escapeHtml(project.title)}</h3></div>
          </div>
          <div class="running-projects__panel">
            <div class="running-projects__panel-status"><span data-running-status>${escapeHtml(project.status)}</span><strong data-running-progress>${project.progress}%</strong></div>
            <div class="running-projects__bar" aria-label="Avance ${project.progress}%"><i data-running-progress-bar data-progress="${project.progress}"></i></div>
            <p data-running-description>${escapeHtml(project.description)}</p>
            <div class="running-projects__facts">
              <div class="running-projects__fact"><small>Inicio</small><strong data-running-start>${escapeHtml(project.startDate)}</strong></div>
              <div class="running-projects__fact"><small>Finalización estimada</small><strong data-running-end>${escapeHtml(project.endDate)}</strong></div>
              <div class="running-projects__fact"><small>Ubicación</small><strong data-running-location>${escapeHtml(project.location)}</strong></div>
              <div class="running-projects__fact"><small>Área responsable</small><strong data-running-area>${escapeHtml(project.area)}</strong></div>
            </div>
            <div class="running-projects__panel-actions">
              <button class="running-projects__nav" type="button" data-running-prev aria-label="Proyecto anterior">←</button>
              <button class="running-projects__details" type="button" data-running-open="${active}">Ver proyecto completo</button>
              <button class="running-projects__nav" type="button" data-running-next aria-label="Proyecto siguiente">→</button>
            </div>
          </div>
        </div>
        <div class="running-projects__rail" role="list" aria-label="Proyectos en ejecución">${railMarkup(projects, active)}</div>
      </div>`;
  }

  function animateProgress(root) {
    const bars = [...root.querySelectorAll("[data-progress]")];
    requestAnimationFrame(() => bars.forEach(bar => {
      bar.style.width = `${clamp(Number(bar.dataset.progress || 0), 0, 100)}%`;
    }));
  }

  function setFallbackOnError(root) {
    root.addEventListener("error", event => {
      if (!(event.target instanceof HTMLImageElement) || !event.target.matches("[data-running-project-image]")) return;
      if (event.target.dataset.fallbackApplied === "true") return;
      event.target.dataset.fallbackApplied = "true";
      event.target.src = FALLBACK_IMAGE;
    }, true);
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "running-projects-dialog";
    dialog.setAttribute("aria-labelledby", "runningProjectsDialogTitle");
    dialog.innerHTML = `<button class="running-projects-dialog__close" type="button" aria-label="Cerrar">×</button><div data-running-dialog-content></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector(".running-projects-dialog__close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
    dialog.addEventListener("close", () => {
      lastDialogTrigger?.focus?.({ preventScroll: true });
      currentDialogProject = null;
    });
    setFallbackOnError(dialog);
    return dialog;
  }

  function openDialog(project, trigger) {
    const modal = ensureDialog();
    currentDialogProject = project;
    lastDialogTrigger = trigger || document.activeElement;
    modal.style.setProperty("--dialog-accent", project.accent);
    const url = safeUrl(project.url);
    modal.querySelector("[data-running-dialog-content]").innerHTML = `
      <div class="running-projects-dialog__grid">
        <div class="running-projects-dialog__media">${imageMarkup(project)}</div>
        <div class="running-projects-dialog__body">
          <span>${escapeHtml(project.category)} · ${escapeHtml(project.status)}</span>
          <h3 id="runningProjectsDialogTitle">${escapeHtml(project.title)}</h3>
          <p class="running-projects-dialog__description">${escapeHtml(project.description)}</p>
          <div class="running-projects-dialog__progress"><strong>${project.progress}%</strong><div><i style="width:${project.progress}%"></i></div></div>
          <div class="running-projects-dialog__facts">
            <div><small>Inicio</small><strong>${escapeHtml(project.startDate)}</strong></div>
            <div><small>Finalización estimada</small><strong>${escapeHtml(project.endDate)}</strong></div>
            <div><small>Ubicación</small><strong>${escapeHtml(project.location)}</strong></div>
            <div><small>Área responsable</small><strong>${escapeHtml(project.area)}</strong></div>
          </div>
          <div class="running-projects-dialog__sections">
            <div><small>Objetivo</small><strong>${escapeHtml(project.objective)}</strong></div>
            <div><small>Resultado actual</small><strong>${escapeHtml(project.result)}</strong></div>
            <div><small>Siguiente hito</small><strong>${escapeHtml(project.next)}</strong></div>
          </div>
          ${url ? `<a class="running-projects-dialog__link" href="${escapeHtml(url)}">Ir al proyecto →</a>` : ""}
        </div>
      </div>`;
    if (!modal.open) modal.showModal();
    requestAnimationFrame(() => modal.querySelector(".running-projects-dialog__close")?.focus({ preventScroll: true }));
  }

  function applyProject(instance, index, animate = true) {
    const { root, projects } = instance;
    const preservedScrollY = window.scrollY;
    const nextIndex = (index + projects.length) % projects.length;
    const project = projects[nextIndex];
    if (!project) return;
    instance.active = nextIndex;
    root.style.setProperty("--rp-accent", project.accent);
    root.style.setProperty("--rp-accent-rgb", project.rgb);
    if (animate) root.classList.add("is-switching");
    const image = root.querySelector(".running-projects__active-image");
    const setters = {
      "[data-running-category]": project.category,
      "[data-running-title]": project.title,
      "[data-running-status]": project.status,
      "[data-running-progress]": `${project.progress}%`,
      "[data-running-description]": project.description,
      "[data-running-start]": project.startDate,
      "[data-running-end]": project.endDate,
      "[data-running-location]": project.location,
      "[data-running-area]": project.area
    };
    Object.entries(setters).forEach(([selector, value]) => {
      const element = root.querySelector(selector);
      if (element) element.textContent = value;
    });
    if (image) {
      image.alt = `Fotografía de ${project.title}`;
      image.src = project.image;
      image.dataset.fallbackApplied = "false";
    }
    const bar = root.querySelector("[data-running-progress-bar]");
    if (bar) {
      bar.dataset.progress = String(project.progress);
      bar.style.width = "0%";
      requestAnimationFrame(() => bar.style.width = `${project.progress}%`);
    }
    const details = root.querySelector(".running-projects__details");
    if (details) details.dataset.runningOpen = String(nextIndex);
    root.querySelectorAll("[data-running-select]").forEach(button => {
      const active = Number(button.dataset.runningSelect) === nextIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - preservedScrollY) <= 120) window.scrollTo(0, preservedScrollY);
    }));
    window.setTimeout(() => root.classList.remove("is-switching"), 390);
  }

  function bindInstance(instance) {
    const { root, projects, mode } = instance;
    setFallbackOnError(root);
    root.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.target.closest("[data-running-prev],[data-running-next],[data-running-select]")) {
        event.preventDefault();
      }
    });
    root.addEventListener("click", event => {
      const open = event.target.closest("[data-running-open]");
      if (open) {
        const project = projects[Number(open.dataset.runningOpen)];
        if (project) openDialog(project, open);
        return;
      }
      if (mode !== "full") return;
      const select = event.target.closest("[data-running-select]");
      if (select) {
        applyProject(instance, Number(select.dataset.runningSelect));
        select.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest", inline: "center" });
        return;
      }
      if (event.target.closest("[data-running-prev]")) applyProject(instance, instance.active - 1);
      if (event.target.closest("[data-running-next]")) applyProject(instance, instance.active + 1);
    });
    root.addEventListener("keydown", event => {
      if (mode !== "full" || !root.matches(":hover") && !root.contains(document.activeElement)) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); applyProject(instance, instance.active - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); applyProject(instance, instance.active + 1); }
    });
  }

  function render(root) {
    const projects = getProjects();
    const mode = root.dataset.mode === "full" ? "full" : "compact";
    if (!projects.length) {
      root.innerHTML = `<div class="running-projects__shell"><div class="running-projects__fallback"><div><strong>Proyectos en ejecución</strong><span>La información se encuentra en preparación.</span></div></div></div>`;
      return;
    }
    const existing = instances.get(root);
    const active = existing ? clamp(existing.active, 0, projects.length - 1) : 0;
    root.innerHTML = mode === "full" ? fullMarkup(projects, active) : compactMarkup(projects);
    root.classList.add("is-reveal-ready", "is-visible");
    const instance = { root, projects, mode, active };
    instances.set(root, instance);
    bindInstance(instance);
    animateProgress(root);
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      root.classList.add("is-visible");
      animateProgress(root);
      observer.disconnect();
    }, { threshold: .12 });
    observer.observe(root);
  }

  function refreshAll() {
    document.querySelectorAll("[data-running-projects]").forEach(render);
  }

  window.RunningProjects = {
    refresh: refreshAll,
    getData: getProjects,
    schema: ["id","title","image","description","status","progress","startDate","endDate","location","area","category","objective","result","next","url","accent"]
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshAll, { once: true });
  else refreshAll();

  ["portal:datachange","firebase:auth","portal:adminlogout"].forEach(eventName => {
    window.addEventListener(eventName, () => window.setTimeout(refreshAll, 0));
  });
  window.addEventListener("pageshow", () => window.setTimeout(refreshAll, 0));
})();
