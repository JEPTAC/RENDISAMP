(() => {
"use strict";
if (window.__SP_FEATURED_PROJECTS_INLINE__) return;
window.__SP_FEATURED_PROJECTS_INLINE__ = true;

const FALLBACK_IMAGE = "assets/cinematica/parque-himno-1600.webp";
const DEFAULT_PROJECTS = [
  {id:"destacado-1",category:"Infraestructura",eyebrow:"CONTENIDO INICIAL EDITABLE",year:"VIGENCIA 2026",title:"Proyecto de infraestructura",description:"Espacio preparado para presentar una iniciativa prioritaria, sus avances y la evidencia disponible.",progress:"0 %",period:"2026",accent:"#1769a8",image:"assets/cinematica/parque-himno-1600.webp",alt:"Vista del parque principal de San Pedro"},
  {id:"destacado-2",category:"Territorio",eyebrow:"CONTENIDO INICIAL EDITABLE",year:"VIGENCIA 2026",title:"Proyecto territorial",description:"Este banner permanece visible mientras se cargan los datos y puede editarse al iniciar sesión como administrador.",progress:"0 %",period:"2026",accent:"#087f6b",image:"assets/cinematica/iglesia-san-pedro-1600.webp",alt:"Iglesia de San Pedro y entorno urbano"},
  {id:"destacado-3",category:"Gestión pública",eyebrow:"CONTENIDO INICIAL EDITABLE",year:"VIGENCIA 2026",title:"Proyecto institucional",description:"Utilice el editor para sustituir la fotografía, el título, la descripción, el avance y el color del proyecto.",progress:"0 %",period:"2026",accent:"#6b4bc3",image:"assets/cinematica/alcaldia-san-pedro-1600.webp",alt:"Edificio de la Alcaldía de San Pedro"}
];
const STORAGE_KEY = "san-pedro-proyectos-destacados-reel-v3";
const INTEGRATED_MODE = true;
const root = document.querySelector(".featured-projects-host");
if (!root) return;
const $ = selector => root.querySelector(selector);
let CAN_EDIT = false;
const stage = $('#fpCard');
const image = $('#fpImage');
const category = $('#fpCategory');
const year = $('#fpYear');
const eyebrow = $('#fpEyebrow');
const title = $('#fpTitle');
const description = $('#fpDescription');
const progress = $('#fpProgress');
const period = $('#fpPeriod');
const current = $('#fpCurrent');
const total = $('#fpTotal');
const reelTrack = $('#fpReelTrack');
const reelViewport = $('#fpReelViewport');
const peek1 = $('#fpPeek1');
const peek2 = $('#fpPeek2');
const autoBtn = $('#fpAuto');
const soundBtn = $('#fpSound');
const openBtn = $('#fpOpen');
const dialog = $('#fpDialog');
const visual = $('.fp__visual');
const empty = $('#fpEmpty');
const editor = $('#fpEditor');
const editorForm = $('#fpEditorForm');
const imageInput = $('#fpProjectImage');
const uploadZone = $('#fpUploadZone');
const uploadPreview = $('#fpUploadPreview');
const editBtn = $('#fpEditProject');
const deleteBtn = $('#fpDeleteProject');
const adminActions = $('#fpAdminActions');
const emptyAdd = $('#fpEmptyAdd');

let PROJECTS = [];
let active = 0;
let auto = true;
let sound = true;
let timer = 0;
let wheelLocked = false;
let dragging = false;
let startY = 0;
let lastY = 0;
let audioCtx = null;
let editorMode = 'add';
let pendingImage = '';
let lastPortalSignature = '';
function normalizeProject(project = {}) {
  const accent = /^#[0-9a-f]{6}$/i.test(project.accent || '') ? project.accent : '#2f6ff2';
  const textColor = /^#[0-9a-f]{6}$/i.test(project.textColor || '') ? project.textColor : '#ffffff';
  const rgb = hexToRgb(accent);
  return {
    id: String(project.id || `featured-${Math.random().toString(36).slice(2, 9)}`),
    category: project.category || 'Proyecto',
    eyebrow: project.eyebrow || 'PROYECTO DESTACADO',
    year: project.year || 'VIGENCIA',
    title: project.title || 'Proyecto sin título',
    description: project.description || '',
    progress: project.progress ?? '—',
    period: project.period ?? '—',
    accent,
    textColor,
    rgb: `${rgb.r},${rgb.g},${rgb.b}`,
    soft: mixHex(accent, '#ffffff', .68),
    image: String(project.image || FALLBACK_IMAGE),
    alt: String(project.alt || project.title || 'Fotografía del proyecto')
  };
}

function canEditPortal() {
  const api = window.Portal;
  let stored = false;
  let local = false;
  try {
    stored = sessionStorage.getItem(api?.KEYS?.admin || "sp_v6_admin") === "1";
    local = sessionStorage.getItem("sp_admin_mode") === "local";
  } catch (_) {}
  return Boolean(api?.state?.admin || stored || local || document.querySelector("#adminSession:not([hidden])"));
}

function projectSourceFromPortal() {
  const content = window.Portal?.state?.content;
  if (!content || typeof content !== "object") return [];
  if (content.featuredProjectsConfigured && Array.isArray(content.featuredProjects) && content.featuredProjects.length) {
    return content.featuredProjects;
  }
  if (Array.isArray(content.projects)) {
    const derived = content.projects.filter(project => String(project?.image || "").trim()).slice(0, 8).map(project => ({
      id: project.id,
      category: project.category,
      eyebrow: project.type || "PROYECTO DESTACADO",
      year: project.year || "VIGENCIA",
      title: project.title,
      description: project.description,
      progress: project.metric || (Number.isFinite(Number(project.progress)) ? `${Number(project.progress)} %` : "—"),
      period: project.year || "—",
      accent: project.color,
      image: project.image,
      alt: `Fotografía de ${project.title || "proyecto"}`
    }));
    if (derived.length) return derived;
  }
  return [];
}

function cacheProjects(projects) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch (_) {}
}

function cachedProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}

