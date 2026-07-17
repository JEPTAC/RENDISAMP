/*
 * Portal Stack Motion
 * Adaptación visual para el Portal Histórico de San Pedro basada en el
 * concepto "Stack Motion Hover Effects" de Codrops (2017) y Anime.js.
 * No reutiliza las imágenes ni el HTML de demostración original.
 */
(() => {
  "use strict";

  const MEDIA_MAP = [
    [".edition-card", ".edition-card__visual"],
    [".deal-card", ".deal-card__visual"],
    [".archive-card", ".archive-card__visual"],
    [".resource-library-card", ".resource-library-card__cover"],
    [".news-feature-card", ".news-feature-card__media"],
    [".news-card", ".news-card__media"]
  ];

  const TARGET_SELECTOR = MEDIA_MAP.map(([card]) => card).join(",");
  const state = {
    observer: null,
    refreshTimer: 0,
    controllers: new WeakMap(),
    initialized: false
  };

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover:hover) and (pointer:fine)");

  const prefersReducedMotion = () => motionQuery.matches;
  const hasFinePointer = () => finePointerQuery.matches;

  function motionTier() {
    return document.documentElement.dataset.motionTier
      || document.body?.dataset.motionTier
      || "medium";
  }

  function paletteFor(card,index) {
    const palettes = [
      ["#31b6e8","#6e9cf6","#9a83ed","#ff9b62"],
      ["#4bc4ad","#48a9e6","#7a8ff0","#f2b657"],
      ["#46b9ea","#7ec8f2","#7d86e8","#de7fa7"],
      ["#23a7d9","#3dc0bb","#758be6","#f39462"]
    ];

    if (card.matches(".news-card,.news-feature-card")) {
      return ["#2d9fe0","#55c4ea","#768df2","#d984c4"];
    }
    if (card.matches(".resource-library-card")) {
      return ["#1fa7d8","#4fc5c0","#6d91ef","#f1ad57"];
    }
    if (card.matches(".archive-card")) {
      return ["#37b7e8","#67a8ef","#8f87e9","#ef9568"];
    }
    return palettes[index % palettes.length];
  }

  function findMedia(card) {
    for (const [cardSelector,mediaSelector] of MEDIA_MAP) {
      if (!card.matches(cardSelector)) continue;
      return card.querySelector(mediaSelector);
    }
    return null;
  }

  function setAccessibleState(card,active) {
    card.classList.toggle("sm-stack-active",active);
    card.setAttribute("data-stack-active",active ? "true" : "false");
  }

  function createController(card,host,surface,layers,index) {
    const title = card.querySelector("h2,h3,.edition-card__body h3,.deal-card__content h3");
    const meta = card.querySelector(
      ".edition-card__meta,.deal-card__meta,.resource-library-card__body > small," +
      ".news-card__body > .news-card__meta,.news-feature-card__content > .section-kicker"
    );
    const action = card.querySelector(
      ".edition-card__footer a,.deal-card__action,.resource-library-card button," +
      ".news-card footer a,.news-feature-card__footer a,.archive-card .button"
    );

    let active = false;
    let releaseTimer = 0;

    const removeAnimations = () => {
      if (!window.anime) return;
      window.anime.remove(layers);
      window.anime.remove(surface);
      if (title) window.anime.remove(title);
      if (meta) window.anime.remove(meta);
      if (action) window.anime.remove(action);
    };

    const reveal = (compact = false) => {
      if (active || prefersReducedMotion()) return;
      active = true;
      clearTimeout(releaseTimer);
      removeAnimations();
      setAccessibleState(card,true);

      const tier = motionTier();
      const low = tier === "low" || compact;
      const spread = low ? 3.5 : tier === "high" ? 7.5 : 5.5;
      const duration = low ? 430 : 760;
      const scale = low ? .94 : .885;

      layers.forEach((layer,layerIndex) => {
        layer.style.opacity = String(.18 + layerIndex * .15);
      });

      window.anime({
        targets: layers,
        translateX: (target,layerIndex) => {
          const direction = layerIndex % 2 === 0 ? -1 : 1;
          return direction * spread * (layerIndex + 1) * .34;
        },
        translateY: (target,layerIndex) => spread * (layerIndex + 1) * .54,
        translateZ: (target,layerIndex) => -10 * (layers.length - layerIndex),
        rotateX: (target,layerIndex) => low ? 0 : -(layers.length - layerIndex) * .7,
        rotateZ: (target,layerIndex) => {
          if (low) return 0;
          const direction = layerIndex % 2 === 0 ? -1 : 1;
          return direction * (.28 + layerIndex * .22);
        },
        scale: (target,layerIndex) => .985 - (layers.length - layerIndex - 1) * .014,
        opacity: (target,layerIndex) => .2 + layerIndex * .16,
        duration,
        delay: (target,layerIndex) => layerIndex * 32,
        easing: [0.2,1,0.3,1]
      });

      window.anime({
        targets: surface,
        translateY: low ? -2 : -5,
        translateZ: low ? 8 : 28,
        scale,
        duration: duration + 80,
        easing: [0.2,1,0.3,1]
      });

      [title,meta,action].filter(Boolean).forEach((element,elementIndex) => {
        window.anime({
          targets: element,
          translateY: elementIndex === 0 ? -3 : -1.5,
          opacity: [0.88,1],
          duration: 420 + elementIndex * 70,
          delay: 70 + elementIndex * 45,
          easing: [0.2,1,0.3,1]
        });
      });
    };

    const conceal = () => {
      if (!active) return;
      active = false;
      clearTimeout(releaseTimer);
      removeAnimations();
      setAccessibleState(card,false);

      window.anime({
        targets: layers,
        translateX: 0,
        translateY: 0,
        translateZ: 0,
        rotateX: 0,
        rotateZ: 0,
        scale: 1,
        opacity: 0,
        duration: 620,
        delay: (target,layerIndex) => (layers.length - layerIndex - 1) * 22,
        easing: [0.2,1,0.3,1]
      });

      window.anime({
        targets: surface,
        translateY: 0,
        translateZ: 0,
        scale: 1,
        duration: 690,
        easing: [0.2,1,0.3,1]
      });

      [title,meta,action].filter(Boolean).forEach(element => {
        window.anime({
          targets: element,
          translateY: 0,
          opacity: 1,
          duration: 520,
          easing: [0.2,1,0.3,1]
        });
      });
    };

    const pulse = () => {
      reveal(true);
      releaseTimer = window.setTimeout(conceal,520);
    };

    const controller = {reveal,conceal,pulse,removeAnimations};
    state.controllers.set(card,controller);

    if (hasFinePointer()) {
      card.addEventListener("pointerenter",() => reveal(false),{passive:true});
      card.addEventListener("pointerleave",conceal,{passive:true});
    }

    card.addEventListener("focusin",() => reveal(motionTier() === "low"));
    card.addEventListener("focusout",event => {
      if (card.contains(event.relatedTarget)) return;
      conceal();
    });

    card.addEventListener("pointerdown",event => {
      if (event.pointerType === "mouse" && hasFinePointer()) return;
      pulse();
    },{passive:true});

    return controller;
  }

  function decorateCard(card,index = 0) {
    if (!(card instanceof HTMLElement)) return;
    if (card.dataset.stackMotion === "1") return;
    if (card.closest("dialog,.admin-console,.context-editor")) return;

    const media = findMedia(card);
    if (!media || media.closest(".sm-stack-host")) return;

    const host = document.createElement("div");
    host.className = "sm-stack-host";

    const computed = getComputedStyle(media);
    host.style.setProperty("--sm-stack-radius",computed.borderRadius || "18px");

    const palette = paletteFor(card,index);
    const layers = palette.map((color,layerIndex) => {
      const layer = document.createElement("span");
      layer.className = "sm-stack-layer";
      layer.setAttribute("aria-hidden","true");
      layer.style.setProperty("--sm-layer-color",color);
      layer.style.setProperty("--sm-layer-index",String(layerIndex));
      return layer;
    });

    const parent = media.parentNode;
    parent.insertBefore(host,media);
    layers.forEach(layer => host.appendChild(layer));
    host.appendChild(media);

    media.classList.add("sm-stack-surface");
    card.classList.add("sm-stack-card");
    card.dataset.stackMotion = "1";
    card.style.setProperty("--sm-stack-order",String(index));

    if (prefersReducedMotion() || !window.anime) {
      card.classList.add("sm-stack-reduced");
      return;
    }

    createController(card,host,media,layers,index);
  }

  function decorate(root = document) {
    const cards = [];
    if (root instanceof Element && root.matches(TARGET_SELECTOR)) cards.push(root);
    root.querySelectorAll?.(TARGET_SELECTOR).forEach(card => cards.push(card));
    cards.forEach((card,index) => decorateCard(card,index));
  }

  function scheduleDecorate(root = document) {
    clearTimeout(state.refreshTimer);
    state.refreshTimer = window.setTimeout(() => decorate(root),45);
  }

  function observe() {
    if (state.observer || !document.body) return;
    state.observer = new MutationObserver(mutations => {
      let relevant = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches(TARGET_SELECTOR) || node.querySelector(TARGET_SELECTOR)) {
            relevant = true;
            break;
          }
        }
        if (relevant) break;
      }
      if (relevant) scheduleDecorate(document);
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
    motionQuery.addEventListener?.("change",() => location.reload());
  }

  window.PortalStackMotion = {init,refresh};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
