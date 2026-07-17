
(() => {
  "use strict";

  const PAGE_MAP = {
    "": "home",
    "index.html": "home",
    "recursos.html": "resources",
    "noticias.html": "news",
    "noticia.html": "news",
    "ideas.html": "ideas",
    "vigencias.html": "vigencias"
  };

  const state = {
    initialized:false,
    mutationObserver:null,
    sectionObserver:null,
    railObserver:null,
    ambientObserver:null,
    refreshTimer:null,
    refreshIdle:null,
    railSignature:"",
    cursorFrame:0,
    cardRects:new WeakMap(),
    balanceControllers:new WeakMap(),
    adaptiveResizeTimer:0,
    longTaskObserver:null,
    longTaskCount:0
  };

  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const finePointerQuery = window.matchMedia(
    "(hover:hover) and (pointer:fine)"
  );

  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const supportsFinePointer = () => finePointerQuery.matches;


  function viewportTier() {
    const width = Math.max(document.documentElement.clientWidth,window.innerWidth || 0);
    const height = Math.max(document.documentElement.clientHeight,window.innerHeight || 0);

    if (width < 768) return "mobile";
    if (height < 740) return "legacy";
    if (width >= 1920 && height >= 900) return "ultra";
    if (width >= 1440 && height >= 780) return "large";
    if (width < 1120 || height < 780) return "compact";
    return "standard";
  }

  function motionTier() {
    const viewport = viewportTier();
    const connection = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;
    const saveData = Boolean(connection?.saveData);
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    const width = Math.max(document.documentElement.clientWidth,window.innerWidth || 0);
    const height = Math.max(document.documentElement.clientHeight,window.innerHeight || 0);

    if (
      prefersReducedMotion()
      || saveData
      || viewport === "mobile"
      || viewport === "legacy"
    ) return "low";

    const knownHighHardware = cores >= 8 && memory >= 8;
    const strongFallback = !memory && cores >= 8 && width >= 1800 && height >= 820;

    if (
      supportsFinePointer()
      && width >= 1280
      && height >= 720
      && (knownHighHardware || strongFallback)
    ) return "high";

    if (
      supportsFinePointer()
      && width >= 1024
      && (cores >= 4 || !cores)
      && (memory >= 4 || !memory)
    ) return "medium";

    return "low";
  }

  function setExperienceTier(nextMotion = motionTier()) {
    const nextViewport = viewportTier();
    const root = document.documentElement;
    const body = document.body;

    root.dataset.motionTier = nextMotion;
    root.dataset.viewportTier = nextViewport;
    if (body) {
      body.dataset.motionTier = nextMotion;
      body.dataset.viewportTier = nextViewport;
    }

    window.PortalExperience = {
      motionTier:nextMotion,
      viewportTier:nextViewport,
      cores:Number(navigator.hardwareConcurrency || 0),
      memory:Number(navigator.deviceMemory || 0),
      saveData:Boolean(
        (navigator.connection
          || navigator.mozConnection
          || navigator.webkitConnection)?.saveData
      )
    };

    if (nextMotion !== "high") {
      document.querySelector(".cd-cursor-glow")?.remove();
    }

    return window.PortalExperience;
  }

  function downgradeMotionTier() {
    const current = document.documentElement.dataset.motionTier;
    if (current === "high") setExperienceTier("medium");
    else if (current === "medium") setExperienceTier("low");
  }

  function installAdaptiveExperience() {
    setExperienceTier();

    const refreshTier = () => {
      clearTimeout(state.adaptiveResizeTimer);
      state.adaptiveResizeTimer = window.setTimeout(() => {
        setExperienceTier();
        addCursorGlow();
      },160);
    };

    window.addEventListener("resize",refreshTier,{passive:true});
    reducedMotionQuery.addEventListener?.("change",refreshTier);
    finePointerQuery.addEventListener?.("change",refreshTier);

    const connection = navigator.connection
      || navigator.mozConnection
      || navigator.webkitConnection;
    connection?.addEventListener?.("change",refreshTier);

    if (
      "PerformanceObserver" in window
      && document.documentElement.dataset.motionTier === "high"
    ) {
      try {
        state.longTaskObserver = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            if (entry.duration < 80) return;
            state.longTaskCount += 1;
            if (state.longTaskCount >= 3) {
              downgradeMotionTier();
              state.longTaskObserver?.disconnect();
              state.longTaskObserver = null;
            }
          });
        });
        state.longTaskObserver.observe({entryTypes:["longtask"]});
      } catch (_) {
        state.longTaskObserver = null;
      }
    }
  }

  function pageName() {
    const filename = (location.pathname.split("/").pop() || "").toLowerCase();
    if (PAGE_MAP[filename]) return PAGE_MAP[filename];
    if (/rendicion-?\d{4}|rendicion\.html/.test(filename)) return "year";
    return "generic";
  }

  function applyHeroLayoutClass() {
    const allowed = new Set(["compact","balanced","wide"]);
    const params = new URLSearchParams(location.search);
    const requested = (params.get("hero") || "").toLowerCase();
    const storedRaw = (localStorage.getItem("sp_hero_layout") || "").toLowerCase();
    const stored = storedRaw === "compact" ? "balanced" : storedRaw;
    const hero = allowed.has(requested)
      ? requested
      : allowed.has(stored)
        ? stored
        : "balanced";

    if (allowed.has(requested)) {
      localStorage.setItem("sp_hero_layout", hero);
    }

    document.body.classList.remove(
      "hero-layout-compact",
      "hero-layout-balanced",
      "hero-layout-wide"
    );
    document.body.classList.add(`hero-layout-${hero}`);
    document.documentElement.dataset.heroLayout = hero;
  }

  function ensurePageClass() {
    const page = pageName();
    document.body.classList.add(
      "claude-studio",
      "blue-studio",
      `claude-page-${page}`
    );
    document.documentElement.dataset.claudePage = page;
    applyHeroLayoutClass();
    setExperienceTier(document.documentElement.dataset.motionTier || motionTier());
  }

  function sectionTitle(section) {
    const heading = section.querySelector(
      "h1,h2,h3,.home-section__head h2,.section-head h2,.year-section__head h2"
    );
    return (heading?.textContent || "Sección").trim().replace(/\s+/g, " ");
  }

  function accentTitleLastWords(root = document) {
    const headings = root.querySelectorAll(
      "main h1, main h2, main h3, .site-footer h2, .site-footer h3"
    );

    headings.forEach(heading => {
      if (!heading.isConnected) return;
      if (heading.closest("dialog,.context-editor,.admin-console")) return;

      const existing = heading.querySelector(".title-accent-word,em");
      if (existing) {
        existing.classList.add("title-accent-word");
        return;
      }

      const walker = document.createTreeWalker(
        heading,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            return /\p{L}/u.test(node.nodeValue || "")
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );

      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      for (let index = textNodes.length - 1; index >= 0; index -= 1) {
        const node = textNodes[index];
        const value = node.nodeValue || "";
        const matches = [...value.matchAll(/[\p{L}\p{M}][\p{L}\p{M}'’\-]*/gu)];
        const match = matches.at(-1);
        if (!match || typeof match.index !== "number") continue;

        const start = match.index;
        const end = start + match[0].length;
        const fragment = document.createDocumentFragment();

        if (start > 0) fragment.append(value.slice(0,start));

        const accent = document.createElement("span");
        accent.className = "title-accent-word";
        accent.textContent = value.slice(start,end);
        fragment.append(accent);

        if (end < value.length) fragment.append(value.slice(end));
        node.replaceWith(fragment);
        break;
      }
    });
  }

  function suitableSections() {
    return [...document.querySelectorAll(
      "main > section, main > article, .site-main > section, .site-main > article"
    )].filter(section => {
      if (!section.isConnected) return false;
      if (section.matches(
        ".home-hero,.page-hero,.news-page-hero,[hidden],.dialog-shell"
      )) return false;
      return section.getBoundingClientRect().height > 80;
    });
  }

  function preferredHead(section) {
    return section.querySelector([
      ".home-section__head",
      ".section-head",
      ".year-section__head",
      ".archive-intro",
      ".news-section-heading",
      ".library-section-head",
      ".ideas-section-head"
    ].join(","));
  }

  function addHeroAtmosphere() {
    document.querySelectorAll(".bs-hero-atmosphere").forEach(node => node.remove());
  }

  function addAmbient(section,index) {
    if (section.querySelector(":scope > .cd-ambient")) return;

    const ambient = document.createElement("div");
    ambient.className = "cd-ambient";
    ambient.setAttribute("aria-hidden", "true");
    ambient.innerHTML = `
      <span class="cd-ambient__mesh"></span>
      <span class="cd-ambient__orb cd-ambient__orb--a"></span>
      <span class="cd-ambient__orb cd-ambient__orb--b"></span>
      <span class="cd-ambient__line"></span>
      <span class="cd-ambient__ribbon"></span>
      <span class="cd-ambient__rings"></span>
      <span class="cd-ambient__spark"></span>`;
    ambient.style.setProperty("--cd-seed", String(index % 5));
    section.prepend(ambient);
  }

  function decorateSections() {
    const sections = suitableSections();

    sections.forEach((section,index) => {
      section.classList.add("cd-section", "cd-reveal");
      section.dataset.cdIndex = String(index + 1).padStart(2, "0");

      if (!section.id) {
        section.id = `contenido-${index + 1}`;
      }

      const head = preferredHead(section);
      if (head && !head.querySelector(".cd-section-mark")) {
        const mark = document.createElement("div");
        mark.className = "cd-section-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.innerHTML = `
          <span>${section.dataset.cdIndex}</span>
          <i></i>
          <em>San Pedro</em>`;
        head.prepend(mark);
      }

      addAmbient(section,index);
    });

    return sections;
  }

  const STACK_MOTION_SELECTOR = [
    ".edition-card",
    ".deal-card",
    ".archive-card",
    ".resource-library-card",
    ".news-feature-card",
    ".news-card"
  ].join(",");

  const CARD_SELECTOR = [
    ".edition-card",
    ".territory-focus-card",
    ".deal-card",
    ".quote-card",
    ".trust-card",
    ".news-card",
    ".news-story",
    ".news-feature-card",
    ".resource-library-card",
    ".year-resource-card",
    ".ideas-cta",
    ".idea-card",
    ".idea-public-card",
    ".idea-feature-card",
    ".idea-column",
    ".dashboard-panel",
    ".executive-kpi",
    ".institution-result",
    ".method-step",
    ".commitment-row",
    ".followup-summary > article",
    ".request-summary > article"
  ].join(",");

  function createBalanceController(element,options = {}) {
    if (!element || state.balanceControllers.has(element)) {
      return state.balanceControllers.get(element) || null;
    }

    const controller = {
      element,
      current:{rx:0,ry:0,rz:0,x:0,y:0,scale:1},
      target:{rx:0,ry:0,rz:0,x:0,y:0,scale:1},
      velocity:{rx:0,ry:0,rz:0,x:0,y:0,scale:0},
      frame:0,
      active:false,
      options
    };

    const keys = ["rx","ry","rz","x","y","scale"];
    const render = () => {
      controller.frame = 0;
      const tier = document.documentElement.dataset.motionTier || "low";
      const stiffness = tier === "high" ? .13 : tier === "medium" ? .16 : .2;
      const damping = tier === "high" ? .78 : tier === "medium" ? .72 : .64;
      let moving = false;

      keys.forEach(key => {
        controller.velocity[key] += (
          controller.target[key] - controller.current[key]
        ) * stiffness;
        controller.velocity[key] *= damping;
        controller.current[key] += controller.velocity[key];
        if (
          Math.abs(controller.target[key] - controller.current[key]) > .004
          || Math.abs(controller.velocity[key]) > .004
        ) moving = true;
      });

      element.style.setProperty("--balance-rx",`${controller.current.rx.toFixed(3)}deg`);
      element.style.setProperty("--balance-ry",`${controller.current.ry.toFixed(3)}deg`);
      element.style.setProperty("--balance-rz",`${controller.current.rz.toFixed(3)}deg`);
      element.style.setProperty("--balance-x",`${controller.current.x.toFixed(3)}px`);
      element.style.setProperty("--balance-y",`${controller.current.y.toFixed(3)}px`);
      element.style.setProperty("--balance-scale",controller.current.scale.toFixed(4));

      if (moving) controller.frame = requestAnimationFrame(render);
      else element.classList.remove("is-balancing");
    };

    controller.schedule = () => {
      element.classList.add("is-balancing");
      if (!controller.frame) controller.frame = requestAnimationFrame(render);
    };

    controller.set = values => {
      Object.assign(controller.target,values);
      controller.schedule();
    };

    controller.impulse = values => {
      Object.entries(values).forEach(([key,value]) => {
        if (key in controller.velocity) controller.velocity[key] += value;
      });
      controller.schedule();
    };

    controller.release = () => {
      controller.active = false;
      controller.set({rx:0,ry:0,rz:0,x:0,y:0,scale:1});
    };

    element.classList.add("weighted-balance");
    element.style.setProperty("--balance-origin",options.origin || "50% 100%");
    element.dataset.balanceRole = options.role || "card";
    state.balanceControllers.set(element,controller);
    return controller;
  }

  function bindCardMotion(card) {
    if (card.dataset.cdMotion === "3" || card.dataset.cdMotion === "stack") return;

    if (card.matches(STACK_MOTION_SELECTOR)) {
      card.dataset.cdMotion = "stack";
      card.classList.add("cd-card","cd-reveal","sm-stack-candidate");
      return;
    }

    card.dataset.cdMotion = "3";
    card.classList.add("cd-card","cd-reveal");

    const siblings = [...(card.parentElement?.children || [])];
    const index = Math.max(siblings.indexOf(card),0);
    card.style.setProperty("--cd-order",String(index));

    const origin = index % 2 === 0 ? "16% 100%" : "84% 100%";
    const controller = createBalanceController(card,{
      role:card.matches(".territory-focus-card") ? "territory" : "card",
      origin
    });
    if (!controller || prefersReducedMotion()) return;

    let pressed = false;
    let last = {nx:0,ny:0};

    const coordinates = event => {
      const rect = card.getBoundingClientRect();
      return {
        nx:Math.max(-1,Math.min(1,((event.clientX-rect.left)/rect.width-.5)*2)),
        ny:Math.max(-1,Math.min(1,((event.clientY-rect.top)/rect.height-.5)*2))
      };
    };

    const applyWeight = (event,strong = false) => {
      const tier = document.documentElement.dataset.motionTier || "low";
      const point = coordinates(event);
      last = point;
      const base = tier === "high" ? 5.4 : tier === "medium" ? 3.6 : 2.1;
      const weight = strong ? 1.18 : .62;
      controller.set({
        rx:-point.ny * base * weight,
        ry:point.nx * base * .82 * weight,
        rz:point.nx * base * .34 * weight,
        x:point.nx * (tier === "high" ? 2.4 : 1.2) * weight,
        y:Math.abs(point.nx) * -.65 * weight,
        scale:strong ? .992 : .998
      });
      card.style.setProperty("--balance-light-x",`${((point.nx+1)*50).toFixed(1)}%`);
      card.style.setProperty("--balance-light-y",`${((point.ny+1)*50).toFixed(1)}%`);
    };

    card.addEventListener("pointerdown",event => {
      pressed = true;
      controller.active = true;
      card.classList.add("is-weighted");
      applyWeight(event,true);
      controller.impulse({
        rz:last.nx * .36,
        ry:last.nx * .42,
        rx:-last.ny * .32
      });
      card.setPointerCapture?.(event.pointerId);
    },{passive:true});

    card.addEventListener("pointermove",event => {
      const tier = document.documentElement.dataset.motionTier || "low";
      if (!pressed && (tier === "low" || !supportsFinePointer())) return;
      applyWeight(event,pressed);
    },{passive:true});

    const release = event => {
      if (!pressed && event?.type !== "pointerleave") return;
      pressed = false;
      card.classList.remove("is-weighted");
      controller.impulse({
        rz:-last.nx * .7,
        ry:-last.nx * .5,
        rx:last.ny * .45
      });
      controller.release();
      if (event?.pointerId !== undefined && card.hasPointerCapture?.(event.pointerId)) {
        card.releasePointerCapture(event.pointerId);
      }
    };

    card.addEventListener("pointerup",release,{passive:true});
    card.addEventListener("pointercancel",release,{passive:true});
    card.addEventListener("lostpointercapture",release,{passive:true});
    card.addEventListener("pointerleave",event => {
      if (!pressed) {
        controller.release();
        card.classList.remove("is-weighted");
      }
    },{passive:true});
  }

  function directChildrenMatching(parent, selector) {
    return [...parent.children].filter(child => child.matches(selector));
  }

  function normalizeAdminControls() {
    document.querySelectorAll(".admin-quick-section").forEach(section => {
      const buttons = directChildrenMatching(
        section,
        ".admin-section-edit-button"
      );
      buttons.slice(1).forEach(button => button.remove());

      buttons[0]?.setAttribute("type","button");
      if (buttons[0] && !buttons[0].getAttribute("aria-label")) {
        buttons[0].setAttribute("aria-label","Editar esta sección");
      }
    });

    document.querySelectorAll("[data-admin-entity]").forEach(entity => {
      const buttons = directChildrenMatching(
        entity,
        ".admin-quick-card-edit"
      );
      buttons.slice(1).forEach(button => button.remove());

      buttons[0]?.setAttribute("type","button");
      if (buttons[0] && !buttons[0].getAttribute("aria-label")) {
        buttons[0].setAttribute("aria-label","Editar este contenido");
      }
    });

    document.querySelectorAll(
      ".admin-section-edit-button, " +
      ".admin-quick-card-edit, " +
      ".dashboard-edit-button"
    ).forEach(button => {
      button.setAttribute("type","button");
      button.style.pointerEvents = "auto";
    });
  }

  function decorateCards(root = document) {
    root.querySelectorAll(CARD_SELECTOR).forEach(bindCardMotion);
  }

  function setupReveal(root = document) {
    const items = root.querySelectorAll(".cd-reveal:not(.cd-observed)");

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach(item => item.classList.add("cd-observed","cd-visible"));
      return;
    }

    if (!state.sectionObserver) {
      state.sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("cd-visible");
          state.sectionObserver.unobserve(entry.target);
        });
      },{
        threshold:.07,
        rootMargin:"0px 0px -6% 0px"
      });
    }

    items.forEach(item => {
      item.classList.add("cd-observed");
      state.sectionObserver.observe(item);
    });
  }

  function setupAmbientVisibility(sections) {
    if (!("IntersectionObserver" in window)) return;

    if (!state.ambientObserver) {
      state.ambientObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle(
            "cd-ambient-offscreen",
            !entry.isIntersecting
          );
        });
      },{
        threshold:0,
        rootMargin:"180px 0px 180px 0px"
      });
    }

    sections.forEach(section => {
      if (section.dataset.cdAmbientObserved === "1") return;
      section.dataset.cdAmbientObserved = "1";
      state.ambientObserver.observe(section);
    });
  }

  function buildRail(sections) {
    const visibleSections = sections.slice(0,9);
    if (visibleSections.length < 2) {
      document.querySelector(".cd-section-rail")?.remove();
      state.railObserver?.disconnect();
      state.railObserver = null;
      state.railSignature = "";
      return;
    }

    const signature = visibleSections
      .map(section => section.id)
      .join("|");

    let rail = document.querySelector(".cd-section-rail");

    if (!rail) {
      rail = document.createElement("nav");
      rail.className = "cd-section-rail";
      rail.setAttribute("aria-label", "Navegación de la página");
      rail.innerHTML = `
        <span class="cd-section-rail__title">Recorrido</span>
        <div class="cd-section-rail__list"></div>`;
      document.body.appendChild(rail);
    }

    const list = rail.querySelector(".cd-section-rail__list");

    // Solo reconstruye si cambió la estructura real de las secciones.
    // Esto evita el titileo producido por contenido dinámico.
    if (rail.dataset.signature !== signature) {
      rail.dataset.signature = signature;
      list.replaceChildren();

      visibleSections.forEach((section,index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.target = section.id;
        button.setAttribute(
          "aria-label",
          `Ir a ${sectionTitle(section)}`
        );
        button.innerHTML = `
          <span>${String(index + 1).padStart(2,"0")}</span>
          <i aria-hidden="true"></i>`;

        button.addEventListener("click", () => {
          section.scrollIntoView({
            behavior:prefersReducedMotion() ? "auto" : "smooth",
            block:"start"
          });
        });

        list.appendChild(button);
      });
    }

    if (state.railObserver && state.railSignature === signature) {
      return;
    }

    state.railObserver?.disconnect();
    state.railSignature = signature;

    state.railObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      rail.querySelectorAll("button").forEach(button => {
        const active = button.dataset.target === visible.target.id;
        button.classList.toggle("active",active);
        button.setAttribute(
          "aria-current",
          active ? "true" : "false"
        );
      });
    },{
      threshold:[.12,.35,.65],
      rootMargin:"-18% 0px -60% 0px"
    });

    visibleSections.forEach(section => {
      state.railObserver.observe(section);
    });
  }

  function addPageSignature() {
    document.querySelector(".cd-page-signature")?.remove();
  }

  function addCursorGlow() {
    const highTier = document.documentElement.dataset.motionTier === "high";
    const existing = document.querySelector(".cd-cursor-glow");
    if (
      !highTier
      || prefersReducedMotion()
      || !supportsFinePointer()
      || window.innerWidth < 1100
    ) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const glow = document.createElement("div");
    glow.className = "cd-cursor-glow";
    glow.setAttribute("aria-hidden","true");
    glow.style.transform = "translate3d(-500px,-500px,0)";
    document.body.appendChild(glow);

    let x = -500;
    let y = -500;

    document.addEventListener("pointermove",event => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      if (state.cursorFrame) return;

      state.cursorFrame = requestAnimationFrame(() => {
        state.cursorFrame = 0;
        if (!glow.isConnected) return;
        glow.style.transform = `translate3d(${x}px,${y}px,0)`;
      });
    },{passive:true});
  }


  function bindHomeHeroMotion() {
    if (pageName() !== "home") return;
    const hero = document.querySelector(".home-hero");
    const copy = hero?.querySelector(".home-hero__copy");
    const visual = hero?.querySelector(".home-hero__visual");
    const progress = hero?.querySelector(".hero-float-card");
    if (!hero || !copy || !visual || hero.dataset.cdHeroMotion === "3") return;
    hero.dataset.cdHeroMotion = "3";

    const copyBalance = createBalanceController(copy,{
      role:"hero-copy",
      origin:"0% 56%"
    });
    const visualBalance = createBalanceController(visual,{
      role:"hero-visual",
      origin:"100% 56%"
    });
    const progressBalance = progress
      ? createBalanceController(progress,{role:"hero-progress",origin:"100% 100%"})
      : null;

    if (prefersReducedMotion()) return;

    let pressed = false;
    let last = {nx:0,ny:0};

    const coordinates = event => {
      const rect = hero.getBoundingClientRect();
      return {
        nx:Math.max(-1,Math.min(1,((event.clientX-rect.left)/rect.width-.5)*2)),
        ny:Math.max(-1,Math.min(1,((event.clientY-rect.top)/rect.height-.5)*2))
      };
    };

    const apply = (event,strong = false) => {
      const tier = document.documentElement.dataset.motionTier || "low";
      const point = coordinates(event);
      last = point;
      const amplitude = tier === "high" ? 3.2 : tier === "medium" ? 1.9 : 1.05;
      const force = strong ? 1.22 : .58;

      copyBalance?.set({
        rx:-point.ny * amplitude * .38 * force,
        ry:point.nx * amplitude * .46 * force,
        rz:-point.nx * amplitude * .13 * force,
        x:point.nx * amplitude * .34 * force,
        y:point.ny * amplitude * .18 * force,
        scale:strong ? .998 : 1
      });
      visualBalance?.set({
        rx:-point.ny * amplitude * .7 * force,
        ry:point.nx * amplitude * force,
        rz:point.nx * amplitude * .22 * force,
        x:point.nx * amplitude * 1.25 * force,
        y:point.ny * amplitude * .72 * force,
        scale:strong ? .996 : 1
      });
      progressBalance?.set({
        rx:-point.ny * amplitude * .65 * force,
        ry:point.nx * amplitude * .78 * force,
        rz:point.nx * amplitude * .24 * force,
        x:point.nx * amplitude * .8 * force,
        y:point.ny * amplitude * .5 * force,
        scale:strong ? .987 : 1
      });

      hero.style.setProperty("--hero-weight-x",`${((point.nx+1)*50).toFixed(1)}%`);
      hero.style.setProperty("--hero-weight-y",`${((point.ny+1)*50).toFixed(1)}%`);
    };

    hero.addEventListener("pointerdown",event => {
      pressed = true;
      hero.classList.add("is-hero-weighted");
      apply(event,true);
      visualBalance?.impulse({rz:last.nx*.32,ry:last.nx*.4,rx:-last.ny*.32});
      progressBalance?.impulse({rz:last.nx*.5,ry:last.nx*.36});
      hero.setPointerCapture?.(event.pointerId);
    },{passive:true});

    hero.addEventListener("pointermove",event => {
      const tier = document.documentElement.dataset.motionTier || "low";
      if (!pressed && (tier === "low" || !supportsFinePointer())) return;
      apply(event,pressed);
    },{passive:true});

    const release = event => {
      if (!pressed && event?.type !== "pointerleave") return;
      pressed = false;
      hero.classList.remove("is-hero-weighted");
      visualBalance?.impulse({rz:-last.nx*.8,ry:-last.nx*.55,rx:last.ny*.5});
      progressBalance?.impulse({rz:-last.nx*1.1,ry:-last.nx*.7});
      copyBalance?.release();
      visualBalance?.release();
      progressBalance?.release();
      if (event?.pointerId !== undefined && hero.hasPointerCapture?.(event.pointerId)) {
        hero.releasePointerCapture(event.pointerId);
      }
    };

    hero.addEventListener("pointerup",release,{passive:true});
    hero.addEventListener("pointercancel",release,{passive:true});
    hero.addEventListener("lostpointercapture",release,{passive:true});
    hero.addEventListener("pointerleave",event => {
      if (!pressed) {
        copyBalance?.release();
        visualBalance?.release();
        progressBalance?.release();
      }
    },{passive:true});
  }

  function normalizeHomeHeroStructure() {
    if (pageName() !== "home") return;

    const hero = document.querySelector(".home-hero");
    const grid = hero?.querySelector(":scope > .home-hero__grid");
    const visual = hero?.querySelector(".home-hero__visual");
    if (!hero || !grid || !visual) return;

    /*
     * La portada vuelve a su estructura semántica original: el panel visual
     * es hermano de la cuadrícula de texto. La composición antigua lo movía
     * dentro del bloque de contenido y provocaba recortes, alturas excesivas
     * y superposiciones en resoluciones intermedias.
     */
    if (visual.parentElement !== hero) {
      hero.insertBefore(visual, grid);
    }

    hero.classList.remove("home-hero--banner-inside");
  }

  function refresh() {
    ensurePageClass();
    addCursorGlow();
    addHeroAtmosphere();
    addPageSignature();
    normalizeHomeHeroStructure();
    bindHomeHeroMotion();
    const sections = decorateSections();
    accentTitleLastWords(document);
    decorateCards();
    normalizeAdminControls();
    setupReveal();
    setupAmbientVisibility(sections);
    buildRail(sections);
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    if (state.refreshIdle && "cancelIdleCallback" in window) {
      cancelIdleCallback(state.refreshIdle);
      state.refreshIdle = null;
    }

    const run = () => {
      state.refreshTimer = null;
      state.refreshIdle = null;
      refresh();
    };

    if ("requestIdleCallback" in window) {
      state.refreshIdle = requestIdleCallback(run,{timeout:240});
    } else {
      state.refreshTimer = window.setTimeout(run,120);
    }
  }

  function observeDynamicContent() {
    if (state.mutationObserver) return;

    const ignoredStudioSelector = [
      ".cd-section-rail",
      ".cd-ambient",
      ".bs-hero-atmosphere",
      ".cd-page-signature",
      ".cd-cursor-glow"
    ].join(",");

    state.mutationObserver = new MutationObserver(mutations => {
      const hasRelevantNode = mutations.some(mutation =>
        [...mutation.addedNodes].some(node => {
          if (!(node instanceof Element)) return false;
          if (node.matches(ignoredStudioSelector)) return false;
          if (node.closest(ignoredStudioSelector)) return false;
          return true;
        })
      );

      if (hasRelevantNode) scheduleRefresh();
    });

    state.mutationObserver.observe(document.body,{
      subtree:true,
      childList:true
    });

    document.addEventListener("portal:rendered",scheduleRefresh);
  }

  function init() {
    if (!document.body) return;
    if (state.initialized) {
      refresh();
      return;
    }

    state.initialized = true;
    installAdaptiveExperience();
    ensurePageClass();
    addCursorGlow();
    refresh();
    observeDynamicContent();

    document.documentElement.classList.add("claude-studio-ready");
    window.dispatchEvent(new CustomEvent("portal:studio-ready",{
      detail:{page:pageName()}
    }));

    const syncVisibility = () => {
      document.documentElement.classList.toggle(
        "portal-page-hidden",
        document.hidden
      );
    };
    syncVisibility();
    document.addEventListener("visibilitychange",syncVisibility,{passive:true});
  }

  window.ClaudeStudio = {
    init,
    refresh,
    bindBalance:bindCardMotion,
    setExperienceTier
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