function loadProjects() {
  const sources = [projectSourceFromPortal(), cachedProjects(), DEFAULT_PROJECTS];
  const selected = sources.find(source => Array.isArray(source) && source.length) || DEFAULT_PROJECTS;
  const normalized = selected.map(normalizeProject).slice(0, 8);
  cacheProjects(normalized);
  return normalized;
}

function showNotice(message) {
  if (!message) return;
  const notice = document.createElement('div');
  notice.className = 'fp-save-notice';
  notice.textContent = message;
  document.body.appendChild(notice);
  requestAnimationFrame(() => notice.classList.add('is-visible'));
  setTimeout(() => { notice.classList.remove('is-visible'); setTimeout(() => notice.remove(), 240); }, 1900);
}

function saveProjects() {
  const api = window.Portal;
  CAN_EDIT = canEditPortal();
  if (!api || !CAN_EDIT) {
    showNotice('La sesión no tiene permisos de edición.');
    return;
  }
  const normalized = PROJECTS.map(normalizeProject).slice(0, 8);
  if (JSON.stringify(normalized).length > 760000) {
    api.helpers?.toast?.('Las imágenes del banner superan el tamaño seguro.');
    showNotice('Reduce el peso de las imágenes antes de guardar.');
    return;
  }
  if (!api.state.content || typeof api.state.content !== 'object') api.state.content = {};
  api.state.content.featuredProjects = normalized;
  api.state.content.featuredProjectsConfigured = true;
  try {
    api.helpers.save();
    cacheProjects(normalized);
    api.helpers.toast?.('Banner de Proyectos guardado correctamente.');
    showNotice('Cambios guardados correctamente.');
    window.dispatchEvent(new CustomEvent('portal:datachange', { detail: { source: 'featured-projects-inline' } }));
  } catch (error) {
    console.error('[Banner Proyectos] No fue posible guardar.', error);
    showNotice('No fue posible guardar los cambios.');
  }
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {r: parseInt(value.slice(0,2),16), g: parseInt(value.slice(2,4),16), b: parseInt(value.slice(4,6),16)};
}

