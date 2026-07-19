(() => {
  "use strict";

  const BUILD = "11.43-proyectos-dock";
  const MIN_PROJECTS = 5;
  const MAX_PROJECTS = 10;
  const PALETTE = [
    ["#238fd3", "#0c4f86"],
    ["#42ad9f", "#176d67"],
    ["#745bd3", "#443397"],
    ["#df8556", "#9f482b"],
    ["#d85f82", "#91364f"],
    ["#3f91d6", "#205e9b"],
    ["#54aa68", "#28723d"],
    ["#d39a37", "#865f19"],
    ["#5378c8", "#2e4a8b"],
    ["#9869c9", "#633b91"]
  ];

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function hexToRgb(hex) {
    const match = String(hex || "").match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return "35,143,211";
    return match.slice(1).map(part => parseInt(part, 16)).join(",");
  }

  function shadeHex(hex, amount) {
    const match = String(hex || "").match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return "#0c4f86";
    const values = match.slice(1).map(part => clamp(parseInt(part, 16) + amount, 0, 255));
    return `#${values.map(value => value.toString(16).padStart(2, "0")).join("")}`;
  }

  function titleMarkup(text) {
    const words = String(text || "Proyecto").trim().split(/\s+/).filter(Boolean);
    const last = words.pop() || "Proyecto";
    return words.length
      ? `${escapeHtml(words.join(" "))} <em>${escapeHtml(last)}</em>`
      : `<em>${escapeHtml(last)}</em>`;
  }

  function defaultProject(index) {
    const [color, dark] = PALETTE[index % PALETTE.length];
    return {
      id: `project-${String(index + 1).padStart(2, "0")}`,
      title: `Proyecto ${String(index + 1).padStart(2, "0")}`,
      category: "Por registrar",
      type: "Carpeta de proyecto",
      year: "2026",
      status: "Información pendiente",
      icon: "PR",
      color,
      dark,
      metric: "—",
      metricLabel: "Indicador por registrar",
      progress: 0,
      secondaryMetric: "Espacio disponible para documentar el proyecto.",
      description: "Esta carpeta está preparada para registrar la información, fotografías, avances, resultados y compromisos del proyecto.",
      tags: ["Proyecto", "Rendición de cuentas"],
      objective: "Objetivo por registrar.",
      result: "Resultado por registrar.",
      next: "Próximo paso por registrar.",
      image: "",
      gallery: [],
      url: ""
    };
  }

  function normalizeProject(project, index) {
    const fallback = defaultProject(index);
    const color = /^#[0-9a-f]{6}$/i.test(String(project?.color || "")) ? project.color : fallback.color;
    const dark = /^#[0-9a-f]{6}$/i.test(String(project?.dark || "")) ? project.dark : shadeHex(color, -38);
    return {
      ...fallback,
      ...project,
      id: String(project?.id || fallback.id),
      title: String(project?.title || fallback.title).trim(),
      category: String(project?.category || fallback.category).trim(),
      type: String(project?.type || fallback.type).trim(),
      year: String(project?.year || fallback.year).trim(),
      status: String(project?.status || fallback.status).trim(),
      icon: String(project?.icon || fallback.icon).trim().slice(0, 3).toUpperCase(),
      color,
      dark,
      rgb: hexToRgb(color),
      metric: String(project?.metric ?? fallback.metric),
      metricLabel: String(project?.metricLabel || fallback.metricLabel).trim(),
      progress: clamp(Number(project?.progress || 0), 0, 100),
      secondaryMetric: String(project?.secondaryMetric || fallback.secondaryMetric).trim(),
      description: String(project?.description || fallback.description).trim(),
      tags: Array.isArray(project?.tags)
        ? project.tags.map(String).map(item => item.trim()).filter(Boolean).slice(0, 8)
        : String(project?.tags || "").split(",").map(item => item.trim()).filter(Boolean).slice(0, 8),
      objective: String(project?.objective || fallback.objective).trim(),
      result: String(project?.result || fallback.result).trim(),
      next: String(project?.next || fallback.next).trim(),
      image: String(project?.image || "").trim(),
      gallery: Array.isArray(project?.gallery)
        ? project.gallery.map(String).map(item => item.trim()).filter(Boolean).slice(0, 10)
        : String(project?.gallery || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean).slice(0, 10),
      url: String(project?.url || "").trim()
    };
  }

  function isSafeUrl(value) {
    const url = String(value || "").trim();
    if (!url) return false;
    if (/^(javascript|data|vbscript):/i.test(url)) return false;
    return /^(https?:\/\/|\/|\.\/|\.\.\/|[a-z0-9_-]+\.html(?:[?#].*)?$)/i.test(url);
  }

  function init() {
    const root = q("#projectsPsp");
    if (!root || root.dataset.initialized === "true" || !window.Portal) return;
    root.dataset.initialized = "true";

    const { state, helpers } = window.Portal;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = matchMedia("(pointer: coarse)");

    if (!state.content || typeof state.content !== "object") state.content = {};
    let projects = Array.isArray(state.content.projects)
      ? state.content.projects.map(normalizeProject)
      : [];
    while (projects.length < MIN_PROJECTS) projects.push(defaultProject(projects.length));
    projects = projects.slice(0, MAX_PROJECTS).map(normalizeProject);
    state.content.projects = projects;

    let activeIndex = 0;
    let activeCategory = "Todos";
    let visibleIndices = projects.map((_, index) => index);
    let managerIndex = 0;
    let pointerMoved = false;
    let pointerStartX = 0;
    let lastFocusedBeforeDialog = null;

    const dom = {
      carousel: q("#projectsCarousel", root),
      viewport: q("#projectsDockViewport", root),
      index: q("#projectsIndex", root),
      eyebrow: q("#projectsEyebrow", root),
      title: q("#projectsTitle", root),
      description: q("#projectsDescription", root),
      tags: q("#projectsTags", root),
      metric: q("#projectsMetric", root),
      metricLabel: q("#projectsMetricLabel", root),
      metricBar: q("#projectsMetricBar", root),
      secondary: q("#projectsSecondary", root),
      progressText: q("#projectsProgressText", root),
      progressBar: q("#projectsProgressBar", root),
      prev: q("#projectsPrev", root),
      next: q("#projectsNext", root),
      manage: q("#projectsManage", root),
      details: q("#projectsDetails", root),
      detailsBackdrop: q("#projectsDetailsBackdrop", root),
      detailsClose: q("#projectsDetailsClose", root),
      detailsSecondaryClose: q("#projectsDetailsSecondaryClose", root),
      detailsCover: q("#projectsDetailsCover", root),
      detailsImage: q("#projectsDetailsImage", root),
      detailsFallbackIcon: q("#projectsDetailsFallbackIcon", root),
      detailsIndex: q("#projectsDetailsIndex", root),
      detailsEyebrow: q("#projectsDetailsEyebrow", root),
      detailsStatus: q("#projectsDetailsStatus", root),
      detailsTitle: q("#projectsDetailsTitle", root),
      detailsYear: q("#projectsDetailsYear", root),
      detailsDescription: q("#projectsDetailsDescription", root),
      detailsTags: q("#projectsDetailsTags", root),
      detailsObjective: q("#projectsDetailsObjective", root),
      detailsResult: q("#projectsDetailsResult", root),
      detailsNext: q("#projectsDetailsNext", root),
      detailsGallery: q("#projectsDetailsGallery", root),
      detailsMore: q("#projectsDetailsMore", root),
      manager: q("#projectsManager", root),
      managerBackdrop: q("#projectsManagerBackdrop", root),
      managerClose: q("#projectsManagerClose", root),
      managerList: q("#projectsManagerList", root),
      managerAdd: q("#projectsManagerAdd", root),
      managerForm: q("#projectsManagerForm", root),
      managerDelete: q("#projectsManagerDelete", root)
    };

    function applyTheme(project) {
      root.style.setProperty("--projects-accent", project.color);
      root.style.setProperty("--projects-accent-dark", project.dark);
      root.style.setProperty("--projects-accent-rgb", project.rgb);
    }

    function matchesCategory(project, category) {
      if (category === "Todos") return true;
      const source = `${project.category} ${project.tags.join(" ")}`.toLowerCase();
      return source.includes(category.toLowerCase());
    }

    function currentVisiblePosition() {
      const position = visibleIndices.indexOf(activeIndex);
      return position >= 0 ? position : 0;
    }

    function renderDock() {
      visibleIndices = projects
        .map((project, index) => ({ project, index }))
        .filter(({ project }) => matchesCategory(project, activeCategory))
        .map(({ index }) => index);

      if (!visibleIndices.length) {
        activeCategory = "Todos";
        visibleIndices = projects.map((_, index) => index);
        qa("[data-project-category]", root).forEach(button => {
          button.classList.toggle("is-active", button.dataset.projectCategory === "Todos");
        });
      }
      if (!visibleIndices.includes(activeIndex)) activeIndex = visibleIndices[0];

      dom.carousel.innerHTML = visibleIndices.map(index => {
        const project = projects[index];
        const active = index === activeIndex;
        return `
          <button class="projects-folder ${active ? "is-active" : ""}"
            type="button"
            role="listitem"
            data-project-index="${index}"
            aria-label="Abrir ficha de ${escapeHtml(project.title)}"
            aria-current="${active ? "true" : "false"}"
            style="--folder-color:${escapeHtml(project.color)}">
            <span class="projects-folder__back" aria-hidden="true"></span>
            <span class="projects-folder__paper" aria-hidden="true"></span>
            <span class="projects-folder__front">
              <span class="projects-folder__top">
                <span class="projects-folder__icon">${escapeHtml(project.icon)}</span>
                <span class="projects-folder__index">${String(index + 1).padStart(2, "0")}</span>
              </span>
              <span class="projects-folder__content">
                <span class="projects-folder__category">${escapeHtml(project.category)}</span>
                <strong class="projects-folder__title">${titleMarkup(project.title)}</strong>
                <span class="projects-folder__meta"><span>${escapeHtml(project.year)}</span><span>${escapeHtml(project.status)}</span></span>
              </span>
            </span>
          </button>`;
      }).join("");

      updateSummary(true);
      resetDockMagnification();
    }

    function animateSummary() {
      if (reducedMotion.matches) return;
      [dom.eyebrow, dom.title, dom.description, dom.tags, dom.metric, dom.metricLabel, dom.secondary]
        .filter(Boolean)
        .forEach((element, index) => {
          element.getAnimations?.().forEach(animation => animation.cancel());
          element.animate([
            { opacity: .2, transform: "translateY(9px)" },
            { opacity: 1, transform: "translateY(0)" }
          ], {
            duration: 340 + index * 24,
            delay: index * 18,
            easing: "cubic-bezier(.2,.82,.2,1)",
            fill: "both"
          });
        });
    }

    function updateSummary(initial = false) {
      const project = projects[activeIndex];
      if (!project) return;
      applyTheme(project);
      dom.index.textContent = String(activeIndex + 1).padStart(2, "0");
      dom.eyebrow.textContent = `${project.category} · ${project.type}`;
      dom.title.innerHTML = titleMarkup(project.title);
      dom.description.textContent = project.description;
      dom.tags.innerHTML = project.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
      dom.metric.textContent = project.metric;
      dom.metricLabel.textContent = project.metricLabel;
      dom.metricBar.style.setProperty("--metric-value", `${project.progress}%`);
      dom.secondary.textContent = project.secondaryMetric;

      qa(".projects-folder", dom.carousel).forEach(folder => {
        const folderIndex = Number(folder.dataset.projectIndex);
        const isActive = folderIndex === activeIndex;
        folder.classList.toggle("is-active", isActive);
        folder.setAttribute("aria-current", String(isActive));
      });

      const position = currentVisiblePosition();
      const total = visibleIndices.length;
      dom.progressText.textContent = `Proyecto ${position + 1} de ${total}`;
      dom.progressBar.style.width = `${total > 1 ? (position / (total - 1)) * 100 : 100}%`;
      dom.prev.disabled = position <= 0;
      dom.next.disabled = position >= total - 1;
      if (!initial) animateSummary();
    }

    function selectProject(index, { scroll = true, focus = false } = {}) {
      if (!projects[index]) return;
      activeIndex = index;
      updateSummary(false);
      const folder = q(`.projects-folder[data-project-index="${index}"]`, dom.carousel);
      if (scroll) folder?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", inline: "center", block: "nearest" });
      if (focus) folder?.focus({ preventScroll: true });
    }

    function moveSelection(direction) {
      const position = currentVisiblePosition();
      const nextPosition = clamp(position + direction, 0, visibleIndices.length - 1);
      selectProject(visibleIndices[nextPosition], { scroll: true, focus: true });
    }

    function resetDockMagnification() {
      qa(".projects-folder", dom.carousel).forEach(folder => {
        const isActive = Number(folder.dataset.projectIndex) === activeIndex;
        folder.style.setProperty("--dock-scale", isActive ? "1.055" : "1");
        folder.style.setProperty("--dock-lift", isActive ? "5px" : "0px");
        folder.style.setProperty("--dock-tilt", "0deg");
        folder.style.setProperty("--dock-z", isActive ? "8" : "1");
      });
    }

    function magnifyDock(pointerX) {
      if (coarsePointer.matches || reducedMotion.matches) return;
      qa(".projects-folder", dom.carousel).forEach(folder => {
        const rect = folder.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const distance = Math.abs(pointerX - center);
        const influence = clamp(1 - distance / 300, 0, 1);
        const selected = Number(folder.dataset.projectIndex) === activeIndex ? .045 : 0;
        const scale = 1 + influence * .42 + selected;
        const lift = influence * 34 + selected * 70;
        const tilt = clamp((pointerX - center) / 75, -1, 1) * influence * 1.5;
        folder.style.setProperty("--dock-scale", scale.toFixed(3));
        folder.style.setProperty("--dock-lift", `${lift.toFixed(1)}px`);
        folder.style.setProperty("--dock-tilt", `${tilt.toFixed(2)}deg`);
        folder.style.setProperty("--dock-z", String(10 + Math.round(influence * 90)));
      });
    }

    function populateDetails() {
      const project = projects[activeIndex];
      applyTheme(project);
      dom.detailsCover.style.setProperty("--projects-accent", project.color);
      dom.detailsCover.style.setProperty("--projects-accent-dark", project.dark);
      dom.detailsFallbackIcon.textContent = project.icon;
      dom.detailsIndex.textContent = String(activeIndex + 1).padStart(2, "0");
      dom.detailsEyebrow.textContent = `${project.category} · ${project.type}`;
      dom.detailsStatus.textContent = project.status;
      dom.detailsTitle.textContent = project.title;
      dom.detailsYear.textContent = project.year;
      dom.detailsDescription.textContent = project.description;
      dom.detailsTags.innerHTML = project.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
      dom.detailsObjective.textContent = project.objective;
      dom.detailsResult.textContent = project.result;
      dom.detailsNext.textContent = project.next;

      dom.detailsImage.hidden = !project.image;
      dom.detailsCover.classList.toggle("is-empty", !project.image);
      if (project.image) {
        dom.detailsImage.src = project.image;
        dom.detailsImage.alt = `Imagen principal de ${project.title}`;
      } else {
        dom.detailsImage.removeAttribute("src");
        dom.detailsImage.alt = "";
      }

      dom.detailsGallery.innerHTML = project.gallery.map((src, index) =>
        `<img src="${escapeHtml(src)}" alt="Fotografía ${index + 1} de ${escapeHtml(project.title)}" loading="lazy">`
      ).join("");

      const hasUrl = isSafeUrl(project.url);
      dom.detailsMore.setAttribute("aria-disabled", String(!hasUrl));
      dom.detailsMore.dataset.url = hasUrl ? project.url : "";
    }

    function openDetails() {
      populateDetails();
      lastFocusedBeforeDialog = document.activeElement;
      dom.details.classList.add("is-open");
      dom.details.setAttribute("aria-hidden", "false");
      document.body.classList.add("projects-dialog-open");
      window.setTimeout(() => dom.detailsClose.focus({ preventScroll: true }), 30);
    }

    function closeDetails() {
      dom.details.classList.remove("is-open");
      dom.details.setAttribute("aria-hidden", "true");
      document.body.classList.remove("projects-dialog-open");
      lastFocusedBeforeDialog?.focus?.({ preventScroll: true });
    }

    function openProjectUrl() {
      const url = dom.detailsMore.dataset.url || "";
      if (!isSafeUrl(url)) {
        helpers.toast?.("Este proyecto aún no tiene configurado un enlace completo.");
        return;
      }
      if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
      else window.location.href = url;
    }

    function trapDialogFocus(event, dialogRoot) {
      if (event.key !== "Tab") return;
      const focusable = qa('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])', dialogRoot)
        .filter(element => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function updateAdminVisibility() {
      let localMode = false;
      try { localMode = sessionStorage.getItem("sp_admin_mode") === "local"; } catch (_) {}
      const adminSession = q("#adminSession");
      const canManage = Boolean(state.admin) || localMode || Boolean(adminSession && !adminSession.hidden);
      dom.manage.hidden = !canManage;
    }

    function saveProjects(message) {
      state.content.projects = projects.map(normalizeProject);
      helpers.save();
      helpers.toast?.(message);
      window.dispatchEvent(new CustomEvent("portal:rendered", { detail: { source: "projects-psp", build: BUILD } }));
    }

    function renderManager() {
      managerIndex = clamp(managerIndex, 0, projects.length - 1);
      dom.managerList.innerHTML = projects.map((project, index) => `
        <button type="button" class="projects-manager__item ${index === managerIndex ? "is-active" : ""}" data-manager-index="${index}">
          <span><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.category)} · ${escapeHtml(project.year)}</small></span>
          <b>${String(index + 1).padStart(2, "0")}</b>
        </button>`).join("");
      dom.managerAdd.disabled = projects.length >= MAX_PROJECTS;
      fillManagerForm();
    }

    function fillManagerForm() {
      const project = projects[managerIndex];
      if (!project || !dom.managerForm) return;
      const form = dom.managerForm.elements;
      ["id", "title", "category", "type", "year", "status", "icon", "color", "metric", "metricLabel", "progress", "secondaryMetric", "description", "objective", "result", "next", "image", "url"]
        .forEach(name => { if (form[name]) form[name].value = project[name] ?? ""; });
      form.tags.value = project.tags.join(", ");
      form.gallery.value = project.gallery.join("\n");
      dom.managerDelete.disabled = projects.length <= MIN_PROJECTS;
    }

    function openManager() {
      updateAdminVisibility();
      if (dom.manage.hidden) return;
      lastFocusedBeforeDialog = document.activeElement;
      renderManager();
      dom.manager.classList.add("is-open");
      dom.manager.setAttribute("aria-hidden", "false");
      document.body.classList.add("projects-dialog-open");
      window.setTimeout(() => dom.managerClose.focus({ preventScroll: true }), 30);
    }

    function closeManager() {
      dom.manager.classList.remove("is-open");
      dom.manager.setAttribute("aria-hidden", "true");
      document.body.classList.remove("projects-dialog-open");
      lastFocusedBeforeDialog?.focus?.({ preventScroll: true });
    }

    function addProject() {
      if (projects.length >= MAX_PROJECTS) {
        helpers.toast?.("El módulo admite un máximo de 10 proyectos.");
        return;
      }
      projects.push(normalizeProject(defaultProject(projects.length), projects.length));
      managerIndex = projects.length - 1;
      saveProjects("Nueva carpeta de proyecto creada.");
      renderDock();
      renderManager();
    }

    function deleteProject() {
      if (projects.length <= MIN_PROJECTS) {
        helpers.toast?.("Deben permanecer al menos cinco carpetas de proyecto.");
        return;
      }
      const project = projects[managerIndex];
      if (!window.confirm(`¿Eliminar la carpeta “${project.title}”?`)) return;
      projects.splice(managerIndex, 1);
      managerIndex = clamp(managerIndex, 0, projects.length - 1);
      activeIndex = clamp(activeIndex, 0, projects.length - 1);
      saveProjects("Carpeta de proyecto eliminada.");
      renderDock();
      renderManager();
    }

    function saveManagerForm(event) {
      event.preventDefault();
      const data = new FormData(dom.managerForm);
      const current = projects[managerIndex];
      const color = String(data.get("color") || current.color);
      projects[managerIndex] = normalizeProject({
        ...current,
        id: String(data.get("id") || current.id),
        title: String(data.get("title") || current.title).trim(),
        category: String(data.get("category") || "Por registrar").trim(),
        type: String(data.get("type") || "Carpeta de proyecto").trim(),
        year: String(data.get("year") || "2026").trim(),
        status: String(data.get("status") || "Información pendiente").trim(),
        icon: String(data.get("icon") || "PR").trim().slice(0, 3).toUpperCase(),
        color,
        dark: shadeHex(color, -38),
        metric: String(data.get("metric") || "—").trim(),
        metricLabel: String(data.get("metricLabel") || "Indicador por registrar").trim(),
        progress: Number(data.get("progress") || 0),
        secondaryMetric: String(data.get("secondaryMetric") || "").trim(),
        description: String(data.get("description") || "").trim(),
        tags: String(data.get("tags") || "").split(",").map(item => item.trim()).filter(Boolean),
        objective: String(data.get("objective") || "").trim(),
        result: String(data.get("result") || "").trim(),
        next: String(data.get("next") || "").trim(),
        image: String(data.get("image") || "").trim(),
        gallery: String(data.get("gallery") || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean),
        url: String(data.get("url") || "").trim()
      }, managerIndex);
      activeIndex = managerIndex;
      saveProjects("Proyecto guardado correctamente.");
      renderDock();
      renderManager();
    }

    qa("[data-project-category]", root).forEach(button => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.projectCategory || "Todos";
        qa("[data-project-category]", root).forEach(item => item.classList.toggle("is-active", item === button));
        renderDock();
      });
    });

    dom.carousel.addEventListener("pointerdown", event => {
      pointerMoved = false;
      pointerStartX = event.clientX;
    });
    dom.carousel.addEventListener("pointermove", event => {
      if (Math.abs(event.clientX - pointerStartX) > 8) pointerMoved = true;
    });
    dom.carousel.addEventListener("click", event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder || pointerMoved) return;
      const index = Number(folder.dataset.projectIndex);
      selectProject(index, { scroll: true });
      openDetails();
    });
    dom.carousel.addEventListener("keydown", event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const index = Number(folder.dataset.projectIndex);
        selectProject(index, { scroll: true });
        openDetails();
      }
    });

    dom.viewport.addEventListener("pointermove", event => magnifyDock(event.clientX), { passive: true });
    dom.viewport.addEventListener("pointerleave", resetDockMagnification, { passive: true });
    dom.viewport.addEventListener("scroll", resetDockMagnification, { passive: true });
    dom.prev.addEventListener("click", () => moveSelection(-1));
    dom.next.addEventListener("click", () => moveSelection(1));

    dom.detailsBackdrop.addEventListener("click", closeDetails);
    dom.detailsClose.addEventListener("click", closeDetails);
    dom.detailsSecondaryClose.addEventListener("click", closeDetails);
    dom.detailsMore.addEventListener("click", openProjectUrl);
    dom.detailsImage.addEventListener("error", () => {
      dom.detailsImage.hidden = true;
      dom.detailsCover.classList.add("is-empty");
    });
    dom.detailsGallery.addEventListener("error", event => {
      if (event.target instanceof HTMLImageElement) event.target.remove();
    }, true);

    dom.manage.addEventListener("click", openManager);
    dom.managerBackdrop.addEventListener("click", closeManager);
    dom.managerClose.addEventListener("click", closeManager);
    dom.managerAdd.addEventListener("click", addProject);
    dom.managerDelete.addEventListener("click", deleteProject);
    dom.managerForm.addEventListener("submit", saveManagerForm);
    dom.managerList.addEventListener("click", event => {
      const button = event.target.closest("[data-manager-index]");
      if (!button) return;
      managerIndex = Number(button.dataset.managerIndex);
      renderManager();
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (dom.details.classList.contains("is-open")) closeDetails();
        else if (dom.manager.classList.contains("is-open")) closeManager();
      }
      if (dom.details.classList.contains("is-open")) trapDialogFocus(event, dom.details);
      if (dom.manager.classList.contains("is-open")) trapDialogFocus(event, dom.manager);
    });

    const revealObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        root.classList.add("is-visible");
        revealObserver.disconnect();
      }
    }, { threshold: .13 });
    revealObserver.observe(root);

    window.addEventListener("portal:rendered", updateAdminVisibility);
    window.addEventListener("resize", resetDockMagnification, { passive: true });
    reducedMotion.addEventListener?.("change", resetDockMagnification);

    renderDock();
    updateAdminVisibility();
    window.dispatchEvent(new CustomEvent("portal:rendered", { detail: { source: "projects-psp", build: BUILD } }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
