(() => {
  const state = { rows:[], selected:null, busy:false };
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  const isSuper = () => Boolean(window.FirebasePortal?.isSuperAdmin?.());

  function ensurePanel() {
    const sidebar = document.querySelector("#adminPanel .admin-sidebar");
    const main = document.querySelector("#adminPanel .admin-main");
    if (!sidebar || !main) return false;

    let button = sidebar.querySelector('[data-admin-tab="subscriptions"]');
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "admin-tab-button subscriptions-admin-tab";
      button.dataset.adminTab = "subscriptions";
      button.textContent = "Suscripciones";
      const before = sidebar.querySelector('[data-admin-tab="backup"]');
      sidebar.insertBefore(button,before || sidebar.querySelector(".admin-signout"));
    }

    let panel = main.querySelector('[data-admin-panel="subscriptions"]');
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "admin-tab subscriptions-admin-panel";
      panel.dataset.adminPanel = "subscriptions";
      panel.innerHTML = `
        <div class="admin-card subscriptions-admin-card">
          <div class="subscriptions-admin-head">
            <div>
              <span>SUSCRIPCIONES</span>
              <h3>Preferencias y estados</h3>
              <p>Consulta restringida al superadministrador. Esta herramienta no realiza envíos.</p>
            </div>
            <button type="button" class="button button-secondary" data-subscription-refresh>Actualizar lista</button>
          </div>
          <div class="subscriptions-admin-toolbar">
            <label>Buscar<input type="search" data-subscription-search placeholder="Correo o estado"></label>
            <label>Estado<select data-subscription-filter><option value="">Todos</option><option value="active">Activas</option><option value="paused">Pausadas</option><option value="cancelled">Canceladas</option></select></label>
          </div>
          <p class="subscriptions-admin-status" data-subscription-status aria-live="polite"></p>
          <div class="subscriptions-admin-list" data-subscription-list></div>
        </div>`;
      const backup = main.querySelector('[data-admin-panel="backup"]');
      main.insertBefore(panel,backup || null);
    }

    button.hidden = !isSuper();
    panel.hidden = !isSuper();
    return true;
  }

  function formatDate(value) {
    const raw = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : value ? new Date(value) : null);
    return raw && !Number.isNaN(raw.getTime()) ? new Intl.DateTimeFormat("es-CO",{dateStyle:"medium",timeStyle:"short"}).format(raw) : "Sin fecha";
  }

  function filteredRows() {
    const search = String(document.querySelector("[data-subscription-search]")?.value || "").trim().toLowerCase();
    const status = String(document.querySelector("[data-subscription-filter]")?.value || "");
    return state.rows.filter(row => {
      const matchesStatus = !status || row.status === status;
      const haystack = `${row.email || ""} ${row.status || ""} ${(row.preferences || []).join(" ")}`.toLowerCase();
      return matchesStatus && (!search || haystack.includes(search));
    });
  }

  function render() {
    const list = document.querySelector("[data-subscription-list]");
    if (!list) return;
    const rows = filteredRows();
    list.innerHTML = rows.length ? rows.map(row => `
      <article class="subscription-admin-row" data-subscription-id="${escapeHtml(row.id)}">
        <div>
          <strong>${escapeHtml(row.email || "Correo no disponible")}</strong>
          <small>${escapeHtml(row.status || "active")} · ${escapeHtml(formatDate(row.updatedAt || row.createdAt))}</small>
          <span>${row.channels?.email !== false ? "Correo" : ""}${row.channels?.web ? " · Web" : ""}${row.channels?.internal ? " · Interna" : ""}</span>
        </div>
        <div class="subscription-admin-actions">
          <button type="button" class="button button-secondary" data-subscription-edit="${escapeHtml(row.id)}">Editar</button>
        </div>
      </article>`).join("") : '<p class="admin-empty">No hay suscripciones que coincidan con el filtro.</p>';
  }

  function ensureEditor() {
    let dialog = document.querySelector("#subscriptionAdminDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "subscriptionAdminDialog";
    dialog.className = "dialog subscription-admin-dialog";
    dialog.setAttribute("aria-labelledby","subscriptionAdminTitle");
    dialog.innerHTML = `
      <button class="dialog-close" type="button" data-subscription-close aria-label="Cerrar">×</button>
      <span class="section-kicker">SUSCRIPCIÓN</span>
      <h2 id="subscriptionAdminTitle">Actualizar suscripción</h2>
      <form data-subscription-form class="dialog-form">
        <input type="hidden" name="id">
        <label>Correo<input name="email" readonly></label>
        <label>Estado<select name="status"><option value="active">Activa</option><option value="paused">Pausada</option><option value="cancelled">Cancelada</option></select></label>
        <fieldset><legend>Canales</legend>
          <label class="check-row"><input type="checkbox" name="channelEmail"> Correo electrónico</label>
          <label class="check-row"><input type="checkbox" name="channelWeb"> Notificación web</label>
          <label class="check-row"><input type="checkbox" name="channelInternal"> Notificación interna</label>
        </fieldset>
        <label>Preferencias (separadas por coma)<input name="preferences" placeholder="Noticias, proyectos, vigencias"></label>
        <p class="form-status" data-subscription-editor-status aria-live="polite"></p>
        <div class="dialog-actions">
          <button type="submit" class="button button-primary">Guardar cambios</button>
          <button type="button" class="button button-secondary" data-subscription-close>Cancelar</button>
          <button type="button" class="button button-danger" data-subscription-delete>Eliminar referencia</button>
        </div>
      </form>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function openEditor(id) {
    const row = state.rows.find(item => item.id === id);
    if (!row) return;
    state.selected = row;
    const dialog = ensureEditor();
    const form = dialog.querySelector("[data-subscription-form]");
    form.elements.id.value = row.id;
    form.elements.email.value = row.email || "";
    form.elements.status.value = row.status || "active";
    form.elements.channelEmail.checked = row.channels?.email !== false;
    form.elements.channelWeb.checked = Boolean(row.channels?.web);
    form.elements.channelInternal.checked = Boolean(row.channels?.internal);
    form.elements.preferences.value = Array.isArray(row.preferences) ? row.preferences.join(", ") : "";
    dialog.showModal();
    form.elements.status.focus();
  }

  async function load() {
    if (!isSuper() || state.busy) return;
    const status = document.querySelector("[data-subscription-status]");
    state.busy = true;
    if (status) status.textContent = "Consultando suscripciones…";
    try {
      state.rows = await window.FirebasePortal.listSubscriptions();
      render();
      if (status) status.textContent = `${state.rows.length} suscripción(es). No se realizan envíos desde este panel.`;
    } catch (error) {
      if (status) status.textContent = window.FirebasePortal?.friendlyError?.(error) || error.message;
    } finally {
      state.busy = false;
    }
  }

  async function save(form) {
    if (state.busy) return;
    const status = form.querySelector("[data-subscription-editor-status]");
    state.busy = true;
    form.querySelector('button[type="submit"]').disabled = true;
    if (status) status.textContent = "Guardando…";
    try {
      const id = form.elements.id.value;
      await window.FirebasePortal.updateSubscriptionAdmin(id,{
        status:form.elements.status.value,
        channels:{
          email:form.elements.channelEmail.checked,
          web:form.elements.channelWeb.checked,
          internal:form.elements.channelInternal.checked
        },
        preferences:String(form.elements.preferences.value || "").split(",").map(item => item.trim()).filter(Boolean)
      });
      if (status) status.textContent = "Cambios guardados correctamente.";
      await load();
      setTimeout(() => form.closest("dialog")?.close(),350);
    } catch (error) {
      if (status) status.textContent = window.FirebasePortal?.friendlyError?.(error) || error.message;
    } finally {
      state.busy = false;
      form.querySelector('button[type="submit"]').disabled = false;
    }
  }

  async function remove(form) {
    if (state.busy || !confirm("¿Eliminar definitivamente esta referencia de suscripción?")) return;
    const status = form.querySelector("[data-subscription-editor-status]");
    state.busy = true;
    if (status) status.textContent = "Eliminando…";
    try {
      await window.FirebasePortal.deleteSubscriptionAdmin(form.elements.id.value);
      form.closest("dialog")?.close();
      await load();
    } catch (error) {
      if (status) status.textContent = window.FirebasePortal?.friendlyError?.(error) || error.message;
    } finally {
      state.busy = false;
    }
  }

  document.addEventListener("click",event => {
    const tab = event.target.closest('[data-admin-tab="subscriptions"]');
    if (tab) {
      const title = document.querySelector("#adminTitle");
      queueMicrotask(() => { if (title) title.textContent = "Suscripciones"; });
      load();
    }
    if (event.target.closest("[data-subscription-refresh]")) load();
    const edit = event.target.closest("[data-subscription-edit]");
    if (edit) openEditor(edit.dataset.subscriptionEdit);
    if (event.target.closest("[data-subscription-close]")) event.target.closest("dialog")?.close();
    const removeButton = event.target.closest("[data-subscription-delete]");
    if (removeButton) remove(removeButton.closest("form"));
  });

  document.addEventListener("input",event => {
    if (event.target.matches("[data-subscription-search],[data-subscription-filter]")) render();
  });

  document.addEventListener("submit",event => {
    const form = event.target.closest("[data-subscription-form]");
    if (!form) return;
    event.preventDefault();
    save(form);
  });

  window.addEventListener("firebase:auth",() => {
    ensurePanel();
    if (!isSuper()) {
      const panel = document.querySelector('[data-admin-panel="subscriptions"]');
      if (panel?.classList.contains("active")) document.querySelector('[data-admin-tab="appearance"]')?.click();
    }
  });

  const boot = () => {
    ensurePanel();
    ensureEditor();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded",boot,{once:true}) : boot();
})();
