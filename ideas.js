document.addEventListener("DOMContentLoaded", () => {
  const { state, helpers, openDialog } = window.Portal;

  function render() {
    const statuses = [
      ["recibida","Recibidas"],
      ["analisis","En análisis"],
      ["aceptada","Se tendrán en cuenta"],
      ["resuelta","Resueltas"]
    ];
    document.querySelector("#ideaBoard").innerHTML = statuses.map(([status,label]) => {
      const ideas = state.ideas.filter(i => i.status === status);
      return `<div class="idea-column" role="list" aria-label="${label}">
        <div class="idea-column__head"><strong>${label}</strong><span>${ideas.length}</span></div>
        ${ideas.map(idea => `
          <article class="idea-public-card" data-idea-open="${idea.id}" data-admin-entity="idea" data-entity-id="${idea.id}" role="button" tabindex="0">
            <div><span>${helpers.escape(idea.category)}</span><time>${helpers.escape(idea.created)}</time></div>
            <h3>${helpers.escape(idea.title)}</h3><p>${helpers.escape(idea.description)}</p>
            <footer><span>${helpers.escape(idea.location)}</span><b>♥ ${idea.votes}</b></footer>
          </article>`).join("")}
      </div>`;
    }).join("");

    document.querySelector("#ideaTotal").textContent = state.ideas.length;
    document.querySelector("#ideaAnalysis").textContent = state.ideas.filter(i => i.status === "analisis").length;
    document.querySelector("#ideaAccepted").textContent = state.ideas.filter(i => i.status === "aceptada").length;
    document.querySelector("#ideaResolved").textContent = state.ideas.filter(i => i.status === "resuelta").length;
    window.dispatchEvent(new CustomEvent("portal:rendered"));
  }

  function openIdea(id) {
    const idea = state.ideas.find(i => i.id === id);
    if (!idea) return;
    document.querySelector("#ideaDetailContent").innerHTML = `
      <div class="idea-detail">
        <aside><span class="section-kicker">ESTADO ACTUAL</span><strong>${helpers.statusLabel(idea.status)}</strong><p>${helpers.escape(idea.category)} · ${helpers.escape(idea.location)}</p><p>Presentada por ${helpers.escape(idea.author)}</p></aside>
        <div><span class="section-kicker">IDEA CIUDADANA</span><h2>${helpers.escape(idea.title)}</h2><p>${helpers.escape(idea.description)}</p><div class="institutional-answer"><small>RESPUESTA INSTITUCIONAL</small><p>${helpers.escape(idea.response)}</p></div><button class="button button-primary" data-support-idea="${idea.id}">♥ Apoyar idea (${idea.votes})</button></div>
      </div>`;
    openDialog("ideaDetailDialog");
  }

  render();
  window.addEventListener("portal:datachange", render);

  const requested = new URLSearchParams(location.search).get("id");
  if (requested) setTimeout(() => openIdea(requested), 150);

  document.querySelector("#openIdeaForm").addEventListener("click", () => openDialog("newIdeaDialog"));
  document.querySelector("#newIdeaForm").addEventListener("submit", async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const idea = {
      id:`i${Date.now()}`, title:form.get("title"), author:form.get("author"),
      location:form.get("location"), category:form.get("category"),
      description:form.get("description"), status:"recibida",
      response:"La propuesta fue recibida y está pendiente de revisión institucional.",
      votes:0, created:new Date().toLocaleDateString("es-CO",{day:"numeric",month:"short",year:"numeric"})
    };
    state.ideas.unshift(idea);
    helpers.save({localOnly:true});
    event.target.reset();
    Portal.closeDialog("newIdeaDialog");
    render();
    try {
      await window.FirebasePortal?.createPublicIdea?.(idea);
      helpers.toast("Idea registrada y enviada a Firebase.");
    } catch (error) {
      helpers.toast("La idea quedó guardada en este navegador. Firebase aún no permitió el envío.");
    }
  });

  document.addEventListener("keydown", event => {
    const card = event.target.closest("[data-idea-open]");
    if (card && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openIdea(card.dataset.ideaOpen);
    }
  });

  document.addEventListener("click", event => {
    const open = event.target.closest("[data-idea-open]");
    if (open) openIdea(open.dataset.ideaOpen);
    const support = event.target.closest("[data-support-idea]");
    if (support) {
      const idea = state.ideas.find(i => i.id === support.dataset.supportIdea);
      idea.votes += 1;
      helpers.save();
      render();
      openIdea(idea.id);
      helpers.toast("Apoyo registrado.");
    }
  });
});