(function(){
  "use strict";
  const API = window.SPHomeBanner = window.SPHomeBanner || {};
  const mounted = new Map();

  function deepClone(value){ return JSON.parse(JSON.stringify(value)); }
  function asset(config,path){
    if(!path) return "";
    if(/^(data:|https?:|blob:|\/)/i.test(path)) return path;
    return (config.basePath || "") + path;
  }
  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function blobShape(index){
    const shapes=[
      '44% 56% 52% 48% / 46% 54% 42% 58%',
      '53% 47% 59% 41% / 42% 58% 46% 54%',
      '49% 51% 43% 57% / 58% 42% 56% 44%',
      '57% 43% 51% 49% / 47% 53% 41% 59%',
      '46% 54% 57% 43% / 52% 48% 58% 42%'
    ];
    return shapes[index % shapes.length];
  }
  function markup(config){
    const slides=config.slides || [];
    return `
      <div class="spb-banner__ambient"></div><div class="spb-banner__ribbon"></div>
      <div class="spb-banner__layout">
        <section class="spb-banner__left">
          <div class="spb-banner__eyebrow">${escapeHtml(config.eyebrow)}</div>
          <h2 class="spb-banner__title"><span>${escapeHtml(config.titleLine1)}</span><span>${escapeHtml(config.titleLine2)}</span></h2>
          <span class="spb-banner__script">${escapeHtml(config.scriptWord)}</span>
          <p class="spb-banner__description">${escapeHtml(config.description)}</p>
          <button class="spb-banner__transport" type="button" data-spb-transport aria-label="Pausar reproducción automática">
            <span class="spb-banner__count"><strong data-spb-current>01</strong> <span>/ <span data-spb-total>${String(slides.length).padStart(2,'0')}</span></span></span>
            <span class="spb-banner__play" aria-hidden="true"></span><span class="spb-banner__transport-label">Reproducción automática</span>
          </button>
        </section>
        <section class="spb-banner__right">
          <div class="spb-banner__console" data-spb-console>
            <div class="spb-banner__screen">
              <div class="spb-banner__viewport" data-spb-viewport aria-label="Galería territorial del inicio. Usa el scroll, las flechas del teclado o un clic para cambiar. Doble clic para conocer la historia.">
                <div data-spb-scenes>${slides.map((slide,i)=>`<div class="spb-banner__scene${i===0?' is-active':''}" data-index="${i}"><img src="${escapeHtml(asset(config,slide.image))}" alt="${escapeHtml(slide.alt || slide.title)}"></div>`).join('')}</div>
                <div class="spb-banner__shade"></div>
                <div class="spb-banner__top"><span class="spb-banner__pill" data-spb-tag></span><span class="spb-banner__pill" data-spb-year></span></div>
                <div class="spb-banner__controls">
                  <button class="spb-banner__sound" type="button" data-spb-sound aria-label="Desactivar sonido">
                    <svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"></path><path d="M15 9.5a4 4 0 0 1 0 5"></path><path d="M17.8 7a7.2 7.2 0 0 1 0 10"></path></svg>
                    <svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z"></path><path d="m16 10 5 5"></path><path d="m21 10-5 5"></path></svg>
                  </button>
                  <button class="spb-banner__progress" type="button" data-spb-progress aria-label="Pausar reproducción automática"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="spb-banner__track" cx="18" cy="18" r="16"></circle><circle class="spb-banner__meter" data-spb-meter cx="18" cy="18" r="16"></circle></svg><span class="spb-banner__pause-icon"></span></button>
                </div>
                <div class="spb-banner__caption" data-spb-caption>
                  <h2><span class="spb-banner__caption-main" data-spb-title-main></span><em class="spb-banner__caption-script" data-spb-title-script></em></h2>
                  <p data-spb-subtitle></p>
                  <span class="spb-banner__discover">doble clic para descubrir</span>
                </div>
              </div>
            </div>
            <div class="spb-banner__library" data-spb-library>${slides.map((slide,i)=>`<button class="spb-banner__thumb${i===0?' is-active':''}" style="--blob:${blobShape(i)}" type="button" data-index="${i}" aria-label="Ver ${escapeHtml(slide.title)}"><img src="${escapeHtml(asset(config,slide.image))}" alt=""></button>`).join('')}</div>
          </div>
        </section>
      </div>
      <div class="spb-banner__modal" data-spb-modal aria-hidden="true"><div class="spb-banner__modal-bg" data-spb-close></div><article class="spb-banner__modal-card" role="dialog" aria-modal="true" tabindex="-1"><button class="spb-banner__close" type="button" data-spb-close aria-label="Cerrar">×</button><div class="spb-banner__modal-image"><img data-spb-modal-image alt=""></div><div class="spb-banner__modal-copy"><small data-spb-modal-tag></small><h3 data-spb-modal-title></h3><p data-spb-modal-story></p></div></article></div>`;
  }

  function mount(target, inputConfig){
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if(!root) throw new Error('No se encontró el contenedor del banner.');
    if(mounted.has(root)) mounted.get(root).destroy();
    const config=deepClone(inputConfig || window.SP_HOME_BANNER_CONFIG || {});
    root.classList.add('spb-banner'); root.setAttribute('tabindex','0'); root.innerHTML=markup(config);

    const slides=config.slides || [];
    const sceneEls=[...root.querySelectorAll('.spb-banner__scene')];
    const thumbs=[...root.querySelectorAll('.spb-banner__thumb')];
    const viewport=root.querySelector('[data-spb-viewport]');
    const consoleEl=root.querySelector('[data-spb-console]');
    const transport=root.querySelector('[data-spb-transport]');
    const progress=root.querySelector('[data-spb-progress]');
    const soundBtn=root.querySelector('[data-spb-sound]');
    const meter=root.querySelector('[data-spb-meter]');
    const modal=root.querySelector('[data-spb-modal]');
    const modalCard=modal?.querySelector('.spb-banner__modal-card');
    const modalClose=modal?.querySelector('.spb-banner__close');
    if(modal && modal.parentElement!==document.body) document.body.appendChild(modal);
    const currentEl=root.querySelector('[data-spb-current]');
    const totalEl=root.querySelector('[data-spb-total]');
    const tagEl=root.querySelector('[data-spb-tag]');
    const yearEl=root.querySelector('[data-spb-year]');
    const titleMainEl=root.querySelector('[data-spb-title-main]');
    const titleScriptEl=root.querySelector('[data-spb-title-script]');
    const captionEl=root.querySelector('[data-spb-caption]');
    const subtitleEl=root.querySelector('[data-spb-subtitle]');
    const modalImage=root.querySelector('[data-spb-modal-image]');
    const modalTag=root.querySelector('[data-spb-modal-tag]');
    const modalTitle=root.querySelector('[data-spb-modal-title]');
    const modalStory=root.querySelector('[data-spb-modal-story]');
    totalEl.textContent=String(slides.length).padStart(2,'0');

    let active=0, playing=config.autoplay !== false, soundEnabled=config.soundEnabled !== false;
    let timer=0, raf=0, start=0, audioContext=null, audioUnlocked=false, wheelLock=false, clickTimer=0, modalReturnFocus=null, previousBodyOverflow="";
    const circumference=100.53;

    function readableRgb(hex, fallback=[47,110,232]){
      const clean=String(hex || '').trim().replace('#','');
      if(!/^[0-9a-f]{6}$/i.test(clean)) return fallback;
      return clean.match(/.{2}/g).map(value=>parseInt(value,16));
    }
    function setTheme(slide){
      const accent=slide.accent || '#2f6ee8';
      root.style.setProperty('--spb-accent',accent);
      root.style.setProperty('--spb-accent-rgb',readableRgb(accent).join(','));
      root.style.setProperty('--spb-soft',slide.soft || '#dbe8ff');
      root.style.setProperty('--spb-cursive-color',slide.cursiveColor || accent);
      root.style.setProperty('--spb-compact-color',slide.compactColor || '#4d6076');
      root.style.setProperty('--spb-caption-title',slide.captionTitleColor || '#ffffff');
      root.style.setProperty('--spb-caption-description',slide.captionDescriptionColor || '#ffffff');
      if(modal){
        modal.style.setProperty('--spb-accent',accent);
        modal.style.setProperty('--spb-accent-rgb',readableRgb(accent).join(','));
        modal.style.setProperty('--spb-cursive-color',slide.cursiveColor || accent);
      }
    }
    function updateText(){
      const slide=slides[active]; if(!slide) return;
      const fullTitle=slide.title || [slide.titleMain,slide.titleScript].filter(Boolean).join(' ');
      currentEl.textContent=String(active+1).padStart(2,'0');
      tagEl.textContent=slide.tag || '';
      yearEl.textContent=slide.year || '';
      titleMainEl.textContent=slide.titleMain || fullTitle;
      titleScriptEl.textContent=slide.titleScript || '';
      titleScriptEl.hidden=!slide.titleScript;
      subtitleEl.textContent=slide.subtitle || '';
      setTheme(slide);
      if(captionEl){
        captionEl.classList.remove('is-refreshing');
        void captionEl.offsetWidth;
        captionEl.classList.add('is-refreshing');
      }
      thumbs.forEach((thumb,i)=>thumb.classList.toggle('is-active',i===active));
      const thumb=thumbs[active]; if(thumb){thumb.classList.remove('is-pop'); void thumb.offsetWidth; thumb.classList.add('is-pop');}
    }
    function unlockAudio(){
      if(audioUnlocked) return;
      try{audioContext=new (window.AudioContext||window.webkitAudioContext)(); if(audioContext.state==='suspended') audioContext.resume(); audioUnlocked=true;}catch(_){audioUnlocked=false;}
    }
    function sound(direction){
      if(!soundEnabled||!audioUnlocked||!audioContext) return;
      const now=audioContext.currentTime;
      const gain=audioContext.createGain(); gain.gain.setValueAtTime(.0001,now); gain.gain.exponentialRampToValueAtTime(.05,now+.008); gain.gain.exponentialRampToValueAtTime(.0001,now+.13); gain.connect(audioContext.destination);
      const osc=audioContext.createOscillator(); osc.type='sine'; osc.frequency.setValueAtTime(direction>0?430:560,now); osc.frequency.exponentialRampToValueAtTime(direction>0?690:360,now+.11); osc.connect(gain); osc.start(now); osc.stop(now+.15);
    }
    function animateProgress(){
      cancelAnimationFrame(raf); start=performance.now(); meter.style.strokeDashoffset=String(circumference);
      const tick=now=>{const p=Math.min((now-start)/(config.intervalMs||7200),1);meter.style.strokeDashoffset=String(circumference*(1-p));if(p<1&&playing)raf=requestAnimationFrame(tick)}; raf=requestAnimationFrame(tick);
    }
    function schedule(){clearTimeout(timer);cancelAnimationFrame(raf);if(!playing){meter.style.strokeDashoffset=String(circumference);return;}animateProgress();timer=setTimeout(()=>go((active+1)%slides.length,1,false),(config.intervalMs||7200));}
    function go(index,direction=1,user=true){
      if(!slides.length||index===active){if(user)schedule();return;}
      if(user)unlockAudio();
      const old=active, oldEl=sceneEls[old], newEl=sceneEls[index];
      sceneEls.forEach(el=>el.classList.remove('is-entering-next','is-entering-prev','is-leaving-left','is-leaving-right'));
      oldEl.classList.add(direction>0?'is-leaving-left':'is-leaving-right');
      newEl.classList.add(direction>0?'is-entering-next':'is-entering-prev'); newEl.style.visibility='visible';
      active=index; updateText(); sound(direction); schedule();
      setTimeout(()=>{oldEl.className='spb-banner__scene';newEl.className='spb-banner__scene is-active';},930);
    }
    function openModal(){
      const slide=slides[active]; if(!slide||!modal)return;
      modalReturnFocus=document.activeElement;
      previousBodyOverflow=document.body.style.overflow;
      modalImage.src=asset(config,slide.image);modalImage.alt=slide.alt||slide.title||'';modalTag.textContent=slide.tag||'';modalTitle.textContent=slide.title || [slide.titleMain,slide.titleScript].filter(Boolean).join(' ');modalStory.textContent=slide.story||'';
      modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';clearTimeout(timer);cancelAnimationFrame(raf);
      requestAnimationFrame(()=>requestAnimationFrame(()=>modalClose?.focus({preventScroll:true})));
    }
    function closeModal(event){
      event?.preventDefault?.();event?.stopPropagation?.();
      if(!modal||!modal.classList.contains('is-open'))return;
      modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');document.body.style.overflow=previousBodyOverflow;
      modalReturnFocus?.focus?.({preventScroll:true});modalReturnFocus=null;schedule();
    }
    function handleModalKeydown(event){
      if(!modal?.classList.contains('is-open'))return;
      if(event.key==='Escape'){closeModal(event);return;}
      if(event.key!=='Tab')return;
      const focusable=[...modal.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    function setPlaying(value){playing=value;transport.classList.toggle('is-paused',!playing);progress.classList.toggle('is-paused',!playing);transport.setAttribute('aria-label',playing?'Pausar reproducción automática':'Reanudar reproducción automática');progress.setAttribute('aria-label',playing?'Pausar reproducción automática':'Reanudar reproducción automática');schedule();}

    thumbs.forEach((thumb,i)=>thumb.addEventListener('click',()=>go(i,i>active?1:-1,true)));
    transport.addEventListener('click',()=>{unlockAudio();setPlaying(!playing)});
    progress.addEventListener('click',()=>{unlockAudio();setPlaying(!playing)});
    soundBtn.addEventListener('click',()=>{unlockAudio();soundEnabled=!soundEnabled;soundBtn.classList.toggle('is-muted',!soundEnabled);soundBtn.setAttribute('aria-label',soundEnabled?'Desactivar sonido':'Activar sonido')});
    viewport.addEventListener('click',()=>{clearTimeout(clickTimer);clickTimer=setTimeout(()=>go((active+1)%slides.length,1,true),220)});
    viewport.addEventListener('dblclick',()=>{clearTimeout(clickTimer);if(config.openHistoryOnDoubleClick!==false)openModal()});
    if(config.wheelNavigation!==false) viewport.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)<10||wheelLock)return;e.preventDefault();wheelLock=true;go((active+(e.deltaY>0?1:-1)+slides.length)%slides.length,e.deltaY>0?1:-1,true);setTimeout(()=>wheelLock=false,520)},{passive:false});
    root.addEventListener('keydown',e=>{if(config.keyboardNavigation===false)return;if(e.key==='ArrowRight'){e.preventDefault();go((active+1)%slides.length,1,true)}else if(e.key==='ArrowLeft'){e.preventDefault();go((active-1+slides.length)%slides.length,-1,true)}else if(e.key==='Enter'){e.preventDefault();openModal()}else if(e.key===' '){e.preventDefault();setPlaying(!playing)}else if(e.key==='Escape'){closeModal()}});
    modal?.addEventListener('click',event=>{if(event.target.closest('[data-spb-close]'))closeModal(event)});
    modalClose?.addEventListener('pointerup',event=>closeModal(event));
    modalClose?.addEventListener('click',event=>closeModal(event));
    modalCard?.addEventListener('click',event=>event.stopPropagation());
    document.addEventListener('keydown',handleModalKeydown,true);
    viewport.addEventListener('mousemove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=viewport.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;consoleEl.style.transform=`rotateX(${y*-2.2}deg) rotateY(${x*3.2}deg) translate3d(${x*3}px,${y*2}px,0)`});
    viewport.addEventListener('mouseleave',()=>consoleEl.style.transform='');
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){if(playing)schedule()}else{clearTimeout(timer);cancelAnimationFrame(raf)}})},{threshold:.15}); observer.observe(root);

    updateText(); soundBtn.classList.toggle('is-muted',!soundEnabled); schedule();
    const instance={
      getConfig:()=>deepClone(config),
      goTo:index=>go(Math.max(0,Math.min(index,slides.length-1)),index>active?1:-1,true),
      update:newConfig=>mount(root,newConfig),
      destroy(){clearTimeout(timer);cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('keydown',handleModalKeydown,true);if(modal?.classList.contains('is-open'))document.body.style.overflow=previousBodyOverflow;modal?.remove();root.innerHTML='';root.classList.remove('spb-banner');mounted.delete(root)}
    };
    mounted.set(root,instance); return instance;
  }

  API.mount=mount;
  API.getInstance=target=>mounted.get(typeof target==='string'?document.getElementById(target):target);
  API.autoMount=function(){document.querySelectorAll('[data-sp-home-banner]').forEach(el=>{if(!mounted.has(el))mount(el,window.SP_HOME_BANNER_CONFIG)});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',API.autoMount);else API.autoMount();
})();
