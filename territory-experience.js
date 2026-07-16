(() => {
  "use strict";

  const STORE_KEY = "sp_territory_experience_v1";
  const BUILD = "11.20-territorio-sin-historia-publica";
  const HOME_PATHS = new Set(["","index.html","/"]);
  const CENTER = [3.99557,-76.22805];

  const MODES = {
    territory:{
      label:"Territorio",
      short:"Localidades",
      icon:"◎",
      description:"Cabecera, barrios urbanos, corregimientos y veredas de referencia."
    },
    impact:{
      label:"Afectaciones",
      short:"Afectaciones",
      icon:"!",
      description:"Eventos y población afectada cargados con soporte institucional."
    },
    work:{
      label:"Obras y respuesta",
      short:"Obras",
      icon:"↗",
      description:"Intervenciones, respuestas, avances y evidencias."
    },
    participation:{
      label:"Participación",
      short:"Participación",
      icon:"✦",
      description:"Ideas, encuentros y ejercicios de control social."
    }
  };

  /*
   * Coordenadas de referencia cartográfica abierta. No representan polígonos
   * oficiales ni límites prediales. Guaqueros se conserva en el inventario
   * territorial, pero queda pendiente de coordenada oficial.
   */
  const TERRITORY = [
    {
      id:"cabecera",
      name:"Cabecera municipal",
      kind:"Casco urbano",
      lat:3.99557,
      lng:-76.22805,
      altitude:988,
      veredas:[],
      barrios:[
        "El Centro",
        "Jorge Herrera",
        "El Espinal",
        "El Porvenir",
        "Villa del Lago",
        "Villas de Belén",
        "La Esperanza",
        "Villa Juliana",
        "Avenida La Planta",
        "El Jardín",
        "La Campiña"
      ],
      note:"Centro urbano de San Pedro con once barrios y sectores georreferenciados."
    },
    {
      id:"angosturas",
      name:"Angosturas",
      kind:"Corregimiento",
      lat:3.97989,
      lng:-76.18611,
      altitude:1262,
      veredas:["La China","Positos"],
      note:"Zona rural de montaña."
    },
    {
      id:"buenos-aires",
      name:"Buenos Aires",
      kind:"Corregimiento",
      lat:3.92892,
      lng:-76.17372,
      altitude:2060,
      veredas:["El Edén","La Pradera"],
      note:"Localidad rural de mayor altitud."
    },
    {
      id:"los-chancos",
      name:"Los Chancos",
      kind:"Corregimiento",
      lat:4.02131,
      lng:-76.21679,
      altitude:990,
      veredas:["Belén","Guadualejo","Las Chambas"],
      note:"Corredor rural cercano a la cabecera."
    },
    {
      id:"naranjal",
      name:"Naranjal",
      kind:"Corregimiento",
      lat:3.97449,
      lng:-76.15450,
      altitude:1526,
      veredas:["La Arenosa"],
      note:"Zona de ladera oriental."
    },
    {
      id:"presidente",
      name:"Presidente",
      kind:"Corregimiento",
      lat:3.96125,
      lng:-76.26298,
      altitude:991,
      veredas:["Arenales","El Hormiguero","Pantanillo","La Ventura"],
      note:"Localidad de referencia próxima al límite municipal."
    },
    {
      id:"san-jose",
      name:"San José",
      kind:"Corregimiento",
      lat:4.03534,
      lng:-76.26846,
      altitude:942,
      veredas:["El Chircal"],
      note:"Sector rural occidental."
    },
    {
      id:"todos-los-santos",
      name:"Todos los Santos",
      kind:"Corregimiento",
      lat:3.98088,
      lng:-76.23919,
      altitude:976,
      veredas:["La Puente","Montegrande","Monterredondo"],
      note:"También identificado como Todos Santos."
    },
    {
      id:"guayabal",
      name:"Guayabal",
      kind:"Corregimiento",
      lat:4.00635,
      lng:-76.23503,
      altitude:967,
      veredas:[],
      note:"Localidad cercana al casco urbano."
    },
    {
      id:"la-esmeralda",
      name:"La Esmeralda",
      kind:"Corregimiento",
      lat:3.94417,
      lng:-76.13111,
      altitude:1730,
      veredas:["Playa Rica","La Altania"],
      note:"También registrada como Esmeraldas en cartografía abierta."
    },
    {
      id:"la-siria",
      name:"La Siria",
      kind:"Corregimiento",
      lat:3.94731,
      lng:-76.14853,
      altitude:1715,
      veredas:[],
      note:"Zona montañosa oriental."
    },
    {
      id:"guaqueros",
      name:"Guaqueros",
      kind:"Corregimiento",
      lat:null,
      lng:null,
      altitude:null,
      veredas:["Los Mates"],
      note:"Pendiente de georreferenciación oficial en el portal."
    },
    {
      id:"platanares",
      name:"Platanares",
      kind:"Corregimiento",
      lat:3.96021,
      lng:-76.13962,
      altitude:1412,
      veredas:[],
      note:"Localidad rural oriental."
    },
    {
      id:"pavas",
      name:"Pavas",
      kind:"Corregimiento",
      lat:3.96337,
      lng:-76.20150,
      altitude:1291,
      veredas:[],
      note:"Zona de ladera próxima a Angosturas."
    }
  ];

  /*
   * Barrios documentados en fuentes municipales y territoriales.
   * Las coordenadas corresponden a centros urbanos de referencia para
   * navegación y deben sustituirse por centroides o polígonos oficiales
   * cuando Planeación Municipal suministre la cartografía.
   */
  const URBAN_NEIGHBORHOODS = [
    {
      id:"barrio-el-centro",
      name:"El Centro",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:3.99555,
      lng:-76.22810,
      sector:"Cabecera municipal",
      note:"Sector central donde se ubican la Alcaldía y el parque principal.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-jorge-herrera",
      name:"Jorge Herrera",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:3.99820,
      lng:-76.23105,
      sector:"Cabecera municipal",
      note:"Barrio urbano ubicado hacia el noroccidente del centro tradicional.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-el-espinal",
      name:"El Espinal",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:3.99155,
      lng:-76.23185,
      sector:"Cabecera municipal",
      note:"Barrio urbano ubicado al suroccidente del centro.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-el-porvenir",
      name:"El Porvenir",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:3.99075,
      lng:-76.22615,
      sector:"Cabecera municipal",
      note:"Sector residencial ubicado al sur de la cabecera.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-villa-del-lago",
      name:"Villa del Lago",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:4.00055,
      lng:-76.22395,
      sector:"Cabecera municipal",
      note:"Sector residencial ubicado al nororiente del casco urbano.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-villas-de-belen",
      name:"Villas de Belén",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:4.00125,
      lng:-76.22735,
      sector:"Cabecera municipal",
      note:"Sector residencial ubicado al norte del centro.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-la-esperanza",
      name:"La Esperanza",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:4.00265,
      lng:-76.23020,
      sector:"Cabecera municipal",
      note:"Sector urbano ubicado hacia el noroccidente de la cabecera.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-villa-juliana",
      name:"Villa Juliana",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:3.98865,
      lng:-76.22720,
      sector:"Cabecera municipal",
      note:"Sector residencial ubicado al sur del casco urbano.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-avenida-la-planta",
      name:"Avenida La Planta",
      kind:"Barrio o sector urbano",
      category:"neighborhood",
      lat:3.99355,
      lng:-76.22295,
      sector:"Cabecera municipal",
      note:"Sector urbano asociado al corredor de la antigua salida oriental.",
      referenceNote:"Centro de referencia; validar denominación y límite oficial."
    },
    {
      id:"barrio-el-jardin",
      name:"El Jardín",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:3.99755,
      lng:-76.22245,
      sector:"Cabecera municipal",
      note:"Sector urbano ubicado hacia el oriente del centro.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    },
    {
      id:"barrio-la-campina",
      name:"La Campiña",
      kind:"Barrio urbano",
      category:"neighborhood",
      lat:4.00335,
      lng:-76.22525,
      sector:"Cabecera municipal",
      note:"Sector urbano ubicado al norte de la cabecera.",
      referenceNote:"Centro de referencia; no representa límite oficial."
    }
  ];

  const BASEMAP_LABELS = Object.freeze({
    plano:"Plano",
    relieve:"Relieve",
    satelite:"Satélite",
    hibrido:"Híbrido"
  });

  const state = {
    initialized:false,
    section:null,
    map:null,
    mapReady:false,
    leafletPromise:null,
    markerLayer:null,
    neighborhoodLayer:null,
    radiusLayer:null,
    activeMode:"territory",
    selectedId:null,
    mapObserver:null,
    mapClick:null,
    adminDialog:null,
    editingRecordId:null,
    records:[],
    localFallback:null,
    baseLayers:null,
    activeBaseLayer:null,
    activeBaseName:"plano",
    baseLayerReadyTimer:0,
    zoomTimer:0
  };

  const portal = () => window.Portal;

  function isHome() {
    const bodyPage = document.body?.dataset?.page;
    if (bodyPage === "home") return true;
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    return HOME_PATHS.has(file) || document.body?.classList.contains("page-home");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g,char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    })[char]);
  }

  function slug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g,"-")
      .replace(/^-|-$/g,"");
  }

  function isAdmin() {
    const adminKey = portal()?.KEYS?.admin || "sp_v6_admin";
    return Boolean(
      portal()?.state?.admin ||
      sessionStorage.getItem(adminKey) === "1" ||
      window.FirebasePortal?.getStatus?.()?.canWrite
    );
  }

  function defaultStore() {
    return {
      version:3,
      updatedAt:"",
      records:[]
    };
  }

  function readLocalStore() {
    if (state.localFallback) return state.localFallback;
    try {
      state.localFallback = {
        ...defaultStore(),
        ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
      };
    } catch {
      state.localFallback = defaultStore();
    }
    return state.localFallback;
  }

  function getStore() {
    const content = portal()?.state?.content;
    if (content) {
      if (
        !content.territoryExperience ||
        typeof content.territoryExperience !== "object"
      ) {
        content.territoryExperience = defaultStore();
      }
      if (!Array.isArray(content.territoryExperience.records)) {
        content.territoryExperience.records = [];
      }
      return content.territoryExperience;
    }
    return readLocalStore();
  }

  function persistStore() {
    const store = getStore();
    store.updatedAt = new Date().toISOString();

    if (portal()?.state?.content) {
      portal()?.helpers?.save?.();
      window.dispatchEvent(new CustomEvent("portal:datachange"));
    } else {
      localStorage.setItem(STORE_KEY,JSON.stringify(store));
    }
  }

  function refreshRecords() {
    state.records = getStore().records
      .filter(record => record && typeof record === "object")
      .map(record => ({
        id:record.id || `territory-${crypto.randomUUID?.() || Date.now()}`,
        category:["impact","work","participation"].includes(record.category)
          ? record.category
          : "impact",
        name:String(record.name || "Punto territorial"),
        sector:String(record.sector || ""),
        lat:Number(record.lat),
        lng:Number(record.lng),
        people:Number(record.people) || 0,
        status:String(record.status || "En seguimiento"),
        date:String(record.date || ""),
        description:String(record.description || ""),
        evidence:String(record.evidence || ""),
        updatedAt:String(record.updatedAt || "")
      }))
      .filter(record => Number.isFinite(record.lat) && Number.isFinite(record.lng));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("es-CO").format(Number(value) || 0);
  }

  function totalPeople() {
    return state.records.reduce((sum,item) => sum + (Number(item.people) || 0),0);
  }

  function createFallbackNodes() {
    const positioned = TERRITORY.filter(item => Number.isFinite(item.lat));
    const lats = positioned.map(item => item.lat);
    const lngs = positioned.map(item => item.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return positioned.map((item,index) => {
      const x = ((item.lng - minLng) / Math.max(maxLng - minLng,.001)) * 76 + 12;
      const y = (1 - (item.lat - minLat) / Math.max(maxLat - minLat,.001)) * 72 + 14;
      return `
        <button
          class="territory-fallback-node"
          type="button"
          data-territory-id="${escapeHtml(item.id)}"
          style="--node-x:${x.toFixed(2)}%;--node-y:${y.toFixed(2)}%;--node-delay:${index * 55}ms"
          aria-label="Ubicar ${escapeHtml(item.name)}"
        >
          <i></i>
          <span>${escapeHtml(item.name)}</span>
        </button>`;
    }).join("");
  }

  function createMapSection() {
    if (document.querySelector("#territorioVivo")) {
      state.section = document.querySelector("#territorioVivo");
      return;
    }

    const section = document.createElement("section");
    section.id = "territorioVivo";
    section.className =
      "home-section home-section--territory territory-experience-section";
    section.dataset.territoryExperience = "true";
    section.innerHTML = `
      <div class="site-shell territory-shell">
        <div class="home-section__head territory-section-head">
          <div>
            <span>TERRITORIO VIVO</span>
            <h2>San Pedro, visto por capas</h2>
          </div>
          <p>
            Explore el municipio, acerque el mapa y conecte cada lugar con
            afectaciones, respuestas, obras, evidencias y participación.
          </p>
        </div>

        <div class="territory-stage">
          <aside class="territory-panel">
            <div class="territory-mode-switch" role="tablist" aria-label="Capas del mapa">
              ${Object.entries(MODES).map(([key,mode],index) => `
                <button
                  type="button"
                  class="${index === 0 ? "active" : ""}"
                  data-territory-mode="${key}"
                  role="tab"
                  aria-selected="${index === 0 ? "true" : "false"}"
                >
                  <i aria-hidden="true">${mode.icon}</i>
                  <span>${mode.short}</span>
                </button>`).join("")}
            </div>

            <div class="territory-panel-copy">
              <span id="territoryModeLabel">CAPA TERRITORIAL</span>
              <h3 id="territoryModeTitle">${MODES.territory.label}</h3>
              <p id="territoryModeDescription">${MODES.territory.description}</p>
            </div>

            <div class="territory-metrics" aria-label="Resumen del mapa">
              <article>
                <small>Localidades</small>
                <strong id="territoryMetricLocations">${TERRITORY.filter(item => Number.isFinite(item.lat)).length}/${TERRITORY.length}</strong>
              </article>
              <article>
                <small>Barrios cabecera</small>
                <strong id="territoryMetricNeighborhoods">${URBAN_NEIGHBORHOODS.length}</strong>
              </article>
              <article>
                <small>Registros</small>
                <strong id="territoryMetricRecords">0</strong>
              </article>
              <article>
                <small>Personas afectadas</small>
                <strong id="territoryMetricPopulation">Sin dato</strong>
              </article>
            </div>

            <label class="territory-search">
              <span>Buscar territorio o registro</span>
              <input
                id="territorySearch"
                type="search"
                placeholder="Barrio, corregimiento, vereda o sector"
                autocomplete="off"
              >
            </label>

            <div class="territory-result-list" id="territoryResultList"></div>

            <div class="territory-detail-card" id="territoryDetailCard" aria-live="polite">
              <span>SELECCIONE UN PUNTO</span>
              <h3 id="territoryDetailTitle">Explore el territorio</h3>
              <p id="territoryDetailDescription">
                Use los filtros, el buscador o los puntos del mapa para consultar información.
              </p>
              <div id="territoryDetailMeta"></div>
            </div>
          </aside>

          <div class="territory-map-shell">
            <div class="territory-map-toolbar">
              <div>
                <span class="territory-live-dot" aria-hidden="true"></span>
                <strong>Mapa territorial interactivo</strong>
              </div>
              <div class="territory-map-view-switch" role="group" aria-label="Vista cartográfica">
                ${Object.entries(BASEMAP_LABELS).map(([key,label],index) => `
                  <button
                    type="button"
                    class="${index === 0 ? "active" : ""}"
                    data-territory-basemap="${key}"
                    aria-pressed="${index === 0 ? "true" : "false"}"
                  >
                    <span>${label}</span>
                  </button>`).join("")}
              </div>
              <div class="territory-toolbar-actions">
                <button type="button" class="territory-map-action" id="territoryResetMap">
                  Vista general
                </button>
                <button type="button" class="territory-map-action territory-admin-button" id="territoryAdminButton" hidden>
                  Gestionar datos
                </button>
              </div>
            </div>

            <div
              class="territory-map"
              id="territoryMap"
              role="application"
              aria-label="Mapa interactivo de San Pedro, Valle del Cauca"
            ></div>
            <div class="territory-map-zoom-orbit" aria-hidden="true">
              <i></i><i></i><i></i>
            </div>
            <div class="territory-camera-status" aria-live="polite">
              <i></i>
              <span id="territoryCameraStatus">Vista general preparada</span>
            </div>

            <div class="territory-map-fallback" id="territoryMapFallback">
              <div class="territory-real-map-loading">
                <img
                  src="ui-gifs/loading-spinner.gif"
                  alt=""
                  decoding="async"
                >
                <strong>Cargando mapa real</strong>
                <small>
                  Preparando calles, carreras, corregimientos y vista satelital.
                </small>
                <button type="button" id="territoryRetryMap" hidden>
                  Reintentar
                </button>
              </div>
            </div>

            <div class="territory-coordinate-bar">
              <span id="territoryCoordinateText">Centro: 3.99557, -76.22805</span>
              <small>
                Cartografía abierta y vistas satelitales de referencia.
                Los límites y nombres deben validarse con información oficial.
              </small>
            </div>

            <div class="territory-legend" aria-label="Leyenda">
              <span><i class="is-territory"></i> Territorio</span>
              <span><i class="is-impact"></i> Afectación</span>
              <span><i class="is-work"></i> Obra o respuesta</span>
              <span><i class="is-participation"></i> Participación</span>
            </div>
          </div>
        </div>

        <div class="territory-focus-grid" id="territoryFocusGrid">
          ${Object.entries(MODES).map(([key,mode],index) => `
            <article
              class="territory-focus-card ${index === 0 ? "active" : ""}"
              data-territory-card="${key}"
              tabindex="0"
              role="button"
              aria-label="Activar capa ${escapeHtml(mode.label)}"
            >
              <div class="territory-card-index">0${index + 1}</div>
              <span>${escapeHtml(mode.label).toUpperCase()}</span>
              <h3>${escapeHtml([
                "Conozca cada lugar",
                "Ubique dónde ocurrió",
                "Siga la respuesta",
                "Vea cómo participa la comunidad"
              ][index])}</h3>
              <p>${escapeHtml(mode.description)}</p>
              <button type="button" tabindex="-1">
                Abrir capa <b aria-hidden="true">↗</b>
              </button>
            </article>`).join("")}
        </div>
      </div>
    `;

    const anchor =
      document.querySelector(".explorer-bar") ||
      document.querySelector(".home-hero") ||
      document.querySelector("main > section");

    if (anchor) {
      anchor.insertAdjacentElement("afterend",section);
    } else {
      document.querySelector("main")?.append(section);
    }

    state.section = section;
  }

  function layerRecords(mode = state.activeMode) {
    if (mode === "territory") {
      return [
        TERRITORY[0],
        ...URBAN_NEIGHBORHOODS,
        ...TERRITORY.slice(1)
      ];
    }
    return state.records.filter(record => record.category === mode);
  }

  function setMode(mode,{focusMap=false} = {}) {
    if (!MODES[mode]) return;
    state.activeMode = mode;
    state.selectedId = null;

    state.section?.querySelectorAll("[data-territory-mode]").forEach(button => {
      const active = button.dataset.territoryMode === mode;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
    });

    state.section?.querySelectorAll("[data-territory-card]").forEach(card => {
      card.classList.toggle("active",card.dataset.territoryCard === mode);
    });

    const modeData = MODES[mode];
    const label = state.section?.querySelector("#territoryModeLabel");
    const title = state.section?.querySelector("#territoryModeTitle");
    const description = state.section?.querySelector("#territoryModeDescription");
    if (label) label.textContent = `CAPA · ${modeData.short.toUpperCase()}`;
    if (title) title.textContent = modeData.label;
    if (description) description.textContent = modeData.description;

    renderMetrics();
    renderResultList();
    renderMapLayers();

    if (focusMap) {
      state.section?.querySelector(".territory-map-shell")
        ?.scrollIntoView({behavior:"smooth",block:"center"});
    }
  }

  function renderMetrics() {
    const georeferenced = TERRITORY.filter(item => Number.isFinite(item.lat)).length;
    const records = state.records.length;
    const people = totalPeople();

    const locationsNode = state.section?.querySelector("#territoryMetricLocations");
    const neighborhoodsNode = state.section?.querySelector(
      "#territoryMetricNeighborhoods"
    );
    const recordsNode = state.section?.querySelector("#territoryMetricRecords");
    const peopleNode = state.section?.querySelector("#territoryMetricPopulation");

    if (locationsNode) {
      locationsNode.textContent = `${georeferenced}/${TERRITORY.length}`;
    }
    if (neighborhoodsNode) {
      neighborhoodsNode.textContent = formatNumber(
        URBAN_NEIGHBORHOODS.length
      );
    }
    if (recordsNode) {
      recordsNode.textContent = state.activeMode === "territory"
        ? formatNumber(records)
        : formatNumber(layerRecords().length);
    }
    if (peopleNode) {
      peopleNode.textContent = people > 0
        ? formatNumber(people)
        : "Sin dato";
    }
  }

  function searchMatches(item,query) {
    if (!query) return true;
    const haystack = [
      item.name,
      item.kind,
      item.sector,
      item.status,
      item.description,
      item.referenceNote,
      ...(item.veredas || []),
      ...(item.barrios || [])
    ].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    return haystack.includes(normalized);
  }

  function renderResultList() {
    const holder = state.section?.querySelector("#territoryResultList");
    const search = state.section?.querySelector("#territorySearch")?.value.trim() || "";
    if (!holder) return;

    const items = layerRecords().filter(item => searchMatches(item,search));

    if (!items.length) {
      holder.innerHTML = `
        <div class="territory-empty">
          <strong>No hay datos cargados en esta capa.</strong>
          <p>
            El administrador puede registrar puntos con coordenadas, estado,
            población afectada y evidencia.
          </p>
        </div>`;
      return;
    }

    holder.innerHTML = items.map(item => {
      const hasCoordinates =
        Number.isFinite(item.lat) && Number.isFinite(item.lng);
      const isNeighborhood = item.category === "neighborhood";
      const subtitle = state.activeMode === "territory"
        ? (
          isNeighborhood
            ? `${item.kind} · Cabecera municipal`
            : `${item.kind}${item.veredas?.length
              ? ` · ${item.veredas.length} veredas`
              : ""}`
        )
        : `${MODES[item.category]?.label || "Registro"} · ${item.status || "Sin estado"}`;
      const value = state.activeMode === "territory"
        ? (
          isNeighborhood
            ? "Barrio"
            : (item.altitude
              ? `${formatNumber(item.altitude)} m`
              : "Por ubicar")
        )
        : (item.people
          ? `${formatNumber(item.people)} personas`
          : "Sin cifra");

      return `
        <button
          type="button"
          class="territory-result-item ${state.selectedId === item.id ? "active" : ""}"
          data-territory-result="${escapeHtml(item.id)}"
          ${hasCoordinates ? "" : "data-no-coordinates='true'"}
        >
          <i class="territory-result-symbol is-${escapeHtml(item.category || "territory")}">
            ${escapeHtml(MODES[item.category]?.icon || "◎")}
          </i>
          <span>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(subtitle)}</small>
          </span>
          <b>${escapeHtml(value)}</b>
        </button>`;
    }).join("");
  }

  function selectItem(item,{fly=true} = {}) {
    if (!item) return;
    state.selectedId = item.id;
    renderResultList();

    const title = state.section?.querySelector("#territoryDetailTitle");
    const description = state.section?.querySelector("#territoryDetailDescription");
    const meta = state.section?.querySelector("#territoryDetailMeta");

    if (title) title.textContent = item.name;
    if (description) {
      description.textContent =
        item.description ||
        item.note ||
        "Información territorial disponible para consulta.";
    }

    const chips = [];
    if (item.kind) chips.push(item.kind);
    if (item.sector) chips.push(item.sector);
    if (item.status) chips.push(item.status);
    if (item.date) chips.push(item.date);
    if (item.people) chips.push(`${formatNumber(item.people)} personas`);
    if (item.altitude) chips.push(`${formatNumber(item.altitude)} m s. n. m.`);
    if (item.veredas?.length) chips.push(item.veredas.join(" · "));
    if (item.barrios?.length) {
      chips.push(`${item.barrios.length} barrios de cabecera`);
    }
    if (item.referenceNote) chips.push("Ubicación de referencia");
    if (meta) {
      meta.innerHTML = chips.map(chip => `<span>${escapeHtml(chip)}</span>`).join("");
    }

    if (
      fly &&
      state.mapReady &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
    ) {
      cinematicFlyTo(item);
    }
  }

  function createLeafletIcon(category = "territory",label = "") {
    const icon = category === "neighborhood"
      ? "B"
      : (MODES[category]?.icon || "◎");
    return window.L.divIcon({
      className:`territory-leaflet-icon is-${category}`,
      html:`
        <span class="territory-marker-pulse"></span>
        <i>${escapeHtml(icon)}</i>
        <b>${escapeHtml(label)}</b>`,
      iconSize:[34,34],
      iconAnchor:[17,17],
      popupAnchor:[0,-18]
    });
  }

  function popupHtml(item) {
    const category = item.category || "territory";
    const details = [];
    if (item.kind) details.push(item.kind);
    if (item.sector) details.push(item.sector);
    if (item.status) details.push(item.status);
    if (item.people) details.push(`${formatNumber(item.people)} personas`);
    if (item.veredas?.length) details.push(item.veredas.join(", "));

    return `
      <div class="territory-popup">
        <span>${escapeHtml(
          category === "neighborhood"
            ? "Barrio de la cabecera"
            : (MODES[category]?.label || "Territorio")
        )}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || item.note || details.join(" · "))}</p>
        ${details.length
          ? `<small>${escapeHtml(details.join(" · "))}</small>`
          : ""}
        ${item.referenceNote
          ? `<em>${escapeHtml(item.referenceNote)}</em>`
          : ""}
      </div>`;
  }

  function createBaseLayers() {
    if (!window.L) return null;

    const tileOptions = {
      minZoom:9,
      updateWhenIdle:true,
      updateWhenZooming:false,
      keepBuffer:2,
      crossOrigin:true
    };

    const plano = window.L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        ...tileOptions,
        maxZoom:19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    );

    const relieve = window.L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        ...tileOptions,
        maxZoom:17,
        attribution:
          'Datos &copy; OpenStreetMap · relieve &copy; OpenTopoMap'
      }
    );

    const imageryUrl =
      "https://server.arcgisonline.com/ArcGIS/rest/services/" +
      "World_Imagery/MapServer/tile/{z}/{y}/{x}";
    const labelsUrl =
      "https://services.arcgisonline.com/ArcGIS/rest/services/" +
      "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

    const satelite = window.L.tileLayer(imageryUrl,{
      ...tileOptions,
      maxZoom:19,
      attribution:"Imágenes &copy; Esri y proveedores"
    });

    const hybridImagery = window.L.tileLayer(imageryUrl,{
      ...tileOptions,
      maxZoom:19,
      attribution:"Imágenes &copy; Esri y proveedores"
    });
    const hybridLabels = window.L.tileLayer(labelsUrl,{
      ...tileOptions,
      maxZoom:19,
      pane:"overlayPane",
      opacity:.92
    });
    const hibrido = window.L.layerGroup([hybridImagery,hybridLabels]);

    return {plano,relieve,satelite,hibrido};
  }

  function setMapCameraStatus(message,active = false) {
    const shell = state.section?.querySelector(".territory-map-shell");
    const node = state.section?.querySelector("#territoryCameraStatus");
    if (node) node.textContent = message;
    shell?.classList.toggle("is-camera-active",active);
  }

  function markBaseButton(button,status) {
    if (!button) return;
    button.classList.remove("is-loading","is-loaded");
    button.removeAttribute("aria-busy");
    if (status === "loading") {
      button.classList.add("is-loading");
      button.setAttribute("aria-busy","true");
    }
    if (status === "loaded") {
      button.classList.add("is-loaded");
      window.setTimeout(() => button.classList.remove("is-loaded"),1000);
    }
  }

  function switchBasemap(name,button = null) {
    if (!state.mapReady || !state.baseLayers?.[name]) return;
    if (name === state.activeBaseName) return;

    const shell = state.section?.querySelector(".territory-map-shell");
    const next = state.baseLayers[name];
    const previous = state.activeBaseLayer;
    markBaseButton(button,"loading");
    shell?.classList.add("is-layer-switching");
    setMapCameraStatus(`Cargando vista ${BASEMAP_LABELS[name]}…`,true);

    clearTimeout(state.baseLayerReadyTimer);
    if (previous && state.map.hasLayer(previous)) state.map.removeLayer(previous);
    state.activeBaseLayer = next;
    state.activeBaseName = name;
    next.addTo(state.map);

    state.section?.querySelectorAll("[data-territory-basemap]")
      .forEach(control => {
        const active = control.dataset.territoryBasemap === name;
        control.classList.toggle("active",active);
        control.setAttribute("aria-pressed",String(active));
      });

    shell.dataset.basemap = name;

    const ready = () => {
      clearTimeout(state.baseLayerReadyTimer);
      shell?.classList.remove("is-layer-switching");
      markBaseButton(button,"loaded");
      setMapCameraStatus(`Vista ${BASEMAP_LABELS[name]} lista`,false);
    };

    const watchLayer = name === "hibrido"
      ? next.getLayers?.()[0]
      : next;
    watchLayer?.once?.("load",ready);
    state.baseLayerReadyTimer = window.setTimeout(ready,1800);
  }

  function cinematicFlyTo(item) {
    if (!state.mapReady || !state.map) return;

    const shell = state.section?.querySelector(".territory-map-shell");
    clearTimeout(state.zoomTimer);
    shell?.classList.remove("is-cinematic-zoom");
    void shell?.offsetWidth;
    shell?.classList.add("is-cinematic-zoom");

    setMapCameraStatus(`Acercando la vista a ${item.name}`,true);

    const isUrban =
      item.id === "cabecera" ||
      /cabecera|barrio|carrera|calle/i.test(
        `${item.name} ${item.kind || ""} ${item.sector || ""}`
      );
    const targetZoom = isUrban ? 17 : 15;

    state.map.flyTo([item.lat,item.lng],targetZoom,{
      animate:true,
      duration:1.65,
      easeLinearity:.15,
      noMoveStart:false
    });

    state.map.once("moveend",() => {
      const layer = [
        ...(state.markerLayer?.getLayers?.() || []),
        ...(state.neighborhoodLayer?.getLayers?.() || [])
      ].find(marker =>
        marker.options?.territoryId === item.id
      );
      layer?.openPopup?.();
      setMapCameraStatus(`${item.name} en detalle`,false);
      state.zoomTimer = window.setTimeout(() => {
        shell?.classList.remove("is-cinematic-zoom");
      },850);
    });
  }

  function updateNeighborhoodLayerVisibility() {
    if (!state.mapReady || !state.map || !state.neighborhoodLayer) return;

    const shouldShow =
      state.activeMode === "territory" &&
      state.map.getZoom() >= 14;

    const visible = state.map.hasLayer(state.neighborhoodLayer);

    if (shouldShow && !visible) {
      state.neighborhoodLayer.addTo(state.map);
    } else if (!shouldShow && visible) {
      state.map.removeLayer(state.neighborhoodLayer);
    }
  }

  function renderMapLayers() {
    if (!state.mapReady || !window.L) return;

    if (!state.markerLayer) {
      state.markerLayer = window.L.layerGroup().addTo(state.map);
    }
    if (!state.neighborhoodLayer) {
      state.neighborhoodLayer = window.L.layerGroup();
    }
    if (!state.radiusLayer) {
      state.radiusLayer = window.L.layerGroup().addTo(state.map);
    }

    state.markerLayer.clearLayers();
    state.neighborhoodLayer.clearLayers();
    state.radiusLayer.clearLayers();

    const items = layerRecords();
    const bounds = [];

    items.forEach(item => {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lng)) return;
      const category = item.category || "territory";
      const marker = window.L.marker([item.lat,item.lng],{
        icon:createLeafletIcon(category,item.name),
        keyboard:true,
        title:item.name,
        territoryId:item.id,
        riseOnHover:true
      });
      marker.bindPopup(popupHtml(item),{
        className:"territory-popup-shell",
        maxWidth:300
      });
      marker.on("click",() => selectItem(item,{fly:false}));

      if (category === "neighborhood") {
        marker.addTo(state.neighborhoodLayer);
      } else {
        marker.addTo(state.markerLayer);
      }

      bounds.push([item.lat,item.lng]);

      if (category === "impact" && item.people > 0) {
        const radius = Math.min(1800,Math.max(180,item.people * 8));
        window.L.circle([item.lat,item.lng],{
          radius,
          color:"#ff6b42",
          weight:1,
          opacity:.75,
          fillColor:"#ff6b42",
          fillOpacity:.12,
          interactive:false
        }).addTo(state.radiusLayer);
      }
    });

    updateNeighborhoodLayerVisibility();

    if (bounds.length && state.activeMode !== "territory") {
      state.map.fitBounds(bounds,{
        padding:[54,54],
        maxZoom:15,
        animate:true,
        duration:.65
      });
    }
  }

  function resetMap() {
    if (!state.mapReady) return;
    const shell = state.section?.querySelector(".territory-map-shell");
    shell?.classList.add("is-cinematic-zoom");
    setMapCameraStatus("Regresando a la vista general",true);
    const positions = TERRITORY
      .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng))
      .map(item => [item.lat,item.lng]);

    if (positions.length) {
      state.map.fitBounds(positions,{
        padding:[38,38],
        maxZoom:12.7,
        animate:true,
        duration:1.15
      });
    } else {
      state.map.flyTo(CENTER,12,{duration:1.1,easeLinearity:.2});
    }

    state.map.once("moveend",() => {
      setMapCameraStatus("Vista general preparada",false);
      window.setTimeout(() => shell?.classList.remove("is-cinematic-zoom"),700);
    });
  }

  function loadExternalStylesheet(url,id) {
    return new Promise((resolve,reject) => {
      const previous = document.getElementById(id);
      if (previous) {
        if (previous.sheet) {
          resolve(previous);
          return;
        }
        previous.remove();
      }

      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = url;
      link.onload = () => resolve(link);
      link.onerror = () => {
        link.remove();
        reject(new Error(`No se pudo cargar ${url}`));
      };
      document.head.appendChild(link);
    });
  }

  function loadExternalScript(url,id) {
    return new Promise((resolve,reject) => {
      const previous = document.getElementById(id);
      if (previous) previous.remove();

      const script = document.createElement("script");
      script.id = id;
      script.src = url;
      script.defer = true;
      script.onload = () => resolve(script);
      script.onerror = () => {
        script.remove();
        reject(new Error(`No se pudo cargar ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  async function loadLeaflet() {
    if (window.L?.map) return window.L;
    if (state.leafletPromise) return state.leafletPromise;

    const cssUrls = [
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css",
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    ];

    const scriptUrls = [
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js",
      "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js",
      "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    ];

    state.leafletPromise = (async () => {
      let cssLoaded = false;

      for (const url of cssUrls) {
        try {
          await loadExternalStylesheet(url,"territoryLeafletCss");
          cssLoaded = true;
          break;
        } catch {
          // Probar el siguiente proveedor.
        }
      }

      if (!cssLoaded) {
        throw new Error("No se pudo cargar el estilo del mapa.");
      }

      for (const url of scriptUrls) {
        try {
          await loadExternalScript(url,"territoryLeafletScript");
          if (window.L?.map) return window.L;
        } catch {
          // Probar el siguiente proveedor.
        }
      }

      throw new Error("No se pudo cargar el motor del mapa.");
    })();

    try {
      return await state.leafletPromise;
    } catch (error) {
      state.leafletPromise = null;
      throw error;
    }
  }

  async function initMap() {
    if (state.mapReady || !state.section) return;

    const mapNode = state.section.querySelector("#territoryMap");
    const fallback = state.section.querySelector("#territoryMapFallback");
    if (!mapNode) return;

    try {
      await loadLeaflet();
      if (!window.L?.map) throw new Error("Leaflet no disponible.");

      state.map = window.L.map(mapNode,{
        center:CENTER,
        zoom:13,
        zoomControl:false,
        scrollWheelZoom:true,
        doubleClickZoom:true,
        touchZoom:true,
        boxZoom:true,
        keyboard:true,
        preferCanvas:true,
        attributionControl:true,
        fadeAnimation:true,
        zoomAnimation:true,
        markerZoomAnimation:true,
        inertia:true,
        inertiaDeceleration:2600,
        easeLinearity:.18,
        zoomSnap:.25,
        zoomDelta:.5,
        wheelPxPerZoomLevel:84
      });

      state.baseLayers = createBaseLayers();
      state.activeBaseName = "plano";
      state.activeBaseLayer = state.baseLayers.plano;
      state.activeBaseLayer.addTo(state.map);

      state.activeBaseLayer.on("tileerror",() => {
        setMapCameraStatus(
          "Algunas partes del mapa están tardando. Reintentando…",
          true
        );
      });
      state.section.querySelector(".territory-map-shell").dataset.basemap =
        state.activeBaseName;

      window.L.control.zoom({position:"topright"}).addTo(state.map);
      window.L.control.scale({
        position:"bottomleft",
        imperial:false,
        maxWidth:110
      }).addTo(state.map);

      state.map.on("click",event => {
        const {lat,lng} = event.latlng;
        state.mapClick = {lat,lng};
        const text = state.section?.querySelector("#territoryCoordinateText");
        if (text) {
          text.textContent = `Punto seleccionado: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }

        if (state.adminDialog?.open) {
          const form = state.adminDialog.querySelector("#territoryRecordForm");
          if (form) {
            form.elements.lat.value = lat.toFixed(6);
            form.elements.lng.value = lng.toFixed(6);
          }
        }
      });

      state.map.on("moveend",() => {
        if (!state.map) return;
        const center = state.map.getCenter();
        const text = state.section?.querySelector("#territoryCoordinateText");
        if (text && !state.mapClick) {
          text.textContent =
            `Centro: ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)} · zoom ${state.map.getZoom().toFixed(2)}`;
        }
      });

      state.map.on("zoomstart",() => {
        state.section?.querySelector(".territory-map-shell")
          ?.classList.add("is-map-zooming");
      });
      state.map.on("zoomend",() => {
        state.section?.querySelector(".territory-map-shell")
          ?.classList.remove("is-map-zooming");
        updateNeighborhoodLayerVisibility();
      });

      state.mapReady = true;
      fallback?.classList.add("is-hidden");
      mapNode.classList.add("is-ready");
      renderMapLayers();
      resetMap();

      window.setTimeout(() => state.map.invalidateSize({animate:false}),120);
    } catch (error) {
      fallback?.classList.remove("is-hidden");
      fallback?.classList.add("has-error");
      const loading = fallback?.querySelector(
        ".territory-real-map-loading"
      );
      const retry = fallback?.querySelector("#territoryRetryMap");

      if (loading) {
        const title = loading.querySelector("strong");
        const detail = loading.querySelector("small");
        if (title) title.textContent = "No se pudo cargar el mapa real";
        if (detail) {
          detail.textContent =
            "Revise la conexión y pulse Reintentar. No se mostrará un mapa simulado.";
        }
      }
      if (retry) retry.hidden = false;

      console.warn(
        "TerritoryExperience: no se pudo cargar Leaflet.",
        error
      );
    }
  }

  function observeMap() {
    if (!state.section || state.mapObserver) return;

    if (!("IntersectionObserver" in window)) {
      initMap();
      return;
    }

    state.mapObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      initMap();
      state.mapObserver.disconnect();
      state.mapObserver = null;
    },{
      threshold:.02,
      rootMargin:"360px 0px"
    });

    state.mapObserver.observe(state.section);
  }

  function focusCardMotion(card) {
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(hover:hover) and (pointer:fine)").matches
    ) return;

    let frame = 0;
    card.addEventListener("pointermove",event => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty("--territory-card-x",x.toFixed(3));
        card.style.setProperty("--territory-card-y",y.toFixed(3));
      });
    },{passive:true});
    card.addEventListener("pointerleave",() => {
      card.style.removeProperty("--territory-card-x");
      card.style.removeProperty("--territory-card-y");
    },{passive:true});
  }

  function ensureAdminDialog() {
    if (state.adminDialog) return state.adminDialog;

    const dialog = document.createElement("dialog");
    dialog.id = "territoryAdminDialog";
    dialog.className = "territory-admin-dialog";
    dialog.setAttribute("aria-labelledby","territoryAdminTitle");
    dialog.innerHTML = `
      <div class="territory-admin-shell">
        <header class="territory-admin-head">
          <div>
            <span>GESTIÓN DEL MAPA</span>
            <h2 id="territoryAdminTitle">Datos territoriales</h2>
            <p>
              Registre únicamente información validada. Los campos de población
              y evidencia pueden dejarse vacíos cuando no exista soporte oficial.
            </p>
          </div>
          <button type="button" class="territory-admin-close" aria-label="Cerrar">×</button>
        </header>

        <div class="territory-admin-layout">
          <form id="territoryRecordForm" class="territory-record-form">
            <input type="hidden" name="recordId">

            <label>
              Capa
              <select name="category" required>
                <option value="impact">Afectación</option>
                <option value="work">Obra o respuesta</option>
                <option value="participation">Participación</option>
              </select>
            </label>

            <label>
              Nombre del registro
              <input name="name" maxlength="120" required>
            </label>

            <label>
              Barrio, vereda, corregimiento o sector
              <input name="sector" maxlength="120">
            </label>

            <div class="territory-admin-coordinates">
              <label>
                Latitud
                <input name="lat" type="number" step="0.000001" required>
              </label>
              <label>
                Longitud
                <input name="lng" type="number" step="0.000001" required>
              </label>
            </div>

            <button type="button" class="territory-use-map-center">
              Usar centro actual del mapa
            </button>

            <div class="territory-admin-coordinates">
              <label>
                Personas afectadas
                <input name="people" type="number" min="0" step="1">
              </label>
              <label>
                Fecha
                <input name="date" type="date">
              </label>
            </div>

            <label>
              Estado
              <input name="status" maxlength="80" value="En seguimiento">
            </label>

            <label>
              Descripción
              <textarea name="description" rows="4" maxlength="900"></textarea>
            </label>

            <label>
              Enlace de evidencia
              <input name="evidence" type="url" placeholder="https://...">
            </label>

            <div class="territory-admin-form-actions">
              <button type="button" class="button button-secondary territory-clear-form">
                Limpiar
              </button>
              <button type="submit" class="button button-primary">
                Guardar punto
              </button>
            </div>
          </form>

          <section class="territory-admin-records">
            <div class="territory-admin-records-head">
              <div>
                <span>REGISTROS CARGADOS</span>
                <strong id="territoryAdminCount">0</strong>
              </div>
              <button type="button" class="territory-export-data">
                Exportar JSON
              </button>
            </div>
            <div id="territoryAdminList"></div>
          </section>
        </div>
      </div>`;

    document.body.appendChild(dialog);
    state.adminDialog = dialog;

    dialog.querySelector(".territory-admin-close")
      .addEventListener("click",() => dialog.close());

    dialog.addEventListener("click",event => {
      if (event.target === dialog) dialog.close();
    });

    dialog.querySelector(".territory-use-map-center")
      .addEventListener("click",() => {
        const center = state.mapReady
          ? state.map.getCenter()
          : {lat:CENTER[0],lng:CENTER[1]};
        const form = dialog.querySelector("#territoryRecordForm");
        form.elements.lat.value = center.lat.toFixed(6);
        form.elements.lng.value = center.lng.toFixed(6);
      });

    dialog.querySelector(".territory-clear-form")
      .addEventListener("click",clearAdminForm);

    dialog.querySelector(".territory-export-data")
      .addEventListener("click",exportData);

    dialog.querySelector("#territoryRecordForm")
      .addEventListener("submit",event => {
        event.preventDefault();
        saveAdminRecord(new FormData(event.currentTarget));
      });

    return dialog;
  }

  function clearAdminForm() {
    const form = state.adminDialog?.querySelector("#territoryRecordForm");
    if (!form) return;
    form.reset();
    form.elements.category.value = "impact";
    form.elements.status.value = "En seguimiento";
    form.elements.recordId.value = "";
    state.editingRecordId = null;

    const center = state.mapReady
      ? state.map.getCenter()
      : {lat:CENTER[0],lng:CENTER[1]};
    form.elements.lat.value = center.lat.toFixed(6);
    form.elements.lng.value = center.lng.toFixed(6);
  }

  function renderAdminList() {
    const list = state.adminDialog?.querySelector("#territoryAdminList");
    const count = state.adminDialog?.querySelector("#territoryAdminCount");
    if (!list || !count) return;

    count.textContent = formatNumber(state.records.length);

    if (!state.records.length) {
      list.innerHTML = `
        <div class="territory-admin-empty">
          <strong>Aún no hay puntos oficiales.</strong>
          <p>Agregue afectaciones, obras o ejercicios de participación.</p>
        </div>`;
      return;
    }

    list.innerHTML = state.records.map(record => `
      <article class="territory-admin-row">
        <i class="is-${escapeHtml(record.category)}">
          ${escapeHtml(MODES[record.category]?.icon || "◎")}
        </i>
        <div>
          <strong>${escapeHtml(record.name)}</strong>
          <small>
            ${escapeHtml(record.sector || "Sin sector")} ·
            ${escapeHtml(record.status || "Sin estado")}
          </small>
        </div>
        <button type="button" data-territory-edit="${escapeHtml(record.id)}">
          Editar
        </button>
        <button type="button" data-territory-delete="${escapeHtml(record.id)}">
          Eliminar
        </button>
      </article>`).join("");
  }

  function openAdminDialog() {
    if (!isAdmin()) {
      portal()?.helpers?.toast?.("Debe iniciar sesión con permisos administrativos.");
      portal()?.openDialog?.("loginDialog");
      return;
    }

    refreshRecords();
    const dialog = ensureAdminDialog();
    renderAdminList();
    clearAdminForm();
    if (!dialog.open) dialog.showModal();
  }

  function saveAdminRecord(formData) {
    const lat = Number(formData.get("lat"));
    const lng = Number(formData.get("lng"));
    const name = String(formData.get("name") || "").trim();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      portal()?.helpers?.toast?.("Complete nombre, latitud y longitud.");
      return;
    }

    const id = String(formData.get("recordId") || "").trim()
      || `territory-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

    const record = {
      id,
      category:String(formData.get("category") || "impact"),
      name,
      sector:String(formData.get("sector") || "").trim(),
      lat,
      lng,
      people:Math.max(0,Number(formData.get("people")) || 0),
      date:String(formData.get("date") || ""),
      status:String(formData.get("status") || "").trim(),
      description:String(formData.get("description") || "").trim(),
      evidence:String(formData.get("evidence") || "").trim(),
      updatedAt:new Date().toISOString()
    };

    const store = getStore();
    const index = store.records.findIndex(item => item.id === id);
    if (index >= 0) store.records[index] = record;
    else store.records.push(record);

    persistStore();
    refreshRecords();
    renderAdminList();
    renderMetrics();
    renderResultList();
    renderMapLayers();
    clearAdminForm();
    portal()?.helpers?.toast?.("Punto territorial guardado.");
  }

  function editAdminRecord(id) {
    const record = state.records.find(item => item.id === id);
    const form = state.adminDialog?.querySelector("#territoryRecordForm");
    if (!record || !form) return;

    state.editingRecordId = id;
    Object.entries(record).forEach(([key,value]) => {
      if (form.elements[key]) form.elements[key].value = value ?? "";
    });
    form.elements.recordId.value = id;
    form.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function deleteAdminRecord(id) {
    const record = state.records.find(item => item.id === id);
    if (!record) return;
    if (!confirm(`¿Eliminar "${record.name}" del mapa?`)) return;

    const store = getStore();
    store.records = store.records.filter(item => item.id !== id);
    persistStore();
    refreshRecords();
    renderAdminList();
    renderMetrics();
    renderResultList();
    renderMapLayers();
    portal()?.helpers?.toast?.("Punto territorial eliminado.");
  }

  function exportData() {
    const payload = JSON.stringify(getStore(),null,2);
    const blob = new Blob([payload],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `san-pedro-territorio-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function syncAdminVisibility() {
    const mapButton = state.section?.querySelector("#territoryAdminButton");
    if (mapButton) mapButton.hidden = !isAdmin();
  }

  function bindEvents() {
    state.section?.addEventListener("click",event => {
      const basemapButton = event.target.closest("[data-territory-basemap]");
      if (basemapButton) {
        switchBasemap(basemapButton.dataset.territoryBasemap,basemapButton);
        return;
      }

      const modeButton = event.target.closest("[data-territory-mode]");
      if (modeButton) {
        setMode(modeButton.dataset.territoryMode);
        return;
      }

      const result = event.target.closest("[data-territory-result]");
      if (result) {
        const id = result.dataset.territoryResult;
        const item = layerRecords().find(entry => entry.id === id);
        if (item) selectItem(item);
        return;
      }

      const fallbackNode = event.target.closest("[data-territory-id]");
      if (fallbackNode) {
        const item = TERRITORY.find(entry =>
          entry.id === fallbackNode.dataset.territoryId
        );
        if (item) selectItem(item);
        return;
      }

      const card = event.target.closest("[data-territory-card]");
      if (card) {
        setMode(card.dataset.territoryCard,{focusMap:true});
        return;
      }

      if (event.target.closest("#territoryResetMap")) {
        state.mapClick = null;
        resetMap();
        return;
      }

      if (event.target.closest("#territoryRetryMap")) {
        state.leafletPromise = null;
        state.mapReady = false;

        const fallback = state.section?.querySelector(
          "#territoryMapFallback"
        );
        const retry = fallback?.querySelector("#territoryRetryMap");
        const title = fallback?.querySelector(
          ".territory-real-map-loading strong"
        );
        const detail = fallback?.querySelector(
          ".territory-real-map-loading small"
        );

        fallback?.classList.remove("has-error");
        if (retry) retry.hidden = true;
        if (title) title.textContent = "Cargando mapa real";
        if (detail) {
          detail.textContent =
            "Preparando calles, carreras, corregimientos y vista satelital.";
        }

        initMap();
        return;
      }

      if (event.target.closest("#territoryAdminButton")) {
        openAdminDialog();
      }
    });

    state.section?.addEventListener("keydown",event => {
      const card = event.target.closest("[data-territory-card]");
      if (!card || !["Enter"," "].includes(event.key)) return;
      event.preventDefault();
      setMode(card.dataset.territoryCard,{focusMap:true});
    });


    state.section?.querySelector("#territorySearch")
      ?.addEventListener("input",renderResultList);

    state.section?.querySelectorAll(".territory-focus-card")
      .forEach(focusCardMotion);

    document.addEventListener("click",event => {
      const edit = event.target.closest("[data-territory-edit]");
      if (edit) editAdminRecord(edit.dataset.territoryEdit);

      const remove = event.target.closest("[data-territory-delete]");
      if (remove) deleteAdminRecord(remove.dataset.territoryDelete);
    });

    [
      "portal:rendered",
      "portal:datachange",
      "firebase:authchange",
      "portal:adminchange"
    ].forEach(name => {
      document.addEventListener(name,() => {
        refreshRecords();
        syncAdminVisibility();
        renderMetrics();
        renderResultList();
        renderMapLayers();
      });
    });

    window.addEventListener("resize",() => {
      if (!state.mapReady) return;
      requestAnimationFrame(() => state.map.invalidateSize({animate:false}));
    },{passive:true});
  }

  function init() {
    if (!isHome()) return;

    if (state.initialized) {
      syncAdminVisibility();
      refreshRecords();
      renderMetrics();
      renderResultList();
      return;
    }

    state.initialized = true;
    refreshRecords();
    createMapSection();
    bindEvents();
    syncAdminVisibility();
    renderMetrics();
    renderResultList();
    observeMap();

    window.dispatchEvent(new CustomEvent("portal:rendered",{
      detail:{source:"territory-experience",build:BUILD}
    }));
  }

  function getPublicTerritoryData() {
    refreshRecords();
    return {
      center:{lat:CENTER[0],lng:CENTER[1]},
      territory:TERRITORY.map(item => ({
        ...item,
        veredas:[...(item.veredas || [])],
        barrios:[...(item.barrios || [])]
      })),
      neighborhoods:URBAN_NEIGHBORHOODS.map(item => ({...item})),
      records:state.records.map(item => ({...item}))
    };
  }

  function focusLocation(id) {
    const item = [
      ...URBAN_NEIGHBORHOODS,
      ...TERRITORY,
      ...state.records
    ].find(entry => entry.id === id);

    if (!item) return false;

    const mode = ["impact","work","participation"].includes(item.category)
      ? item.category
      : "territory";

    setMode(mode);
    state.section?.querySelector(".territory-map-shell")
      ?.scrollIntoView({behavior:"smooth",block:"center"});

    window.setTimeout(() => {
      selectItem(item,{fly:true});
    },420);

    return true;
  }

  window.TerritoryExperience = {
    init,
    setMode,
    openAdmin:openAdminDialog,
    switchBasemap,
    resetMap,
    getData:getPublicTerritoryData,
    focusLocation,
    refresh:() => {
      refreshRecords();
      renderMetrics();
      renderResultList();
      renderMapLayers();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();