function mixHex(a, b, amount) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const channel = key => Math.round(A[key] + (B[key] - A[key]) * amount).toString(16).padStart(2,'0');
  return `#${channel('r')}${channel('g')}${channel('b')}`;
}

function syncAdminUi() {
  CAN_EDIT = canEditPortal();
  if (adminActions) adminActions.hidden = !CAN_EDIT;
  if (emptyAdd) emptyAdd.hidden = !CAN_EDIT;
  root.classList.toggle('can-edit', CAN_EDIT);
  root.classList.toggle('is-guest', !CAN_EDIT);
}

function syncFromPortal({ force = false } = {}) {
  const incoming = projectSourceFromPortal();
  CAN_EDIT = canEditPortal();
  syncAdminUi();
  if (!incoming.length) {
    root.setAttribute('aria-busy', 'false');
    return;
  }
  const normalized = incoming.map(normalizeProject).slice(0, 8);
  const signature = JSON.stringify(normalized.map(project => [project.id, project.title, project.image, project.progress, project.accent, project.textColor]));
  if (!force && signature === lastPortalSignature) return;
  lastPortalSignature = signature;
  PROJECTS = normalized;
  active = Math.min(active, Math.max(0, PROJECTS.length - 1));
  cacheProjects(PROJECTS);
  refresh(false);
  root.setAttribute('aria-busy', 'false');
}

function setEmptyState() {
  const isEmpty = PROJECTS.length === 0;
  syncAdminUi();
  visual.classList.toggle('is-empty', isEmpty);
  empty.hidden = !isEmpty;
  editBtn.disabled = isEmpty;
  openBtn.disabled = isEmpty;
  autoBtn.disabled = isEmpty;
  total.textContent = String(PROJECTS.length).padStart(2, '0');
  current.textContent = isEmpty ? '00' : String(active + 1).padStart(2, '0');
  if (isEmpty) {
    const overline = empty.querySelector('.fp__empty-overline');
    const heading = empty.querySelector('h2');
    const copy = empty.querySelector('p:last-of-type');
    if (CAN_EDIT) {
      if (overline) overline.textContent = 'Carrete vacío';
      if (heading) heading.innerHTML = 'Agrega tu primer <span>proyecto</span>';
      if (copy) copy.textContent = 'Carga las fotografías y la información para construir el banner destacado.';
    } else {
      if (overline) overline.textContent = 'Portafolio público';
      if (heading) heading.innerHTML = 'Proyectos <span>en preparación</span>';
      if (copy) copy.textContent = 'La Administración Municipal está preparando los proyectos que se destacarán en este espacio.';
    }
    clearInterval(timer);
    reelTrack.innerHTML = '';
    image.removeAttribute('src');
    image.alt = '';
    peek1.style.backgroundImage = 'none';
    peek2.style.backgroundImage = 'none';
  }
}

