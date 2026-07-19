(() => {
  "use strict";
  if (window.__PLATFORM_POLISH_V1152_ORDER__) return;
  window.__PLATFORM_POLISH_V1152_ORDER__ = true;

  let scheduled = false;
  const placeLast = () => {
    scheduled = false;
    const link = document.querySelector('link[href*="platform-polish-v1152.css"]');
    if (!link || !document.head) return;
    const stylesheets = [...document.head.querySelectorAll('link[rel="stylesheet"]')];
    if (stylesheets.at(-1) !== link) document.head.appendChild(link);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(placeLast);
  };

  schedule();
  document.addEventListener("DOMContentLoaded", schedule, { once: true });
  window.addEventListener("load", schedule, { once: true });
  window.setTimeout(schedule, 250);
  window.setTimeout(schedule, 1200);

  const observer = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node =>
      node instanceof HTMLLinkElement && node.rel === "stylesheet"
    ))) schedule();
  });
  observer.observe(document.head, { childList: true });
})();
