/*
 * Portal Stack Motion V11.34
 * Adaptación del concepto Stack Motion Hover Effects para tarjetas completas.
 * Las imágenes permanecen estáticas; el movimiento se aplica a la superficie,
 * las capas, la información y las figuras decorativas.
 */
(() => {
  "use strict";

  const TARGET_SELECTOR = [
    ".edition-card",
    ".deal-card",
    ".archive-card",
    ".resource-library-card",
    ".news-feature-card",
    ".news-card"
  ].join(",");

  const MEDIA_SELECTOR = [
    ".edition-card__visual",
    ".deal-card__visual",
    ".archive-card__visual",
    ".resource-library-card__cover",
    ".news-feature-card__media",
    ".news-card__media"
  ].join(",");

  const CONTENT_SELECTOR = [
    ".edition-card__body",
    ".deal-card__content",
    ".archive-card__body",
    ".resource-library-card__body",
    ".news-feature-card__content",
    ".news-card__body"
  ].join(",");

  const FIGURE_SELECTOR = [
    ".edition-discount",
    ".edition-landscape",
    ".edition-landscape i",
    ".edition-landscape b",
    ".edition-landscape u",
    ".document-format",
    ".mini-scene",
    ".mini-scene i",
    ".mini-scene b",
    ".mini-scene u",
    ".resource-library-card__cover > span",
    ".resource-library-card__cover > small",
    ".news-visual > span",
    ".news-featured-badge",
    ".news-read-link b",
    ".edition-card__meta b",
    ".deal-card__meta b"
  ].join(",");

  const state = {
    initialized: false,
    observer: null,
    refreshTimer: 0,
    controllers: new WeakMap(),
    activeCard: null,
    pointerFrame: 0,
    pointerTarget: null,
    pointerPosition: {x: 0, y: 0}
  };

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover:hover) and (pointer:fine)");

  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const hasFinePointer = () => finePointerQuery.matches;

  function paletteFor(card,index) {
    const standard = [
      ["#36b9e8","#63a8ee","#897fe6","#ee9564"],
      ["#43c2aa","#4ca9df","#738bea","#efb255"],
      ["#3db7e3","#74c2eb","#7a82df","#d97ca3"],
      ["#24a8d4","#47bdb7","#7189e3","#ee925f"]
    ];

    if (card.matches(".news-card,.news-feature-card")) {
      return ["#319fd8","#53bee4","#6e88e9","#cc79bd"];
    }
    if (card.matches(".resource-library-card")) {
      return ["#24a8d6","#48bdb8","#6889e7","#e8aa56"];
    }
    if (card.matches(".archive-card")) {
      return ["#36b4df","#619fe9","#847fe2","#e89166"];
    }
    return standard[index % standard.length];
  }

  function motionTier() {
    return document.documentElement.dataset.motionTier
      || document.body?.dataset.motionTier
      || "medium";
  }

  function createLayers(card,index) {
    const palette = paletteFor(card,index);
    const fragment = document.createDocumentFragment();
    const layers = palette.map((color,layerIndex) => {
      const layer = document.createElement("span");
      layer.className = `sm-card-layer sm-card-layer--${layerIndex + 1}`;
      layer.setAttribute("aria-hidden","true");
      layer.style.setProperty("--sm-layer-color",color);
      fragment.appendChild(layer);
      return layer;
    });

    const surface = document.createElement("span");
    surface.className = "sm-card-surface";
    surface.setAttribute("aria-hidden","true");
    fragment.appendChild(surface);

    const highlight = document.createElement("span");
    highlight.className = "sm-card-highlight";
    highlight.setAttribute("aria-hidden","true");
    fragment.appendChild(highlight);

    card.prepend(fragment);
    return {layers,surface,highlight};
  }

  function copyCardAppearance(card,surface) {
    const computed = getComputedStyle(card);
    const radius = computed.borderRadius || "24px";
    const background = computed.background || computed.backgroundColor || "#fff";
    const border = computed.border || "1px solid rgba(67,113,169,.16)";
    const shadow = computed.boxShadow || "0 16px 38px rgba(8,55,120,.09)";

    card.style.setProperty("--sm-card-radius",radius);
    surface.style.background = background;
    surface.style.border = border;
    surface.style.boxShadow = shadow;

    card.style.setProperty("background","transparent","important");
    card.style.setProperty("border-color","transparent","important");
    card.style.setProperty("box-shadow","none","important");
  }

  function classifyElements(card) {
    const media = card.querySelector(MEDIA_SELECTOR);
    const content = card.querySelector(CONTENT_SELECTOR);
    const figures = [...card.querySelectorAll(FIGURE_SELECTOR)];

    media?.classList.add("sm-card-media-static");
    content?.classList.add("sm-card-content-motion");

    figures.forEach((figure,index) => {
      figure.classList.add("sm-card-figure-motion");
      const direction = index % 2 === 0 ? 1 : -1;
      const distance = 2.5 + Math.min(index,4) * .55;
      figure.style.setProperty("--sm-figure-x",`${(direction * distance).toFixed(2)}px`);
      figure.style.setProperty("--sm-figure-y",`${(-2.4 - index * .45).toFixed(2)}px`);
      figure.style.setProperty("--sm-figure-r",`${(direction * (.32 + index * .08)).toFixed(2)}deg`);
      figure.style.setProperty("--sm-figure-delay",`${Math.min(index * 18,90)}ms`);
    });

    return {media,content,figures};
  }

  function updatePointer(card,event) {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    state.pointerTarget = card;
    const rect = card.getBoundingClientRect();
    const x = Math.max(-1,Math.min(1,((event.clientX - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1,Math.min(1,((event.clientY - rect.top) / rect.height - .5) * 2));
    state.pointerPosition = {x,y};

    if (state.pointerFrame) return;
    state.pointerFrame = requestAnimationFrame(() => {
      state.pointerFrame = 0;
      const target = state.pointerTarget;
      if (!target || !target.classList.contains("sm-stack-active")) return;
      const {x:liveX,y:liveY} = state.pointerPosition;
      const tier = motionTier();
      const amplitude = tier === "high" ? 2.2 : tier === "medium" ? 1.35 : .7;
      target.style.setProperty("--sm-live-x",`${(liveX * amplitude).toFixed(2)}px`);
      target.style.setProperty("--sm-live-y",`${(liveY * amplitude * .7).toFixed(2)}px`);
      target.style.setProperty("--sm-content-x",`${(liveX * amplitude * .35).toFixed(2)}px`);
      target.style.setProperty("--sm-content-y",`${(liveY * amplitude * .28).toFixed(2)}px`);
      target.style.setProperty("--sm-light-x",`${((liveX + 1) * 50).toFixed(1)}%`);
      target.style.setProperty("--sm-light-y",`${((liveY + 1) * 50).toFixed(1)}%`);
    });
  }

  function activate(card) {
    if (prefersReducedMotion()) return;
    if (state.activeCard && state.activeCard !== card) {
      deactivate(state.activeCard);
    }
    state.activeCard = card;
    card.classList.add("sm-stack-active");
    card.setAttribute("data-stack-active","true");
  }

  function deactivate(card) {
    if (!card) return;
    card.classList.remove("sm-stack-active");
    card.setAttribute("data-stack-active","false");
    card.style.setProperty("--sm-live-x","0px");
    card.style.setProperty("--sm-live-y","0px");
    card.style.setProperty("--sm-light-x","50%");
    card.style.setProperty("--sm-light-y","50%");
    card.style.setProperty("--sm-content-x","0px");
    card.style.setProperty("--sm-content-y","0px");
    if (state.activeCard === card) state.activeCard = null;
  }

  function bindCard(card) {
    if (card.dataset.stackMotion === "2") return;
    if (card.closest("dialog,.admin-console,.context-editor")) return;

    const siblings = [...(card.parentElement?.children || [])];
    const index = Math.max(0,siblings.indexOf(card));
    const {surface} = createLayers(card,index);
    copyCardAppearance(card,surface);
    classifyElements(card);

    card.classList.add("sm-stack-card");
    card.dataset.stackMotion = "2";
    card.setAttribute("data-stack-active","false");
    card.style.setProperty("--sm-order",String(index));
    card.style.setProperty("--sm-live-x","0px");
    card.style.setProperty("--sm-live-y","0px");
    card.style.setProperty("--sm-light-x","50%");
    card.style.setProperty("--sm-light-y","50%");
    card.style.setProperty("--sm-content-x","0px");
    card.style.setProperty("--sm-content-y","0px");

    let touchTimer = 0;

    if (hasFinePointer()) {
      card.addEventListener("pointerenter",() => activate(card),{passive:true});
      card.addEventListener("pointermove",event => updatePointer(card,event),{passive:true});
      card.addEventListener("pointerleave",() => deactivate(card),{passive:true});
    }

    card.addEventListener("focusin",() => activate(card));
    card.addEventListener("focusout",event => {
      if (card.contains(event.relatedTarget)) return;
      deactivate(card);
    });

    card.addEventListener("pointerdown",event => {
      if (event.pointerType === "mouse" && hasFinePointer()) return;
      activate(card);
      clearTimeout(touchTimer);
      touchTimer = window.setTimeout(() => deactivate(card),760);
    },{passive:true});

    state.controllers.set(card,{activate:() => activate(card),deactivate:() => deactivate(card)});
  }

  function decorate(root = document) {
    const cards = [];
    if (root instanceof Element && root.matches(TARGET_SELECTOR)) cards.push(root);
    root.querySelectorAll?.(TARGET_SELECTOR).forEach(card => cards.push(card));
    cards.forEach(bindCard);
  }

  function scheduleDecorate(root = document) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => decorate(root),35);
  }

  function observe() {
    if (state.observer || !document.body) return;
    state.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(TARGET_SELECTOR) || node.querySelector(TARGET_SELECTOR)) {
            scheduleDecorate(document);
            return;
          }
        }
      }
    });
    state.observer.observe(document.body,{childList:true,subtree:true});
  }

  function refresh() {
    decorate(document);
  }

  function init() {
    if (!document.body) return;
    if (state.initialized) {
      refresh();
      return;
    }
    state.initialized = true;
    document.documentElement.classList.add("stack-motion-ready");
    refresh();
    observe();
    document.addEventListener("portal:rendered",refresh);
    window.addEventListener("pageshow",refresh,{passive:true});
    document.addEventListener("visibilitychange",() => {
      if (document.hidden && state.activeCard) deactivate(state.activeCard);
    },{passive:true});
  }

  window.PortalStackMotion = {init,refresh};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
