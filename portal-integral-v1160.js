(() => {
  "use strict";
  if (window.__PORTAL_INTEGRAL_V1160__) return;
  window.__PORTAL_INTEGRAL_V1160__ = true;

  const FALLBACKS = {
    default:"assets/cinematica/parque-himno-1600.webp",
    news:"assets/cinematica/alcaldia-san-pedro-1600.webp",
    project:"assets/cinematica/parque-himno-1600.webp",
    map:"assets/cinematica/iglesia-san-pedro-960.webp"
  };

  function ensureIntegralCssLast() {
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(item => (item.getAttribute("href") || "").includes("portal-integral-v1160.css"));
    if (link && link.parentElement === document.head && link !== document.head.lastElementChild) document.head.appendChild(link);
  }

  function appendCredit() {
    const footer = document.querySelector("#siteFooter footer,#siteFooter .site-footer,#siteFooter");
    if (!footer || footer.querySelector(".portal-development-credit")) return;
    const credit = document.createElement("div");
    credit.className = "portal-development-credit";
    credit.innerHTML = `<span>Desarrollado por</span><strong>Juan Esteban Pérez</strong><span>– Enlace TIC’s</span>`;
    footer.appendChild(credit);
  }

  function removeIntrusiveLoading() {
    document.querySelectorAll(".global-loading-overlay,.loading-overlay,.portal-loading-dialog").forEach(node => {
      node.hidden = true;
      node.setAttribute("aria-hidden","true");
    });
  }

  function imageFallback(image) {
    if (!(image instanceof HTMLImageElement) || image.dataset.integralFallbackBound === "true") return;
    image.dataset.integralFallbackBound = "true";
    image.addEventListener("error", () => {
      if (image.dataset.integralFallbackApplied === "true") return;
      image.dataset.integralFallbackApplied = "true";
      const type = image.closest(".news-detail,.news-card") ? "news" : image.closest("[data-running-projects],.projects-psp") ? "project" : image.closest(".territory-section") ? "map" : "default";
      image.src = image.dataset.fallbackSrc || FALLBACKS[type];
    });
    if (!image.alt.trim()) image.alt = "Imagen institucional de apoyo";
    if (!image.hasAttribute("decoding")) image.decoding = "async";
    if (!image.hasAttribute("loading") && !image.closest(".page-hero,.home-xmb-banner")) image.loading = "lazy";
  }

  function bindImages(root = document) { root.querySelectorAll("img").forEach(imageFallback); }

  function preserveNewsReturn(event) {
    const link = event.target.closest?.('a[href*="noticia.html?id="]');
    if (!link) return;
    const filters = {
      href:location.href,
      scrollY:window.scrollY,
      query:document.querySelector("#newsSearch")?.value || "",
      category:document.querySelector("#newsCategory")?.value || "all",
      year:document.querySelector("#newsYear")?.value || "all",
      savedAt:Date.now()
    };
    sessionStorage.setItem("sp_news_return_state",JSON.stringify(filters));
  }

  function stabilizeDialogs() {
    document.querySelectorAll("dialog").forEach(dialog => {
      if (dialog.dataset.integralDialogBound === "true") return;
      dialog.dataset.integralDialogBound = "true";
      dialog.addEventListener("close", () => {
        document.body.classList.remove("has-accessible-modal");
        document.body.style.removeProperty("--scrollbar-compensation");
      });
      new MutationObserver(() => {
        if (dialog.open) {
          const gap = Math.max(0,window.innerWidth-document.documentElement.clientWidth);
          document.body.style.setProperty("--scrollbar-compensation",`${gap}px`);
          document.body.classList.add("has-accessible-modal");
        }
      }).observe(dialog,{attributes:true,attributeFilter:["open"]});
    });
  }

  function protectSubmits() {
    document.addEventListener("submit", event => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.dataset.preventDoubleSubmit === "false") return;
      if (form.dataset.submitting === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      form.dataset.submitting = "true";
      const buttons = [...form.querySelectorAll('button[type="submit"],input[type="submit"]')];
      buttons.forEach(button => button.disabled = true);
      window.setTimeout(() => {
        form.dataset.submitting = "false";
        buttons.forEach(button => button.disabled = false);
      },5000);
    },true);
  }

  function auditEditControls(root = document) {
    const admin = Boolean(window.Portal?.state?.admin || window.FirebasePortal?.getStatus?.()?.canWrite);
    root.querySelectorAll(".admin-section-edit-button,[data-admin-edit],.edit-section-button").forEach(button => {
      button.hidden = !admin;
      if (!button.type && button.tagName === "BUTTON") button.type = "button";
      if (!button.getAttribute("aria-label")) button.setAttribute("aria-label",button.textContent.trim() || "Editar sección");
    });
  }

  function refreshMapSize() {
    const section = document.querySelector(".territory-section");
    if (!section) return;
    window.dispatchEvent(new CustomEvent("territory:invalidate"));
  }

  function init() {
    ensureIntegralCssLast();
    appendCredit();
    removeIntrusiveLoading();
    bindImages();
    stabilizeDialogs();
    auditEditControls();
    window.DriveMedia?.bind?.();
    window.PortalSubscriptions?.bind?.();
    refreshMapSize();
  }

  document.addEventListener("click",preserveNewsReturn,true);
  protectSubmits();
  ["portal:rendered","portal:datachange","firebase:auth","portal:adminchange"].forEach(name => {
    window.addEventListener(name,() => requestAnimationFrame(init));
    document.addEventListener(name,() => requestAnimationFrame(init));
  });
  window.addEventListener("pageshow",() => requestAnimationFrame(init));
  window.addEventListener("resize",() => window.clearTimeout(window.__integralResizeTimer) || (window.__integralResizeTimer=window.setTimeout(refreshMapSize,120)),{passive:true});
  document.addEventListener("visibilitychange",() => { if (!document.hidden) refreshMapSize(); });

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      bindImages(node);
      stabilizeDialogs();
      auditEditControls(node);
      appendCredit();
    }));
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.PortalIntegral = {init,appendCredit,bindImages,refreshMapSize,ensureIntegralCssLast,FALLBACKS};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
