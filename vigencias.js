document.addEventListener("DOMContentLoaded", () => {
  const { state, helpers } = window.Portal;
  const years = [...state.years].sort((a,b)=>a.year-b.year);
  document.querySelector("#archiveCount").textContent = years.length;
  document.querySelector("#archiveGrid").innerHTML = years.map((year,index) => `
    <article class="archive-card reveal visible" data-admin-entity="year" data-entity-id="${year.year}">
      <div class="archive-card__visual archive-${index%3}${year.cover ? " has-cover-image" : ""}" ${year.cover ? `style="background-image:linear-gradient(rgba(6,43,101,.1),rgba(6,43,101,.25)),url('${year.cover}')"` : ""}><span>${year.progress}%</span><div class="mini-scene"><i></i><b></b><u></u></div></div>
      <div class="archive-card__body"><div><small>${helpers.escape(year.status)}</small><strong>${year.year}</strong></div><h2>Rendición de Cuentas ${year.year}</h2><p>${helpers.escape(year.summary)}</p><ul><li>${year.documents} documentos</li><li>${year.videos} videos</li><li>${year.commitments} compromisos</li></ul><a class="button button-primary" href="${helpers.yearUrl(year.year)}">Abrir edición</a></div>
    </article>`).join("");
  window.dispatchEvent(new CustomEvent("portal:rendered"));
});