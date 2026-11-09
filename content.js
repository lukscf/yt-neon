(() => {
  if (window.__ytNeonLoaded) return;
  window.__ytNeonLoaded = true;

  const DEFAULTS = {
    theme: true, tilt: true, floatButton: true,
    color: "purple", background: "bullet", font: "youtube"
  };
  const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);
  const BACKGROUNDS = new Set(["aurora", "stars", "matrix", "synthwave", "bokeh", "warp", "rain", "fireflies", "orbit", "bullet", "none"]);
  const FONTS = new Set(["youtube", "mono", "opensans", "arial"]);
  const settings = { ...DEFAULTS };
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const float = window.__ytnFloat;
  let fx;

  // ---------- Fundo animado (fica atrás do conteúdo) ----------
  function ensureFx() {
    if (fx?.isConnected) return;
    fx = document.createElement("div");
    fx.id = "ytn-fx";
    fx.setAttribute("aria-hidden", "true");
    const shape = document.createElement("div");
    shape.className = "ytn-fx-shape";
    const particles = document.createElement("div");
    particles.className = "ytn-fx-particles";
    for (let i = 0; i < 22; i++) {
      const span = document.createElement("span");
      span.style.setProperty("--i", i);
      span.style.setProperty("--x", ((i * 43 + 17) % 97) + "%");
      span.style.setProperty("--y", ((i * 29 + 11) % 83) + "%");
      span.style.setProperty("--d", ((i * 7) % 11) + "s");
      span.style.setProperty("--s", (3 + (i * 5) % 10) + "px");
      span.textContent = i % 2 ? "1" : "0";
      particles.appendChild(span);
    }
    fx.append(shape, particles);
    document.body.appendChild(fx);
  }

  function applySettings() {
    ensureFx();
    const theme = !!settings.theme;
    root.classList.toggle("ytn-theme", theme);
    root.classList.toggle("ytn-tilt-on", theme && !!settings.tilt);
    root.dataset.ytnColor = COLORS.has(settings.color) ? settings.color : "purple";
    root.dataset.ytnBg = theme && BACKGROUNDS.has(settings.background) ? settings.background : "none";
    root.dataset.ytnFont = FONTS.has(settings.font) ? settings.font : "youtube";
    // fundo Bullet: densidade moderada, como no SL Neon (o fundo divide a tela com vídeos)
    root.dataset.bulletFxDensity = "0.4";
    root.dataset.bulletFx = root.dataset.ytnBg === "bullet" ? "#ytn-fx" : "off";
    if (!theme || !settings.tilt) endFollow();
    root.classList.toggle("ytn-no-float-btn", !settings.floatButton);
    if (settings.floatButton) float?.ensureButton();
    else document.querySelectorAll(".ytn-float-btn").forEach((b) => b.remove());
  }

  chrome.storage.local.get(DEFAULTS).then((stored) => {
    Object.assign(settings, stored);
    applySettings();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) settings[key] = changes[key].newValue ?? DEFAULTS[key];
    }
    applySettings();
  });

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "ping") reply({ ok: true, theme: !!settings.theme, float: float?.state || null });
  });

  // ---------- Hover 3D que segue o mouse ----------
  // Cartões de vídeo (início, busca, sugestões), itens do menu lateral, chips e botões.
  // Anúncios ficam de fora: não recebem inclinação nem brilho.
  const FOLLOW_SELECTOR = [
    "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer", "ytd-grid-video-renderer",
    "ytd-playlist-renderer", "ytd-channel-renderer", "yt-lockup-view-model", "ytd-reel-item-renderer",
    "ytd-guide-entry-renderer", "ytd-mini-guide-entry-renderer", "yt-chip-cloud-chip-renderer",
    "yt-button-shape > button", "ytd-button-renderer button", "#subscribe-button button"
  ].join(",");
  const AD_SELECTOR = "ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-companion-slot-renderer, ytd-action-companion-ad-renderer, ytd-player-legacy-desktop-watch-ads-renderer, [class*=ytd-ad-], [id^=player-ads], .ytp-ad-module, .video-ads";
  const SMALL = "ytd-guide-entry-renderer, ytd-mini-guide-entry-renderer, yt-chip-cloud-chip-renderer, button";
  let followEl = null, followSpot = null, followRestorePos = false, followFrame = 0, followPoint = null;

  function endFollow() {
    if (followFrame) cancelAnimationFrame(followFrame);
    followFrame = 0;
    if (!followEl) return;
    followEl.classList.remove("ytn-follow");
    for (const p of ["--ytn-rx", "--ytn-ry", "--ytn-x", "--ytn-y", "--ytn-sc"]) followEl.style.removeProperty(p);
    if (followRestorePos) followEl.style.removeProperty("position");
    followSpot?.remove();
    followEl = followSpot = null;
    followRestorePos = false;
  }

  function paintFollow() {
    followFrame = 0;
    if (!followEl?.isConnected || !followPoint) return endFollow();
    const r = followEl.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.max(0, Math.min(1, (followPoint.x - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (followPoint.y - r.top) / r.height));
    const small = followEl.matches(SMALL);
    // cartões grandes inclinam pouco; botões e itens do menu, mais
    const tiltY = small ? (r.width > 150 ? 10 : 20) : Math.min(10, 1600 / r.width);
    const tiltX = small ? 18 : Math.min(9, 1400 / r.height);
    followEl.style.setProperty("--ytn-ry", ((x - 0.5) * tiltY).toFixed(2) + "deg");
    followEl.style.setProperty("--ytn-rx", ((0.5 - y) * tiltX).toFixed(2) + "deg");
    followEl.style.setProperty("--ytn-x", (x * 100).toFixed(1) + "%");
    followEl.style.setProperty("--ytn-y", (y * 100).toFixed(1) + "%");
    followEl.style.setProperty("--ytn-sc", small ? "1.04" : "1.015");
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !settings.tilt || !settings.theme || reducedMotion.matches) return;
    let target = event.target instanceof Element ? event.target.closest(FOLLOW_SELECTOR) : null;
    if (target && (target.closest(AD_SELECTOR) || target.querySelector(AD_SELECTOR) || target.closest(".html5-video-player"))) target = null;
    if (target !== followEl) {
      endFollow();
      if (!target) return;
      followEl = target;
      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
        followRestorePos = true;
      }
      followSpot = document.createElement("span");
      followSpot.className = "ytn-spot";
      followSpot.setAttribute("aria-hidden", "true");
      target.appendChild(followSpot);
      target.classList.add("ytn-follow");
    }
    followPoint = { x: event.clientX, y: event.clientY };
    if (!followFrame) followFrame = requestAnimationFrame(paintFollow);
  }, { passive: true, capture: true });
  document.addEventListener("pointerleave", endFollow);
  window.addEventListener("blur", endFollow);
  window.addEventListener("scroll", endFollow, { passive: true });
  reducedMotion.addEventListener("change", endFollow);

  // ---------- Botão do player flutuante ----------
  // O YouTube é uma página única: troca de vídeo sem recarregar e pode recriar a barra do player.
  let btnTimer = 0;
  const refreshButton = () => {
    if (btnTimer) return;
    btnTimer = setTimeout(() => {
      btnTimer = 0;
      ensureFx();
      if (settings.floatButton) float?.ensureButton();
    }, 400);
  };
  document.addEventListener("yt-navigate-finish", refreshButton);
  new MutationObserver(refreshButton).observe(document.body, { childList: true, subtree: true });
})();
