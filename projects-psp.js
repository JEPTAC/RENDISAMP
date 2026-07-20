(() => {
  "use strict";

  const BUILD = "11.51-proyectos-continuous-dock";
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

  function resolveMedia(value, fallback = "") {
    if (window.DriveMedia?.resolveUrl) return window.DriveMedia.resolveUrl(value, fallback);
    if (value && typeof value === "object") return value.thumbnailUrl || value.webContentLink || value.webViewLink || value.url || fallback;
    return String(value || fallback);
  }

  function normalizeReference(value) {
    if (!value || typeof value !== "object") return null;
    return window.DriveMedia?.normalize ? window.DriveMedia.normalize(value) : value;
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
      imageRef: normalizeReference(project?.imageRef || (project?.image && typeof project.image === "object" ? project.image : null)),
      image: resolveMedia(project?.imageRef || project?.image, "").trim(),
      galleryRefs: Array.isArray(project?.galleryRefs)
        ? project.galleryRefs.map(normalizeReference).filter(Boolean).slice(0, 10)
        : Array.isArray(project?.gallery)
          ? project.gallery.filter(item => item && typeof item === "object").map(normalizeReference).filter(Boolean).slice(0, 10)
          : [],
      gallery: (Array.isArray(project?.galleryRefs) && project.galleryRefs.length
        ? project.galleryRefs.map(item => resolveMedia(item, ""))
        : Array.isArray(project?.gallery)
          ? project.gallery.map(item => resolveMedia(item, ""))
          : String(project?.gallery || "").split(/\r?\n/).map(item => item.trim()))
        .filter(Boolean).slice(0, 10),
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
    let pointerStartY = 0;
    let dragStartScrollLeft = 0;
    let draggingPointerId = null;
    let isDraggingDock = false;
    let suppressNextClick = false;
    let dockPointerInside = false;
    let dockPointerX = null;
    let dockAnimationFrame = 0;
    let dockScrollAnimationFrame = 0;
    let selectionAnimationTimer = 0;
    let audioContext = null;
    let audioUnlocked = false;
    let lastSelectionSoundAt = 0;
    let wheelAccumulator = 0;
    let wheelResetTimer = 0;
    let wheelPageLockTimer = 0;
    let wheelPageScrollY = 0;
    let dockPageScrollAnchor = 0;
    let wheelNavigationLocked = false;
    let lastFocusedBeforeDialog = null;
    let detailOpening = false;
    let dialogScrollY = 0;
    let summaryTransitionSequence = 0;
    let summaryAnimations = [];
    let dockSelectionAnimations = [];
    let suppressFocusAnimationUntil = 0;

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

    // Los diálogos se trasladan al <body> para que position:fixed siempre
    // tome como referencia la ventana y no cualquier ancestro animado.
    [dom.details, dom.manager].forEach(dialog => {
      if (dialog && dialog.parentElement !== document.body) document.body.appendChild(dialog);
    });

    function installDriveManagerControls() {
      if (!dom.managerForm || dom.managerForm.dataset.driveControls === "true") return;
      dom.managerForm.dataset.driveControls = "true";
      const imageInput = dom.managerForm.elements.image;
      const galleryInput = dom.managerForm.elements.gallery;
      if (imageInput) {
        imageInput.readOnly = true;
        imageInput.placeholder = "Seleccione una imagen desde Google Drive";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-secondary projects-manager__drive";
        button.textContent = "Elegir imagen en Drive";
        button.addEventListener("click", async () => {
          const reference = await window.DriveMedia?.choose?.({ modulePath:"Proyectos/Galerías", accept:"image/*", title:"Imagen principal del proyecto", makePublic:true });
          if (!reference) return;
          projects[managerIndex].imageRef = reference;
          projects[managerIndex].image = resolveMedia(reference, "");
          imageInput.value = reference.name || reference.driveFileId || "Imagen seleccionada";
        });
        imageInput.closest("label")?.appendChild(button);
      }
      if (galleryInput) {
        galleryInput.readOnly = true;
        galleryInput.placeholder = "Seleccione la galería desde Google Drive";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button button-secondary projects-manager__drive";
        button.textContent = "Elegir galería en Drive";
        button.addEventListener("click", async () => {
          const references = await window.DriveMedia?.choose?.({ modulePath:"Proyectos/Galerías", accept:"image/*", multiple:true, title:"Galería del proyecto", makePublic:true });
          const list = Array.isArray(references) ? references : references ? [references] : [];
          if (!list.length) return;
          projects[managerIndex].galleryRefs = list.slice(0,10);
          projects[managerIndex].gallery = list.map(item => resolveMedia(item, "")).filter(Boolean);
          galleryInput.value = list.map(item => item.name || item.driveFileId).join("\n");
        });
        galleryInput.closest("label")?.appendChild(button);
      }
    }
    installDriveManagerControls();

    function applyTheme(project) {
      [root, dom.details, dom.manager].filter(Boolean).forEach(element => {
        element.style.setProperty("--projects-accent", project.color);
        element.style.setProperty("--projects-accent-dark", project.dark);
        element.style.setProperty("--projects-accent-rgb", project.rgb);
        element.style.setProperty("--projects-ink", "#09284e");
        element.style.setProperty("--projects-copy", "#55718e");
        element.style.setProperty("--projects-ease", "cubic-bezier(.2,.82,.2,1)");
      });
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
            data-project-index="${index}"
            tabindex="${active ? "0" : "-1"}"
            aria-roledescription="carpeta de proyecto"
            aria-label="${escapeHtml(project.title)}. ${escapeHtml(project.category)}. Presione Enter para abrir la ficha."
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

    function setProjectTitle(element, value) {
      if (!element) return;
      const words = String(value || "Proyecto").trim().split(/\s+/).filter(Boolean);
      const accentText = words.pop() || "Proyecto";
      const leadText = words.join(" ");

      let accent = element.querySelector("em");
      if (!accent) {
        accent = document.createElement("em");
        element.appendChild(accent);
      }

      let leadNode = [...element.childNodes].find(node =>
        node.nodeType === Node.TEXT_NODE && node !== accent
      );
      if (!leadNode) {
        leadNode = document.createTextNode("");
        element.insertBefore(leadNode, accent);
      }

      [...element.childNodes].forEach(node => {
        if (node !== leadNode && node !== accent) node.remove();
      });

      leadNode.nodeValue = leadText ? `${leadText} ` : "";
      accent.textContent = accentText;
    }

    function updateTagSlots(tags = []) {
      let slots = qa("[data-project-tag-slot]", dom.tags);
      while (slots.length < 8) {
        const slot = document.createElement("span");
        slot.dataset.projectTagSlot = String(slots.length);
        slot.hidden = true;
        dom.tags.appendChild(slot);
        slots.push(slot);
      }
      slots.forEach((slot, index) => {
        const value = tags[index] || "";
        slot.textContent = value;
        slot.hidden = !value;
      });
    }

    function commitSummaryContent(project) {
      dom.index.textContent = String(activeIndex + 1).padStart(2, "0");
      dom.eyebrow.textContent = `${project.category} · ${project.type}`;
      setProjectTitle(dom.title, project.title);
      dom.description.textContent = project.description;
      updateTagSlots(project.tags);
      dom.metric.textContent = project.metric;
      dom.metricLabel.textContent = project.metricLabel;
      dom.metricBar.style.setProperty("--metric-value", `${project.progress}%`);
      dom.secondary.textContent = project.secondaryMetric;
    }

    function cancelSummaryAnimations() {
      summaryAnimations.forEach(animation => {
        try { animation.cancel(); } catch (_) {}
      });
      summaryAnimations = [];
    }

    function transitionSummaryContent(project, direction = 1, initial = false) {
      const copy = dom.title?.closest(".projects-psp__summary-copy");
      const metric = dom.metric?.closest(".projects-psp__metric");
      const targets = [copy, metric].filter(Boolean);

      cancelSummaryAnimations();
      commitSummaryContent(project);

      if (initial || reducedMotion.matches || !targets.length || typeof targets[0].animate !== "function") {
        root.classList.remove("is-project-switching");
        return;
      }

      const sequence = ++summaryTransitionSequence;
      root.classList.add("is-project-switching");
      const enterX = direction >= 0 ? 22 : -22;

      const animations = targets.map((target, index) => target.animate([
        {
          opacity: .7,
          transform: `translate3d(${enterX * (index ? .42 : 1)}px,4px,0) scale(.992)`
        },
        {
          offset: .62,
          opacity: 1,
          transform: "translate3d(-1px,-1px,0) scale(1.002)"
        },
        {
          opacity: 1,
          transform: "translate3d(0,0,0) scale(1)"
        }
      ], {
        duration: index ? 310 : 360,
        delay: index * 24,
        easing: "cubic-bezier(.2,.72,.2,1)",
        fill: "both"
      }));


      summaryAnimations = animations;
      Promise.allSettled(animations.map(animation => animation.finished)).finally(() => {
        if (sequence !== summaryTransitionSequence) return;
        summaryAnimations = [];
        root.classList.remove("is-project-switching");
      });
    }

    function updateSummary(initial = false, direction = 1) {
      const project = projects[activeIndex];
      if (!project) return;
      applyTheme(project);

      qa(".projects-folder", dom.carousel).forEach(folder => {
        const folderIndex = Number(folder.dataset.projectIndex);
        const isActive = folderIndex === activeIndex;
        folder.classList.toggle("is-active", isActive);
        folder.setAttribute("aria-current", String(isActive));
        folder.tabIndex = isActive ? 0 : -1;
      });

      const position = currentVisiblePosition();
      const total = visibleIndices.length;
      dom.progressText.textContent = `Proyecto ${position + 1} de ${total}`;
      dom.progressBar.style.width = `${total > 1 ? (position / (total - 1)) * 100 : 100}%`;
      dom.prev.disabled = position <= 0;
      dom.next.disabled = position >= total - 1;

      transitionSummaryContent(project, direction, initial);
    }

    function unlockSelectionAudio() {
      if (audioUnlocked && audioContext) return audioContext;
      try {
        audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === "suspended") audioContext.resume?.();
        audioUnlocked = true;
      } catch (_) {
        audioUnlocked = false;
      }
      return audioContext;
    }

    function playSelectionSound(direction = 1, source = "program") {
      if (source === "program" || source === "filter" || !audioUnlocked) return;
      const context = unlockSelectionAudio();
      if (!context) return;
      const nowMs = performance.now();
      if (nowMs - lastSelectionSoundAt < 70) return;
      lastSelectionSoundAt = nowMs;
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(.0001, now);
      master.gain.exponentialRampToValueAtTime(.018, now + .008);
      master.gain.exponentialRampToValueAtTime(.0001, now + .14);
      master.connect(context.destination);
      const base = direction >= 0 ? 520 : 620;
      [
        {type:"sine", start:base, end:base * 1.18, gain:1},
        {type:"triangle", start:base * 1.5, end:base * 1.36, gain:.26}
      ].forEach(({type,start,end,gain}) => {
        const oscillator = context.createOscillator();
        const voiceGain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(start,now);
        oscillator.frequency.exponentialRampToValueAtTime(end,now + .11);
        voiceGain.gain.value = gain;
        oscillator.connect(voiceGain).connect(master);
        oscillator.start(now);
        oscillator.stop(now + .15);
      });
    }

    function cancelDockSelectionAnimations() {
      dockSelectionAnimations.forEach(animation => {
        try { animation.cancel(); } catch (_) {}
      });
      dockSelectionAnimations = [];
    }

    function animateDockSelection(previousIndex, nextIndex, direction = 1, source = "program") {
      cancelDockSelectionAnimations();
      if (reducedMotion.matches) return;
      const animations = [];
      qa(".projects-folder", dom.carousel).forEach(folder => {
        const index = Number(folder.dataset.projectIndex);
        const distance = Math.abs(index - nextIndex);
        const front = q(".projects-folder__front", folder);
        const paper = q(".projects-folder__paper", folder);
        if (!front?.animate) return;
        if (index === nextIndex) {
          animations.push(front.animate([
            { transform: "translate3d(0,-3px,0) scale(1.01)" },
            { offset: .62, transform: `translate3d(${-direction * 2}px,-14px,0) scale(1.045) rotateY(${-direction * 1.2}deg)` },
            { transform: "translate3d(0,0,0) scale(1) rotateY(0)" }
          ], { duration: 470, easing: "cubic-bezier(.2,.78,.2,1)", fill: "none" }));
          if (paper?.animate) animations.push(paper.animate([
            { transform: "translate3d(0,-10px,0)" },
            { offset: .62, transform: "translate3d(0,-22px,0)" },
            { transform: "translate3d(0,-12px,0)" }
          ], { duration: 470, easing: "cubic-bezier(.2,.78,.2,1)", fill: "none" }));
        } else if (index === previousIndex) {
          animations.push(front.animate([
            { transform: "translate3d(0,-4px,0) scale(1.015)" },
            { offset: .55, transform: `translate3d(${-direction * 7}px,3px,0) scale(.975)` },
            { transform: "translate3d(0,0,0) scale(1)" }
          ], { duration: 390, easing: "cubic-bezier(.2,.72,.2,1)", fill: "none" }));
        } else if (distance <= 2) {
          animations.push(front.animate([
            { transform: "translate3d(0,0,0)" },
            { offset: .55, transform: `translate3d(${direction * (3 - distance) * 2}px,-${Math.max(2,7-distance*2)}px,0)` },
            { transform: "translate3d(0,0,0)" }
          ], { duration: 380 + distance * 35, delay: distance * 18, easing: "cubic-bezier(.2,.72,.2,1)", fill: "none" }));
        }
      });
      dockSelectionAnimations = animations;
      if (previousIndex !== nextIndex) playSelectionSound(direction, source);
      Promise.allSettled(animations.map(animation => animation.finished)).finally(() => {
        if (dockSelectionAnimations === animations) dockSelectionAnimations = [];
      });
    }

    function triggerSelectionBounce(folder, source = "program") {
      if (!folder || reducedMotion.matches) return;
      const front = q(".projects-folder__front", folder);
      const paper = q(".projects-folder__paper", folder);
      const animations = [];
      if (front?.animate) animations.push(front.animate([
        { transform: "translate3d(0,0,0) scale(1)" },
        { offset: .58, transform: "translate3d(0,-11px,0) scale(1.025)" },
        { transform: "translate3d(0,0,0) scale(1)" }
      ], { duration: 420, easing: "cubic-bezier(.2,.76,.2,1)", fill: "none" }));
      if (paper?.animate) animations.push(paper.animate([
        { transform: "translate3d(0,-12px,0)" },
        { offset: .58, transform: "translate3d(0,-20px,0)" },
        { transform: "translate3d(0,-12px,0)" }
      ], { duration: 420, easing: "cubic-bezier(.2,.76,.2,1)", fill: "none" }));
      folder.dataset.selectionSource = source;
      dockSelectionAnimations.push(...animations);
    }

    function centerFolderInViewport(folder, behavior = "smooth") {
      if (!folder) return;
      if (dockScrollAnimationFrame) cancelAnimationFrame(dockScrollAnimationFrame);
      dom.viewport.classList.remove("is-programmatic-scroll");

      const maxScroll = Math.max(0, dom.viewport.scrollWidth - dom.viewport.clientWidth);
      const target = clamp(folder.offsetLeft + folder.offsetWidth / 2 - dom.viewport.clientWidth / 2, 0, maxScroll);
      const startLeft = dom.viewport.scrollLeft;
      const distance = target - startLeft;

      if (behavior === "auto" || Math.abs(distance) < 1) {
        dom.viewport.scrollLeft = target;
        return;
      }

      dom.viewport.classList.add("is-programmatic-scroll");
      const startedAt = performance.now();
      const duration = clamp(280 + Math.abs(distance) * .2, 300, 460);
      const ease = value => value < .5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2;

      const frame = now => {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        dom.viewport.scrollLeft = startLeft + distance * ease(progress);
        if (progress < 1) {
          dockScrollAnimationFrame = requestAnimationFrame(frame);
        } else {
          dockScrollAnimationFrame = 0;
          dom.viewport.classList.remove("is-programmatic-scroll");
        }
      };
      dockScrollAnimationFrame = requestAnimationFrame(frame);
    }

    function selectProject(index, { scroll = true, focus = false, animate = true, source = "program" } = {}) {
      if (!projects[index]) return;
      const previousIndex = activeIndex;
      const changed = previousIndex !== index;
      const previousPosition = visibleIndices.indexOf(previousIndex);
      const nextPosition = visibleIndices.indexOf(index);
      const direction = nextPosition === previousPosition ? 0 : nextPosition > previousPosition ? 1 : -1;
      activeIndex = index;
      updateSummary(false, direction || 1);
      const folder = q(`.projects-folder[data-project-index="${index}"]`, dom.carousel);
      if (scroll) centerFolderInViewport(folder, reducedMotion.matches ? "auto" : "smooth");
      if (focus) {
        suppressFocusAnimationUntil = performance.now() + 520;
        folder?.focus({ preventScroll: true });
      }
      if (animate && (changed || source === "keyboard" || source === "wheel" || source === "button")) {
        animateDockSelection(previousIndex,index,direction || 1,source);
        triggerSelectionBounce(folder, source);
      }
      window.setTimeout(() => {
        if (dockPointerInside && Number.isFinite(dockPointerX)) scheduleDockMagnification(dockPointerX);
        else resetDockMagnification();
      },changed ? 70 : 0);
    }

    function moveSelection(direction, source = "button") {
      const position = currentVisiblePosition();
      const nextPosition = clamp(position + direction, 0, visibleIndices.length - 1);
      if (nextPosition === position) {
        triggerSelectionBounce(q(`.projects-folder[data-project-index="${activeIndex}"]`, dom.carousel), source);
        return;
      }
      selectProject(visibleIndices[nextPosition], { scroll: true, focus: source === "keyboard", source });
    }

    function selectBoundary(which, source = "keyboard") {
      if (!visibleIndices.length) return;
      const index = which === "start" ? visibleIndices[0] : visibleIndices[visibleIndices.length - 1];
      selectProject(index, { scroll: true, focus: source === "keyboard", source });
    }

    function resetDockMagnification() {
      if (dockAnimationFrame) cancelAnimationFrame(dockAnimationFrame);
      dockAnimationFrame = 0;
      qa(".projects-folder", dom.carousel).forEach(folder => {
        const isActive = Number(folder.dataset.projectIndex) === activeIndex;
        const hasFocus = document.activeElement === folder;
        folder.style.setProperty("--dock-scale", hasFocus ? "1.36" : isActive ? "1.30" : ".90");
        folder.style.setProperty("--dock-lift", hasFocus ? "38px" : isActive ? "34px" : "0px");
        folder.style.setProperty("--dock-shift-x", "0px");
        folder.style.setProperty("--dock-tilt", "0deg");
        folder.style.setProperty("--dock-z", hasFocus ? "50" : isActive ? "42" : "1");
      });
    }

    function applyDockMagnification(pointerX) {
      dockAnimationFrame = 0;
      if (coarsePointer.matches || reducedMotion.matches || isDraggingDock) {
        resetDockMagnification();
        return;
      }
      const viewportRect = dom.viewport.getBoundingClientRect();
      qa(".projects-folder", dom.carousel).forEach(folder => {
        const center = viewportRect.left + folder.offsetLeft - dom.viewport.scrollLeft + folder.offsetWidth / 2;
        const signedDistance = center - pointerX;
        const distance = Math.abs(signedDistance);
        const influence = clamp(1 - distance / 310, 0, 1);
        const nearInfluence = influence * influence * (3 - 2 * influence);
        const isActive = Number(folder.dataset.projectIndex) === activeIndex;
        const hasFocus = document.activeElement === folder;
        const selected = hasFocus ? .18 : isActive ? .15 : 0;
        const scale = .90 + nearInfluence * .34 + selected;
        const lift = nearInfluence * 38 + selected * 112;
        const pushDirection = signedDistance === 0 ? 0 : Math.sign(signedDistance);
        const shift = pushDirection * nearInfluence * 32;
        const tilt = clamp((pointerX - center) / 92, -1, 1) * nearInfluence * 1.05;
        folder.style.setProperty("--dock-scale", scale.toFixed(3));
        folder.style.setProperty("--dock-lift", `${lift.toFixed(1)}px`);
        folder.style.setProperty("--dock-shift-x", `${shift.toFixed(1)}px`);
        folder.style.setProperty("--dock-tilt", `${tilt.toFixed(2)}deg`);
        folder.style.setProperty("--dock-z", String(20 + Math.round(nearInfluence * 100) + (isActive ? 12 : 0)));
      });
    }

    function scheduleDockMagnification(pointerX) {
      dockPointerX = pointerX;
      if (dockAnimationFrame) return;
      dockAnimationFrame = requestAnimationFrame(() => applyDockMagnification(dockPointerX));
    }

    function nearestFolderToViewportCenter() {
      const folders = qa(".projects-folder", dom.carousel);
      if (!folders.length) return null;
      const viewportRect = dom.viewport.getBoundingClientRect();
      const viewportCenter = viewportRect.left + viewportRect.width / 2;
      return folders.reduce((nearest, folder) => {
        const center = viewportRect.left + folder.offsetLeft - dom.viewport.scrollLeft + folder.offsetWidth / 2;
        const distance = Math.abs(center - viewportCenter);
        return !nearest || distance < nearest.distance ? { folder, distance } : nearest;
      }, null)?.folder || null;
    }

    function settleDraggedDock() {
      const nearest = nearestFolderToViewportCenter();
      if (!nearest) return;
      const index = Number(nearest.dataset.projectIndex);
      selectProject(index, { scroll: true, focus: false, source: "drag" });
    }

    function handleDockNavigationKey(event) {
      const target = event.target;
      if (["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) unlockSelectionAudio();
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return false;
      if (dom.details.classList.contains("is-open") || dom.manager.classList.contains("is-open")) return false;
      const insideDock = dom.viewport.contains(document.activeElement) || dom.carousel.contains(document.activeElement) || dockPointerInside;
      if (!insideDock) return false;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        moveSelection(-1, "keyboard");
        return true;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        moveSelection(1, "keyboard");
        return true;
      }
      if (event.key === "Home") {
        event.preventDefault();
        event.stopPropagation();
        selectBoundary("start", "keyboard");
        return true;
      }
      if (event.key === "End") {
        event.preventDefault();
        event.stopPropagation();
        selectBoundary("end", "keyboard");
        return true;
      }
      return false;
    }

    function lockDialogViewport() {
      if (document.body.classList.contains("projects-dialog-open")) return;
      dialogScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      document.documentElement.classList.add("projects-dialog-open");
      document.body.classList.add("projects-dialog-open");
      document.body.style.top = `-${dialogScrollY}px`;
      document.body.style.paddingRight = scrollbarWidth ? `${scrollbarWidth}px` : "";
    }

    function unlockDialogViewport() {
      if (dom.details.classList.contains("is-open") || dom.manager.classList.contains("is-open")) return;
      document.documentElement.classList.remove("projects-dialog-open");
      document.body.classList.remove("projects-dialog-open");
      document.body.style.removeProperty("top");
      document.body.style.removeProperty("padding-right");
      window.scrollTo({ top: dialogScrollY, left: 0, behavior: "auto" });
    }

    function wait(milliseconds) {
      return new Promise(resolve => window.setTimeout(resolve, milliseconds));
    }

    function makeFlyingSheet(folder, project) {
      const paper = q(".projects-folder__paper", folder);
      if (!paper) return null;
      const rect = paper.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      const flight = document.createElement("div");
      flight.className = "projects-folder-sheet-flight";
      flight.setAttribute("aria-hidden", "true");
      flight.style.left = `${rect.left}px`;
      flight.style.top = `${rect.top}px`;
      flight.style.width = `${rect.width}px`;
      flight.style.height = `${rect.height}px`;
      flight.style.setProperty("--flight-accent", project.color);
      flight.innerHTML = `
        <span class="projects-folder-sheet-flight__corner"></span>
        <span class="projects-folder-sheet-flight__mark">${escapeHtml(project.icon)}</span>
        <span class="projects-folder-sheet-flight__line projects-folder-sheet-flight__line--title"></span>
        <span class="projects-folder-sheet-flight__line"></span>
        <span class="projects-folder-sheet-flight__line projects-folder-sheet-flight__line--short"></span>`;
      document.body.appendChild(flight);

      const targetWidth = Math.min(1080, Math.max(340, window.innerWidth - 54));
      const targetHeight = Math.min(760, Math.max(320, window.innerHeight - 54));
      const sourceCenterX = rect.left + rect.width / 2;
      const sourceCenterY = rect.top + rect.height / 2;
      const targetCenterX = window.innerWidth / 2;
      const targetCenterY = window.innerHeight / 2;
      const dx = targetCenterX - sourceCenterX;
      const dy = targetCenterY - sourceCenterY;
      const scaleX = targetWidth / rect.width;
      const scaleY = targetHeight / rect.height;

      const animation = flight.animate([
        { transform: "translate3d(0,0,0) scale(1,1) rotateX(0deg) rotateZ(0deg)", opacity: 1, borderRadius: "16px", filter: "blur(0)" },
        { offset: .18, transform: `translate3d(${dx * .05}px,-74px,0) scale(1.1,1.1) rotateX(-3deg) rotateZ(-1.6deg)`, opacity: 1, borderRadius: "18px", filter: "blur(0)" },
        { offset: .55, transform: `translate3d(${dx * .48}px,${dy * .43 - 24}px,0) scale(${1 + (scaleX - 1) * .44},${1 + (scaleY - 1) * .44}) rotateX(0deg) rotateZ(.8deg)`, opacity: .98, borderRadius: "24px", filter: "blur(0)" },
        { offset: .84, transform: `translate3d(${dx * .9}px,${dy * .9}px,0) scale(${1 + (scaleX - 1) * .9},${1 + (scaleY - 1) * .9}) rotateX(0deg) rotateZ(-.15deg)`, opacity: .78, borderRadius: "31px", filter: "blur(.25px)" },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${scaleX},${scaleY}) rotateX(0deg) rotateZ(0deg)`, opacity: 0, borderRadius: "36px", filter: "blur(1px)" }
      ], { duration: 860, easing: "cubic-bezier(.16,.86,.18,1)", fill: "forwards" });

      const finished = animation.finished.catch(() => {}).finally(() => flight.remove());
      return { flight, animation, finished };
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

    async function openDetails(sourceFolder = null) {
      if (detailOpening || dom.details.classList.contains("is-open")) return;
      detailOpening = true;
      populateDetails();
      lastFocusedBeforeDialog = document.activeElement;

      const project = projects[activeIndex];
      const folder = sourceFolder || q(`.projects-folder[data-project-index="${activeIndex}"]`, dom.carousel);
      const shouldAnimateSheet = Boolean(folder) && !reducedMotion.matches;
      let flight = null;

      if (shouldAnimateSheet) {
        folder.classList.add("is-opening");
        flight = makeFlyingSheet(folder, project);
        await wait(470);
      }

      lockDialogViewport();
      dom.details.classList.add("is-open", shouldAnimateSheet ? "is-sheet-arrival" : "is-direct-arrival");
      dom.details.setAttribute("aria-hidden", "false");
      window.setTimeout(() => dom.detailsClose.focus({ preventScroll: true }), shouldAnimateSheet ? 240 : 60);

      await wait(shouldAnimateSheet ? 390 : 40);
      folder?.classList.remove("is-opening");
      dom.details.classList.remove("is-sheet-arrival", "is-direct-arrival");
      detailOpening = false;
      flight?.finished?.catch?.(() => {});
    }

    function closeDetails() {
      if (detailOpening && !dom.details.classList.contains("is-open")) return;
      dom.details.classList.remove("is-open", "is-sheet-arrival", "is-direct-arrival");
      dom.details.setAttribute("aria-hidden", "true");
      detailOpening = false;
      qa(".projects-folder.is-opening", dom.carousel).forEach(folder => folder.classList.remove("is-opening"));
      unlockDialogViewport();
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
      if (form.image) form.image.value = project.imageRef?.name || project.imageRef?.driveFileId || (project.image && !project.image.startsWith("blob:") ? project.image : "");
      form.gallery.value = project.galleryRefs?.length
        ? project.galleryRefs.map(item => item.name || item.driveFileId).join("\n")
        : project.gallery.join("\n");
      dom.managerDelete.disabled = projects.length <= MIN_PROJECTS;
    }

    function openManager() {
      updateAdminVisibility();
      if (dom.manage.hidden) return;
      lastFocusedBeforeDialog = document.activeElement;
      renderManager();
      dom.manager.classList.add("is-open");
      dom.manager.setAttribute("aria-hidden", "false");
      lockDialogViewport();
      window.setTimeout(() => dom.managerClose.focus({ preventScroll: true }), 30);
    }

    function closeManager() {
      dom.manager.classList.remove("is-open");
      dom.manager.setAttribute("aria-hidden", "true");
      unlockDialogViewport();
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
        imageRef: current.imageRef || null,
        image: current.imageRef ? resolveMedia(current.imageRef, "") : String(data.get("image") || current.image || "").trim(),
        galleryRefs: Array.isArray(current.galleryRefs) ? current.galleryRefs : [],
        gallery: Array.isArray(current.galleryRefs) && current.galleryRefs.length
          ? current.galleryRefs.map(item => resolveMedia(item, "")).filter(Boolean)
          : String(data.get("gallery") || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean),
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

    dom.viewport.addEventListener("pointerenter", event => {
      dockPointerInside = true;
      dockPageScrollAnchor = window.scrollY || document.documentElement.scrollTop || 0;
      scheduleDockMagnification(event.clientX);
    }, { passive: true });

    dom.viewport.addEventListener("pointerleave", () => {
      if (isDraggingDock) return;
      dockPointerInside = false;
      dockPointerX = null;
      resetDockMagnification();
    }, { passive: true });

    dom.viewport.addEventListener("pointerdown", event => {
      if (event.button !== 0 || detailOpening) return;
      unlockSelectionAudio();
      pointerMoved = false;
      pointerStartX = event.clientX;
      pointerStartY = event.clientY;
      dragStartScrollLeft = dom.viewport.scrollLeft;
      draggingPointerId = event.pointerId;
      isDraggingDock = false;
      suppressNextClick = false;
      dom.viewport.focus({ preventScroll: true });
    });

    dom.viewport.addEventListener("pointermove", event => {
      dockPointerInside = true;
      dockPointerX = event.clientX;
      if (draggingPointerId !== event.pointerId) {
        scheduleDockMagnification(event.clientX);
        return;
      }
      const dx = event.clientX - pointerStartX;
      const dy = event.clientY - pointerStartY;
      if (!isDraggingDock && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy) * .7) {
        isDraggingDock = true;
        pointerMoved = true;
        suppressNextClick = true;
        root.classList.add("is-dragging-dock");
        dom.viewport.setPointerCapture?.(event.pointerId);
        resetDockMagnification();
      }
      if (!isDraggingDock) {
        scheduleDockMagnification(event.clientX);
        return;
      }
      if (event.cancelable) event.preventDefault();
      dom.viewport.scrollLeft = dragStartScrollLeft - dx;
    }, { passive: false });

    function finishDockPointer(event) {
      if (draggingPointerId !== event.pointerId) return;
      if (dom.viewport.hasPointerCapture?.(event.pointerId)) dom.viewport.releasePointerCapture(event.pointerId);
      draggingPointerId = null;
      root.classList.remove("is-dragging-dock");
      if (isDraggingDock) {
        isDraggingDock = false;
        settleDraggedDock();
        window.setTimeout(() => { suppressNextClick = false; pointerMoved = false; }, 80);
      } else {
        isDraggingDock = false;
        pointerMoved = false;
      }
    }

    dom.viewport.addEventListener("pointerup", finishDockPointer);
    dom.viewport.addEventListener("pointercancel", finishDockPointer);
    dom.viewport.addEventListener("lostpointercapture", event => {
      if (draggingPointerId !== event.pointerId) return;
      draggingPointerId = null;
      root.classList.remove("is-dragging-dock");
      if (isDraggingDock) settleDraggedDock();
      isDraggingDock = false;
    });

    function handleDockWheel(event) {
      unlockSelectionAudio();
      const path = event.composedPath?.() || [];
      const overDock = dockPointerInside || path.includes(dom.viewport) || path.includes(dom.carousel);
      if (!overDock || event.ctrlKey || dom.details.classList.contains("is-open") || dom.manager.classList.contains("is-open")) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      event.stopPropagation();
      dockPointerInside = true;
      dockPageScrollAnchor = window.scrollY || document.documentElement.scrollTop || 0;
      wheelAccumulator += delta;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => { wheelAccumulator = 0; wheelNavigationLocked = false; }, 180);
      if (wheelNavigationLocked || Math.abs(wheelAccumulator) < 42) return;
      const direction = wheelAccumulator > 0 ? 1 : -1;
      wheelAccumulator = 0;
      wheelNavigationLocked = true;
      moveSelection(direction, "wheel");
      window.setTimeout(() => { wheelNavigationLocked = false; }, 260);
    }
    dom.viewport.addEventListener("wheel", handleDockWheel, { passive: false });

    dom.carousel.addEventListener("click", event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder || pointerMoved || suppressNextClick) return;
      const index = Number(folder.dataset.projectIndex);
      const wasActive = index === activeIndex;
      selectProject(index, { scroll: true, focus: false, source: "click" });
      window.setTimeout(() => openDetails(folder), wasActive || reducedMotion.matches ? 0 : 150);
    });

    dom.carousel.addEventListener("focusin", event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder) return;
      const index = Number(folder.dataset.projectIndex);
      if (index !== activeIndex) {
        selectProject(index, { scroll: true, focus: false, source: "keyboard" });
      } else {
        resetDockMagnification();
        if (performance.now() > suppressFocusAnimationUntil) {
          triggerSelectionBounce(folder, "keyboard");
        }
      }
    });

    dom.carousel.addEventListener("keydown", event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder) return;
      if (handleDockNavigationKey(event)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const index = Number(folder.dataset.projectIndex);
        selectProject(index, { scroll: true, focus: true, source: "keyboard" });
        openDetails(folder);
      }
    });

    dom.viewport.addEventListener("keydown", event => {
      if (event.target === dom.viewport) handleDockNavigationKey(event);
    });

    dom.viewport.addEventListener("scroll", () => {
      if (isDraggingDock) return;
      if (dockPointerInside && Number.isFinite(dockPointerX)) scheduleDockMagnification(dockPointerX);
      else resetDockMagnification();
    }, { passive: true });

    dom.prev.addEventListener("click", () => moveSelection(-1, "button"));
    dom.next.addEventListener("click", () => moveSelection(1, "button"));

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
    document.addEventListener("click", event => {
      const detailClose = event.target.closest?.("#projectsDetailsClose,#projectsDetailsSecondaryClose,#projectsDetailsBackdrop");
      if (detailClose) { event.preventDefault(); event.stopPropagation(); closeDetails(); return; }
      const managerClose = event.target.closest?.("#projectsManagerClose,#projectsManagerBackdrop");
      if (managerClose) { event.preventDefault(); event.stopPropagation(); closeManager(); }
    },true);
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
      if (!dom.details.classList.contains("is-open") && !dom.manager.classList.contains("is-open")) {
        handleDockNavigationKey(event);
      }
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
    window.addEventListener("resize", () => {
      if (dockPointerInside && Number.isFinite(dockPointerX)) scheduleDockMagnification(dockPointerX);
      else resetDockMagnification();
    }, { passive: true });
    reducedMotion.addEventListener?.("change", resetDockMagnification);

    renderDock();
    updateAdminVisibility();
    window.dispatchEvent(new CustomEvent("portal:rendered", { detail: { source: "projects-psp", build: BUILD } }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
