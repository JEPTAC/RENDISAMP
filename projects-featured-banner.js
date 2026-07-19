(() => {
  "use strict";

  const BUILD = "11.51-featured-projects-bridge";
  const iframe = document.querySelector("#featuredProjectsBanner");
  if (!iframe) return;

  const sameOrigin = event => event.origin === window.location.origin && event.source === iframe.contentWindow;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function portal() {
    return window.Portal || null;
  }

  function canEdit() {
    const api = portal();
    let storedAdmin = false;
    let localMode = false;
    try {
      storedAdmin = sessionStorage.getItem(api?.KEYS?.admin || "sp_v6_admin") === "1";
      localMode = sessionStorage.getItem("sp_admin_mode") === "local";
    } catch (_) {}
    return Boolean(api?.state?.admin || storedAdmin || localMode);
  }

  function normalizeProject(project = {}, index = 0) {
    const accent = /^#[0-9a-f]{6}$/i.test(String(project.accent || project.color || ""))
      ? String(project.accent || project.color)
      : "#2f6ff2";
    return {
      id: String(project.id || `featured-${index + 1}`),
      category: String(project.category || "Proyecto").slice(0, 40),
      eyebrow: String(project.eyebrow || project.type || "PROYECTO DESTACADO").slice(0, 50),
      year: String(project.year || "VIGENCIA").slice(0, 36),
      title: String(project.title || "Proyecto sin título").slice(0, 100),
      description: String(project.description || "").slice(0, 320),
      progress: String(project.progress ?? project.metric ?? "—").slice(0, 18),
      period: String(project.period || project.year || "—").slice(0, 24),
      accent,
      image: String(project.image || ""),
      alt: String(project.alt || (project.title ? `Fotografía de ${project.title}` : "Fotografía del proyecto")).slice(0, 180)
    };
  }

  function derivedProjects() {
    const api = portal();
    const content = api?.state?.content;
    if (!content || typeof content !== "object") return [];

    if (content.featuredProjectsConfigured && Array.isArray(content.featuredProjects)) {
      return content.featuredProjects.map(normalizeProject).slice(0, 8);
    }

    const folders = Array.isArray(content.projects) ? content.projects : [];
    return folders
      .filter(project => String(project?.image || "").trim())
      .slice(0, 6)
      .map((project, index) => normalizeProject({
        id: project.id,
        category: project.category,
        eyebrow: project.type || "PROYECTO DESTACADO",
        year: project.year,
        title: project.title,
        description: project.description,
        progress: project.metric || (Number.isFinite(Number(project.progress)) ? `${Number(project.progress)} %` : "—"),
        period: project.year,
        accent: project.color,
        image: project.image,
        alt: `Fotografía de ${project.title || "proyecto"}`
      }, index));
  }

  function post(type, detail = {}) {
    iframe.contentWindow?.postMessage({ type, build: BUILD, ...detail }, window.location.origin);
  }

  function sendState() {
    post("SP_FEATURED_PROJECTS_INIT", {
      canEdit: canEdit(),
      projects: derivedProjects()
    });
  }

  function setFrameHeight(height) {
    const viewport = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const min = mobile ? 760 : 570;
    const max = mobile ? Math.max(820, viewport * 1.35) : 820;
    const next = clamp(Number(height) || min, min, max);
    iframe.style.height = `${Math.round(next)}px`;
  }

  function saveProjects(projects) {
    const api = portal();
    if (!api || !canEdit()) {
      post("SP_FEATURED_PROJECTS_SAVE_RESULT", {
        ok: false,
        message: "La sesión no tiene permisos de edición."
      });
      return;
    }

    const normalized = Array.isArray(projects)
      ? projects.map(normalizeProject).slice(0, 8)
      : [];
    const serialized = JSON.stringify(normalized);

    if (serialized.length > 760000) {
      post("SP_FEATURED_PROJECTS_SAVE_RESULT", {
        ok: false,
        message: "Las imágenes todavía son demasiado pesadas. Redúcelas antes de guardar."
      });
      api.helpers?.toast?.("No se guardó el banner: las imágenes superan el tamaño seguro.");
      return;
    }

    if (!api.state.content || typeof api.state.content !== "object") api.state.content = {};
    api.state.content.featuredProjects = normalized;
    api.state.content.featuredProjectsConfigured = true;

    try {
      api.helpers.save();
      api.helpers.toast?.("Banner de Proyectos guardado correctamente.");
      post("SP_FEATURED_PROJECTS_SAVE_RESULT", {
        ok: true,
        projects: normalized,
        message: "Cambios guardados correctamente."
      });
      window.dispatchEvent(new CustomEvent("portal:rendered", {
        detail: { source: "featured-projects-banner", build: BUILD }
      }));
    } catch (error) {
      console.error("[Banner Proyectos] No fue posible guardar.", error);
      post("SP_FEATURED_PROJECTS_SAVE_RESULT", {
        ok: false,
        message: "No fue posible guardar los cambios."
      });
      api.helpers?.toast?.("No fue posible guardar el banner de Proyectos.");
    }
  }

  window.addEventListener("message", event => {
    if (!sameOrigin(event)) return;
    const data = event.data || {};

    if (data.type === "SP_FEATURED_PROJECTS_READY") {
      iframe.classList.add("is-ready");
      iframe.setAttribute("aria-busy", "false");
      sendState();
      return;
    }

    if (data.type === "SP_FEATURED_PROJECTS_RESIZE") {
      setFrameHeight(data.height);
      return;
    }

    if (data.type === "SP_FEATURED_PROJECTS_SAVE") {
      saveProjects(data.projects);
    }
  });

  iframe.addEventListener("load", () => {
    window.setTimeout(sendState, 40);
    window.setTimeout(() => iframe.classList.add("is-ready"), 240);
  });

  ["firebase:auth", "portal:datachange", "portal:rendered", "portal:adminlogout"].forEach(eventName => {
    window.addEventListener(eventName, () => window.setTimeout(sendState, 0));
  });

  window.addEventListener("resize", () => post("SP_FEATURED_PROJECTS_REQUEST_SIZE"), { passive: true });

  const start = () => {
    sendState();
    window.setTimeout(sendState, 300);
    window.setTimeout(sendState, 1200);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
