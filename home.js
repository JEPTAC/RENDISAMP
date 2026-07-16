document.addEventListener("DOMContentLoaded", () => {
  const { state, helpers } = window.Portal;
  const years = [...state.years].sort((a,b) => Number(a.year)-Number(b.year));

  const selector = document.querySelector("#homeYear");
  selector.innerHTML = years.map(y => `<option value="${y.year}">${y.year}</option>`).join("");

  document.querySelector("#homeExploreForm").addEventListener("submit", event => {
    event.preventDefault();
    const year = Number(selector.value);
    location.href = helpers.yearUrl(year);
  });

  const grid = document.querySelector("#featuredYears");
  grid.innerHTML = years.slice(0,4).map((year,index) => `
    <article class="edition-card reveal visible ${index === 0 ? "edition-card--featured" : ""}" data-admin-entity="year" data-entity-id="${year.year}">
      <div class="edition-card__visual edition-visual-${index%3}${year.cover ? " has-cover-image" : ""}" ${year.cover ? `style="background-image:linear-gradient(rgba(5,34,78,.12),rgba(5,34,78,.3)),url('${year.cover}')"` : ""}>
        <span class="edition-discount">${year.progress}%</span>
        <div class="edition-landscape"><i></i><b></b><u></u></div>
        <small>${helpers.escape(year.status)}</small>
      </div>
      <div class="edition-card__body">
        <div class="edition-card__meta"><span>EDICIÓN ${year.year}</span><b>★ ${year.status === "Publicada" ? "5.0" : "En preparación"}</b></div>
        <h3>Rendición de Cuentas ${year.year}</h3>
        <p>${helpers.escape(year.summary)}</p>
        <div class="edition-card__footer"><span>${year.documents} recursos</span><a href="${helpers.yearUrl(year.year)}">Explorar →</a></div>
      </div>
    </article>`).join("");

  const featureYear = helpers.getYear(2025) || years[0];
  document.querySelector("#homeHeroProgress").textContent = `${featureYear.progress}%`;
  document.querySelector("#homeResourceCount").textContent = state.resources.length;
  document.querySelector("#homeIdeasCount").textContent = state.ideas.length;

  const editorialResources = state.resources.filter(r => r.featured).slice(0,3);
  document.querySelector("#editorialCards").innerHTML = editorialResources.map((item,index) => `
    <article class="deal-card deal-card--${helpers.escape(item.type)} reveal visible"
      data-admin-entity="resource"
      data-entity-id="${item.id}">
      <div class="deal-card__visual deal-${index}${item.image ? " has-cover-image" : ""}"
        ${item.image ? `style="background-image:linear-gradient(rgba(7,46,105,.16),rgba(7,46,105,.28)),url('${item.image}')"` : ""}>
        <span class="document-format" aria-label="Formato ${helpers.escape(helpers.typeLabel(item.type))}">
          ${helpers.typeIcon(item.type)}
        </span>
      </div>
      <div class="deal-card__content">
        <small class="deal-card__meta">
          <b>${item.year}</b>
          <span>${helpers.escape(helpers.typeLabel(item.type))}</span>
        </small>
        <h3>${helpers.escape(item.title)}</h3>
        <p>${helpers.escape(item.meta)}</p>
        <a class="deal-card__action"
          href="recursos.html?q=${encodeURIComponent(item.title)}">
          <span>Abrir recurso</span>
          <b aria-hidden="true">↗</b>
        </a>
      </div>
    </article>`).join("");

  const ideas = state.ideas.slice(0,3);
  document.querySelector("#citizenQuotes").innerHTML = ideas.map(idea => `
    <article class="quote-card reveal visible" data-admin-entity="idea" data-entity-id="${idea.id}">
      <div class="quote-symbol">“</div>
      <p>${helpers.escape(idea.description)}</p>
      <div class="quote-author"><span>${helpers.escape(idea.author).charAt(0)}</span><div><strong>${helpers.escape(idea.author)}</strong><small>${helpers.escape(idea.location)} · ♥ ${idea.votes}</small></div></div>
    </article>`).join("");

  const ideaEntryButton = document.querySelector(".ideas-cta .button");
  if (ideaEntryButton) {
    ideaEntryButton.textContent = "Ingresa o inicia →";
    ideaEntryButton.classList.remove("button-secondary");
    ideaEntryButton.classList.add("button-primary", "ideas-entry-button");
  }

  window.dispatchEvent(new CustomEvent("portal:rendered"));

  document.querySelector("#newsletterForm").addEventListener("submit", event => {
    event.preventDefault();
    event.target.reset();
    helpers.toast("Suscripción registrada en la demostración.");
  });
});