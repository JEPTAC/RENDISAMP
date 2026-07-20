(() => {
  "use strict";
  if (window.__RENDISAMP_REPAIR_V1161__) return;
  window.__RENDISAMP_REPAIR_V1161__ = true;

  const FALLBACK_IMAGE = "assets/cinematica/parque-himno-1600.webp";
  const RECOVERY_KEY = "sp_v1161_ideas_recovered";
  const DEFAULT_IDEAS = [
    {id:"i1",title:"Ruta segura para estudiantes",author:"Junta de Acción Comunal",location:"Zona urbana",category:"Infraestructura",description:"Mejorar señalización, iluminación y pasos seguros en recorridos utilizados por estudiantes.",status:"analisis",response:"La propuesta fue remitida a Planeación e Infraestructura para revisión técnica.",votes:18,created:"20 jun. 2026"},
    {id:"i2",title:"Mercado campesino mensual",author:"Productores rurales",location:"Zona rural",category:"Desarrollo social",description:"Crear un espacio mensual para que productores locales ofrezcan sus productos directamente.",status:"aceptada",response:"La iniciativa será considerada en la programación institucional del segundo semestre.",votes:31,created:"11 jun. 2026"},
    {id:"i3",title:"Recuperación de un parque barrial",author:"Colectivo juvenil",location:"Barrio El Centro",category:"Medio ambiente",description:"Recuperar zonas verdes, mobiliario y pintura mediante una jornada comunitaria.",status:"resuelta",response:"Se realizó una intervención inicial y se programó una segunda jornada de mantenimiento.",votes:22,created:"27 may. 2026"},
    {id:"i4",title:"Talleres culturales itinerantes",author:"Madres comunitarias",location:"Corregimientos",category:"Cultura",description:"Llevar talleres de música, lectura y artes a diferentes sectores rurales.",status:"recibida",response:"La propuesta fue recibida y está pendiente de asignación.",votes:9,created:"2 jul. 2026"}
  ];

  function recoverIdeasOnce() {
    if (!window.Portal?.state || !Array.isArray(window.Portal.state.ideas)) return;
    if (window.Portal.state.ideas.length || localStorage.getItem(RECOVERY_KEY) === "1") return;
    window.Portal.state.ideas = DEFAULT_IDEAS.map(item => ({...item}));
    localStorage.setItem(RECOVERY_KEY,"1");
    window.Portal.helpers?.save?.({localOnly:true});
    window.dispatchEvent(new CustomEvent("portal:datachange",{detail:{source:"ideas-recovery-v1161"}}));
  }

  function addDevelopmentCredit() {
    const footer = document.querySelector("#siteFooter footer, #siteFooter .site-footer, #siteFooter");
    if (!footer || footer.querySelector(".development-credit")) return;
    const credit = document.createElement("div");
    credit.className = "development-credit";
    credit.innerHTML = "<span>Desarrollado por</span> <strong>Juan Esteban Pérez</strong> <span>– Enlace TIC’s</span>";
    footer.appendChild(credit);
  }

  function installImageFallbacks(root = document) {
    root.querySelectorAll("img").forEach(image => {
      if (image.dataset.repairFallbackBound === "true") return;
      image.dataset.repairFallbackBound = "true";
      image.addEventListener("error",() => {
        if (image.dataset.repairFallbackApplied === "true") return;
        image.dataset.repairFallbackApplied = "true";
        image.src = image.dataset.fallbackSrc || image.dataset.imageFallback || FALLBACK_IMAGE;
      });
    });
  }

  function stabilizeMap() {
    const map = window.TerritoryExperience;
    if (!map) return;
    window.dispatchEvent(new Event("territory:invalidate"));
    document.querySelectorAll(".territory-leaflet-icon").forEach(marker => {
      marker.style.opacity = "1";
      marker.style.visibility = "visible";
    });
  }

  function ensureProjectBanner() {
    const root = document.querySelector("[data-projects-featured]");
    if (!root) return;
    root.style.removeProperty("display");
    root.style.removeProperty("visibility");
    root.style.removeProperty("opacity");
    root.hidden = false;
  }

  function bind() {
    recoverIdeasOnce();
    addDevelopmentCredit();
    installImageFallbacks();
    ensureProjectBanner();
    if (document.querySelector(".territory-experience-section")) {
      requestAnimationFrame(stabilizeMap);
      setTimeout(stabilizeMap,300);
    }
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (!(node instanceof Element)) return;
      installImageFallbacks(node);
    }));
    addDevelopmentCredit();
    ensureProjectBanner();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();

  observer.observe(document.documentElement,{childList:true,subtree:true});
  ["portal:rendered","portal:datachange","firebase:data","firebase:authchange"].forEach(name => {
    window.addEventListener(name,() => setTimeout(bind,0));
    document.addEventListener(name,() => setTimeout(bind,0));
  });
  window.addEventListener("pageshow",() => setTimeout(stabilizeMap,80));
  window.addEventListener("resize",() => requestAnimationFrame(stabilizeMap),{passive:true});
})();