function makeReel() {
  if (!PROJECTS.length) {
    reelTrack.innerHTML = '<div class="fp__reel-empty">Agrega proyectos para construir el carrete.</div>';
    return;
  }
  reelTrack.innerHTML = PROJECTS.map((project, index) => `
    <button class="fp__reel-item" type="button" data-index="${index}" aria-label="Seleccionar ${escapeHtml(project.title)}">
      <img src="${project.image}" alt="">
      <span class="fp__reel-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="fp__reel-title">${escapeHtml(project.title)}</span>
    </button>`).join('');
  reelTrack.querySelectorAll('.fp__reel-item').forEach(button => {
    button.addEventListener('click', () => goTo(Number(button.dataset.index)));
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freq, duration = .06, type = 'sine', gain = .018, delay = 0) {
  if (!sound) return;
  ensureAudio();
  const time = audioCtx.currentTime + delay;
  const oscillator = audioCtx.createOscillator();
  const volume = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, time);
  volume.gain.setValueAtTime(.0001, time);
  volume.gain.exponentialRampToValueAtTime(gain, time + .008);
  volume.gain.exponentialRampToValueAtTime(.0001, time + duration);
  oscillator.connect(volume).connect(audioCtx.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + .03);
}

function soundNav() { tone(520, .05, 'sine', .015); tone(720, .05, 'sine', .010, .03); }
function soundOpen() { tone(430, .10, 'triangle', .019); tone(650, .12, 'sine', .014, .05); tone(870, .14, 'sine', .010, .10); }

function updateReel() {
  const items = [...reelTrack.querySelectorAll('.fp__reel-item')];
  items.forEach((element, index) => element.classList.toggle('is-active', index === active));
  if (!items.length) return;
  if (innerWidth <= 760) {
    items[active]?.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
    return;
  }
  const item = items[active];
  const viewportHeight = reelViewport.clientHeight;
  const center = item.offsetTop + item.offsetHeight / 2;
  reelTrack.style.transform = `translateY(${Math.round(viewportHeight / 2 - center)}px)`;
}

function applyProject(animate = true) {
  setEmptyState();
  if (!PROJECTS.length) return;
  active = Math.min(active, PROJECTS.length - 1);
  const project = PROJECTS[active];
  const nextOne = PROJECTS[(active + 1) % PROJECTS.length];
  const nextTwo = PROJECTS[(active + 2) % PROJECTS.length];
  root.style.setProperty('--accent', project.accent);
  root.style.setProperty('--accent-rgb', project.rgb);
  root.style.setProperty('--accent-soft', project.soft);
  root.style.setProperty('--fp-photo-text', project.textColor || '#ffffff');
  image.classList.remove('is-fallback');
  image.src = project.image;
  image.alt = project.alt;
  category.textContent = project.category;
  year.textContent = project.year;
  eyebrow.textContent = project.eyebrow;
  title.textContent = project.title;
  description.textContent = project.description;
  progress.textContent = project.progress;
  period.textContent = project.period;
  current.textContent = String(active + 1).padStart(2, '0');
  total.textContent = String(PROJECTS.length).padStart(2, '0');
  peek1.style.backgroundImage = nextOne ? `linear-gradient(rgba(255,255,255,.05),rgba(255,255,255,.05)),url("${nextOne.image}")` : 'none';
  peek2.style.backgroundImage = nextTwo ? `linear-gradient(rgba(255,255,255,.08),rgba(255,255,255,.08)),url("${nextTwo.image}")` : 'none';
  if (animate) {
    image.classList.remove('is-entering');
    void image.offsetWidth;
    image.classList.add('is-entering');
  }
  updateReel();
  restartAuto();
}

function refresh(animate = false) {
  makeReel();
  setEmptyState();
  applyProject(animate);
}

function goTo(index, play = true) {
  if (!PROJECTS.length) return;
  const nextIndex = (index + PROJECTS.length) % PROJECTS.length;
  if (nextIndex === active) return;
  active = nextIndex;
  applyProject(true);
  if (play) soundNav();
}

function next() { goTo(active + 1); }
function previous() { goTo(active - 1); }
function restartAuto() { clearInterval(timer); if (auto && PROJECTS.length > 1) timer = setInterval(next, 6800); }

function openProject() {
  if (!PROJECTS.length) return;
  const project = PROJECTS[active];
  $('#fpDialogImage').src = project.image;
  $('#fpDialogImage').alt = project.alt;
  $('#fpDialogEyebrow').textContent = `${project.category} · ${project.year}`;
  $('#fpDialogTitle').textContent = project.title;
  $('#fpDialogDesc').textContent = project.description;
  soundOpen();
  dialog.showModal();
}

function onWheel(event) {
  if (!PROJECTS.length || dialog.open || editor.open || wheelLocked) return;
  const delta = event.deltaY || event.deltaX;
  if (Math.abs(delta) < 8) return;
  event.preventDefault();
  wheelLocked = true;
  delta > 0 ? next() : previous();
  setTimeout(() => wheelLocked = false, 460);
}

function endDrag(event) {
  if (!dragging) return;
  const delta = lastY - startY;
  dragging = false;
  stage.classList.remove('is-dragging');
  try { stage.releasePointerCapture(event.pointerId); } catch {}
  if (Math.abs(delta) > 52) delta < 0 ? next() : previous();
  restartAuto();
}

function openEditor(mode) {
  if (!CAN_EDIT) return;
  editorMode = mode;
  pendingImage = '';
  editorForm.reset();
  $('#fpFieldAccent').value = '#2f6ff2';
  $('#fpFieldTextColor').value = '#ffffff';
  uploadZone.classList.remove('has-image');
  uploadPreview.removeAttribute('src');
  imageInput.required = mode === 'add';
  deleteBtn.hidden = mode !== 'edit';
  $('#fpEditorHeading').textContent = mode === 'edit' ? 'Editar proyecto' : 'Agregar proyecto';
  if (mode === 'edit' && PROJECTS.length) {
    const project = PROJECTS[active];
    $('#fpFieldTitle').value = project.title;
    $('#fpFieldCategory').value = project.category;
    $('#fpFieldEyebrow').value = project.eyebrow;
    $('#fpFieldYear').value = project.year;
    $('#fpFieldDescription').value = project.description;
    $('#fpFieldProgress').value = project.progress;
    $('#fpFieldPeriod').value = project.period;
    $('#fpFieldAccent').value = project.accent;
    $('#fpFieldTextColor').value = project.textColor || '#ffffff';
    $('#fpFieldAlt').value = project.alt;
    uploadPreview.src = project.image;
    uploadZone.classList.add('has-image');
  }
  editor.showModal();
  setTimeout(() => $('#fpFieldTitle').focus(), 80);
}

async function optimizeImage(file) {
  if (!file) return '';
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen válido.');
  const source = await fileToDataUrl(file);
  const bitmap = await loadImage(source);
  const maxWidth = 1200;
  const maxHeight = 675;
  const ratio = Math.min(1, maxWidth / bitmap.naturalWidth, maxHeight / bitmap.naturalHeight);
  const width = Math.max(1, Math.round(bitmap.naturalWidth * ratio));
  const height = Math.max(1, Math.round(bitmap.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', {alpha: false});
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  let quality = .82;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > 130000 && quality > .46) {
    quality -= .07;
    result = canvas.toDataURL('image/jpeg', quality);
  }
  return result;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });
}

