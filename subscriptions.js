(() => {
  "use strict";
  if (window.PortalSubscriptions) return;
  const STORAGE_KEY = "sp_subscription_receipts_v1";

  function receiptStore() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveReceipt(email, receipt) {
    const store = receiptStore();
    store[email.toLowerCase()] = receipt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  function statusNode(form) {
    let node = form.querySelector(".subscription-status");
    if (!node) {
      node = document.createElement("p");
      node.className = "subscription-status";
      node.setAttribute("aria-live", "polite");
      form.appendChild(node);
    }
    return node;
  }
  function ensureConsent(form) {
    if (form.querySelector('[name="subscriptionConsent"]')) return;
    const label = document.createElement("label");
    label.className = "subscription-consent";
    label.innerHTML = `<input type="checkbox" name="subscriptionConsent" required><span>Acepto el tratamiento de mis datos para recibir las actualizaciones seleccionadas. Puedo cancelar la suscripción posteriormente.</span>`;
    form.appendChild(label);
  }
  function getEmailInput(form) {
    return form.querySelector('input[type="email"],input[name="email"]');
  }
  async function submit(form) {
    const emailInput = getEmailInput(form);
    const status = statusNode(form);
    const button = form.querySelector('button[type="submit"],input[type="submit"]');
    const email = String(emailInput?.value || "").trim().toLowerCase();
    const consent = Boolean(form.querySelector('[name="subscriptionConsent"]')?.checked);
    if (!emailInput?.checkValidity()) { emailInput?.reportValidity(); return; }
    if (!consent) {
      status.textContent = "Debe aceptar el tratamiento de datos.";
      status.className = "subscription-status is-error";
      form.querySelector('[name="subscriptionConsent"]')?.focus();
      return;
    }
    if (!window.FirebasePortal?.upsertSubscription) {
      status.textContent = "Firebase todavía está iniciando. Intente nuevamente en un momento.";
      status.className = "subscription-status is-error";
      return;
    }
    if (button) button.disabled = true;
    form.classList.add("portal-local-loading");
    status.textContent = "Registrando suscripción…";
    status.className = "subscription-status";
    try {
      const preferences = form.dataset.preferences
        ? form.dataset.preferences.split(",").map(item => item.trim()).filter(Boolean)
        : [document.body.dataset.page || "general"];
      const previousReceipt = receiptStore()[email] || {};
      const receipt = await window.FirebasePortal.upsertSubscription({
        email, consent:true, preferences,
        unsubscribeToken:previousReceipt.unsubscribeToken || "",
        channels:{email:true, web:false, internal:Boolean(window.FirebasePortal.getStatus?.()?.user)},
        source:location.pathname.split("/").pop() || "index.html"
      });
      saveReceipt(email, receipt);
      form.reset();
      status.textContent = "Suscripción registrada correctamente. No se realizaron envíos durante esta prueba.";
      status.className = "subscription-status is-success";
    } catch (error) {
      status.textContent = window.FirebasePortal?.friendlyError?.(error) || error.message || "No fue posible registrar la suscripción.";
      status.className = "subscription-status is-error";
    } finally {
      if (button) button.disabled = false;
      form.classList.remove("portal-local-loading");
    }
  }
  async function cancel(email) {
    const receipt = receiptStore()[String(email || "").toLowerCase()] || {};
    return window.FirebasePortal.cancelSubscription({email, unsubscribeToken:receipt.unsubscribeToken || ""});
  }
  function bind(root = document) {
    root.querySelectorAll("#newsletterForm,#newsSubscriptionForm,#yearNewsletter,[data-subscription-form]").forEach(form => {
      if (form.dataset.subscriptionBound === "true") return;
      form.dataset.subscriptionBound = "true";
      ensureConsent(form);
    });
  }
  document.addEventListener("submit", event => {
    const form = event.target.closest?.("#newsletterForm,#newsSubscriptionForm,#yearNewsletter,[data-subscription-form]");
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submit(form);
  }, true);
  window.PortalSubscriptions = {bind, submit, cancel};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => bind(), {once:true});
  else bind();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) bind(node); }))).observe(document.documentElement,{childList:true,subtree:true});
})();
