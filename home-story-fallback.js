(() => {
  "use strict";

  const READY = "11.32-native-scroll-story-fallback";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value,min,max) => Math.min(Math.max(value,min),max);

  function makeScrollController(section,count,onProgress,options = {}) {
    let start = 0;
    let end = 1;
    let raf = 0;
    let snapTimer = 0;
    let snapping = false;

    section.style.setProperty(options.countProperty || "--story-count",String(count));
    section.classList.add(options.nativeClass || "is-native-story");

    const measure = () => {
      const rect = section.getBoundingClientRect();
      start = rect.top + window.scrollY;
      end = start + Math.max(section.offsetHeight - window.innerHeight,1);
    };

    const render = () => {
      raf = 0;
      const progress = clamp((window.scrollY - start) / Math.max(end - start,1),0,1);
      const active = window.scrollY >= start - 2 && window.scrollY <= end + 2;
      section.classList.toggle("is-scroll-active",active);
      onProgress(progress,active);
    };

    const snap = () => {
      snapTimer = 0;
      if (snapping || reduced.matches || count < 2) return;
      const raw = (window.scrollY - start) / Math.max(end - start,1);
      if (raw <= 0 || raw >= 1) return;
      const step = 1 / (count - 1);
      const target = Math.round(raw / step) * step;
      if (Math.abs(target - raw) < .025) return;
      snapping = true;
      window.scrollTo({top:start + (end - start) * target,behavior:"smooth"});
      window.setTimeout(() => {snapping = false;},280);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(render);
      clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snap,140);
    };

    const refresh = () => {
      measure();
      render();
    };

    measure();
    render();
    requestAnimationFrame(refresh);
    window.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",refresh,{passive:true});
    window.addEventListener("orientationchange",refresh,{passive:true});

    return {
      go(index,behavior = "smooth") {
        const ratio = count > 1 ? clamp(index,0,count - 1) / (count - 1) : 0;
        window.scrollTo({top:start + (end - start) * ratio,behavior});
      },
      skip() {window.scrollTo({top:end + 2,behavior:"smooth"});}
    };
  }

  function initProjectFallback() {
    const section = document.querySelector(".project-console");
    const track = document.getElementById("projectConsoleTrack");
    if (!section || !track) return null;
    const cards = [...track.querySelectorAll(".project-console-card")];
    if (!cards.length) return null;

    section.classList.add("project-console--native");
    section.style.setProperty("--project-count",String(cards.length));
    const current = document.getElementById("projectConsoleCurrent");
    const total = document.getElementById("projectConsoleTotal");
    const selected = document.getElementById("projectConsoleSelected");
    const steps = document.getElementById("projectConsoleSteps");
    const prev = document.getElementById("projectConsolePrev");
    const next = document.getElementById("projectConsoleNext");
    let activeIndex = 0;

    if (total) total.textContent = String(cards.length).padStart(2,"0");
    if (steps && !steps.children.length) {
      cards.forEach((_,index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = `<i></i><span>${String(index + 1).padStart(2,"0")}</span>`;
        button.setAttribute("aria-label",`Ir al proyecto ${index + 1}`);
        button.addEventListener("click",() => controller?.go(index));
        steps.append(button);
      });
    }

    const updateCopy = index => {
      activeIndex = clamp(index,0,cards.length - 1);
      const card = cards[activeIndex];
      if (current) current.textContent = String(activeIndex + 1).padStart(2,"0");
      if (selected) {
        const title = card.querySelector("strong")?.textContent || `Proyecto ${activeIndex + 1}`;
        const copy = card.querySelector(".project-console-card__body > span")?.textContent || "Información del proyecto.";
        selected.querySelector("h3").textContent = title;
        selected.querySelector("p").textContent = copy;
      }
      cards.forEach((item,itemIndex) => {
        const isActive = itemIndex === activeIndex;
        item.classList.toggle("is-active",isActive);
        item.setAttribute("aria-selected",String(isActive));
        item.setAttribute("aria-hidden",String(!isActive && Math.abs(itemIndex - activeIndex) > 2));
        item.tabIndex = isActive ? 0 : -1;
        if ("inert" in item) item.inert = !isActive;
      });
      [...(steps?.children || [])].forEach((button,index) => button.classList.toggle("is-active",index === activeIndex));
      if (prev) prev.disabled = activeIndex <= 0;
      if (next) next.disabled = activeIndex >= cards.length - 1;
    };

    const controller = makeScrollController(section,cards.length,(progress) => {
      const exact = progress * Math.max(cards.length - 1,1);
      const nearest = Math.round(exact);
      cards.forEach((card,index) => {
        const distance = index - exact;
        const passed = Math.max(-distance,0);
        const upcoming = Math.max(distance,0);
        let x = upcoming * 7;
        let y = `${upcoming * 18}px`;
        let scale = 1 - Math.min(upcoming,5) * .038;
        let rotate = Math.min(upcoming,5) * .34;
        let opacity = Math.max(.22,1 - upcoming * .14);
        if (passed > 0) {
          const exit = Math.min(passed,1);
          x = -exit * 30;
          y = `${-exit * 112}%`;
          scale = 1 - exit * .075;
          rotate = -exit * 1.35;
          opacity = 1 - exit;
        }
        card.style.transform = `translate3d(${x}px,0,0) translateY(${y}) rotate(${rotate}deg) scale(${scale})`;
        card.style.opacity = String(opacity);
        card.style.zIndex = String(cards.length - index + (index === nearest ? cards.length : 0));
      });
      if (nearest !== activeIndex) updateCopy(nearest);
      section.style.setProperty("--project-scroll-progress",progress.toFixed(4));
    },{nativeClass:"project-console--native",countProperty:"--project-count"});

    prev?.addEventListener("click",() => controller.go(activeIndex - 1));
    next?.addEventListener("click",() => controller.go(activeIndex + 1));
    document.getElementById("projectConsoleViewport")?.addEventListener("keydown",event => {
      if (["ArrowDown","ArrowRight","PageDown"].includes(event.key)) {
        event.preventDefault(); controller.go(activeIndex + 1);
      } else if (["ArrowUp","ArrowLeft","PageUp"].includes(event.key)) {
        event.preventDefault(); controller.go(activeIndex - 1);
      }
    });
    updateCopy(0);
    return controller;
  }

  function initCinematicFallback() {
    const section = document.querySelector(".san-pedro-cinematic");
    const frames = [...document.querySelectorAll("[data-cinematic-frame]")];
    if (!section || !frames.length) return null;
    section.classList.add("san-pedro-cinematic--native");
    section.style.setProperty("--cinematic-count",String(frames.length));

    const stories = [
      ["01 · MEMORIA QUE SUENA","La música también guarda memoria","En San Pedro, el arte público convierte el paisaje cotidiano en un escenario donde la historia parece seguir sonando.","“San Pedro no solo se recorre: se escucha, se mira y se recuerda.”"],
      ["02 · ARQUITECTURA Y TIEMPO","Una silueta que acompaña el tiempo","Las fachadas, las torres y la luz del atardecer construyen una postal donde tradición y vida cotidiana se encuentran.","“Cada edificio conserva una manera distinta de contar el municipio.”"],
      ["03 · PUNTO DE ENCUENTRO","El parque guarda voces y encuentros","Bajo la sombra de los árboles, el centro urbano se convierte en conversación, descanso y memoria compartida.","“La plaza es una pausa: allí el territorio aprende a reconocerse.”"],
      ["04 · CASA DE LO PÚBLICO","La gestión también tiene un lugar","La Alcaldía representa el espacio donde documentos, decisiones y participación se transforman en acciones para la comunidad.","“Lo público se fortalece cuando puede verse, entenderse y consultarse.”"]
    ];
    const eyebrow = document.getElementById("cinematicEyebrow");
    const heading = document.getElementById("cinematicHeading");
    const text = document.getElementById("cinematicText");
    const quote = document.getElementById("cinematicQuote");
    const copy = document.getElementById("cinematicCopy");
    const progress = document.getElementById("cinematicProgress");
    const rail = [...document.querySelectorAll("[data-cinematic-step]")];
    let activeIndex = 0;

    const write = index => {
      activeIndex = clamp(index,0,frames.length - 1);
      const story = stories[activeIndex];
      eyebrow.textContent = story[0];
      const words = story[1].split(" ");
      heading.innerHTML = `${words.slice(0,-1).join(" ")} <em>${words.at(-1)}</em>`;
      text.textContent = story[2];
      quote.textContent = story[3];
      copy.classList.remove("is-entering");
      void copy.offsetWidth;
      copy.classList.add("is-entering");
      rail.forEach((button,index2) => button.classList.toggle("is-active",index2 === activeIndex));
    };

    const controller = makeScrollController(section,frames.length,(value) => {
      const exact = value * Math.max(frames.length - 1,1);
      const base = Math.floor(exact);
      const local = exact - base;
      frames.forEach((frame,index) => {
        let opacity = 0;
        if (index === base) opacity = 1 - local;
        if (index === base + 1) opacity = local;
        if (value >= .999 && index === frames.length - 1) opacity = 1;
        const image = frame.querySelector("img");
        const direction = index % 2 ? 1 : -1;
        frame.style.opacity = opacity.toFixed(3);
        frame.style.clipPath = `inset(${(1 - opacity) * 9}% ${(1 - opacity) * 7}% round ${26 + (1 - opacity) * 14}px)`;
        frame.style.zIndex = String(index === base + 1 ? 3 : index === base ? 2 : 1);
        if (image) {
          const localCamera = index === base ? local : index === base + 1 ? Math.max(local - .15,0) : 0;
          const scale = index % 2 === 0 ? 1.025 + localCamera * .085 : 1.105 - localCamera * .07;
          image.style.transform = `translate3d(${direction * localCamera * 3.4}%,${(localCamera - .5) * 1.4}%,0) scale(${scale})`;
        }
      });
      const nearest = Math.round(exact);
      if (nearest !== activeIndex) write(nearest);
      if (progress) progress.style.width = `${(value * 100).toFixed(2)}%`;
      section.style.setProperty("--cinematic-progress",value.toFixed(4));
    },{nativeClass:"san-pedro-cinematic--native",countProperty:"--cinematic-count"});

    rail.forEach((button,index) => button.addEventListener("click",() => controller.go(index)));
    document.getElementById("cinematicSkip")?.addEventListener("click",() => controller.skip());
    document.querySelector(".san-pedro-cinematic__stage")?.addEventListener("keydown",event => {
      if (["ArrowDown","ArrowRight","PageDown"].includes(event.key)) {
        event.preventDefault(); controller.go(activeIndex + 1);
      } else if (["ArrowUp","ArrowLeft","PageUp"].includes(event.key)) {
        event.preventDefault(); controller.go(activeIndex - 1);
      } else if (event.key === "Escape") {
        controller.skip();
      }
    });
    write(0);
    return controller;
  }

  function bootFallback() {
    if (document.documentElement.dataset.homeStoryReady) return;
    if (reduced.matches) return;
    initProjectFallback();
    initCinematicFallback();
    document.documentElement.dataset.homeStoryReady = READY;
  }

  window.setTimeout(bootFallback,1200);
})();