async function handleImageFile(file) {
  try {
    uploadZone.setAttribute('aria-busy', 'true');
    pendingImage = await optimizeImage(file);
    uploadPreview.src = pendingImage;
    uploadZone.classList.add('has-image');
  } catch (error) {
    alert(error.message || 'No fue posible procesar la imagen.');
  } finally {
    uploadZone.removeAttribute('aria-busy');
  }
}

function formProject() {
  const form = new FormData(editorForm);
  const existing = editorMode === 'edit' ? PROJECTS[active] : null;
  const selectedImage = pendingImage || existing?.image || '';
  const accent = String(form.get('accent') || '#2f6ff2');
  const textColor = String(form.get('textColor') || '#ffffff');
  return normalizeProject({
    title: String(form.get('title') || '').trim(),
    category: String(form.get('category') || '').trim() || 'Proyecto',
    eyebrow: String(form.get('eyebrow') || '').trim() || 'PROYECTO DESTACADO',
    year: String(form.get('year') || '').trim() || 'VIGENCIA',
    description: String(form.get('description') || '').trim(),
    progress: String(form.get('progress') || '').trim() || '—',
    period: String(form.get('period') || '').trim() || '—',
    accent,
    textColor,
    alt: String(form.get('alt') || '').trim() || `Fotografía de ${String(form.get('title') || 'proyecto').trim()}`,
    image: selectedImage
  });
}

PROJECTS = loadProjects();
refresh(false);
syncAdminUi();
root.setAttribute('aria-busy', 'false');


stage.addEventListener('wheel', onWheel, {passive:false});
reelViewport.addEventListener('wheel', onWheel, {passive:false});
stage.addEventListener('pointerdown', event => {
  if (!PROJECTS.length || event.button !== 0) return;
  dragging = true;
  startY = lastY = event.clientY;
  stage.classList.add('is-dragging');
  stage.setPointerCapture(event.pointerId);
  clearInterval(timer);
  ensureAudio();
});
stage.addEventListener('pointermove', event => { if (dragging) lastY = event.clientY; });
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('dblclick', openProject);
openBtn.addEventListener('click', event => { event.stopPropagation(); openProject(); });

