(() => {
  const chartInstances = new Map();
  const CHART_URL = "https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js";

  const portal = () => window.Portal;
  const formatCurrency = value => portal().helpers.formatCurrency(value);
  const formatNumber = value => portal().helpers.formatNumber(value);

  function loadChartJs() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (window.__chartJsPromise) return window.__chartJsPromise;
    window.__chartJsPromise = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      script.src = CHART_URL;
      script.async = true;
      script.onload = () => resolve(window.Chart);
      script.onerror = () => reject(new Error("No fue posible cargar el motor de gráficas."));
      document.head.appendChild(script);
    });
    return window.__chartJsPromise;
  }

  function dashboard(year) {
    return portal().state.dashboards?.[String(year)] || portal().state.dashboards?.[year] || null;
  }

  function statusClass(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("respondida") || normalized.includes("general")) return "is-complete";
    if (normalized.includes("progreso") || normalized.includes("análisis")) return "is-progress";
    return "is-pending";
  }

  function commitmentStatusLabel(status) {
    return ({pendiente:"Pendiente",en_progreso:"En progreso",cumplido:"Cumplido",bloqueado:"Bloqueado"})[status] || status || "Pendiente";
  }

  function destroyCharts() {
    chartInstances.forEach(chart => chart.destroy());
    chartInstances.clear();
  }

  function chartColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      primary:style.getPropertyValue("--primary").trim() || "#0b4fb3",
      secondary:style.getPropertyValue("--secondary").trim() || "#137ad1",
      accent:style.getPropertyValue("--accent").trim() || "#f4b41a",
      ink:style.getPropertyValue("--ink").trim() || "#14213d",
      muted:style.getPropertyValue("--muted").trim() || "#66738a",
      line:style.getPropertyValue("--line").trim() || "#dce3ee"
    };
  }

  function commonOptions() {
    const colors = chartColors();
    return {
      responsive:true,
      maintainAspectRatio:false,
      animation:{duration:650,easing:"easeOutQuart"},
      interaction:{mode:"nearest",intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:"rgba(5,29,67,.95)",
          titleColor:"#fff",bodyColor:"#fff",padding:12,
          displayColors:false
        }
      },
      scales:{
        x:{grid:{color:"rgba(103,116,139,.12)"},ticks:{color:colors.muted,font:{family:"Century Gothic",size:10}}},
        y:{grid:{display:false},ticks:{color:colors.ink,font:{family:"Century Gothic",size:10}}}
      }
    };
  }

  function renderCharts(year,data) {
    if (!window.Chart) return;
    destroyCharts();
    const colors = chartColors();

    const investmentCtx = document.querySelector("#investmentChart");
    if (investmentCtx) {
      const options = commonOptions();
      options.indexAxis = "y";
      options.plugins.tooltip.callbacks = {label:context => formatCurrency(context.raw)};
      options.scales.x.ticks.callback = value => `$${Number(value/1_000_000_000).toLocaleString("es-CO",{maximumFractionDigits:1})} mil M`;
      chartInstances.set("investment",new Chart(investmentCtx,{
        type:"bar",
        data:{labels:data.investment.map(item=>item.label),datasets:[{data:data.investment.map(item=>item.value),backgroundColor:data.investment.map((_,i)=>i===0?colors.primary:`hsla(${205+i*18},72%,48%,.78)`),borderRadius:7,borderSkipped:false,barThickness:18}]},
        options
      }));
    }

    const reachCtx = document.querySelector("#populationChart");
    if (reachCtx) {
      const options = commonOptions();
      options.indexAxis = "y";
      options.plugins.tooltip.callbacks = {label:context => `${formatNumber(context.raw)} personas / usuarios`};
      chartInstances.set("reach",new Chart(reachCtx,{
        type:"bar",
        data:{labels:data.populationReach.map(item=>item.label),datasets:[{data:data.populationReach.map(item=>item.value),backgroundColor:colors.secondary,borderRadius:7,borderSkipped:false,barThickness:15}]},
        options
      }));
    }

    const executionCtx = document.querySelector("#executionChart");
    if (executionCtx) {
      const options = commonOptions();
      options.indexAxis = "y";
      options.scales.x.min = 0; options.scales.x.max = 100;
      options.scales.x.ticks.callback = value => `${value}%`;
      options.plugins.tooltip.callbacks = {label:context => `${formatNumber(context.raw)}% de ejecución reportada`};
      chartInstances.set("execution",new Chart(executionCtx,{
        type:"bar",
        data:{labels:data.execution.map(item=>item.label),datasets:[{data:data.execution.map(item=>item.value),backgroundColor:data.execution.map(item=>item.value>=95?"#1a9b62":item.value>=80?colors.primary:item.value>=60?colors.accent:"#e56342"),borderRadius:6,borderSkipped:false,barThickness:13}]},
        options
      }));
    }

    const commitments = portal().state.commitments.filter(item=>Number(item.year)===Number(year));
    const priorityCounts = ["Alta","Estratégica","Transversal"].map(priority=>commitments.filter(item=>item.priority===priority).length);
    const commitmentCtx = document.querySelector("#commitmentPriorityChart");
    if (commitmentCtx) {
      chartInstances.set("commitment",new Chart(commitmentCtx,{
        type:"doughnut",
        data:{labels:["Alta","Estratégica","Transversal"],datasets:[{data:priorityCounts,backgroundColor:["#e55353",colors.primary,"#32a36a"],borderWidth:0,hoverOffset:5}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{boxWidth:10,usePointStyle:true,font:{family:"Century Gothic",size:10}}},tooltip:{callbacks:{label:context=>`${context.label}: ${context.raw}`}}},animation:{duration:650}}
      }));
    }
  }

  function adminEditButton(type,id,year) {
    return portal().state.admin ? `<button class="dashboard-edit-button" type="button" data-dashboard-edit="${type}" data-entity-id="${id}" data-entity-year="${year}">Editar</button>` : "";
  }

  function kpisMarkup(year,data) {
    return data.kpis.map(item=>`<article class="executive-kpi kpi-${item.color}" data-admin-entity="dashboardKpi" data-entity-id="${item.id}" data-entity-year="${year}">
      <span class="executive-kpi__icon" aria-hidden="true">${portal().helpers.escape(item.icon)}</span>
      <div><small>${portal().helpers.escape(item.label)}</small><strong>${portal().helpers.escape(item.display || formatNumber(item.value))}</strong><p>${portal().helpers.escape(item.description)}</p></div>
    </article>`).join("");
  }

  function investmentRows(year,data) {
    const total = data.investment.reduce((sum,item)=>sum+Number(item.value||0),0);
    return data.investment.map(item=>`<tr>
      <td data-label="Dependencia"><strong>${portal().helpers.escape(item.label)}</strong></td>
      <td data-label="Valor">${formatCurrency(item.value)}</td>
      <td data-label="Participación">${total?formatNumber(item.value/total*100):0}%</td>
      <td data-label="Alcance">${portal().helpers.escape(item.scope)}</td>
      <td class="table-actions">${adminEditButton("investmentItem",item.id,year)}</td>
    </tr>`).join("");
  }

  function methodologyMarkup(data) {
    return data.methodology.map((item,index)=>`<article class="method-step"><span>${index+1}</span><div><strong>${portal().helpers.escape(item.title)}</strong><p>${portal().helpers.escape(item.description)}</p></div></article>`).join("");
  }

  function institutionalMarkup(data) {
    return data.institutionalResults.map(item=>`<article class="institution-result"><span>${portal().helpers.escape(item.department.charAt(0))}</span><div><h3>${portal().helpers.escape(item.department)}</h3><p>${portal().helpers.escape(item.result)}</p><small>${portal().helpers.escape(item.value)}</small></div></article>`).join("");
  }

  function commitmentRows(year) {
    const list = portal().state.commitments.filter(item=>Number(item.year)===Number(year));
    return list.map(item=>`<tr data-status="${item.status}" data-priority="${item.priority}">
      <td data-label="Compromiso"><strong>${portal().helpers.escape(item.title)}</strong><small>${portal().helpers.escape(item.scope)}</small></td>
      <td data-label="Responsable">${portal().helpers.escape(item.responsible)}</td>
      <td data-label="Prioridad"><span class="priority-badge priority-${item.priority.toLowerCase().replace(/[^a-záéíóúñ]+/g,"-")}">${portal().helpers.escape(item.priority)}</span></td>
      <td data-label="Estado"><span class="status-pill status-${item.status}">${commitmentStatusLabel(item.status)}</span></td>
      <td data-label="Avance"><div class="table-progress"><i><u style="width:${Number(item.progress||0)}%"></u></i><b>${Number(item.progress||0)}%</b></div></td>
      <td class="table-actions">${item.evidenceUrl?`<a href="${portal().helpers.safeUrl(item.evidenceUrl)}" target="_blank" rel="noopener">Evidencia ↗</a>`:""}${adminEditButton("commitment",item.id,year)}</td>
    </tr>`).join("");
  }

  function requestRows(year) {
    const list = portal().state.citizenRequests.filter(item=>Number(item.year)===Number(year));
    return list.map(item=>`<tr data-status="${portal().helpers.escape(item.status)}" data-topic="${portal().helpers.escape(item.topic)}">
      <td data-label="Solicitud"><strong>${portal().helpers.escape(item.request)}</strong><small>${portal().helpers.escape(item.radicados)}</small></td>
      <td data-label="Solicitante">${portal().helpers.escape(item.applicant)}</td>
      <td data-label="Tema">${portal().helpers.escape(item.topic)}</td>
      <td data-label="Estado"><span class="request-state ${statusClass(item.status)}">${portal().helpers.escape(item.status)}</span></td>
      <td class="table-actions"><button type="button" data-request-detail="${item.id}">Ver detalle</button>${adminEditButton("citizenRequest",item.id,year)}</td>
    </tr>`).join("");
  }

  function insertSections(year,data) {
    document.querySelectorAll("[data-dashboard-generated]").forEach(element=>element.remove());
    const indicatorSection = document.querySelector("#indicadores");
    if (!indicatorSection) return;

    const panorama = document.createElement("section");
    panorama.id = "panorama";
    panorama.className = "year-section dashboard-section dashboard-section--executive";
    panorama.dataset.dashboardGenerated = "true";
    panorama.dataset.adminSection = "dashboard";
    panorama.innerHTML = `<div class="site-shell">
      <div class="year-section__head"><div><span class="section-kicker">PANORAMA GENERAL</span><h2>Resultados ejecutivos de ${year}</h2></div><p>Indicadores extraídos del informe consolidado de la audiencia pública.</p></div>
      <div class="executive-kpis">${kpisMarkup(year,data)}</div>
      <div class="dashboard-grid dashboard-grid--method">
        <article class="dashboard-panel"><header><div><span class="section-kicker">RUTA METODOLÓGICA</span><h3>Cómo se desarrolló la audiencia</h3></div></header><div class="methodology-flow">${methodologyMarkup(data)}</div></article>
        <article class="dashboard-panel dashboard-panel--focus"><header><div><span class="section-kicker">ENFOQUE</span><h3>Ejes de la audiencia</h3></div></header><div class="focus-list">${data.focusAreas.map((item,index)=>`<div><span>${index+1}</span><strong>${portal().helpers.escape(item)}</strong></div>`).join("")}</div></article>
      </div>
    </div>`;

    const investment = document.createElement("section");
    investment.id = "inversion";
    investment.className = "year-section year-section--soft dashboard-section";
    investment.dataset.dashboardGenerated = "true";
    investment.dataset.adminSection = "dashboard";
    investment.innerHTML = `<div class="site-shell">
      <div class="year-section__head"><div><span class="section-kicker">INVERSIÓN Y COBERTURA</span><h2>Recursos reportados y población alcanzada</h2></div><p>Las gráficas se complementan con tablas para facilitar la verificación de cada dato.</p></div>
      <div class="dashboard-grid dashboard-grid--charts">
        <article class="dashboard-panel dashboard-panel--chart"><header><div><span>GRÁFICA 01</span><h3>Inversión por dependencia</h3></div><strong>${formatCurrency(data.investment.reduce((s,i)=>s+i.value,0))}</strong></header><div class="chart-frame chart-frame--large"><canvas id="investmentChart" aria-label="Gráfica de inversión reportada por dependencia"></canvas></div></article>
        <article class="dashboard-panel dashboard-panel--chart"><header><div><span>GRÁFICA 02</span><h3>Alcance poblacional</h3></div><strong>${formatNumber(Math.max(...data.populationReach.map(i=>i.value)))}</strong></header><div class="chart-frame chart-frame--large"><canvas id="populationChart" aria-label="Gráfica de alcance poblacional por componente"></canvas></div><details class="chart-data-details"><summary>Ver y editar datos</summary><div>${data.populationReach.map(item=>`<div><span>${portal().helpers.escape(item.label)}</span><strong>${formatNumber(item.value)}</strong>${adminEditButton("reachItem",item.id,year)}</div>`).join("")}</div></details></article>
      </div>
      <article class="dashboard-panel dashboard-table-panel"><header><div><span class="section-kicker">CUADRO FINANCIERO</span><h3>Consolidado por dependencia</h3></div><label class="table-search">Buscar<input id="investmentSearch" type="search" placeholder="Dependencia o alcance"></label></header><div class="responsive-table"><table id="investmentTable"><thead><tr><th>Dependencia</th><th>Valor reportado</th><th>Participación</th><th>Alcance institucional</th><th></th></tr></thead><tbody>${investmentRows(year,data)}</tbody></table></div></article>
    </div>`;

    const execution = document.createElement("section");
    execution.id = "ejecucion";
    execution.className = "year-section dashboard-section";
    execution.dataset.dashboardGenerated = "true";
    execution.dataset.adminSection = "dashboard";
    execution.innerHTML = `<div class="site-shell">
      <div class="year-section__head"><div><span class="section-kicker">EJECUCIÓN Y RESULTADOS</span><h2>Porcentajes reportados e impacto institucional</h2></div><p>La ejecución porcentual se presenta por componente, sin convertirla en un promedio general que pueda ocultar diferencias.</p></div>
      <article class="dashboard-panel dashboard-panel--chart"><header><div><span>GRÁFICA 03</span><h3>Porcentajes de ejecución mencionados en la audiencia</h3></div><strong>${data.execution.length} componentes</strong></header><div class="chart-frame chart-frame--execution"><canvas id="executionChart" aria-label="Gráfica de porcentajes de ejecución por componente"></canvas></div><details class="chart-data-details"><summary>Ver y editar datos</summary><div>${data.execution.map(item=>`<div><span>${portal().helpers.escape(item.label)}</span><strong>${formatNumber(item.value)}%</strong>${adminEditButton("executionItem",item.id,year)}</div>`).join("")}</div></details></article>
      <div class="institution-results">${institutionalMarkup(data)}</div>
      <article class="key-points-panel"><div><span class="section-kicker">PUNTOS CLAVE</span><h3>Lectura ejecutiva del informe</h3></div><ul>${data.keyPoints.map(item=>`<li>${portal().helpers.escape(item)}</li>`).join("")}</ul></article>
    </div>`;

    const followup = document.createElement("section");
    followup.id = "seguimiento";
    followup.className = "year-section year-section--soft dashboard-section";
    followup.dataset.dashboardGenerated = "true";
    followup.dataset.adminSection = "dashboard";
    const yearCommitments = portal().state.commitments.filter(item=>Number(item.year)===Number(year));
    const progressAverage = yearCommitments.length ? Math.round(yearCommitments.reduce((sum,item)=>sum+Number(item.progress||0),0)/yearCommitments.length) : 0;
    followup.innerHTML = `<div class="site-shell">
      <div class="year-section__head"><div><span class="section-kicker">MATRIZ DE COMPROMISOS</span><h2>Seguimiento institucional</h2></div><p>Los compromisos del informe se cargan inicialmente sin avance inventado. El administrador puede actualizar estado, porcentaje, fecha y evidencia.</p></div>
      <div class="followup-summary">
        <article><span>Compromisos</span><strong>${yearCommitments.length}</strong></article>
        <article><span>Avance promedio</span><strong>${progressAverage}%</strong></article>
        <article><span>Alta prioridad</span><strong>${yearCommitments.filter(i=>i.priority==="Alta").length}</strong></article>
        <article class="followup-chart"><canvas id="commitmentPriorityChart" aria-label="Distribución de compromisos por prioridad"></canvas></article>
      </div>
      <article class="dashboard-panel dashboard-table-panel"><header><div><span class="section-kicker">CONTROL DE COMPROMISOS</span><h3>Responsables, prioridad y avance</h3></div><div class="table-filters"><select id="commitmentStatusFilter"><option value="all">Todos los estados</option><option value="pendiente">Pendiente</option><option value="en_progreso">En progreso</option><option value="cumplido">Cumplido</option><option value="bloqueado">Bloqueado</option></select><select id="commitmentPriorityFilter"><option value="all">Todas las prioridades</option><option>Alta</option><option>Estratégica</option><option>Transversal</option></select></div></header><div class="responsive-table"><table id="commitmentTable"><thead><tr><th>Compromiso</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Avance</th><th></th></tr></thead><tbody>${commitmentRows(year)}</tbody></table></div></article>
    </div>`;

    const requests = document.createElement("section");
    requests.id = "solicitudes";
    requests.className = "year-section dashboard-section";
    requests.dataset.dashboardGenerated = "true";
    requests.dataset.adminSection = "dashboard";
    const yearRequests = portal().state.citizenRequests.filter(item=>Number(item.year)===Number(year));
    const answered = yearRequests.filter(item=>!String(item.status).toLowerCase().includes("pendiente")).length;
    requests.innerHTML = `<div class="site-shell">
      <div class="year-section__head"><div><span class="section-kicker">PARTICIPACIÓN CIUDADANA</span><h2>Solicitudes, respuestas y espacios de gestión</h2></div><p>La matriz original contiene 24 registros y el informe consolidó ocho solicitudes depuradas.</p></div>
      <div class="request-summary"><article><strong>${yearRequests.length}</strong><span>Solicitudes consolidadas</span></article><article><strong>${answered}</strong><span>Con respuesta identificada</span></article><article><strong>${yearRequests.length-answered}</strong><span>Pendientes de respuesta específica</span></article></div>
      <article class="dashboard-panel dashboard-table-panel"><header><div><span class="section-kicker">MATRIZ CIUDADANA</span><h3>Estado de atención</h3></div><div class="table-filters"><input id="requestSearch" type="search" placeholder="Buscar solicitud o solicitante"><select id="requestStatusFilter"><option value="all">Todos los estados</option>${[...new Set(yearRequests.map(i=>i.status))].map(item=>`<option>${portal().helpers.escape(item)}</option>`).join("")}</select></div></header><div class="responsive-table"><table id="requestTable"><thead><tr><th>Solicitud</th><th>Solicitante</th><th>Tema</th><th>Estado</th><th></th></tr></thead><tbody>${requestRows(year)}</tbody></table></div></article>
    </div>`;

    indicatorSection.after(panorama,investment,execution,followup,requests);

    const subnav = document.querySelector(".year-subnav__inner");
    if (subnav) {
      subnav.querySelectorAll("[data-dashboard-link]").forEach(item=>item.remove());
      const links = [["panorama","Panorama"],["inversion","Inversión"],["ejecucion","Ejecución"],["seguimiento","Seguimiento"],["solicitudes","Solicitudes"]];
      links.forEach(([id,label])=>{const link=document.createElement("a");link.href=`#${id}`;link.textContent=label;link.dataset.dashboardLink="true";subnav.appendChild(link);});
    }
  }

  function bindFilters(year) {
    const investmentSearch = document.querySelector("#investmentSearch");
    investmentSearch?.addEventListener("input",()=>{
      const q=investmentSearch.value.toLowerCase();
      document.querySelectorAll("#investmentTable tbody tr").forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));
    });

    const filterCommitments = () => {
      const status=document.querySelector("#commitmentStatusFilter")?.value || "all";
      const priority=document.querySelector("#commitmentPriorityFilter")?.value || "all";
      document.querySelectorAll("#commitmentTable tbody tr").forEach(row=>row.hidden=!((status==="all"||row.dataset.status===status)&&(priority==="all"||row.dataset.priority===priority)));
    };
    document.querySelector("#commitmentStatusFilter")?.addEventListener("change",filterCommitments);
    document.querySelector("#commitmentPriorityFilter")?.addEventListener("change",filterCommitments);

    const filterRequests = () => {
      const q=(document.querySelector("#requestSearch")?.value || "").toLowerCase();
      const status=document.querySelector("#requestStatusFilter")?.value || "all";
      document.querySelectorAll("#requestTable tbody tr").forEach(row=>row.hidden=!(row.textContent.toLowerCase().includes(q)&&(status==="all"||row.dataset.status===status)));
    };
    document.querySelector("#requestSearch")?.addEventListener("input",filterRequests);
    document.querySelector("#requestStatusFilter")?.addEventListener("change",filterRequests);
  }

  function ensureDialog() {
    if (document.querySelector("#dashboardDetailDialog")) return;
    const dialog=document.createElement("dialog");
    dialog.className="dialog dashboard-detail-dialog";
    dialog.id="dashboardDetailDialog";
    dialog.innerHTML='<button class="dialog-close" data-dashboard-close aria-label="Cerrar ventana">×</button><div id="dashboardDetailContent"></div>';
    document.body.appendChild(dialog);
  }

  function openRequest(id) {
    const item=portal().state.citizenRequests.find(request=>request.id===id); if(!item)return;
    ensureDialog();
    document.querySelector("#dashboardDetailContent").innerHTML=`<span class="section-kicker">SOLICITUD CIUDADANA</span><h2>${portal().helpers.escape(item.topic)}</h2><div class="request-detail-grid"><div><small>Solicitante</small><strong>${portal().helpers.escape(item.applicant)}</strong></div><div><small>Estado</small><strong>${portal().helpers.escape(item.status)}</strong></div><div class="is-wide"><small>Radicados</small><p>${portal().helpers.escape(item.radicados)}</p></div></div><h3>Solicitud consolidada</h3><p>${portal().helpers.escape(item.request)}</p><div class="institutional-answer"><small>RESPUESTA INSTITUCIONAL</small><p>${portal().helpers.escape(item.response || "Pendiente de respuesta específica.")}</p></div><details><summary>Referencia y soporte</summary><p>${portal().helpers.escape(item.support)}</p></details>`;
    document.querySelector("#dashboardDetailDialog").showModal();
  }

  function bindEvents(year) {
    if (window.__rendicionDashboardEventsBound) return;
    window.__rendicionDashboardEventsBound = true;
    document.addEventListener("click",event=>{
      const request=event.target.closest("[data-request-detail]"); if(request) openRequest(request.dataset.requestDetail);
      const edit=event.target.closest("[data-dashboard-edit]");
      if(edit){event.preventDefault();event.stopPropagation();window.InlineAdmin?.openEntityEditor?.(edit.dataset.dashboardEdit,edit.dataset.entityId,edit.dataset.entityYear);}
      if(event.target.closest("[data-dashboard-close]")) document.querySelector("#dashboardDetailDialog")?.close();
    });
  }

  async function init(year) {
    const data=dashboard(year); if(!data)return;
    insertSections(year,data);
    bindFilters(year);bindEvents(year);ensureDialog();
    try {await loadChartJs();renderCharts(year,data);} catch(error){portal().helpers.toast(error.message);}
    window.dispatchEvent(new CustomEvent("portal:rendered"));
  }

  window.RendicionDashboard={init,refresh:init,destroy:destroyCharts};
})();