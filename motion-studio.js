(() => {
  "use strict";

  const state = {
    initialized:false,
    revealObserver:null,
    activeSectionObserver:null,
    refreshTimer:0,
    frame:0,
    pointerX:.5,
    pointerY:.5,
    scrollY:0,
    activeMagnetic:null,
    activeMedia:null,
    magneticFrame:0,
    mediaFrame:0
  };

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );
  const finePointer = window.matchMedia(
    "(hover:hover) and (pointer:fine)"
  );

  const qsa = (selector,root=document) => [...root.querySelectorAll(selector)];

  function decorateMotionItems(root=document) {
    const selector = [
      ".home-hero__copy > span",
      ".home-hero__copy h1",
      ".home-hero__visual",
      ".home-hero__copy > p",
      ".home-hero__copy .hero-actions",
      ".home-section__head",
      ".section-head",
      ".year-section__head",
      ".archive-intro",
      ".news-section-heading",
      ".library-section-head",
      ".ideas-section-head",
      ".cd-card",
      ".dashboard-panel",
      ".executive-kpi",
      ".institution-result",
      ".method-step",
      ".commitment-row"
    ].join(",");

    qsa(selector,root).forEach((element,index) => {
      if (element.dataset.motionDecorated === "1") return;
      element.dataset.motionDecorated = "1";
      element.classList.add("motion-polish");
      element.style.setProperty("--motion-order",String(index % 8));
    });
  }

  function setupReveal(root=document) {
    const items = qsa(".motion-polish:not(.motion-observed)",root);

    if (
      reducedMotion.matches ||
      !("IntersectionObserver" in window)
    ) {
      items.forEach(item => {
        item.classList.add("motion-observed","motion-in");
      });
      return;
    }

    if (!state.revealObserver) {
      state.revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("motion-in");
          state.revealObserver.unobserve(entry.target);
        });
      },{
        threshold:.08,
        rootMargin:"0px 0px -5% 0px"
      });
    }

    items.forEach(item => {
      item.classList.add("motion-observed");
      state.revealObserver.observe(item);
    });
  }

  function setupActiveSections(root=document) {
    const sections = qsa(
      ".cd-section,.home-hero,.page-hero,.news-page-hero",
      root
    );

    if (!("IntersectionObserver" in window)) {
      sections.forEach(section => section.classList.add("motion-scene-active"));
      return;
    }

    if (!state.activeSectionObserver) {
      state.activeSectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle(
            "motion-scene-active",
            entry.isIntersecting
          );
        });
      },{
        threshold:0,
        rootMargin:"180px 0px 180px 0px"
      });
    }

    sections.forEach(section => {
      if (section.dataset.motionSceneObserved === "1") return;
      section.dataset.motionSceneObserved = "1";
      state.activeSectionObserver.observe(section);
    });
  }

  function renderDepthFrame() {
    state.frame = 0;
    const root = document.documentElement;
    const width = Math.max(innerWidth,1);
    const height = Math.max(innerHeight,1);
    const px = (state.pointerX / width - .5) * 2;
    const py = (state.pointerY / height - .5) * 2;
    const scroll = Math.min(1,Math.max(0,state.scrollY / height));

    root.style.setProperty("--motion-pointer-x",px.toFixed(4));
    root.style.setProperty("--motion-pointer-y",py.toFixed(4));
    root.style.setProperty("--motion-scroll",scroll.toFixed(4));
  }

  function scheduleDepthFrame() {
    if (state.frame) return;
    state.frame = requestAnimationFrame(renderDepthFrame);
  }

  function setupDepthMotion() {
    if (reducedMotion.matches) return;

    state.pointerX = innerWidth / 2;
    state.pointerY = innerHeight / 2;
    state.scrollY = scrollY;

    if (finePointer.matches) {
      document.addEventListener("pointermove",event => {
        if (event.pointerType === "touch") return;
        state.pointerX = event.clientX;
        state.pointerY = event.clientY;
        scheduleDepthFrame();
      },{passive:true});
    }

    window.addEventListener("scroll",() => {
      state.scrollY = scrollY;
      scheduleDepthFrame();
    },{passive:true});

    window.addEventListener("resize",scheduleDepthFrame,{passive:true});
    scheduleDepthFrame();
  }

  function resetMagnetic(element) {
    if (!element) return;
    element.style.translate = "0 0";
    element.classList.remove("motion-magnetic-active");
  }

  function setupMagneticButtons() {
    if (reducedMotion.matches || !finePointer.matches) return;

    document.addEventListener("pointermove",event => {
      const target = event.target.closest(
        ".button,.main-nav a,.site-nav a,.cd-section-rail button"
      );

      if (target !== state.activeMagnetic) {
        resetMagnetic(state.activeMagnetic);
        state.activeMagnetic = target;
      }
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;

      if (state.magneticFrame) return;
      state.magneticFrame = requestAnimationFrame(() => {
        state.magneticFrame = 0;
        target.classList.add("motion-magnetic-active");
        target.style.translate = `${(x * 7).toFixed(1)}px ${(y * 5).toFixed(1)}px`;
      });
    },{passive:true});

    document.addEventListener("pointerout",event => {
      if (!state.activeMagnetic) return;
      if (
        event.relatedTarget &&
        state.activeMagnetic.contains(event.relatedTarget)
      ) return;
      resetMagnetic(state.activeMagnetic);
      state.activeMagnetic = null;
    },{passive:true});
  }

  function resetMedia(element) {
    if (!element) return;
    element.style.setProperty("--media-x","0");
    element.style.setProperty("--media-y","0");
    element.classList.remove("motion-media-active");
  }

  function setupMediaDepth() {
    if (reducedMotion.matches || !finePointer.matches) return;

    document.addEventListener("pointermove",event => {
      const target = event.target.closest([
        ".home-hero__visual",
        ".resource-library-card__cover",
        ".news-card__media",
        ".news-feature-card__media",
        ".edition-card__visual"
      ].join(","));

      if (target !== state.activeMedia) {
        resetMedia(state.activeMedia);
        state.activeMedia = target;
      }
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;

      if (state.mediaFrame) return;
      state.mediaFrame = requestAnimationFrame(() => {
        state.mediaFrame = 0;
        target.classList.add("motion-media-active");
        target.style.setProperty("--media-x",x.toFixed(3));
        target.style.setProperty("--media-y",y.toFixed(3));
      });
    },{passive:true});

    document.addEventListener("pointerout",event => {
      if (!state.activeMedia) return;
      if (
        event.relatedTarget &&
        state.activeMedia.contains(event.relatedTarget)
      ) return;
      resetMedia(state.activeMedia);
      state.activeMedia = null;
    },{passive:true});
  }

  function setupButtonPulse() {
    document.addEventListener("pointerdown",event => {
      const button = event.target.closest(".button,button:not([disabled])");
      if (!button || reducedMotion.matches) return;

      const rect = button.getBoundingClientRect();
      const pulse = document.createElement("span");
      pulse.className = "motion-button-pulse";
      pulse.style.left = `${event.clientX - rect.left}px`;
      pulse.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(pulse);
      pulse.addEventListener("animationend",() => pulse.remove(),{once:true});
    });
  }

  function refresh(root=document) {
    decorateMotionItems(root);
    setupReveal(root);
    setupActiveSections(root);
  }

  function scheduleRefresh() {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => {
      state.refreshTimer = 0;
      refresh();
    },100);
  }

  function init() {
    if (state.initialized) {
      refresh();
      return;
    }

    state.initialized = true;
    document.documentElement.classList.add("motion-studio-ready");
    refresh();
    setupDepthMotion();
    setupMagneticButtons();
    setupMediaDepth();
    setupButtonPulse();

    document.addEventListener("portal:rendered",scheduleRefresh);
    document.addEventListener("admin-popup:updated",scheduleRefresh);
    window.addEventListener("pageshow",scheduleRefresh,{passive:true});

    const observer = new MutationObserver(mutations => {
      const useful = mutations.some(mutation =>
        [...mutation.addedNodes].some(node =>
          node instanceof Element &&
          !node.matches(
            ".motion-button-pulse,.cd-ambient,.bs-hero-atmosphere"
          )
        )
      );
      if (useful) scheduleRefresh();
    });

    observer.observe(document.body,{
      subtree:true,
      childList:true
    });
  }

  window.MotionStudio = {init,refresh};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();