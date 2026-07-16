(() => {
  "use strict";

  const EDITS_KEY = "contextEdits";
  const EDIT_BUTTON_SELECTOR = [
    ".admin-section-edit-button",
    ".admin-quick-card-edit",
    ".dashboard-edit-button"
  ].join(",");

  const CARD_SELECTOR = [
    ".edition-card",
    ".deal-card",
    ".quote-card",
    ".trust-card",
    ".news-card",
    ".news-story",
    ".news-feature-card",
    ".resource-library-card",
    ".year-resource-card",
    ".ideas-cta",
    ".idea-card",
    ".idea-public-card",
    ".idea-feature-card",
    ".idea-column",
    ".dashboard-panel",
    ".executive-kpi",
    ".institution-result",
    ".method-step",
    ".commitment-row",
    ".followup-summary > article",
    ".request-summary > article",
    ".territory-focus-card",
    ".territory-detail-card"
  ].join(",");

  const state = {
    initialized:false,
    target:null,
    scope:null,
    key:null,
    observer:null,
    refreshTimer:null,
    refreshIdle:null
  };

  const portal = () => window.Portal;
  const isAdmin = () => Boolean(
    portal()?.state?.admin ||
    sessionStorage.getItem(portal()?.KEYS?.admin || "sp_v6_admin") === "1" ||
    window.FirebasePortal?.getStatus?.()?.canWrite
  );

  function pageKey() {
    return portal()?.helpers?.pageKey?.()
      || (location.pathname.split("/").pop() || "index").replace(/\.html$/i, "");
  }

  function sanitizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g,"-")
      .replace(/^-+|-+$/g,"") || "contenido";
  }

  function elementIndex(element) {
    if (!element?.parentElement) return 0;
    return [...element.parentElement.children].indexOf(element);
  }

  function targetKey(target) {
    if (!target) return null;
    if (target.dataset.adminEditKey) return target.dataset.adminEditKey;

    const explicit =
      target.id ||
      target.dataset.adminEntity ||
      target.dataset.section ||
      target.getAttribute("aria-label");

    let key = explicit
      ? sanitizeKey(explicit)
      : `${target.tagName.toLowerCase()}-${elementIndex(target)}`;

    const parentSection = target.closest("main > section,main > article");
    if (parentSection && parentSection !== target) {
      const sectionId = parentSection.id || `section-${elementIndex(parentSection)}`;
      key = `${sanitizeKey(sectionId)}--${key}`;
    }

    target.dataset.adminEditKey = key;
    return key;
  }

  function elementPath(root,node) {
    const path = [];
    let current = node;
    while (current && current !== root) {
      const parent = current.parentElement;
      if (!parent) return null;
      path.unshift([...parent.children].indexOf(current));
      current = parent;
    }
    return current === root ? path : null;
  }

  function resolvePath(root,path) {
    let current = root;
    for (const index of path || []) {
      current = current?.children?.[index];
      if (!current) return null;
    }
    return current;
  }

  function editableScope(target) {
    if (!target) return null;
    if (target.matches("main > section,main > article,.home-section,.year-section")) {
      return target.querySelector(
        ".home-section__head,.section-head,.year-section__head,.archive-intro," +
        ".news-section-heading,.library-section-head,.ideas-section-head"
      ) || target;
    }
    return target;
  }

  function isEditableTextNode(node) {
    if (!node || !node.textContent?.trim()) return false;
    if (node.closest(EDIT_BUTTON_SELECTOR)) return false;
    if (node.closest("nav,script,style,form,dialog,.cd-section-rail")) return false;
    if (node.children.length && !node.matches("h1,h2,h3,h4,h5,h6,p,small,label,button,a,li")) return false;
    return true;
  }

  function collectTextNodes(scope) {
    if (!scope) return [];
    const selectors = [
      "h1","h2","h3","h4","h5","h6","p","small",
      ".section-kicker",".section-label",".eyebrow",".card-meta",
      "a.button","button:not(.admin-section-edit-button):not(.admin-quick-card-edit)"
    ].join(",");
    const nodes = [...scope.querySelectorAll(selectors)].filter(isEditableTextNode);
    if (scope.matches(selectors) && isEditableTextNode(scope)) nodes.unshift(scope);
    return [...new Set(nodes)].slice(0,24);
  }

  function collectImages(scope) {
    if (!scope) return [];
    const images = [...scope.querySelectorAll("img")]
      .filter(img => !img.closest(EDIT_BUTTON_SELECTOR));
    if (scope.matches("img")) images.unshift(scope);
    return [...new Set(images)].slice(0,6);
  }

  function getStore() {
    const content = portal()?.state?.content;
    if (!content) return {};
    if (!content[EDITS_KEY] || typeof content[EDITS_KEY] !== "object") {
      content[EDITS_KEY] = {};
    }
    return content[EDITS_KEY];
  }

  function saveStore() {
    portal()?.helpers?.save?.();
    window.dispatchEvent(new CustomEvent("portal:datachange"));
  }

  function recordId(key) {
    return `${pageKey()}::${key}`;
  }

  function applyRecord(target,record) {
    if (!target || !record) return;
    const scope = editableScope(target) || target;

    (record.texts || []).forEach(item => {
      const node = resolvePath(scope,item.path);
      if (node) node.textContent = item.value;
    });

    (record.images || []).forEach(item => {
      const image = resolvePath(target,item.path);
      if (!(image instanceof HTMLImageElement)) return;
      if (item.src) image.src = item.src;
      image.alt = item.alt || "";
    });

    const styles = record.styles || {};
    const allowed = ["background","color","padding","borderRadius","maxWidth","minHeight"];
    allowed.forEach(property => {
      const value = styles[property];
      if (typeof value === "string" && value.trim()) target.style[property] = value;
      else target.style.removeProperty(property.replace(/[A-Z]/g,m => `-${m.toLowerCase()}`));
    });
  }

  function applySavedEdits(root = document) {
    const store = getStore();
    root.querySelectorAll("[data-admin-edit-key]").forEach(target => {
      applyRecord(target,store[recordId(target.dataset.adminEditKey)]);
    });
  }

  function createEditButton(target,type) {
    if (!target || target.querySelector(`:scope > .${type === "section" ? "admin-section-edit-button" : "admin-quick-card-edit"}`)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = type === "section"
      ? "admin-section-edit-button"
      : "admin-quick-card-edit";
    button.innerHTML = `<span aria-hidden="true">✎</span><b>${type === "section" ? "Editar sección" : "Editar"}</b>`;
    button.setAttribute("aria-label",type === "section" ? "Editar esta sección" : "Editar este contenido");
    target.appendChild(button);
  }

  function decorate(root = document) {
    const admin = isAdmin();
    document.body.classList.toggle("admin-popup-enabled",admin);

    const sections = root.querySelectorAll("main > section,main > article");
    sections.forEach(section => {
      section.classList.add("admin-quick-section");
      targetKey(section);
      if (admin) createEditButton(section,"section");
    });

    root.querySelectorAll(CARD_SELECTOR).forEach(card => {
      card.dataset.adminEntity ||= targetKey(card);
      targetKey(card);
      if (admin) createEditButton(card,"card");
    });

    if (!admin) root.querySelectorAll(EDIT_BUTTON_SELECTOR).forEach(button => button.remove());
    applySavedEdits(root);
  }

  function fieldLabel(node,index) {
    const label = node.matches("h1,h2,h3,h4,h5,h6")
      ? `Título ${index + 1}`
      : node.matches("a,button")
        ? `Acción ${index + 1}`
        : `Texto ${index + 1}`;
    return label;
  }

  function ensureContextDialog() {
    let dialog = document.querySelector("#contextEditorDialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "contextEditorDialog";
    dialog.className = "context-editor";
    dialog.setAttribute("aria-labelledby","contextEditorTitle");
    dialog.innerHTML = `
      <form method="dialog" class="context-editor__shell" id="contextEditorForm">
        <header class="context-editor__head">
          <div>
            <span>EDICIÓN CONTEXTUAL</span>
            <h2 id="contextEditorTitle">Editar contenido</h2>
            <p id="contextEditorDescription">Los cambios se guardan en el portal y se sincronizan cuando Firebase está disponible.</p>
          </div>
          <button class="context-editor__close" type="button" aria-label="Cerrar editor">×</button>
        </header>
        <nav class="context-editor__tabs" aria-label="Opciones de edición">
          <button type="button" class="active" data-context-tab="content">Contenido</button>
          <button type="button" data-context-tab="images">Imágenes</button>
          <button type="button" data-context-tab="design">Diseño</button>
        </nav>
        <div class="context-editor__body">
          <section class="context-editor__panel active" data-context-panel="content"><div id="contextTextFields"></div></section>
          <section class="context-editor__panel" data-context-panel="images"><div id="contextImageFields"></div></section>
          <section class="context-editor__panel" data-context-panel="design">
            <div class="context-design-grid">
              <label>Fondo<input name="background" placeholder="#ffffff o linear-gradient(...)"></label>
              <label>Color del texto<input name="color" placeholder="#0b2850"></label>
              <label>Espaciado interno<input name="padding" placeholder="24px"></label>
              <label>Redondeado<input name="borderRadius" placeholder="24px"></label>
              <label>Ancho máximo<input name="maxWidth" placeholder="1180px o 100%"></label>
              <label>Altura mínima<input name="minHeight" placeholder="auto o 260px"></label>
            </div>
          </section>
        </div>
        <footer class="context-editor__footer">
          <button type="button" class="button button-danger" id="contextEditorReset">Restablecer bloque</button>
          <span></span>
          <button type="button" class="button button-secondary context-editor__cancel">Cancelar</button>
          <button type="submit" class="button button-primary">Guardar cambios</button>
        </footer>
      </form>`;
    document.body.appendChild(dialog);

    dialog.querySelector(".context-editor__close").addEventListener("click",() => dialog.close());
    dialog.querySelector(".context-editor__cancel").addEventListener("click",() => dialog.close());
    dialog.addEventListener("click",event => {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelectorAll("[data-context-tab]").forEach(button => {
      button.addEventListener("click",() => {
        const tab = button.dataset.contextTab;
        dialog.querySelectorAll("[data-context-tab]").forEach(item => item.classList.toggle("active",item === button));
        dialog.querySelectorAll("[data-context-panel]").forEach(panel => panel.classList.toggle("active",panel.dataset.contextPanel === tab));
      });
    });

    dialog.querySelector("#contextEditorReset").addEventListener("click",() => {
      if (!state.key || !state.target) return;
      delete getStore()[recordId(state.key)];
      state.target.removeAttribute("style");
      saveStore();
      location.reload();
    });

    dialog.querySelector("#contextEditorForm").addEventListener("submit",event => {
      event.preventDefault();
      saveEditor();
    });

    return dialog;
  }

  function openEditor(buttonOrTarget) {
    if (!isAdmin()) {
      portal()?.helpers?.toast?.("Debe iniciar sesión con permisos de edición.");
      return;
    }

    const button = buttonOrTarget?.matches?.(EDIT_BUTTON_SELECTOR)
      ? buttonOrTarget
      : buttonOrTarget?.closest?.(EDIT_BUTTON_SELECTOR);
    const target = button?.classList.contains("admin-section-edit-button")
      ? button.closest("main > section,main > article,.home-section,.year-section")
      : button?.closest("[data-admin-entity]," + CARD_SELECTOR) || buttonOrTarget;

    if (!(target instanceof Element)) {
      portal()?.helpers?.toast?.("No fue posible identificar el bloque a editar.");
      return;
    }

    state.target = target;
    state.scope = editableScope(target) || target;
    state.key = targetKey(target);

    const dialog = ensureContextDialog();
    const texts = collectTextNodes(state.scope);
    const images = collectImages(target);
    const existing = getStore()[recordId(state.key)] || {};

    dialog.querySelector("#contextEditorTitle").textContent =
      target.querySelector("h1,h2,h3")?.textContent?.trim() || "Editar contenido";

    const textHolder = dialog.querySelector("#contextTextFields");
    textHolder.innerHTML = texts.length
      ? texts.map((node,index) => `
          <label class="context-field">
            <span>${fieldLabel(node,index)}</span>
            <textarea rows="${node.textContent.trim().length > 90 ? 4 : 2}" data-text-index="${index}"></textarea>
          </label>`).join("")
      : `<p class="context-editor__empty">Este bloque no tiene textos editables detectados.</p>`;
    texts.forEach((node,index) => {
      textHolder.querySelector(`[data-text-index="${index}"]`).value = node.textContent.trim();
    });
    textHolder.dataset.nodeCount = String(texts.length);

    const imageHolder = dialog.querySelector("#contextImageFields");
    imageHolder.innerHTML = images.length
      ? images.map((image,index) => `
          <fieldset class="context-image-field">
            <legend>Imagen ${index + 1}</legend>
            <img src="${image.currentSrc || image.src}" alt="">
            <label>Dirección de la imagen<input data-image-src="${index}" value=""></label>
            <label>Texto alternativo<input data-image-alt="${index}" value=""></label>
            <label>Subir imagen local<input type="file" accept="image/*" data-image-file="${index}"></label>
          </fieldset>`).join("")
      : `<p class="context-editor__empty">Este bloque no contiene imágenes.</p>`;
    images.forEach((image,index) => {
      imageHolder.querySelector(`[data-image-src="${index}"]`).value = image.getAttribute("src") || "";
      imageHolder.querySelector(`[data-image-alt="${index}"]`).value = image.alt || "";
    });

    imageHolder.querySelectorAll("[data-image-file]").forEach(input => {
      input.addEventListener("change",event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 1_500_000) {
          portal()?.helpers?.toast?.("La imagen local debe pesar menos de 1,5 MB. Para archivos mayores utilice Google Drive.");
          event.target.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const index = event.target.dataset.imageFile;
          imageHolder.querySelector(`[data-image-src="${index}"]`).value = String(reader.result || "");
          imageHolder.querySelectorAll(".context-image-field")[Number(index)]?.querySelector("img")?.setAttribute("src",String(reader.result || ""));
        };
        reader.readAsDataURL(file);
      });
    });

    const form = dialog.querySelector("#contextEditorForm");
    ["background","color","padding","borderRadius","maxWidth","minHeight"].forEach(property => {
      form.elements[property].value = existing.styles?.[property]
        || target.style[property]
        || "";
    });

    dialog.querySelectorAll("[data-context-tab]").forEach((item,index) => item.classList.toggle("active",index === 0));
    dialog.querySelectorAll("[data-context-panel]").forEach((item,index) => item.classList.toggle("active",index === 0));
    if (!dialog.open) dialog.showModal();
  }

  function saveEditor() {
    const dialog = ensureContextDialog();
    if (!state.target || !state.scope || !state.key) return;

    const textNodes = collectTextNodes(state.scope);
    const images = collectImages(state.target);
    const texts = [];
    const imageRecords = [];

    dialog.querySelectorAll("[data-text-index]").forEach(input => {
      const index = Number(input.dataset.textIndex);
      const node = textNodes[index];
      const path = elementPath(state.scope,node);
      if (!node || !path) return;
      node.textContent = input.value.trim();
      texts.push({path,value:input.value.trim()});
    });

    dialog.querySelectorAll("[data-image-src]").forEach(input => {
      const index = Number(input.dataset.imageSrc);
      const image = images[index];
      const path = elementPath(state.target,image);
      if (!image || !path) return;
      const src = input.value.trim();
      const alt = dialog.querySelector(`[data-image-alt="${index}"]`)?.value.trim() || "";
      if (src) image.src = src;
      image.alt = alt;
      imageRecords.push({path,src,alt});
    });

    const form = dialog.querySelector("#contextEditorForm");
    const styles = {};
    ["background","color","padding","borderRadius","maxWidth","minHeight"].forEach(property => {
      styles[property] = String(form.elements[property].value || "").trim();
      if (styles[property]) state.target.style[property] = styles[property];
      else state.target.style.removeProperty(property.replace(/[A-Z]/g,m => `-${m.toLowerCase()}`));
    });

    getStore()[recordId(state.key)] = {texts,images:imageRecords,styles,updatedAt:new Date().toISOString()};
    saveStore();
    dialog.close();
    portal()?.helpers?.toast?.("Cambios guardados.");
  }

  function setAdminTab(tab = "appearance") {
    const panel = document.querySelector("#adminPanel");
    if (!panel) return;
    panel.querySelectorAll("[data-admin-tab]").forEach(button => button.classList.toggle("active",button.dataset.adminTab === tab));
    panel.querySelectorAll("[data-admin-panel]").forEach(section => section.classList.toggle("active",section.dataset.adminPanel === tab));
    const titles = {appearance:"Apariencia",years:"Vigencias",resources:"Recursos",ideas:"Ideas ciudadanas",connections:"Conexiones",backup:"Respaldo"};
    const title = panel.querySelector("#adminTitle");
    if (title) title.textContent = titles[tab] || "Administración";
  }

  function openAdmin(tab = "appearance") {
    if (!isAdmin()) {
      portal()?.helpers?.toast?.("Debe iniciar sesión con permisos administrativos.");
      portal()?.openDialog?.("loginDialog");
      return;
    }
    portal()?.syncAdmin?.();
    setAdminTab(tab);
    portal()?.openDialog?.("adminPanel");
  }

  function suppressLegacyAdmin() {
    const selector =
      "#inlineAdminToolbar,.inline-admin-toolbar,.admin-console-shell," +
      ".inline-admin-inspector,.inline-inspector,#inlineConsoleBackdrop";

    if (document.querySelector(selector)) {
      document.querySelectorAll(selector).forEach(node => node.remove());
    }

    if (
      document.body.classList.contains("admin-inline-active") ||
      document.body.classList.contains("admin-inspector-open") ||
      document.body.classList.contains("admin-console-open") ||
      document.body.classList.contains("admin-explicit-open")
    ) {
      document.body.classList.remove(
        "admin-inline-active",
        "admin-inspector-open",
        "admin-console-open",
        "admin-explicit-open"
      );
    }
  }

  function scheduleSync() {
    clearTimeout(state.refreshTimer);
    if (state.refreshIdle && "cancelIdleCallback" in window) {
      cancelIdleCallback(state.refreshIdle);
      state.refreshIdle = null;
    }

    const run = () => {
      state.refreshTimer = null;
      state.refreshIdle = null;
      suppressLegacyAdmin();
      decorate();
    };

    if ("requestIdleCallback" in window) {
      state.refreshIdle = requestIdleCallback(run,{timeout:260});
    } else {
      state.refreshTimer = setTimeout(run,140);
    }
  }

  function sync() {
    suppressLegacyAdmin();
    decorate();
  }

  function init() {
    if (state.initialized) {
      sync();
      return;
    }
    state.initialized = true;
    ensureContextDialog();
    sync();

    document.addEventListener("click",event => {
      const button = event.target.closest(EDIT_BUTTON_SELECTOR);
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openEditor(button);
    },true);

    window.addEventListener("firebase:auth",scheduleSync);
    window.addEventListener("portal:datachange",scheduleSync);
    window.addEventListener("pageshow",scheduleSync);

    const ignoredSelector = [
      ".admin-section-edit-button",
      ".admin-quick-card-edit",
      ".context-editor",
      ".cd-ambient",
      ".cd-section-rail",
      ".bs-hero-atmosphere",
      ".cd-cursor-glow"
    ].join(",");

    state.observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation =>
        [...mutation.addedNodes].some(node => {
          if (!(node instanceof Element)) return false;
          if (node.matches(ignoredSelector)) return false;
          if (node.closest(ignoredSelector)) return false;
          return true;
        })
      );
      if (relevant) scheduleSync();
    });
    state.observer.observe(document.body,{childList:true,subtree:true});
  }

  window.AdminPopup = {init,sync,openAdmin,openEditor,setAdminTab,applySavedEdits};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();