window.addEventListener('keydown', event => {
  if (dialog.open || editor.open || !PROJECTS.length) return;
  if (!$('#featuredProjects').matches(':hover') && document.activeElement !== stage) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); next(); }
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
  else if (event.key === 'Enter') { event.preventDefault(); openProject(); }
});

autoBtn.addEventListener('click', () => {
  auto = !auto;
  autoBtn.setAttribute('aria-pressed', String(auto));
  autoBtn.querySelector('span').textContent = auto ? 'Reproducción automática' : 'Reproducción pausada';
  restartAuto();
  soundOpen();
});
soundBtn.addEventListener('click', () => {
  sound = !sound;
  soundBtn.setAttribute('aria-pressed', String(sound));
  soundBtn.setAttribute('aria-label', sound ? 'Desactivar sonidos' : 'Activar sonidos');
  soundBtn.style.opacity = sound ? '1' : '.48';
  if (sound) { ensureAudio(); soundOpen(); }
});

$('#fpDialogClose').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
$('#fpAddProject').addEventListener('click', () => { if (CAN_EDIT) openEditor('add'); });
$('#fpEmptyAdd').addEventListener('click', () => { if (CAN_EDIT) openEditor('add'); });
editBtn.addEventListener('click', () => { if (CAN_EDIT) openEditor('edit'); });
$('#fpEditorX').addEventListener('click', () => editor.close());
$('#fpEditorCancel').addEventListener('click', () => editor.close());
editor.addEventListener('click', event => { if (event.target === editor) editor.close(); });

imageInput.addEventListener('change', event => handleImageFile(event.target.files?.[0]));
['dragenter','dragover'].forEach(type => uploadZone.addEventListener(type, event => { event.preventDefault(); uploadZone.classList.add('is-dragging'); }));
['dragleave','drop'].forEach(type => uploadZone.addEventListener(type, event => { event.preventDefault(); uploadZone.classList.remove('is-dragging'); }));
uploadZone.addEventListener('drop', event => {
  const file = event.dataTransfer.files?.[0];
  if (file) handleImageFile(file);
});

editorForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!CAN_EDIT) return;
  const project = formProject();
  if (!project.image) { alert('Selecciona una fotografía para el proyecto.'); return; }
  if (!project.title || !project.description) { alert('Completa el título y la descripción.'); return; }
  if (editorMode === 'edit') PROJECTS[active] = project;
  else { PROJECTS.push(project); active = PROJECTS.length - 1; }
  saveProjects();
  editor.close();
  refresh(true);
  soundOpen();
});

deleteBtn.addEventListener('click', () => {
  if (!CAN_EDIT || !PROJECTS.length) return;
  if (!confirm(`¿Eliminar “${PROJECTS[active].title}” del carrete?`)) return;
  PROJECTS.splice(active, 1);
  active = Math.max(0, Math.min(active, PROJECTS.length - 1));
  saveProjects();
  editor.close();
  refresh(false);
});

new ResizeObserver(() => updateReel()).observe(root);
window.addEventListener('resize', updateReel, {passive:true});
['portal:datachange','firebase:auth','portal:adminlogout'].forEach(eventName => {
  window.addEventListener(eventName, event => {
    if (event?.detail?.source === 'featured-projects-inline') return;
    window.setTimeout(() => syncFromPortal(), 0);
  });
});
window.addEventListener('pageshow', () => syncFromPortal({ force: true }));
image.addEventListener('error', () => {
  if (image.src.endsWith(FALLBACK_IMAGE)) return;
  image.classList.add('is-fallback');
  image.src = FALLBACK_IMAGE;
});
reelTrack.addEventListener('error', event => {
  if (event.target instanceof HTMLImageElement && !event.target.src.endsWith(FALLBACK_IMAGE)) event.target.src = FALLBACK_IMAGE;
}, true);
window.setTimeout(() => syncFromPortal({ force: true }), 0);
window.setTimeout(() => syncFromPortal(), 700);
['pointerdown','keydown','wheel','touchstart'].forEach(eventName => window.addEventListener(eventName, ensureAudio, {once:true, passive:true}));
})();
