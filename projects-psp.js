(() => {
  "use strict";

  const BUILD = "11.39-proyectos-psp";
  const MIN_PROJECTS = 5;
  const MAX_PROJECTS = 10;
  const PALETTE = [
    ["#1f8bd1","#0d4f8e","31,139,209"],
    ["#44b9a8","#176d67","68,185,168"],
    ["#765bd6","#443297","118,91,214"],
    ["#eb8751","#a54627","235,135,81"],
    ["#df5d82","#96334f","223,93,130"],
    ["#4797dc","#205e9b","71,151,220"],
    ["#53af67","#25733a","83,175,103"],
    ["#d89e32","#8f6115","216,158,50"],
    ["#4d79cd","#294a8d","77,121,205"],
    ["#9a67cf","#613796","154,103,207"]
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

  function defaultProject(index) {
    const [color, dark, rgb] = PALETTE[index % PALETTE.length];
    return {
      id:`project-${String(index + 1).padStart(2,"0")}`,
      title:`Proyecto ${String(index + 1).padStart(2,"0")}`,
      category:"Por registrar",
      type:"Carpeta de proyecto",
      year:"2026",
      status:"Información pendiente",
      icon:"PR",
      color,
      dark,
      rgb,
      metric:"—",
      metricLabel:"indicador por registrar",
      progress:0,
      secondaryMetric:"Espacio disponible para documentar el proyecto.",
      description:"Esta carpeta está preparada para registrar la información, fotografías, avances, resultados y compromisos del proyecto.",
      tags:["Proyecto","Rendición de cuentas"],
      objective:"Objetivo por registrar.",
      result:"Resultado por registrar.",
      next:"Próximo paso por registrar.",
      image:"",
      gallery:[]
    };
  }

  function normalizeProject(project, index) {
    const fallback = defaultProject(index);
    const color = /^#[0-9a-f]{6}$/i.test(String(project?.color || ""))
      ? project.color
      : fallback.color;
    const dark = /^#[0-9a-f]{6}$/i.test(String(project?.dark || ""))
      ? project.dark
      : fallback.dark;
    const rgb = hexToRgb(color) || fallback.rgb;
    return {
      ...fallback,
      ...project,
      color,
      dark,
      rgb,
      progress:clamp(Number(project?.progress || 0),0,100),
      tags:Array.isArray(project?.tags)
        ? project.tags.filter(Boolean).slice(0,6)
        : String(project?.tags || "").split(",").map(item => item.trim()).filter(Boolean).slice(0,6),
      gallery:Array.isArray(project?.gallery)
        ? project.gallery.filter(Boolean).slice(0,8)
        : String(project?.gallery || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean).slice(0,8)
    };
  }

  function hexToRgb(hex) {
    const match = String(hex || "").match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!match) return null;
    return `${parseInt(match[1],16)},${parseInt(match[2],16)},${parseInt(match[3],16)}`;
  }

  function italicizeLastWord(text) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const last = words.pop() || "Proyecto";
    return words.length
      ? `${escapeHtml(words.join(" "))} <em>${escapeHtml(last)}</em>`
      : `<em>${escapeHtml(last)}</em>`;
  }

  function init() {
    if (document.body?.dataset.page !== "home") return;
    const root = q("#projectsPsp");
    const shell = q("#proyectos");
    if (!root || !shell || !window.Portal) return;
    if (root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";

    const {state, helpers} = window.Portal;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let projects = ensureProjects(state, helpers);
    let currentIndex = 0;
    let scrollProgress = 0;
    let frame = 0;
    let snapTimer = 0;
    let managerIndex = 0;
    let ambientFrame = 0;
    let ambientVisible = false;

    const dom = {
      carousel:q("#projectsCarousel",root),
      index:q("#projectsIndex",root),
      eyebrow:q("#projectsEyebrow",root),
      title:q("#projectsTitle",root),
      description:q("#projectsDescription",root),
      tags:q("#projectsTags",root),
      metric:q("#projectsMetric",root),
      metricLabel:q("#projectsMetricLabel",root),
      metricBar:q("#projectsMetricBar",root),
      secondary:q("#projectsSecondary",root),
      open:q("#projectsOpen",root),
      progressText:q("#projectsProgressText",root),
      progressBar:q("#projectsProgressBar",root),
      clock:q("#projectsClock",root),
      manage:q("#projectsManage",root),
      details:q("#projectsDetails",root),
      detailsBackdrop:q("#projectsDetailsBackdrop",root),
      detailsClose:q("#projectsDetailsClose",root),
      detailsCover:q("#projectsDetailsCover",root),
      detailsImage:q("#projectsDetailsImage",root),
      detailsIndex:q("#projectsDetailsIndex",root),
      detailsEyebrow:q("#projectsDetailsEyebrow",root),
      detailsTitle:q("#projectsDetailsTitle",root),
      detailsDescription:q("#projectsDetailsDescription",root),
      detailsObjective:q("#projectsDetailsObjective",root),
      detailsResult:q("#projectsDetailsResult",root),
      detailsNext:q("#projectsDetailsNext",root),
      detailsGallery:q("#projectsDetailsGallery",root),
      manager:q("#projectsManager",root),
      managerBackdrop:q("#projectsManagerBackdrop",root),
      managerClose:q("#projectsManagerClose",root),
      managerList:q("#projectsManagerList",root),
      managerAdd:q("#projectsManagerAdd",root),
      managerForm:q("#projectsManagerForm",root),
      managerDelete:q("#projectsManagerDelete",root),
      canvas:q("#projectsAmbientCanvas",root)
    };

    function ensureProjects(stateRef, helperRef) {
      if (!stateRef.content || typeof stateRef.content !== "object") stateRef.content = {};
      let list = Array.isArray(stateRef.content.projects)
        ? stateRef.content.projects.map(normalizeProject)
        : [];
      while (list.length < MIN_PROJECTS) list.push(defaultProject(list.length));
      list = list.slice(0,MAX_PROJECTS).map(normalizeProject);
      stateRef.content.projects = list;
      helperRef.save({localOnly:true});
      return list;
    }

    function saveProjects(message = "Proyectos actualizados.") {
      state.content.projects = projects.map(normalizeProject);
      helpers.save();
      helpers.toast?.(message);
      window.dispatchEvent(new CustomEvent("portal:rendered",{detail:{source:"projects-psp",build:BUILD}}));
    }

    function applyTheme(project) {
      root.style.setProperty("--projects-accent",project.color);
      root.style.setProperty("--projects-accent-dark",project.dark);
      root.style.setProperty("--projects-accent-rgb",project.rgb);
    }

    function renderFolders() {
      dom.carousel.innerHTML = projects.map((project,index) => `
        <article class="projects-folder"
          data-project-index="${index}"
          tabindex="${index === currentIndex ? "0" : "-1"}"
          role="button"
          aria-label="Seleccionar ${escapeHtml(project.title)}"
          aria-current="${index === currentIndex ? "true" : "false"}"
          style="--folder-color:${escapeHtml(project.color)}">
          <div class="projects-folder__back"></div>
          <div class="projects-folder__paper"></div>
          <div class="projects-folder__front">
            <div class="projects-folder__top">
              <span class="projects-folder__icon">${escapeHtml(project.icon || "PR")}</span>
              <span class="projects-folder__index">${String(index + 1).padStart(2,"0")}</span>
            </div>
            <div class="projects-folder__content">
              <span class="projects-folder__category">${escapeHtml(project.category)}</span>
              <h3 class="projects-folder__title">${italicizeLastWord(project.title)}</h3>
              <div class="projects-folder__meta"><span>${escapeHtml(project.year)}</span><span>${escapeHtml(project.status)}</span></div>
            </div>
          </div>
        </article>`).join("");
      shell.style.setProperty("--projects-count",projects.length);
      setScrollHeight();
      updateFromScroll(true);
    }

    function setScrollHeight() {
      if (reduceMotion.matches) {
        shell.style.height = "auto";
        shell.style.minHeight = "auto";
        return;
      }
      const viewport = Math.max(620,window.innerHeight || 720);
      const mobile = window.innerWidth <= 820;
      const step = mobile
        ? clamp(viewport * .68,420,590)
        : clamp(viewport * .78,500,720);
      const headerOffset = mobile ? 0 : Number.parseFloat(getComputedStyle(shell).getPropertyValue("--projects-sticky-top")) || 76;
      const stageHeight = Math.max(620,viewport - headerOffset);
      const height = stageHeight + Math.max(0,projects.length - 1) * step;
      shell.style.height = `${Math.round(height)}px`;
      shell.style.minHeight = `${Math.round(height)}px`;
    }

    function scrollMetrics() {
      const rect = shell.getBoundingClientRect();
      const stageHeight = root.offsetHeight || window.innerHeight;
      const scrollDistance = Math.max(1,shell.offsetHeight - stageHeight);
      const local = clamp(-rect.top + (parseFloat(getComputedStyle(root).top) || 0),0,scrollDistance);
      return {rect,scrollDistance,progress:local / scrollDistance};
    }

    function scrollToProject(index, behavior = "smooth") {
      const next = clamp(index,0,projects.length - 1);
      const rect = shell.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const stageHeight = root.offsetHeight || window.innerHeight;
      const distance = Math.max(1,shell.offsetHeight - stageHeight);
      const target = absoluteTop + distance * (next / Math.max(1,projects.length - 1));
      window.scrollTo({top:target,behavior:reduceMotion.matches ? "auto" : behavior});
    }

    function updateFolderTransforms(rawIndex) {
      const width = root.clientWidth;
      const mobile = width <= 820;
      const spacing = mobile ? clamp(width * .37,128,176) : clamp(width * .145,150,230);
      const folders = qa(".projects-folder",dom.carousel);

      folders.forEach((folder,index) => {
        const offset = index - rawIndex;
        const abs = Math.abs(offset);
        const visible = abs <= (mobile ? 2.25 : 3.4);
        const x = offset * spacing;
        const y = Math.pow(abs,1.22) * (mobile ? 15 : 20) + (offset < 0 ? -7 : 0);
        const z = -Math.pow(abs,1.08) * (mobile ? 105 : 150);
        const ry = clamp(-offset * (mobile ? 15 : 18),-54,54);
        const rz = clamp(offset * 1.1,-3.2,3.2);
        const scale = clamp(1 - abs * (mobile ? .085 : .075),.68,1);
        const opacity = visible ? clamp(1 - Math.max(0,abs - 2.25) * .65,.12,1) : 0;
        folder.style.setProperty("--folder-x",`${x.toFixed(2)}px`);
        folder.style.setProperty("--folder-y",`${y.toFixed(2)}px`);
        folder.style.setProperty("--folder-z",`${z.toFixed(2)}px`);
        folder.style.setProperty("--folder-ry",`${ry.toFixed(2)}deg`);
        folder.style.setProperty("--folder-rz",`${rz.toFixed(2)}deg`);
        folder.style.setProperty("--folder-scale",scale.toFixed(4));
        folder.style.setProperty("--folder-opacity",opacity.toFixed(3));
        folder.style.zIndex = String(1000 - Math.round(abs * 100));
        folder.setAttribute("aria-hidden",String(!visible));
      });
    }

    function setProject(index, force = false) {
      const next = clamp(index,0,projects.length - 1);
      if (!force && next === currentIndex) return;
      currentIndex = next;
      const project = projects[currentIndex];
      applyTheme(project);
      dom.index.textContent = String(currentIndex + 1).padStart(2,"0");
      dom.eyebrow.textContent = `${project.category} · ${project.type}`;
      dom.title.innerHTML = italicizeLastWord(project.title);
      dom.description.textContent = project.description;
      dom.tags.innerHTML = project.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("");
      dom.metric.textContent = project.metric;
      dom.metricLabel.textContent = project.metricLabel;
      dom.metricBar.style.setProperty("--metric-value",`${project.progress}%`);
      dom.secondary.textContent = project.secondaryMetric;
      dom.progressText.textContent = currentIndex === projects.length - 1
        ? `Última carpeta · continúa bajando`
        : `Proyecto ${currentIndex + 1} de ${projects.length}`;
      qa(".projects-folder",dom.carousel).forEach((folder,folderIndex) => {
        const active = folderIndex === currentIndex;
        folder.classList.toggle("is-active",active);
        folder.setAttribute("aria-current",String(active));
        folder.tabIndex = active ? 0 : -1;
      });
      qa("[data-project-category]",root).forEach(button => {
        const category = button.dataset.projectCategory;
        const active = category === "Todos" || category === project.category;
        button.classList.toggle("is-active",active && (category !== "Todos" || !qa("[data-project-category].is-active",root).some(node => node !== button)));
      });
    }

    function updateFromScroll(force = false) {
      frame = 0;
      if (reduceMotion.matches) {
        updateFolderTransforms(currentIndex);
        setProject(currentIndex,force);
        return;
      }
      const metrics = scrollMetrics();
      scrollProgress = metrics.progress;
      const raw = scrollProgress * Math.max(1,projects.length - 1);
      const next = clamp(Math.round(raw),0,projects.length - 1);
      updateFolderTransforms(raw);
      setProject(next,force);
      dom.progressBar.style.width = `${scrollProgress * 100}%`;
      root.dataset.scrollActive = String(metrics.rect.top <= 2 && metrics.rect.bottom >= root.offsetHeight - 2);
    }

    function requestUpdate() {
      if (frame) return;
      frame = requestAnimationFrame(() => updateFromScroll(false));
      if (!reduceMotion.matches) {
        clearTimeout(snapTimer);
        snapTimer = window.setTimeout(() => {
          const rect = shell.getBoundingClientRect();
          const active = rect.top <= 4 && rect.bottom >= root.offsetHeight - 4;
          if (!active || document.hidden || dom.details.classList.contains("is-open") || dom.manager.classList.contains("is-open")) return;
          const raw = scrollProgress * Math.max(1,projects.length - 1);
          if (Math.abs(raw - Math.round(raw)) < .11) return;
          scrollToProject(Math.round(raw),"smooth");
        },220);
      }
    }

    function openDetails() {
      const project = projects[currentIndex];
      dom.detailsCover.style.setProperty("--projects-accent",project.color);
      dom.detailsCover.style.setProperty("--projects-accent-dark",project.dark);
      dom.detailsImage.src = project.image || "";
      dom.detailsImage.alt = project.image ? `Imagen del proyecto ${project.title}` : "";
      dom.detailsImage.hidden = !project.image;
      dom.detailsCover.classList.toggle("is-empty",!project.image);
      dom.detailsIndex.textContent = String(currentIndex + 1).padStart(2,"0");
      dom.detailsEyebrow.textContent = `${project.category} · ${project.type}`;
      dom.detailsTitle.innerHTML = italicizeLastWord(project.title);
      dom.detailsDescription.textContent = project.description;
      dom.detailsObjective.textContent = project.objective;
      dom.detailsResult.textContent = project.result;
      dom.detailsNext.textContent = project.next;
      dom.detailsGallery.innerHTML = project.gallery.map((src,index) => `<img src="${escapeHtml(src)}" alt="Fotografía ${index + 1} de ${escapeHtml(project.title)}" loading="lazy">`).join("");
      dom.details.classList.add("is-open");
      dom.details.setAttribute("aria-hidden","false");
      dom.detailsClose.focus({preventScroll:true});
    }

    function closeDetails() {
      dom.details.classList.remove("is-open");
      dom.details.setAttribute("aria-hidden","true");
      q(`.projects-folder[data-project-index="${currentIndex}"]`,dom.carousel)?.focus({preventScroll:true});
    }

    function updateAdminVisibility() {
      let localMode = false;
      try { localMode = sessionStorage.getItem("sp_admin_mode") === "local"; } catch (_) {}
      const adminSession = q("#adminSession");
      const canManage = Boolean(state.admin)
        || localMode
        || Boolean(adminSession && !adminSession.hidden);
      dom.manage.hidden = !canManage;
    }

    function renderManager() {
      managerIndex = clamp(managerIndex,0,projects.length - 1);
      dom.managerList.innerHTML = projects.map((project,index) => `
        <button type="button" class="projects-manager__item ${index === managerIndex ? "is-active" : ""}" data-manager-index="${index}">
          <span><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.category)} · ${escapeHtml(project.year)}</small></span>
          <b>${String(index + 1).padStart(2,"0")}</b>
        </button>`).join("");
      dom.managerAdd.disabled = projects.length >= MAX_PROJECTS;
      fillManagerForm();
    }

    function fillManagerForm() {
      const project = projects[managerIndex];
      if (!project) return;
      const form = dom.managerForm.elements;
      form.id.value = project.id;
      form.title.value = project.title;
      form.category.value = project.category;
      form.type.value = project.type;
      form.year.value = project.year;
      form.status.value = project.status;
      form.icon.value = project.icon;
      form.color.value = project.color;
      form.metric.value = project.metric;
      form.metricLabel.value = project.metricLabel;
      form.progress.value = project.progress;
      form.secondaryMetric.value = project.secondaryMetric;
      form.description.value = project.description;
      form.tags.value = project.tags.join(", ");
      form.objective.value = project.objective;
      form.result.value = project.result;
      form.next.value = project.next;
      form.image.value = project.image;
      form.gallery.value = project.gallery.join("\n");
      dom.managerDelete.disabled = projects.length <= MIN_PROJECTS;
    }

    function openManager() {
      updateAdminVisibility();
      if (dom.manage.hidden) return;
      renderManager();
      dom.manager.classList.add("is-open");
      dom.manager.setAttribute("aria-hidden","false");
      dom.managerClose.focus({preventScroll:true});
    }

    function closeManager() {
      dom.manager.classList.remove("is-open");
      dom.manager.setAttribute("aria-hidden","true");
      dom.manage.focus({preventScroll:true});
    }

    function addProject() {
      if (projects.length >= MAX_PROJECTS) {
        helpers.toast?.("El módulo admite un máximo de 10 proyectos.");
        return;
      }
      projects.push(defaultProject(projects.length));
      managerIndex = projects.length - 1;
      saveProjects("Nueva carpeta de proyecto creada.");
      renderFolders();
      renderManager();
      scrollToProject(managerIndex,"auto");
    }

    function deleteProject() {
      if (projects.length <= MIN_PROJECTS) {
        helpers.toast?.("Deben permanecer al menos cinco carpetas de proyecto.");
        return;
      }
      const project = projects[managerIndex];
      if (!confirm(`¿Eliminar la carpeta “${project.title}”?`)) return;
      projects.splice(managerIndex,1);
      managerIndex = clamp(managerIndex,0,projects.length - 1);
      currentIndex = clamp(currentIndex,0,projects.length - 1);
      saveProjects("Carpeta de proyecto eliminada.");
      renderFolders();
      renderManager();
    }

    function saveManagerForm(event) {
      event.preventDefault();
      const data = new FormData(dom.managerForm);
      const current = projects[managerIndex];
      const color = String(data.get("color") || current.color);
      const dark = shadeHex(color,-34) || current.dark;
      projects[managerIndex] = normalizeProject({
        ...current,
        id:String(data.get("id") || current.id),
        title:String(data.get("title") || current.title).trim(),
        category:String(data.get("category") || "Por registrar").trim(),
        type:String(data.get("type") || "Carpeta de proyecto").trim(),
        year:String(data.get("year") || "2026").trim(),
        status:String(data.get("status") || "Información pendiente").trim(),
        icon:String(data.get("icon") || "PR").trim().slice(0,3).toUpperCase(),
        color,
        dark,
        metric:String(data.get("metric") || "—").trim(),
        metricLabel:String(data.get("metricLabel") || "indicador por registrar").trim(),
        progress:Number(data.get("progress") || 0),
        secondaryMetric:String(data.get("secondaryMetric") || "").trim(),
        description:String(data.get("description") || "").trim(),
        tags:String(data.get("tags") || "").split(",").map(item => item.trim()).filter(Boolean),
        objective:String(data.get("objective") || "").trim(),
        result:String(data.get("result") || "").trim(),
        next:String(data.get("next") || "").trim(),
        image:String(data.get("image") || "").trim(),
        gallery:String(data.get("gallery") || "").split(/\r?\n/).map(item => item.trim()).filter(Boolean)
      },managerIndex);
      saveProjects("Proyecto guardado correctamente.");
      renderFolders();
      renderManager();
      setProject(managerIndex,true);
    }

    function shadeHex(hex,amount) {
      const match = String(hex || "").match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
      if (!match) return null;
      const values = match.slice(1).map(part => clamp(parseInt(part,16) + amount,0,255));
      return `#${values.map(value => value.toString(16).padStart(2,"0")).join("")}`;
    }

    function updateClock() {
      dom.clock.textContent = new Intl.DateTimeFormat("es-CO",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
    }

    function initAmbient() {
      const canvas = dom.canvas;
      const context = canvas?.getContext?.("2d",{alpha:true});
      if (!canvas || !context) return;
      let width = 0;
      let height = 0;
      let dpr = 1;
      let time = 0;

      const resize = () => {
        const rect = root.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1,1.5);
        width = Math.max(1,Math.round(rect.width));
        height = Math.max(1,Math.round(rect.height));
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(dpr,0,0,dpr,0,0);
      };

      const draw = () => {
        ambientFrame = 0;
        if (!ambientVisible || document.hidden || reduceMotion.matches) return;
        time += .008;
        context.clearRect(0,0,width,height);
        context.lineWidth = 1;
        for (let layer = 0; layer < 3; layer += 1) {
          context.beginPath();
          const base = height * (.67 + layer * .07);
          for (let x = -20; x <= width + 20; x += 18) {
            const y = base + Math.sin(x * .006 + time + layer * .8) * (18 + layer * 8);
            if (x === -20) context.moveTo(x,y); else context.lineTo(x,y);
          }
          context.strokeStyle = `rgba(${getComputedStyle(root).getPropertyValue("--projects-accent-rgb") || "39,127,218"},${.055 - layer * .01})`;
          context.stroke();
        }
        ambientFrame = requestAnimationFrame(draw);
      };

      const observer = new IntersectionObserver(entries => {
        ambientVisible = entries.some(entry => entry.isIntersecting);
        if (ambientVisible && !ambientFrame) ambientFrame = requestAnimationFrame(draw);
        if (!ambientVisible && ambientFrame) {
          cancelAnimationFrame(ambientFrame);
          ambientFrame = 0;
        }
      },{rootMargin:"100px"});
      observer.observe(root);
      resize();
      window.addEventListener("resize",resize,{passive:true});
    }

    renderFolders();
    updateClock();
    window.setInterval(updateClock,30000);
    updateAdminVisibility();
    initAmbient();

    window.addEventListener("scroll",requestUpdate,{passive:true});
    window.addEventListener("resize",() => {setScrollHeight();requestUpdate();},{passive:true});
    window.addEventListener("orientationchange",() => window.setTimeout(() => {setScrollHeight();requestUpdate();},240),{passive:true});
    reduceMotion.addEventListener?.("change",() => {setScrollHeight();renderFolders();});

    dom.carousel.addEventListener("click",event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder) return;
      const index = Number(folder.dataset.projectIndex);
      if (index === currentIndex) openDetails();
      else scrollToProject(index);
    });

    dom.carousel.addEventListener("keydown",event => {
      const folder = event.target.closest(".projects-folder");
      if (!folder) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const index = Number(folder.dataset.projectIndex);
        if (index === currentIndex) openDetails();
        else scrollToProject(index);
      }
    });

    root.addEventListener("keydown",event => {
      if (dom.details.classList.contains("is-open") || dom.manager.classList.contains("is-open")) return;
      if (["ArrowRight","PageDown"].includes(event.key)) {event.preventDefault();scrollToProject(currentIndex + 1);}
      if (["ArrowLeft","PageUp"].includes(event.key)) {event.preventDefault();scrollToProject(currentIndex - 1);}
      if (event.key === "Home") {event.preventDefault();scrollToProject(0);}
      if (event.key === "End") {event.preventDefault();scrollToProject(projects.length - 1);}
      if (event.key === "Enter" && event.target === root) {event.preventDefault();openDetails();}
    });

    qa("[data-project-category]",root).forEach(button => {
      button.addEventListener("click",() => {
        const category = button.dataset.projectCategory;
        if (category === "Todos") {scrollToProject(0);return;}
        const index = projects.findIndex(project => project.category.toLowerCase().includes(category.toLowerCase()));
        if (index < 0) helpers.toast?.(`Aún no hay proyectos en la categoría ${category}.`);
        else scrollToProject(index);
      });
    });

    q("#projectsPrev",root)?.addEventListener("click",() => scrollToProject(currentIndex - 1));
    q("#projectsNext",root)?.addEventListener("click",() => scrollToProject(currentIndex + 1));
    dom.open.addEventListener("click",openDetails);
    dom.detailsBackdrop.addEventListener("click",closeDetails);
    dom.detailsClose.addEventListener("click",closeDetails);
    dom.manage.addEventListener("click",openManager);
    dom.managerBackdrop.addEventListener("click",closeManager);
    dom.managerClose.addEventListener("click",closeManager);
    dom.managerAdd.addEventListener("click",addProject);
    dom.managerDelete.addEventListener("click",deleteProject);
    dom.managerForm.addEventListener("submit",saveManagerForm);
    dom.managerList.addEventListener("click",event => {
      const button = event.target.closest("[data-manager-index]");
      if (!button) return;
      managerIndex = Number(button.dataset.managerIndex);
      renderManager();
    });

    document.addEventListener("keydown",event => {
      if (event.key !== "Escape") return;
      if (dom.details.classList.contains("is-open")) closeDetails();
      if (dom.manager.classList.contains("is-open")) closeManager();
    });

    const adminSession = q("#adminSession");
    if (adminSession) new MutationObserver(updateAdminVisibility).observe(adminSession,{attributes:true,attributeFilter:["hidden"]});
    window.addEventListener("portal:datachange",() => {
      projects = ensureProjects(state,helpers);
      renderFolders();
      updateAdminVisibility();
    });
    window.addEventListener("portal:adminlogout",updateAdminVisibility);

    window.ProjectPspModule = {
      build:BUILD,
      getProjects:() => projects.map(project => ({...project})),
      open:index => {scrollToProject(index);window.setTimeout(openDetails,350);},
      refresh:() => {projects = ensureProjects(state,helpers);renderFolders();}
    };

    window.dispatchEvent(new CustomEvent("portal:rendered",{detail:{source:"projects-psp",build:BUILD}}));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
