(() => {
  "use strict";

  const BUILD = "11.30-projects-cinematic";
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
    if (!viewport || !track || !selected || !backdrop) return;

    let projects = ensureProjects();
    let activeIndex = 0;
    let pointerStart = 0;
    let pointerDelta = 0;
    let pointerActive = false;
    let moved = false;
    let wheelLock = false;
    let editingId = projects[0]?.id || "";

    viewport.tabIndex = 0;

    function saveProjects() {
      const api = portal();
      if (!api) return;
      api.state.content.homeProjects = projects.map(normalizeProject);
      api.helpers.save();
      window.dispatchEvent(new CustomEvent("home:projects-updated",{detail:{count:projects.length}}));
    }

    function renderCards() {
      track.replaceChildren();
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
            <i>${String(index + 1).padStart(2,"0")}</i>
            <b>${escapeHtml(project.status)}</b>
          </span>
          <span class="project-console-card__body">
            <small>${escapeHtml(project.category)} · ${escapeHtml(project.year)}</small>
            <strong>${escapeHtml(project.title)}</strong>
            <em>Ver proyecto</em>
          </span>`;
        if (image) {
          card.querySelector(".project-console-card__visual").style.backgroundImage =
            `linear-gradient(180deg,rgba(4,17,35,.05),rgba(4,17,35,.82)),url("${image.replace(/["\\]/g,"\\$&")}")`;
        }
        card.addEventListener("click",() => {
          if (moved) return;
          setActive(index,true);
          window.setTimeout(openProject,130);
        });
        track.append(card);
      });
      totalNode.textContent = String(projects.length).padStart(2,"0");
      setActive(clamp(activeIndex,0,projects.length - 1),false);
    }

    function setActive(index,announce = true) {
      activeIndex = clamp(index,0,projects.length - 1);
      const active = projects[activeIndex];
      const rgb = projectColor(activeIndex);

      [...track.children].forEach((card,indexValue) => {
        const offset = indexValue - activeIndex;
        const distance = Math.abs(offset);
        card.style.setProperty("--project-offset",String(offset));
        card.style.setProperty("--project-distance",String(distance));
        card.style.setProperty("--project-z",String(100 - distance));
        card.classList.toggle("is-active",indexValue === activeIndex);
        card.classList.toggle("is-before",offset < 0);
        card.classList.toggle("is-after",offset > 0);
        card.classList.toggle("is-far",distance > 3);
        card.setAttribute("aria-selected",String(indexValue === activeIndex));
        card.tabIndex = indexValue === activeIndex ? 0 : -1;
      });

      currentNode.textContent = String(activeIndex + 1).padStart(2,"0");
      selected.querySelector("h3").textContent = active.title;
      selected.querySelector("p").textContent = active.description;
      selected.querySelector("span").textContent = `${active.category.toUpperCase()} · ${active.year}`;
      backdrop.style.setProperty("--project-active-rgb",rgb.join(","));
      backdrop.style.backgroundImage = active.image
        ? `linear-gradient(90deg,rgba(4,18,38,.94) 0%,rgba(4,18,38,.70) 44%,rgba(4,18,38,.30) 100%),url("${safeUrl(active.image)}")`
        : "";
      prev.disabled = activeIndex <= 0;
      next.disabled = activeIndex >= projects.length - 1;
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

    function syncAdminVisibility() {
      manageButton.hidden = !canManageProjects();
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

    prev.addEventListener("click",() => setActive(activeIndex - 1));
    next.addEventListener("click",() => setActive(activeIndex + 1));
    openButton.addEventListener("click",openProject);
    manageButton.addEventListener("click",openEditor);

    viewport.addEventListener("keydown",event => {
      if (event.key === "ArrowLeft") { event.preventDefault(); setActive(activeIndex - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); setActive(activeIndex + 1); }
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openProject(); }
    });

    viewport.addEventListener("wheel",event => {
      if (wheelLock || Math.abs(event.deltaY) < 12) return;
      event.preventDefault();
      wheelLock = true;
      setActive(activeIndex + (event.deltaY > 0 ? 1 : -1));
      window.setTimeout(() => { wheelLock = false; },260);
    },{passive:false});

    viewport.addEventListener("pointerdown",event => {
      if (event.target.closest("button,a")) return;
      pointerActive = true;
      moved = false;
      pointerStart = event.clientX;
      pointerDelta = 0;
      viewport.setPointerCapture?.(event.pointerId);
      viewport.classList.add("is-dragging");
    });
    viewport.addEventListener("pointermove",event => {
      if (!pointerActive) return;
      pointerDelta = event.clientX - pointerStart;
      moved = moved || Math.abs(pointerDelta) > 8;
      track.style.setProperty("--project-drag",`${clamp(pointerDelta,-110,110)}px`);
    });
    const finishPointer = event => {
      if (!pointerActive) return;
      pointerActive = false;
      viewport.releasePointerCapture?.(event.pointerId);
      viewport.classList.remove("is-dragging");
      track.style.removeProperty("--project-drag");
      if (Math.abs(pointerDelta) > 46) setActive(activeIndex + (pointerDelta < 0 ? 1 : -1));
      window.setTimeout(() => { moved = false; },0);
    };
    viewport.addEventListener("pointerup",finishPointer);
    viewport.addEventListener("pointercancel",finishPointer);

    window.addEventListener("firebase:auth",syncAdminVisibility);
    window.addEventListener("firebase:data",() => {
      projects = ensureProjects();
      renderCards();
      syncAdminVisibility();
    });
    window.addEventListener("focus",syncAdminVisibility);

    renderCards();
    syncAdminVisibility();
  }

  function initCinematic() {
    const section = document.getElementById("san-pedro-cinematica");
    const frames = [...document.querySelectorAll("[data-cinematic-frame]")];
    const railButtons = [...document.querySelectorAll("[data-cinematic-step]")];
    const eyebrow = document.getElementById("cinematicEyebrow");
    const heading = document.getElementById("cinematicHeading");
    const text = document.getElementById("cinematicText");
    const quote = document.getElementById("cinematicQuote");
    const progressBar = document.getElementById("cinematicProgress");
    if (!section || !frames.length || !eyebrow || !heading || !text || !quote) return;

    let currentStory = -1;
    let ticking = false;
    let loaded = false;

    function loadImages() {
      if (loaded) return;
      loaded = true;
      section.querySelectorAll("source[data-srcset]").forEach(source => {
        source.srcset = source.dataset.srcset;
        source.removeAttribute("data-srcset");
      });
      section.querySelectorAll("img[data-src]").forEach(image => {
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
      });
    }

    if ("IntersectionObserver" in window) {
      const imageObserver = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          loadImages();
          imageObserver.disconnect();
        }
      },{rootMargin:"1200px 0px"});
      imageObserver.observe(section);
    } else {
      loadImages();
    }

    function writeStory(index) {
      if (index === currentStory) return;
      currentStory = index;
      const story = CINEMATIC_STORIES[index];
      eyebrow.textContent = story.eyebrow;
      heading.innerHTML = `${escapeHtml(story.heading.split(" ").slice(0,-1).join(" "))} <em>${escapeHtml(story.heading.split(" ").at(-1))}</em>`;
      text.textContent = story.text;
      quote.textContent = story.quote;
      document.getElementById("cinematicCopy")?.classList.remove("is-entering");
      requestAnimationFrame(() => document.getElementById("cinematicCopy")?.classList.add("is-entering"));
      railButtons.forEach((button,buttonIndex) => button.classList.toggle("is-active",buttonIndex === index));
    }

    function update() {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const scrollable = Math.max(section.offsetHeight - window.innerHeight,1);
      const progress = clamp(-rect.top / scrollable,0,1);
      const steps = frames.length;
      const position = progress * steps;
      const base = Math.min(steps - 1,Math.floor(position));
      const local = position - base;
      const fade = base < steps - 1 ? clamp((local - .56) / .44,0,1) : 0;
      const storyIndex = Math.min(steps - 1,base + (fade > .5 ? 1 : 0));
      const motionTier = document.documentElement.dataset.motionTier || "low";

      frames.forEach((frame,index) => {
        let opacity = 0;
        if (index === base) opacity = 1 - fade;
        if (index === base + 1) opacity = fade;
        if (progress >= .999 && index === steps - 1) opacity = 1;
        frame.style.opacity = opacity.toFixed(3);
        frame.classList.toggle("is-active",opacity > .45);
        if (motionTier !== "low") {
          const relative = index - position;
          const x = relative * -18;
          const scale = 1.07 - Math.min(Math.abs(relative),1) * .02;
          frame.style.setProperty("--cinematic-x",`${x.toFixed(2)}px`);
          frame.style.setProperty("--cinematic-scale",scale.toFixed(4));
        }
      });

      progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
      section.style.setProperty("--cinematic-progress",progress.toFixed(4));
      writeStory(storyIndex);
    }

    function scheduleUpdate() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    railButtons.forEach((button,index) => {
      button.addEventListener("click",() => {
        const scrollable = Math.max(section.offsetHeight - window.innerHeight,1);
        window.scrollTo({
          top:section.offsetTop + scrollable * (index / Math.max(frames.length - 1,1)),
          behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        });
      });
    });

    window.addEventListener("scroll",scheduleUpdate,{passive:true});
    window.addEventListener("resize",scheduleUpdate,{passive:true});
    writeStory(0);
    update();
  }

  function init() {
    initProjectConsole();
    initCinematic();
    window.dispatchEvent(new CustomEvent("portal:rendered",{detail:{source:"home-experience",build:BUILD}}));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
