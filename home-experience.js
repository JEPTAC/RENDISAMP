(() => {
  "use strict";

  const BUILD = "11.32-native-scroll-story";
  const PROJECT_LIMIT = 10;
  const PROJECT_MINIMUM = 5;

  const PROJECT_DEFAULTS = Array.from({length:PROJECT_MINIMUM},(_,index) => ({
    id:`home-project-${index + 1}`,
    title:`Proyecto ${String(index + 1).padStart(2,"0")}`,
    category:"Proyecto institucional",
    year:"2025",
    status:"Próximamente",
    description:"Espacio preparado para publicar la información del proyecto.",
    impact:"Información por completar.",
    image:"",
    gallery:[],
    link:""
  }));

  const CINEMATIC_STORIES = [
    {
      eyebrow:"01 · MEMORIA QUE SUENA",
      heading:"La música también guarda memoria",
      text:"En San Pedro, el arte público convierte el paisaje cotidiano en un escenario donde la historia parece seguir sonando.",
      quote:"“San Pedro no solo se recorre: se escucha, se mira y se recuerda.”"
    },
    {
      eyebrow:"02 · ARQUITECTURA Y TIEMPO",
      heading:"Una silueta que acompaña el tiempo",
      text:"Las fachadas, las torres y la luz del atardecer construyen una postal donde tradición y vida cotidiana se encuentran.",
      quote:"“Cada edificio conserva una manera distinta de contar el municipio.”"
    },
    {
      eyebrow:"03 · PUNTO DE ENCUENTRO",
      heading:"El parque guarda voces y encuentros",
      text:"Bajo la sombra de los árboles, el centro urbano se convierte en conversación, descanso y memoria compartida.",
      quote:"“La plaza es una pausa: allí el territorio aprende a reconocerse.”"
    },
    {
      eyebrow:"04 · CASA DE LO PÚBLICO",
      heading:"La gestión también tiene un lugar",
      text:"La Alcaldía representa el espacio donde documentos, decisiones y participación se transforman en acciones para la comunidad.",
      quote:"“Lo público se fortalece cuando puede verse, entenderse y consultarse.”"
    }
  ];

  const clamp = (value,min,max) => Math.min(Math.max(value,min),max);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g,char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[char]);

  const safeUrl = value => {
    const url = String(value || "").trim();
    if (!url) return "";
    return /^(https?:\/\/|\.\.?\/|\/|assets\/|data:image\/)/i.test(url) ? url : "";
  };

  const parseGallery = value => {
    if (Array.isArray(value)) return value.map(safeUrl).filter(Boolean).slice(0,8);
    return String(value || "")
      .split(/[\n,]+/)
      .map(item => safeUrl(item.trim()))
      .filter(Boolean)
      .slice(0,8);
  };

  function portal() {
    return window.Portal || null;
  }

  function normalizeProject(item,index) {
    const source = item && typeof item === "object" ? item : {};
    return {
      id:String(source.id || `home-project-${Date.now()}-${index}`),
      title:String(source.title || `Proyecto ${String(index + 1).padStart(2,"0")}`),
      category:String(source.category || "Proyecto institucional"),
      year:String(source.year || "2025"),
      status:String(source.status || "Próximamente"),
      description:String(source.description || "Espacio preparado para publicar la información del proyecto."),
      impact:String(source.impact || "Información por completar."),
      image:safeUrl(source.image),
      gallery:parseGallery(source.gallery),
      link:safeUrl(source.link)
    };
  }

  function ensureProjects() {
    const api = portal();
    if (!api) return PROJECT_DEFAULTS.map(normalizeProject);

    const existing = Array.isArray(api.state.content.homeProjects)
      ? api.state.content.homeProjects
      : [];
    const projects = existing.slice(0,PROJECT_LIMIT).map(normalizeProject);

    while (projects.length < PROJECT_MINIMUM) {
      projects.push(normalizeProject(PROJECT_DEFAULTS[projects.length],projects.length));
    }

    api.state.content.homeProjects = projects;
    if (!existing.length) api.helpers.save({localOnly:true});
    return projects;
  }

  function canManageProjects() {
    return Boolean(
      portal()?.state?.admin ||
      sessionStorage.getItem("sp_admin_mode") === "local" ||
      sessionStorage.getItem("sp_admin_mode") === "firebase"
    );
  }

  function projectColor(index) {
    return [
      [16,111,193],[40,157,219],[83,103,217],[131,92,214],[21,149,139],
      [232,123,55],[48,129,205],[105,84,194],[23,145,184],[49,147,104]
    ][index % 10];
  }

  const NARRATIVE_STATE = {projectCount:PROJECT_MINIMUM,sceneCount:CINEMATIC_STORIES.length};

  function ensureNarrativeProgress() {
    let node = document.getElementById("homeNarrativeProgress");
    if (node) return node;
    node = document.createElement("div");
    node.id = "homeNarrativeProgress";
    node.className = "home-narrative-progress";
    node.setAttribute("aria-hidden","true");
    node.innerHTML = `<span>RECORRIDO</span><b>01</b><i><em></em></i><small>09</small><strong>Proyectos</strong>`;
    document.body.append(node);
    return node;
  }

  function updateNarrativeProgress(kind,index,count,visible = true) {
    const node = ensureNarrativeProgress();
    if (kind === "project") NARRATIVE_STATE.projectCount = count;
    if (kind === "scene") NARRATIVE_STATE.sceneCount = count;
    const total = NARRATIVE_STATE.projectCount + NARRATIVE_STATE.sceneCount;
    const current = kind === "scene" ? NARRATIVE_STATE.projectCount + index + 1 : index + 1;
    node.querySelector("b").textContent = String(current).padStart(2,"0");
    node.querySelector("small").textContent = String(total).padStart(2,"0");
    node.querySelector("strong").textContent = kind === "scene" ? "Cinemática" : "Proyectos";
    node.querySelector("em").style.height = `${total > 1 ? ((current - 1) / (total - 1)) * 100 : 100}%`;
    node.classList.toggle("is-visible",visible);
  }

  function createProjectDialog() {
    let dialog = document.getElementById("projectConsoleDialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "projectConsoleDialog";
    dialog.className = "project-console-dialog";
    dialog.innerHTML = `
      <button class="project-console-dialog__close" type="button" aria-label="Cerrar">×</button>
      <div id="projectConsoleDialogContent"></div>`;
    document.body.append(dialog);
    dialog.querySelector(".project-console-dialog__close")?.addEventListener("click",() => dialog.close());
    dialog.addEventListener("click",event => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function createProjectEditorDialog() {
    let dialog = document.getElementById("projectConsoleEditorDialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "projectConsoleEditorDialog";
    dialog.className = "project-console-editor";
    dialog.innerHTML = `
      <div class="project-console-editor__shell">
        <header>
          <div><span>ADMINISTRACIÓN DEL INICIO</span><h2>Gestionar proyectos destacados</h2></div>
          <button type="button" data-project-editor-close aria-label="Cerrar">×</button>
        </header>
        <div class="project-console-editor__layout">
          <aside>
            <div class="project-console-editor__summary">
              <strong id="projectEditorCount">5</strong>
              <span>de 10 proyectos</span>
            </div>
            <div id="projectEditorList" class="project-console-editor__list"></div>
            <button class="project-console-editor__add" id="projectEditorAdd" type="button">＋ Agregar proyecto</button>
          </aside>
          <form id="projectEditorForm" class="project-console-editor__form">
            <input type="hidden" name="id">
            <label>Título<input name="title" maxlength="80" required></label>
            <div class="project-console-editor__form-row">
              <label>Categoría<input name="category" maxlength="50"></label>
              <label>Año<input name="year" maxlength="12"></label>
            </div>
            <label>Estado<input name="status" maxlength="40"></label>
            <label>Descripción<textarea name="description" rows="4" maxlength="420"></textarea></label>
            <label>Resultado o impacto<textarea name="impact" rows="3" maxlength="280"></textarea></label>
            <label>Imagen principal<input name="image" placeholder="https://... o assets/..." inputmode="url"></label>
            <label>Galería de fotografías<textarea name="gallery" rows="4" placeholder="Una URL por línea, máximo 8"></textarea></label>
            <label>Enlace relacionado<input name="link" placeholder="https://..." inputmode="url"></label>
            <div class="project-console-editor__form-actions">
              <button type="button" class="button button-secondary" id="projectEditorDelete">Eliminar</button>
              <button type="submit" class="button button-primary">Guardar proyecto</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.append(dialog);
    dialog.querySelector("[data-project-editor-close]")?.addEventListener("click",() => dialog.close());
    dialog.addEventListener("click",event => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function initProjectConsole() {
    const section = document.getElementById("proyectos-destacados");
    const shell = section?.querySelector(".project-console__shell");
    const viewport = document.getElementById("projectConsoleViewport");
    const track = document.getElementById("projectConsoleTrack");
    const selected = document.getElementById("projectConsoleSelected");
    const backdrop = document.getElementById("projectConsoleBackdrop");
    const currentNode = document.getElementById("projectConsoleCurrent");
    const totalNode = document.getElementById("projectConsoleTotal");
    const prev = document.getElementById("projectConsolePrev");
    const next = document.getElementById("projectConsoleNext");
    const openButton = document.getElementById("projectConsoleOpen");
    const manageButton = document.getElementById("projectConsoleManage");
    const stepsNode = document.getElementById("projectConsoleSteps");
    if (!section || !shell || !viewport || !track || !selected || !backdrop || !stepsNode) return;

    let projects = ensureProjects();
    let activeIndex = 0;
    let editingId = projects[0]?.id || "";
    let motionCleanup = () => {};
    let scrollController = null;
    let resizeTimer = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    viewport.tabIndex = 0;
    viewport.setAttribute("aria-describedby","projectConsoleTitle");

    function loadProjectImage(index) {
      const card = track.children[index];
      const image = card?.querySelector("img[data-project-src]");
      if (!image || image.dataset.loaded === "true") return;
      const source = safeUrl(image.dataset.projectSrc);
      if (!source) return;

      image.dataset.loaded = "true";
      image.addEventListener("load",() => {
        card.classList.add("has-image");
        card.classList.remove("has-image-error");
      },{once:true});
      image.addEventListener("error",() => {
        card.classList.add("has-image-error");
        image.removeAttribute("src");
      },{once:true});
      image.src = source;
    }

    function saveProjects() {
      const api = portal();
      if (!api) return;
      api.state.content.homeProjects = projects.map(normalizeProject);
      api.helpers.save();
      window.dispatchEvent(new CustomEvent("home:projects-updated",{detail:{count:projects.length}}));
    }

    function updateSelectedContent(index,announce = true) {
      activeIndex = clamp(index,0,projects.length - 1);
      const active = projects[activeIndex];
      const rgb = projectColor(activeIndex);
      if (!active) return;

      loadProjectImage(activeIndex);
      loadProjectImage(activeIndex + 1);

      const staticMode = section.classList.contains("project-console--static");
      [...track.children].forEach((card,indexValue) => {
        const isActive = indexValue === activeIndex;
        card.classList.toggle("is-active",isActive);
        card.setAttribute("aria-selected",String(isActive));
        card.setAttribute("aria-hidden",staticMode ? "false" : String(!isActive));
        card.tabIndex = staticMode || isActive ? 0 : -1;
        if ("inert" in card) card.inert = staticMode ? false : !isActive;
      });
      [...stepsNode.children].forEach((button,indexValue) => {
        const isActive = indexValue === activeIndex;
        button.classList.toggle("is-active",isActive);
        button.setAttribute("aria-current",isActive ? "step" : "false");
      });

      currentNode.textContent = String(activeIndex + 1).padStart(2,"0");
      selected.querySelector("h3").textContent = active.title;
      selected.querySelector("p").textContent = active.description;
      selected.querySelector("span").textContent = `${active.category.toUpperCase()} · ${active.year}`;
      backdrop.style.setProperty("--project-active-rgb",rgb.join(","));
      backdrop.style.backgroundImage = active.image
        ? `linear-gradient(90deg,rgba(4,18,38,.96) 0%,rgba(4,18,38,.78) 46%,rgba(4,18,38,.38) 100%),url("${safeUrl(active.image).replace(/["\\]/g,"\\$&")}")`
        : "";
      prev.disabled = activeIndex <= 0;
      next.disabled = activeIndex >= projects.length - 1;
      section.style.setProperty("--project-progress",projects.length > 1 ? String(activeIndex / (projects.length - 1)) : "1");
      updateNarrativeProgress("project",activeIndex,projects.length,section.classList.contains("is-scroll-active"));
      if (announce) viewport.setAttribute("aria-label",`${active.title}, ${activeIndex + 1} de ${projects.length}`);
    }

    function openProject() {
      const project = projects[activeIndex];
      if (!project) return;
      const dialog = createProjectDialog();
      const holder = dialog.querySelector("#projectConsoleDialogContent");
      const images = [project.image,...project.gallery].map(safeUrl).filter(Boolean);
      const primary = images[0] || "";
      holder.innerHTML = `
        <article class="project-detail">
          <div class="project-detail__media"${primary ? ` style="background-image:linear-gradient(180deg,rgba(5,21,43,.06),rgba(5,21,43,.50)),url('${escapeHtml(primary)}')"` : ""}>
            ${primary ? "" : `<span>${String(activeIndex + 1).padStart(2,"0")}</span>`}
            <div><small>${escapeHtml(project.category)} · ${escapeHtml(project.year)}</small><strong>${escapeHtml(project.status)}</strong></div>
          </div>
          <div class="project-detail__content">
            <span>FICHA DEL PROYECTO</span>
            <h2>${escapeHtml(project.title)}</h2>
            <p>${escapeHtml(project.description)}</p>
            <section><small>RESULTADO O IMPACTO</small><strong>${escapeHtml(project.impact)}</strong></section>
            ${images.length > 1 ? `<div class="project-detail__gallery">${images.map((image,index) => `<button type="button" data-project-gallery="${escapeHtml(image)}" aria-label="Ver fotografía ${index + 1}" style="background-image:url('${escapeHtml(image)}')"></button>`).join("")}</div>` : ""}
            <div class="project-detail__actions">
              ${project.link ? `<a class="button button-primary" href="${escapeHtml(project.link)}" target="_blank" rel="noopener">Abrir información relacionada ↗</a>` : `<span>Este proyecto está listo para completar su información desde el administrador.</span>`}
            </div>
          </div>
        </article>`;
      holder.querySelectorAll("[data-project-gallery]").forEach(button => {
        button.addEventListener("click",() => {
          holder.querySelector(".project-detail__media").style.backgroundImage = `linear-gradient(180deg,rgba(5,21,43,.06),rgba(5,21,43,.50)),url("${safeUrl(button.dataset.projectGallery)}")`;
        });
      });
      dialog.showModal();
    }

    function renderEditorList() {
      const dialog = createProjectEditorDialog();
      const list = dialog.querySelector("#projectEditorList");
      const count = dialog.querySelector("#projectEditorCount");
      const add = dialog.querySelector("#projectEditorAdd");
      count.textContent = String(projects.length);
      add.disabled = projects.length >= PROJECT_LIMIT;
      list.innerHTML = projects.map((project,index) => `
        <button type="button" data-project-edit="${escapeHtml(project.id)}" class="${project.id === editingId ? "is-active" : ""}">
          <span>${String(index + 1).padStart(2,"0")}</span>
          <div><strong>${escapeHtml(project.title)}</strong><small>${escapeHtml(project.status)}</small></div>
        </button>`).join("");
      list.querySelectorAll("[data-project-edit]").forEach(button => {
        button.addEventListener("click",() => loadEditorProject(button.dataset.projectEdit));
      });
    }

    function loadEditorProject(id) {
      editingId = id;
      const dialog = createProjectEditorDialog();
      const form = dialog.querySelector("#projectEditorForm");
      const project = projects.find(item => item.id === id) || projects[0];
      if (!project) return;
      form.elements.id.value = project.id;
      form.elements.title.value = project.title;
      form.elements.category.value = project.category;
      form.elements.year.value = project.year;
      form.elements.status.value = project.status;
      form.elements.description.value = project.description;
      form.elements.impact.value = project.impact;
      form.elements.image.value = project.image;
      form.elements.gallery.value = project.gallery.join("\n");
      form.elements.link.value = project.link;
      dialog.querySelector("#projectEditorDelete").disabled = projects.length <= PROJECT_MINIMUM;
      renderEditorList();
    }

    function openEditor() {
      if (!canManageProjects()) return;
      const dialog = createProjectEditorDialog();
      editingId = projects[activeIndex]?.id || projects[0]?.id;
      loadEditorProject(editingId);
      if (!dialog.dataset.bound) {
        dialog.dataset.bound = "true";
        dialog.querySelector("#projectEditorAdd").addEventListener("click",() => {
          if (projects.length >= PROJECT_LIMIT) return;
          const index = projects.length;
          const project = normalizeProject({
            id:`home-project-${Date.now()}`,
            title:`Proyecto ${String(index + 1).padStart(2,"0")}`
          },index);
          projects.push(project);
          editingId = project.id;
          saveProjects();
          renderCards();
          loadEditorProject(project.id);
        });
        dialog.querySelector("#projectEditorDelete").addEventListener("click",() => {
          if (projects.length <= PROJECT_MINIMUM) return;
          const index = projects.findIndex(item => item.id === editingId);
          if (index < 0) return;
          projects.splice(index,1);
          activeIndex = clamp(activeIndex,0,projects.length - 1);
          editingId = projects[Math.min(index,projects.length - 1)]?.id || projects[0]?.id;
          saveProjects();
          renderCards();
          loadEditorProject(editingId);
        });
        dialog.querySelector("#projectEditorForm").addEventListener("submit",event => {
          event.preventDefault();
          const form = event.currentTarget;
          const id = form.elements.id.value;
          const index = projects.findIndex(item => item.id === id);
          if (index < 0) return;
          projects[index] = normalizeProject({
            id,
            title:form.elements.title.value,
            category:form.elements.category.value,
            year:form.elements.year.value,
            status:form.elements.status.value,
            description:form.elements.description.value,
            impact:form.elements.impact.value,
            image:form.elements.image.value,
            gallery:form.elements.gallery.value,
            link:form.elements.link.value
          },index);
          saveProjects();
          renderCards();
          loadEditorProject(id);
          portal()?.helpers?.toast?.("Proyecto actualizado.");
        });
      }
      dialog.showModal();
    }

    function syncAdminVisibility() {
      manageButton.hidden = !canManageProjects();
    }

    function goToProject(index,behavior = "smooth") {
      const targetIndex = clamp(index,0,projects.length - 1);
      if (scrollController?.scrollToStep) {
        scrollController.scrollToStep(targetIndex,behavior);
      } else {
        updateSelectedContent(targetIndex);
      }
    }

    function setupStaticLayout(cards) {
      section.classList.add("project-console--static");
      updateSelectedContent(0,false);
      cards.forEach((card,index) => {
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
        card.style.removeProperty("z-index");
        card.tabIndex = 0;
        card.inert = false;
        card.setAttribute("aria-hidden","false");
        if (!card.dataset.staticFocusBound) {
          card.dataset.staticFocusBound = "true";
          card.addEventListener("focus",() => updateSelectedContent(index,false));
        }
      });
      return {scrollToStep(index){cards[index]?.scrollIntoView({behavior:"smooth",block:"center"});}};
    }

    function setupNativeStack(cards) {
      section.classList.add("project-console--native");
      section.style.setProperty("--project-count",String(cards.length));
      let frame = 0;
      let start = 0;
      let end = 1;
      let snapTimer = 0;
      let snapping = false;

      const measure = () => {
        start = section.getBoundingClientRect().top + window.scrollY;
        end = start + Math.max(section.offsetHeight - window.innerHeight,1);
      };

      const render = () => {
        frame = 0;
        const progress = clamp((window.scrollY - start) / Math.max(end - start,1),0,1);
        const isActive = window.scrollY >= start - 2 && window.scrollY <= end + 2;
        section.classList.toggle("is-scroll-active",isActive);
        section.style.setProperty("--project-scroll-progress",progress.toFixed(4));
        updateNarrativeProgress("project",activeIndex,projects.length,isActive);
        const exact = progress * Math.max(cards.length - 1,1);
        const nextActive = Math.round(exact);
        cards.forEach((card,index) => {
          const relative = index - exact;
          const behind = Math.max(relative,0);
          const passed = Math.max(-relative,0);
          const exit = Math.min(passed,1);
          const y = passed > 0 ? `${-exit * 112}%` : `${behind * 18}px`;
          const x = passed > 0 ? -exit * 30 : behind * 7;
          const scale = passed > 0 ? 1 - exit * .075 : 1 - Math.min(behind,5) * .038;
          const rotate = passed > 0 ? -1.35 * exit : Math.min(behind,5) * .34;
          const opacity = passed >= 1 ? 0 : Math.max(.22,1 - behind * .14);
          card.style.transform = `translate3d(${x}px,0,0) translateY(${y}) rotate(${rotate}deg) scale(${scale})`;
          card.style.opacity = String(opacity);
          card.style.zIndex = String(cards.length - index);
          card.setAttribute("aria-hidden",String(opacity < .15));
        });
        if (nextActive !== activeIndex) updateSelectedContent(nextActive,false);
      };

      const snapToNearest = () => {
        snapTimer = 0;
        if (snapping || reducedMotion.matches) return;
        const range = Math.max(end - start,1);
        const raw = (window.scrollY - start) / range;
        if (raw <= 0 || raw >= 1) return;
        const steps = Math.max(cards.length - 1,1);
        const nearest = Math.round(raw * steps) / steps;
        if (Math.abs(nearest - raw) < .018) return;
        snapping = true;
        window.scrollTo({top:start + range * nearest,behavior:"smooth"});
        window.setTimeout(() => {snapping = false;},260);
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(render);
        clearTimeout(snapTimer);
        snapTimer = window.setTimeout(snapToNearest,110);
      };
      const remeasure = () => {
        measure();
        render();
      };
      measure();
      render();
      requestAnimationFrame(remeasure);
      window.addEventListener("scroll",schedule,{passive:true});
      window.addEventListener("resize",remeasure,{passive:true});
      window.addEventListener("pageshow",remeasure,{passive:true});
      window.addEventListener("portal:rendered",remeasure,{once:true});
      return {
        scrollToStep(index,behavior = "smooth") {
          const ratio = cards.length > 1 ? index / (cards.length - 1) : 0;
          window.scrollTo({top:start + (end - start) * ratio,behavior});
        },
        destroy() {
          window.removeEventListener("scroll",schedule);
          window.removeEventListener("resize",remeasure);
          window.removeEventListener("pageshow",remeasure);
          window.removeEventListener("portal:rendered",remeasure);
          clearTimeout(snapTimer);
          if (frame) cancelAnimationFrame(frame);
        }
      };
    }

    function setupGsapStack(cards) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      if (!gsap || !ScrollTrigger) return null;
      gsap.registerPlugin(ScrollTrigger);
      section.classList.add("project-console--gsap");
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const lowTier = document.documentElement.dataset.motionTier === "low";
      const gap = mobile ? 11 : 18;
      const xGap = mobile || lowTier ? 0 : 5;
      const scaleStep = mobile ? .026 : .035;
      const rotationStep = mobile || lowTier ? 0 : .22;

      cards.forEach((card,index) => {
        gsap.set(card,{
          y:index * gap,
          x:index * xGap,
          scale:1 - Math.min(index,6) * scaleStep,
          rotation:Math.min(index,6) * rotationStep,
          opacity:Math.max(.28,1 - index * .12),
          zIndex:cards.length - index,
          transformOrigin:"50% 84%",
          force3D:true
        });
      });

      const timeline = gsap.timeline({defaults:{ease:"none"},paused:true});
      for (let step = 0; step < cards.length - 1; step += 1) {
        timeline.to(cards[step],{
          yPercent:mobile ? -92 : -112,
          xPercent:mobile ? 0 : -4,
          scale:.94,
          rotation:mobile || lowTier ? 0 : -1.05,
          opacity:0,
          duration:1
        },step);
        for (let cardIndex = step + 1; cardIndex < cards.length; cardIndex += 1) {
          const distance = cardIndex - (step + 1);
          timeline.to(cards[cardIndex],{
            y:distance * gap,
            x:distance * xGap,
            scale:1 - Math.min(distance,6) * scaleStep,
            rotation:Math.min(distance,6) * rotationStep,
            opacity:Math.max(.28,1 - distance * .12),
            duration:1
          },step);
        }
      }

      const trigger = ScrollTrigger.create({
        id:"project-stack",
        trigger:section,
        start:"top top",
        end:() => `+=${Math.round(window.innerHeight * (mobile ? .72 : .88) * Math.max(cards.length - 1,1))}`,
        pin:shell,
        pinSpacing:true,
        animation:timeline,
        scrub:mobile ? .28 : .48,
        anticipatePin:1,
        invalidateOnRefresh:true,
        snap:cards.length > 1 ? {
          snapTo:ScrollTrigger.snapDirectional
            ? ScrollTrigger.snapDirectional(1 / (cards.length - 1))
            : 1 / (cards.length - 1),
          delay:.04,
          duration:{min:.10,max:.32},
          ease:"power1.inOut"
        } : false,
        onUpdate:self => {
          const index = Math.round(self.progress * Math.max(cards.length - 1,1));
          if (index !== activeIndex) updateSelectedContent(index,false);
          section.style.setProperty("--project-scroll-progress",self.progress.toFixed(4));
        },
        onToggle:self => {
          section.classList.toggle("is-scroll-active",self.isActive);
          updateNarrativeProgress("project",activeIndex,projects.length,self.isActive);
        }
      });

      return {
        scrollToStep(index,behavior = "smooth") {
          const ratio = cards.length > 1 ? index / (cards.length - 1) : 0;
          window.scrollTo({top:trigger.start + (trigger.end - trigger.start) * ratio,behavior});
        },
        destroy() {
          trigger.kill(true);
          timeline.kill();
        }
      };
    }

    function setupMotion() {
      motionCleanup();
      motionCleanup = () => {};
      scrollController = null;
      section.classList.remove("project-console--static","project-console--native","project-console--gsap","is-scroll-active");
      const cards = [...track.querySelectorAll(".project-console-card")];
      cards.forEach(card => {
        card.style.removeProperty("transform");
        card.style.removeProperty("opacity");
        card.style.removeProperty("z-index");
      });

      if (reducedMotion.matches) {
        scrollController = setupStaticLayout(cards);
      } else {
        scrollController = setupNativeStack(cards);
      }
      motionCleanup = () => scrollController?.destroy?.();
      window.ScrollTrigger?.refresh?.(true);
    }

    function renderCards() {
      track.replaceChildren();
      stepsNode.replaceChildren();
      projects.forEach((project,index) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "project-console-card";
        card.dataset.projectIndex = String(index);
        card.setAttribute("role","option");
        card.setAttribute("aria-label",`Abrir ${project.title}`);
        const rgb = projectColor(index);
        card.style.setProperty("--project-rgb",rgb.join(","));
        const image = safeUrl(project.image);
        card.innerHTML = `
          <span class="project-console-card__visual">
            ${image ? `<img data-project-src="${escapeHtml(image)}" alt="" width="900" height="900" decoding="async">` : ""}
            <i>${String(index + 1).padStart(2,"0")}</i>
            <b>${escapeHtml(project.status)}</b>
          </span>
          <span class="project-console-card__body">
            <small>${escapeHtml(project.category)} · ${escapeHtml(project.year)}</small>
            <strong>${escapeHtml(project.title)}</strong>
            <span>${escapeHtml(project.description)}</span>
            <em>Ver proyecto <b aria-hidden="true">↗</b></em>
          </span>`;
        card.addEventListener("click",() => {
          if (index !== activeIndex) {
            goToProject(index);
            return;
          }
          openProject();
        });
        track.append(card);

        const stepButton = document.createElement("button");
        stepButton.type = "button";
        stepButton.dataset.projectStep = String(index);
        stepButton.setAttribute("aria-label",`Ir al proyecto ${index + 1}: ${project.title}`);
        stepButton.innerHTML = `<span>${String(index + 1).padStart(2,"0")}</span><i aria-hidden="true"></i>`;
        stepButton.addEventListener("click",() => goToProject(index));
        stepsNode.append(stepButton);
      });
      totalNode.textContent = String(projects.length).padStart(2,"0");
      activeIndex = clamp(activeIndex,0,projects.length - 1);
      updateSelectedContent(activeIndex,false);
      setupMotion();
    }

    prev.addEventListener("click",() => goToProject(activeIndex - 1));
    next.addEventListener("click",() => goToProject(activeIndex + 1));
    openButton.addEventListener("click",openProject);
    manageButton.addEventListener("click",openEditor);

    viewport.addEventListener("keydown",event => {
      if (["ArrowDown","ArrowRight","PageDown"].includes(event.key)) {
        event.preventDefault();
        goToProject(activeIndex + 1);
      } else if (["ArrowUp","ArrowLeft","PageUp"].includes(event.key)) {
        event.preventDefault();
        goToProject(activeIndex - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToProject(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToProject(projects.length - 1);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProject();
      }
    });

    const rebuildMotion = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setupMotion,180);
    };
    window.addEventListener("resize",rebuildMotion,{passive:true});
    window.addEventListener("orientationchange",rebuildMotion,{passive:true});
    reducedMotion.addEventListener?.("change",setupMotion);
    window.addEventListener("firebase:auth",syncAdminVisibility);
    window.addEventListener("firebase:data",() => {
      projects = ensureProjects();
      renderCards();
      syncAdminVisibility();
    });
    window.addEventListener("focus",syncAdminVisibility);
    window.addEventListener("pagehide",() => motionCleanup(),{once:true});

    renderCards();
    syncAdminVisibility();
  }

  function initCinematic() {
    const section = document.getElementById("san-pedro-cinematica");
    const stage = section?.querySelector(".san-pedro-cinematic__stage");
    const frames = [...document.querySelectorAll("[data-cinematic-frame]")];
    const railButtons = [...document.querySelectorAll("[data-cinematic-step]")];
    const eyebrow = document.getElementById("cinematicEyebrow");
    const heading = document.getElementById("cinematicHeading");
    const text = document.getElementById("cinematicText");
    const quote = document.getElementById("cinematicQuote");
    const progressBar = document.getElementById("cinematicProgress");
    const copy = document.getElementById("cinematicCopy");
    const skip = document.getElementById("cinematicSkip");
    if (!section || !stage || !frames.length || !eyebrow || !heading || !text || !quote || !progressBar) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    section.classList.add("is-loading");
    stage.tabIndex = 0;
    stage.setAttribute("aria-label","Recorrido cinematográfico de San Pedro");
    let activeIndex = -1;
    let controller = null;
    let resizeTimer = 0;

    function writeStory(index,animate = true) {
      const nextIndex = clamp(index,0,CINEMATIC_STORIES.length - 1);
      if (nextIndex === activeIndex && animate) return;
      activeIndex = nextIndex;
      const story = CINEMATIC_STORIES[nextIndex];
      const words = story.heading.split(" ");
      eyebrow.textContent = story.eyebrow;
      heading.innerHTML = `${escapeHtml(words.slice(0,-1).join(" "))} <em>${escapeHtml(words.at(-1))}</em>`;
      text.textContent = story.text;
      quote.textContent = story.quote;
      railButtons.forEach((button,index) => {
        const isActive = index === nextIndex;
        button.classList.toggle("is-active",isActive);
        button.setAttribute("aria-current",isActive ? "step" : "false");
      });
      frames.forEach((frame,index) => frame.classList.toggle("is-active",index === nextIndex));
      updateNarrativeProgress("scene",nextIndex,frames.length,section.classList.contains("is-scroll-active"));
      if (animate && !reducedMotion.matches) {
        copy?.classList.remove("is-entering");
        requestAnimationFrame(() => copy?.classList.add("is-entering"));
      }
    }

    function fillStaticCaptions() {
      frames.forEach((frame,index) => {
        const story = CINEMATIC_STORIES[index];
        const caption = frame.querySelector(".san-pedro-cinematic__static-caption");
        if (!caption) return;
        caption.innerHTML = `<span>${escapeHtml(story.eyebrow)}</span><h3>${escapeHtml(story.heading)}</h3><p>${escapeHtml(story.text)}</p><blockquote>${escapeHtml(story.quote)}</blockquote>`;
      });
    }

    function refreshAfterImages() {
      const loadFrame = frame => {
        const image = frame.querySelector("img");
        if (!image) return Promise.resolve();
        if (image.complete) {
          if (!image.naturalWidth) frame.classList.add("has-image-error");
          return image.decode?.().catch(() => {}) || Promise.resolve();
        }
        return new Promise(resolve => {
          image.addEventListener("load",resolve,{once:true});
          image.addEventListener("error",() => {
            frame.classList.add("has-image-error");
            resolve();
          },{once:true});
        });
      };
      const firstReady = loadFrame(frames[0]);
      firstReady.finally(() => {
        section.classList.remove("is-loading");
        section.classList.add("is-ready");
        window.ScrollTrigger?.refresh?.(true);
      });
      Promise.all(frames.slice(1).map(loadFrame)).then(() => window.ScrollTrigger?.refresh?.(true));
    }

    function setupReduced() {
      section.classList.add("san-pedro-cinematic--reduced");
      fillStaticCaptions();
      frames.forEach(frame => {
        frame.style.removeProperty("transform");
        frame.style.removeProperty("opacity");
        frame.style.removeProperty("clip-path");
      });
      copy.hidden = true;
      railButtons.forEach((button,index) => {
        button.onclick = () => frames[index]?.scrollIntoView({behavior:"auto",block:"center"});
      });
      return {destroy(){
        copy.hidden = false;
        railButtons.forEach(button => {button.onclick = null;});
      }};
    }

    function setupNative() {
      section.classList.add("san-pedro-cinematic--native");
      section.style.setProperty("--cinematic-count",String(frames.length));
      const useMask = window.innerWidth > 767 && document.documentElement.dataset.motionTier !== "low";
      let frameId = 0;
      let start = 0;
      let end = 1;
      let snapTimer = 0;
      let snapping = false;
      const measure = () => {
        start = section.getBoundingClientRect().top + window.scrollY;
        end = start + Math.max(section.offsetHeight - window.innerHeight,1);
      };
      const render = () => {
        frameId = 0;
        const progress = clamp((window.scrollY - start) / Math.max(end - start,1),0,1);
        const isActive = window.scrollY >= start - 2 && window.scrollY <= end + 2;
        section.classList.toggle("is-scroll-active",isActive);
        updateNarrativeProgress("scene",activeIndex < 0 ? 0 : activeIndex,frames.length,isActive);
        const exact = progress * Math.max(frames.length - 1,1);
        const base = Math.floor(exact);
        const local = exact - base;
        frames.forEach((frame,index) => {
          let opacity = 0;
          if (index === base) opacity = 1 - local;
          if (index === base + 1) opacity = local;
          if (progress >= .999 && index === frames.length - 1) opacity = 1;
          const image = frame.querySelector("img");
          frame.style.opacity = opacity.toFixed(3);
          frame.style.clipPath = useMask
            ? `inset(${(1 - opacity) * 10}% ${(1 - opacity) * 8}% round 30px)`
            : "inset(0% 0% 0% 0% round 24px)";
          if (image) {
            const direction = index % 2 === 0 ? -1 : 1;
            image.style.transform = `translate3d(${direction * local * 2.5}%,${(local - .5) * 1.2}%,0) scale(${1.035 + local * .045})`;
          }
        });
        const index = Math.round(exact);
        if (index !== activeIndex) writeStory(index);
        progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
      };
      const snapToNearest = () => {
        snapTimer = 0;
        if (snapping || reducedMotion.matches) return;
        const range = Math.max(end - start,1);
        const raw = (window.scrollY - start) / range;
        if (raw <= 0 || raw >= 1) return;
        const steps = Math.max(frames.length - 1,1);
        const nearest = Math.round(raw * steps) / steps;
        if (Math.abs(nearest - raw) < .018) return;
        snapping = true;
        window.scrollTo({top:start + range * nearest,behavior:"smooth"});
        window.setTimeout(() => {snapping = false;},280);
      };
      const schedule = () => {
        if (!frameId) frameId = requestAnimationFrame(render);
        clearTimeout(snapTimer);
        snapTimer = window.setTimeout(snapToNearest,120);
      };
      const remeasure = () => {
        measure();
        render();
      };
      measure();
      render();
      requestAnimationFrame(remeasure);
      window.addEventListener("scroll",schedule,{passive:true});
      window.addEventListener("resize",remeasure,{passive:true});
      window.addEventListener("pageshow",remeasure,{passive:true});
      window.addEventListener("portal:rendered",remeasure,{once:true});
      return {
        scrollToStep(index,behavior = "smooth") {
          const ratio = frames.length > 1 ? index / (frames.length - 1) : 0;
          window.scrollTo({top:start + (end - start) * ratio,behavior});
        },
        skip() {window.scrollTo({top:end + 2,behavior:"smooth"});},
        destroy() {
          window.removeEventListener("scroll",schedule);
          window.removeEventListener("resize",remeasure);
          window.removeEventListener("pageshow",remeasure);
          window.removeEventListener("portal:rendered",remeasure);
          clearTimeout(snapTimer);
          if (frameId) cancelAnimationFrame(frameId);
        }
      };
    }

    function setupGsap() {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      if (!gsap || !ScrollTrigger) return null;
      gsap.registerPlugin(ScrollTrigger);
      section.classList.add("san-pedro-cinematic--gsap");
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const lowTier = document.documentElement.dataset.motionTier === "low";
      const useMask = !mobile && !lowTier;
      const timeline = gsap.timeline({defaults:{ease:"none"},paused:true});

      frames.forEach((frame,index) => {
        const image = frame.querySelector("img");
        gsap.set(frame,{
          opacity:index === 0 ? 1 : 0,
          clipPath:useMask
            ? (index === 0 ? "inset(0% 0% 0% 0% round 30px)" : "inset(18% 15% 18% 15% round 42px)")
            : "inset(0% 0% 0% 0% round 24px)",
          xPercent:index === 0 ? 0 : 4,
          zIndex:frames.length - index,
          force3D:true
        });
        if (image) gsap.set(image,{scale:1.035,xPercent:index % 2 === 0 ? 0 : 2,yPercent:0,force3D:true});
      });

      for (let index = 0; index < frames.length - 1; index += 1) {
        const current = frames[index];
        const next = frames[index + 1];
        const currentImage = current.querySelector("img");
        const nextImage = next.querySelector("img");
        const position = index;
        const direction = index % 2 === 0 ? -1 : 1;
        if (currentImage) {
          timeline.to(currentImage,{
            scale:lowTier ? 1.055 : 1.105,
            xPercent:mobile ? 0 : direction * 2.5,
            yPercent:index === 1 ? -1.5 : 0,
            duration:.68
          },position);
        }
        timeline.to(current,{
          opacity:0,
          clipPath:useMask ? "inset(10% 8% 10% 8% round 36px)" : "inset(0% 0% 0% 0% round 24px)",
          xPercent:mobile ? 0 : direction * -3,
          duration:.32
        },position + .68);
        timeline.fromTo(next,{
          opacity:0,
          clipPath:useMask ? "inset(18% 15% 18% 15% round 42px)" : "inset(0% 0% 0% 0% round 24px)",
          xPercent:mobile ? 0 : direction * 4
        },{
          opacity:1,
          clipPath:useMask ? "inset(0% 0% 0% 0% round 30px)" : "inset(0% 0% 0% 0% round 24px)",
          xPercent:0,
          duration:.32
        },position + .68);
        if (nextImage) {
          timeline.fromTo(nextImage,{
            scale:lowTier ? 1.05 : 1.09,
            xPercent:mobile ? 0 : direction * 2,
            yPercent:index === 0 ? 1.5 : 0
          },{
            scale:1.035,
            xPercent:0,
            yPercent:0,
            duration:.32
          },position + .68);
        }
      }
      const trigger = ScrollTrigger.create({
        id:"san-pedro-cinematic",
        trigger:section,
        start:"top top",
        end:() => `+=${Math.round(window.innerHeight * (mobile ? .75 : .96) * Math.max(frames.length - 1,1))}`,
        pin:stage,
        pinSpacing:true,
        animation:timeline,
        scrub:mobile ? .30 : .55,
        anticipatePin:1,
        invalidateOnRefresh:true,
        snap:frames.length > 1 ? {
          snapTo:ScrollTrigger.snapDirectional
            ? ScrollTrigger.snapDirectional(1 / (frames.length - 1))
            : 1 / (frames.length - 1),
          delay:.05,
          duration:{min:.12,max:.38},
          ease:"power1.inOut"
        } : false,
        onUpdate:self => {
          const index = Math.round(self.progress * Math.max(frames.length - 1,1));
          if (index !== activeIndex) writeStory(index);
          progressBar.style.width = `${(self.progress * 100).toFixed(2)}%`;
          section.style.setProperty("--cinematic-progress",self.progress.toFixed(4));
        },
        onToggle:self => {
          section.classList.toggle("is-scroll-active",self.isActive);
          updateNarrativeProgress("scene",activeIndex < 0 ? 0 : activeIndex,frames.length,self.isActive);
        }
      });

      return {
        scrollToStep(index,behavior = "smooth") {
          const ratio = frames.length > 1 ? index / (frames.length - 1) : 0;
          window.scrollTo({top:trigger.start + (trigger.end - trigger.start) * ratio,behavior});
        },
        skip() {window.scrollTo({top:trigger.end + 2,behavior:"smooth"});},
        destroy() {trigger.kill(true); timeline.kill();}
      };
    }

    function setup() {
      controller?.destroy?.();
      controller = null;
      section.classList.remove("san-pedro-cinematic--reduced","san-pedro-cinematic--native","san-pedro-cinematic--gsap","is-scroll-active");
      copy.hidden = false;
      frames.forEach(frame => {
        frame.style.removeProperty("opacity");
        frame.style.removeProperty("clip-path");
        frame.style.removeProperty("transform");
        const image = frame.querySelector("img");
        image?.style.removeProperty("transform");
      });
      railButtons.forEach(button => {button.onclick = null;});
      activeIndex = -1;
      writeStory(0,false);
      controller = reducedMotion.matches ? setupReduced() : setupNative();
      window.ScrollTrigger?.refresh?.(true);
    }

    stage.addEventListener("keydown",event => {
      if (["ArrowDown","ArrowRight","PageDown"].includes(event.key)) {
        event.preventDefault();
        controller?.scrollToStep?.(clamp(activeIndex + 1,0,frames.length - 1),reducedMotion.matches ? "auto" : "smooth");
      } else if (["ArrowUp","ArrowLeft","PageUp"].includes(event.key)) {
        event.preventDefault();
        controller?.scrollToStep?.(clamp(activeIndex - 1,0,frames.length - 1),reducedMotion.matches ? "auto" : "smooth");
      } else if (event.key === "Home") {
        event.preventDefault();
        controller?.scrollToStep?.(0,reducedMotion.matches ? "auto" : "smooth");
      } else if (event.key === "End") {
        event.preventDefault();
        controller?.scrollToStep?.(frames.length - 1,reducedMotion.matches ? "auto" : "smooth");
      } else if (event.key === "Escape") {
        event.preventDefault();
        controller?.skip?.();
      }
    });

    railButtons.forEach((button,index) => {
      button.addEventListener("click",() => controller?.scrollToStep?.(index,reducedMotion.matches ? "auto" : "smooth"));
    });
    skip?.addEventListener("click",() => controller?.skip?.() || section.nextElementSibling?.scrollIntoView({behavior:reducedMotion.matches ? "auto" : "smooth"}));

    const rebuild = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup,180);
    };
    window.addEventListener("resize",rebuild,{passive:true});
    window.addEventListener("orientationchange",rebuild,{passive:true});
    reducedMotion.addEventListener?.("change",setup);
    window.addEventListener("pagehide",() => controller?.destroy?.(),{once:true});

    fillStaticCaptions();
    refreshAfterImages();
    setup();
  }

  function setupMediaLifecycle() {
    const videos = [...document.querySelectorAll("video")];
    if (!videos.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (!entry.isIntersecting || entry.intersectionRatio < .18) {
          video.pause?.();
          return;
        }
        if (video.hasAttribute("autoplay")) {
          video.muted = true;
          video.playsInline = true;
          video.play?.().catch(() => {});
        }
      });
    },{threshold:[0,.18,.6]});
    videos.forEach(video => {
      if (video.hasAttribute("autoplay")) video.muted = true;
      if (!video.hasAttribute("controls") && !video.hasAttribute("autoplay")) video.controls = true;
      observer.observe(video);
    });
    window.addEventListener("pagehide",() => observer.disconnect(),{once:true});
  }

  function setupNavigationStability() {
    if ("scrollRestoration" in history) history.scrollRestoration = "auto";
    window.ScrollTrigger?.config?.({
      ignoreMobileResize:true,
      limitCallbacks:true
    });
    const refresh = () => window.setTimeout(() => window.ScrollTrigger?.refresh?.(true),80);
    window.addEventListener("pageshow",refresh,{passive:true});
    window.addEventListener("hashchange",refresh,{passive:true});
    window.addEventListener("popstate",refresh,{passive:true});
    document.addEventListener("visibilitychange",() => {
      if (!window.gsap?.ticker) return;
      if (document.hidden) window.gsap.ticker.sleep();
      else {
        window.gsap.ticker.wake();
        refresh();
      }
    },{passive:true});
  }

  function init() {
    initProjectConsole();
    initCinematic();
    setupMediaLifecycle();
    setupNavigationStability();
    document.documentElement.dataset.homeStoryReady = BUILD;
    window.dispatchEvent(new CustomEvent("portal:rendered",{detail:{source:"home-experience",build:BUILD}}));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
