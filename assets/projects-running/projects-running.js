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
  let managerDialog = null;
  let managerImageRef = null;

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
  const canManage = () => Boolean(window.Portal?.state?.admin || window.FirebasePortal?.canWrite?.());
  const normalize = (project = {}, index = 0) => {
    const accent = /^#[0-9a-f]{6}$/i.test(String(project.accent || project.color || ""))
      ? String(project.accent || project.color)
      : "#1769a8";
    return {
      id: String(project.id || `running-${index + 1}`),
      title: String(project.title || `Proyecto en ejecución ${index + 1}`).trim(),
      image: project.imageRef || project.image || FALLBACK_IMAGE,
      imageRef: project.imageRef && typeof project.imageRef === "object" ? project.imageRef : (project.image && typeof project.image === "object" ? project.image : null),
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
      advances:Array.isArray(project.advances) ? project.advances.map(item => String(item)).filter(Boolean).slice(0,8) : [],
      lastUpdated:String(project.lastUpdated || project.updatedAt || "Por registrar").trim(),
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

  function extractDriveId(value) {
    const text = String(value || "");
    return text.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1]
      || text.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1]
      || "";
  }

  function projectImage(project) {
    if (window.DriveMedia?.resolveUrl) return window.DriveMedia.resolveUrl(project.image,FALLBACK_IMAGE);
    if (typeof project.image === "string") {
      const id = extractDriveId(project.image);
      return id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000` : (project.image || FALLBACK_IMAGE);
    }
    const ref = project.image || project.imageRef || {};
    const id = ref.driveFileId || ref.id || extractDriveId(ref.webViewLink || ref.displayUrl || ref.webContentLink);
    return ref.displayUrl || ref.thumbnailUrl || (id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w2000` : FALLBACK_IMAGE);
  }

  function imageMarkup(project, className = "") {
    return `<img class="${className}" src="${escapeHtml(projectImage(project))}" data-fallback-src="${FALLBACK_IMAGE}" alt="Fotografía de ${escapeHtml(project.title)}" loading="lazy" decoding="async" data-running-project-image>`;
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
          <div class="running-projects__head-actions"><a class="running-projects__all" href="proyectos.html#proyectos-en-ejecucion">Ver todos los proyectos →</a>${canManage() ? '<button type="button" class="running-projects__manage" data-running-manage>Editar proyectos</button>' : ''}</div>
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
          ${canManage() ? '<button type="button" class="running-projects__manage" data-running-manage>Editar proyectos</button>' : ''}
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
    dialog.addEventListener("cancel",event => { event.preventDefault(); dialog.close(); });
    dialog.addEventListener("click", event => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("--scrollbar-compensation");
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
          ${project.advances.length ? `<div><small>Principales avances</small><ul class="running-projects-dialog__advances">${project.advances.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
          <p class="running-projects-dialog__updated">Última actualización: <strong>${escapeHtml(project.lastUpdated)}</strong></p>
          ${url ? `<a class="running-projects-dialog__link" href="${escapeHtml(url)}">Ver proyecto completo →</a>` : ""}
        </div>
      </div>`;
    const dialogImage = modal.querySelector("[data-running-project-image]");
    if (dialogImage) { dialogImage.loading = "eager"; dialogImage.fetchPriority = "high"; }
    if (!modal.open) {
      const gap = Math.max(0,window.innerWidth-document.documentElement.clientWidth);
      document.body.style.setProperty("--scrollbar-compensation",`${gap}px`);
      document.body.classList.add("modal-open");
      modal.showModal();
    }
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
      image.src = projectImage(project);
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

  function saveRunningProjects(projects, message = "Proyectos actualizados.") {
    if (!window.Portal?.state?.content) window.Portal.state.content = {};
    window.Portal.state.content.runningProjects = projects.map(normalize);
    window.Portal.helpers.save();
    window.Portal.helpers.toast?.(message);
    refreshAll();
  }

  function ensureManagerDialog() {
    if (managerDialog) return managerDialog;
    managerDialog = document.createElement("dialog");
    managerDialog.className = "running-projects-manager dialog";
    managerDialog.innerHTML = `<button type="button" class="dialog-close" data-running-manager-close aria-label="Cerrar">×</button>
      <div class="running-projects-manager__layout"><aside><span class="section-kicker">ADMINISTRACIÓN</span><h2>Proyectos en ejecución</h2><div data-running-manager-list></div><button type="button" class="button button-secondary" data-running-manager-add>＋ Crear proyecto</button></aside>
      <form data-running-manager-form><input type="hidden" name="index"><label>Nombre<input name="title" required maxlength="120"></label><label>Categoría<input name="category" maxlength="60"></label><label>Estado<input name="status" maxlength="60"></label><label>Avance %<input name="progress" type="number" min="0" max="100"></label><label>Fecha de inicio<input name="startDate"></label><label>Finalización estimada<input name="endDate"></label><label>Ubicación<input name="location"></label><label>Área responsable<input name="area"></label><label class="full">Descripción<textarea name="description" required></textarea></label><label class="full">Objetivo<textarea name="objective"></textarea></label><label class="full">Resultado<textarea name="result"></textarea></label><label class="full">Próximo hito<textarea name="next"></textarea></label><label class="full">Principales avances<textarea name="advances" placeholder="Uno por línea"></textarea></label><label>Última actualización<input name="lastUpdated"></label><label>Color<input name="accent" type="color"></label><label class="full">Enlace<input name="url"></label><div class="full running-projects-manager__media"><span data-running-manager-image>Sin imagen seleccionada</span><button type="button" class="button button-secondary" data-running-manager-drive>Elegir imagen en Drive</button></div><div class="full running-projects-manager__actions"><button type="button" class="button button-secondary" data-running-manager-delete>Eliminar</button><button type="submit" class="button button-primary">Guardar cambios</button></div></form></div>`;
    document.body.appendChild(managerDialog);
    let working = [];
    const list = managerDialog.querySelector("[data-running-manager-list]");
    const form = managerDialog.querySelector("[data-running-manager-form]");
    const fill = index => {
      const project = working[index]; if (!project) return;
      form.elements.index.value = index;
      ["title","category","status","progress","startDate","endDate","location","area","description","objective","result","next","lastUpdated","accent","url"].forEach(key => { if (form.elements[key]) form.elements[key].value = project[key] ?? ""; });
      form.elements.advances.value = (project.advances || []).join("\n");
      managerImageRef = project.imageRef || (typeof project.image === "object" ? project.image : null);
      managerDialog.querySelector("[data-running-manager-image]").textContent = managerImageRef?.name || (typeof project.image === "string" && project.image !== FALLBACK_IMAGE ? project.image : "Sin imagen seleccionada");
      [...list.children].forEach((button,i) => button.classList.toggle("is-active", i === index));
    };
    const renderList = active => {
      list.innerHTML = working.map((project,index) => `<button type="button" data-running-manager-index="${index}"><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.status)} · ${project.progress}%</small></button>`).join("");
      fill(Math.max(0,Math.min(active,working.length-1)));
    };
    list.addEventListener("click",event => { const button=event.target.closest("[data-running-manager-index]"); if(button) fill(Number(button.dataset.runningManagerIndex)); });
    managerDialog.querySelector("[data-running-manager-close]").addEventListener("click",()=>managerDialog.close());
    managerDialog.addEventListener("click",event=>{if(event.target===managerDialog) managerDialog.close();});
    managerDialog.querySelector("[data-running-manager-add]").addEventListener("click",()=>{ working.push(normalize({title:"Nuevo proyecto",status:"En preparación",progress:0},working.length)); renderList(working.length-1); });
    managerDialog.querySelector("[data-running-manager-delete]").addEventListener("click",()=>{ const index=Number(form.elements.index.value); if(!working[index]||!confirm(`¿Eliminar “${working[index].title}”?`))return; working.splice(index,1); if(!working.length)working.push(normalize({},0)); renderList(Math.max(0,index-1)); });
    managerDialog.querySelector("[data-running-manager-drive]").addEventListener("click",async()=>{ const ref=await window.DriveMedia?.choose?.({modulePath:"Proyectos/En ejecución",accept:"image/*",title:"Imagen del proyecto en ejecución",makePublic:true}); if(!ref)return; managerImageRef=ref; managerDialog.querySelector("[data-running-manager-image]").textContent=ref.name||ref.driveFileId; });
    form.addEventListener("submit",event=>{ event.preventDefault(); const index=Number(form.elements.index.value); const data=new FormData(form); const current=working[index]||{}; working[index]=normalize({...current,title:data.get("title"),category:data.get("category"),status:data.get("status"),progress:data.get("progress"),startDate:data.get("startDate"),endDate:data.get("endDate"),location:data.get("location"),area:data.get("area"),description:data.get("description"),objective:data.get("objective"),result:data.get("result"),next:data.get("next"),advances:String(data.get("advances")||"").split(/\r?\n/).map(v=>v.trim()).filter(Boolean),lastUpdated:data.get("lastUpdated"),accent:data.get("accent"),url:data.get("url"),imageRef:managerImageRef,image:managerImageRef||current.image,updatedBy:window.FirebasePortal?.getStatus?.()?.user?.uid||"",updatedAt:new Date().toISOString()},index); saveRunningProjects(working,"Proyectos en ejecución guardados."); managerDialog.close(); });
    managerDialog.openFor = () => { working=getProjects().map(project=>({...project})); renderList(0); managerDialog.showModal(); };
    return managerDialog;
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
      if (event.target.closest("[data-running-manage]")) { ensureManagerDialog().openFor(); return; }
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
    schema: ["id","title","image","imageRef","description","status","progress","startDate","endDate","location","area","category","objective","result","next","advances","lastUpdated","url","accent"]
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refreshAll, { once: true });
  else refreshAll();

  ["portal:datachange","firebase:auth","portal:adminlogout"].forEach(eventName => {
    window.addEventListener(eventName, () => window.setTimeout(refreshAll, 0));
  });
  window.addEventListener("pageshow", () => window.setTimeout(refreshAll, 0));
})();
