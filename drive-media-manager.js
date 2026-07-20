(() => {
  "use strict";
  if (window.DriveMedia) return;

  const state = {dialog:null, resolver:null, rejecter:null, selected:null, module:"documentos", modulePath:"", publicResource:false, multiple:false};
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);
  const canUseAdminDrive = () => Boolean(window.FirebasePortal?.getStatus?.()?.canWrite || window.Portal?.state?.admin);
  const MODULES = {
    inicio:"inicio", inicioBanners:"inicioBanners", proyectos:"proyectos", proyectosDestacados:"proyectosDestacados",
    proyectosEjecucion:"proyectosEjecucion", proyectosGalerias:"proyectosGalerias", noticias:"noticias",
    noticiasPortadas:"noticiasPortadas", noticiasGalerias:"noticiasGalerias", noticiasAdjuntos:"noticiasAdjuntos",
    mapa:"mapa", mapaLugares:"mapaLugares", mapaAfectaciones:"mapaAfectaciones", mapaRespuestas:"mapaRespuestas",
    mapaParticipacion:"mapaParticipacion", archivoHistorico:"archivoHistorico", documentos:"documentos",
    participacion:"participacion", participacionAdjuntos:"participacionAdjuntos"
  };
  const FALLBACK_IMAGE = "assets/cinematica/parque-himno-1600.webp";

  function drive() {
    if (!window.DrivePortal) throw new Error("Google Drive todavía no está disponible.");
    return window.DrivePortal;
  }

  function resolveUrl(value, fallback = FALLBACK_IMAGE) {
    if (!value) return fallback;
    if (typeof value === "string") return value || fallback;
    return value.displayUrl || value.thumbnailUrl || value.webViewLink || fallback;
  }

  function normalize(value, extra = {}) {
    if (!value) return null;
    if (typeof value === "string") return {displayUrl:value, webViewLink:value, name:"", mimeType:"", ...extra};
    return drive().normalizeReference?.(value, extra) || {...value, ...extra};
  }

  function ensureDialog() {
    if (state.dialog) return state.dialog;
    const dialog = document.createElement("dialog");
    dialog.className = "drive-media-dialog";
    dialog.setAttribute("aria-labelledby", "driveMediaTitle");
    dialog.innerHTML = `
      <form method="dialog" class="drive-media-dialog__shell">
        <header>
          <div><span>GOOGLE DRIVE</span><h2 id="driveMediaTitle">Seleccionar archivo</h2><p id="driveMediaStatus">Conecte Drive para continuar.</p></div>
          <button type="button" class="drive-media-dialog__close" aria-label="Cerrar">×</button>
        </header>
        <div class="drive-media-dialog__preview" id="driveMediaPreview" hidden></div>
        <div class="drive-media-dialog__progress" id="driveMediaProgress" hidden><i></i><span>Preparando…</span></div>
        <div class="drive-media-dialog__actions">
          <button type="button" class="button button-secondary" data-drive-action="connect">Conectar Drive</button>
          <button type="button" class="button button-secondary" data-drive-action="select">Elegir archivo existente</button>
          <label class="button button-primary drive-media-dialog__upload">Cargar archivo nuevo<input id="driveMediaUpload" type="file" hidden></label>
        </div>
        <label class="drive-media-dialog__visibility"><input id="driveMediaPublic" type="checkbox"> Publicar este recurso para visitantes</label>
        <footer>
          <button type="button" class="button button-secondary" data-drive-action="cancel">Cancelar</button>
          <button type="button" class="button button-primary" data-drive-action="confirm" disabled>Usar archivo seleccionado</button>
        </footer>
      </form>`;
    document.body.appendChild(dialog);
    state.dialog = dialog;

    const close = () => finish(null);
    dialog.querySelector(".drive-media-dialog__close").addEventListener("click", close);
    dialog.querySelector('[data-drive-action="cancel"]').addEventListener("click", close);
    dialog.addEventListener("cancel", event => { event.preventDefault(); close(); });
    dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
    dialog.querySelector('[data-drive-action="connect"]').addEventListener("click", async () => {
      try { setStatus("Conectando con Google Drive…"); await drive().connect(); setStatus("Drive conectado. Seleccione o cargue un archivo."); }
      catch (error) { setStatus(drive().friendlyError?.(error) || error.message, true); }
    });
    dialog.querySelector('[data-drive-action="select"]').addEventListener("click", async () => {
      try {
        setStatus("Abriendo el selector de Drive…");
        const files = await drive().chooseFiles({multiple:state.multiple, mimeTypes:dialog.dataset.mimeTypes || ""});
        if (files?.length) selectFiles(files);
        else setStatus("No se seleccionó ningún archivo.");
      } catch (error) { setStatus(drive().friendlyError?.(error) || error.message, true); }
    });
    dialog.querySelector("#driveMediaUpload").addEventListener("change", async event => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        setProgress(0, `Preparando ${file.name}…`);
        const path = state.modulePath || drive().modulePath?.(state.module, state.module) || state.module;
        const uploaded = await drive().uploadFile(file, path, {
          returnMetadata:true,
          makePublic:dialog.querySelector("#driveMediaPublic").checked,
          category:state.module
        });
        selectFile(uploaded);
      } catch (error) { setProgress(null); setStatus(drive().friendlyError?.(error) || error.message, true); }
    });
    dialog.querySelector('[data-drive-action="confirm"]').addEventListener("click", async () => {
      const makePublic = dialog.querySelector("#driveMediaPublic").checked;
      const selected = Array.isArray(state.selected) ? state.selected : [state.selected].filter(Boolean);
      try {
        const normalized = [];
        for (const item of selected) {
          let current = item;
          if (item?.driveFileId && item.visibility !== (makePublic ? "public" : "private")) {
            current = normalize(await drive().setPublicVisibility(item.driveFileId,makePublic),{module:state.module,visibility:makePublic ? "public" : "private"});
          }
          normalized.push({...current,visibility:makePublic ? "public" : "private"});
        }
        finish(state.multiple ? normalized : normalized[0] || null);
      } catch (error) { setStatus(drive().friendlyError?.(error) || error.message,true); }
    });
    window.addEventListener("drive:upload", event => {
      if (!dialog.open) return;
      const detail = event.detail || {};
      if (detail.status === "complete") setProgress(null);
      else setProgress(detail.progress ?? 0, detail.name ? `Cargando ${detail.name} · ${detail.progress || 0}%` : "Cargando…");
    });
    return dialog;
  }

  function setStatus(text, error = false) {
    const node = state.dialog?.querySelector("#driveMediaStatus");
    if (node) { node.textContent = text; node.classList.toggle("is-error", error); }
  }
  function setProgress(value, text = "") {
    const box = state.dialog?.querySelector("#driveMediaProgress");
    if (!box) return;
    box.hidden = value === null;
    if (value !== null) {
      box.querySelector("i").style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
      box.querySelector("span").textContent = text || `${value}%`;
    }
  }
  function selectFiles(files) {
    const list = (Array.isArray(files) ? files : [files]).filter(Boolean).map(file => normalize(file, {
      module:state.module,
      visibility:state.dialog.querySelector("#driveMediaPublic").checked ? "public" : "private"
    }));
    if (!list.length) return;
    state.selected = state.multiple ? list : list[0];
    const preview = state.dialog.querySelector("#driveMediaPreview");
    const first = list[0];
    const isImage = String(first.mimeType || "").startsWith("image/");
    preview.hidden = false;
    preview.innerHTML = `${isImage ? `<img src="${escapeHtml(resolveUrl(first))}" alt="">` : `<span class="drive-media-dialog__file-icon">${escapeHtml((first.name || "ARCHIVO").split(".").pop().slice(0,4).toUpperCase())}</span>`}<div><strong>${escapeHtml(list.length > 1 ? `${list.length} archivos seleccionados` : first.name || "Archivo seleccionado")}</strong><small>${escapeHtml(first.mimeType || "Archivo de Drive")}${list.length > 1 ? ` · ${list.length} elementos` : first.size ? ` · ${Math.ceil(first.size / 1024)} KB` : ""}</small></div>`;
    state.dialog.querySelector('[data-drive-action="confirm"]').disabled = false;
    setStatus(`${list.length > 1 ? `${list.length} archivos listos` : "Archivo listo"} · ${first.visibility === "public" ? "visible para visitantes" : "privado"}.`);
  }

  function selectFile(file) { selectFiles([file]); }
  function finish(value) {
    const dialog = state.dialog;
    if (!dialog?.open) return;
    dialog.close();
    const resolve = state.resolver;
    state.resolver = null; state.rejecter = null; state.selected = null;
    resolve?.(value);
  }

  async function choose(options = {}) {
    if (!canUseAdminDrive()) throw new Error("La cuenta no tiene permiso administrativo para usar Google Drive.");
    state.module = MODULES[options.module] || options.module || "documentos";
    state.modulePath = String(options.modulePath || "").trim();
    state.publicResource = options.publicResource === true || options.makePublic === true;
    state.multiple = options.multiple === true;
    if (options.file) {
      const path = state.modulePath || drive().modulePath?.(state.module,state.module) || state.module;
      const uploaded = await drive().uploadFile(options.file,path,{returnMetadata:true,makePublic:state.publicResource,category:state.module});
      return normalize(uploaded,{module:state.module,visibility:state.publicResource ? "public" : "private"});
    }
    const dialog = ensureDialog();
    state.selected = null;
    const mimeValue = options.mimeTypes || options.accept || "";
    dialog.dataset.mimeTypes = Array.isArray(mimeValue) ? mimeValue.join(",") : String(mimeValue || "");
    dialog.querySelector("#driveMediaTitle").textContent = options.title || "Seleccionar archivo";
    dialog.querySelector("#driveMediaPublic").checked = state.publicResource;
    dialog.querySelector('[data-drive-action="select"]').textContent = state.multiple ? "Elegir archivos existentes" : "Elegir archivo existente";
    dialog.querySelector("#driveMediaPreview").hidden = true;
    dialog.querySelector('[data-drive-action="confirm"]').disabled = true;
    setProgress(null);
    setStatus(drive().getStatus?.().connected ? "Drive conectado. Seleccione o cargue un archivo." : "Conecte Drive para seleccionar o cargar un archivo.");
    if (!dialog.open) dialog.showModal();
    return new Promise((resolve, reject) => { state.resolver = resolve; state.rejecter = reject; });
  }

  function bind(root = document) {
    root.querySelectorAll("[data-drive-media]").forEach(button => {
      if (button.dataset.driveBound === "true") return;
      button.dataset.driveBound = "true";
      button.addEventListener("click", async () => {
        const target = document.querySelector(button.dataset.driveTarget || "");
        try {
          const ref = await choose({
            module:button.dataset.driveModule || "documentos",
            title:button.dataset.driveTitle || "Seleccionar archivo",
            publicResource:button.dataset.drivePublic === "true",
            mimeTypes:button.dataset.driveMime || ""
          });
          if (!ref || !target) return;
          target.value = JSON.stringify(ref);
          target.dispatchEvent(new Event("change", {bubbles:true}));
        } catch (error) { window.Portal?.helpers?.toast?.(error.message); }
      });
    });
  }

  window.DriveMedia = {choose, bind, resolveUrl, normalize, fallbackImage:FALLBACK_IMAGE};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => bind(), {once:true});
  else bind();
  new MutationObserver(mutations => mutations.forEach(m => m.addedNodes.forEach(node => { if (node instanceof Element) bind(node); }))).observe(document.documentElement, {childList:true, subtree:true});
})();
