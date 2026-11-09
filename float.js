// YT Neon: player flutuante, sempre por cima das outras janelas.
// Usa a Document Picture-in-Picture (Chrome 116+): o próprio <video> do YouTube vai para a
// janela flutuante, com controles neon. Ao fechar, ele volta ao player da página no mesmo ponto,
// porque é o mesmo elemento: nada é recarregado. Sem a API, cai no Picture-in-Picture padrão.
(() => {
  if (window.__ytnFloat) return;

  const st = { win: null, video: null, home: null, next: null, holder: null, cleanup: [] };
  const isWatchVideo = (v) => v && v.isConnected && (v.readyState > 0 || v.currentSrc);

  function findVideo() {
    const main = document.querySelector("#movie_player video.html5-main-video");
    if (isWatchVideo(main)) return main;
    // Shorts, miniplayer e outros players: o vídeo visível que já tem mídia
    return [...document.querySelectorAll("video")].find((v) => isWatchVideo(v) && v.getClientRects().length) || null;
  }

  function accent() {
    return getComputedStyle(document.documentElement).getPropertyValue("--ytn-accent").trim() || "#bd77ff";
  }

  function toast(text) {
    let el = document.getElementById("ytn-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "ytn-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  const fmt = (s) => {
    if (!isFinite(s)) return "ao vivo";
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
  };

  const ICON = {
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>',
    vol: '<path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9zm15.6 3 2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4z"/>',
    back: '<path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 12H5V7h14zM12 9l-4 3 4 3v-2h4v-2h-4z"/>',
    // esticar: setas para fora; normal: setas para dentro
    stretch: '<path d="M3 5h5v2H5v3H3zm13 0h5v5h-2V7h-3zM3 14h2v3h3v2H3zm16 0h2v5h-5v-2h3z"/><path d="M8 12l3-2.5v5zm8 0l-3-2.5v5z"/>',
    fit: '<path d="M3 5h5v2H5v3H3zm13 0h5v5h-2V7h-3zM3 14h2v3h3v2H3zm16 0h2v5h-5v-2h3z"/><path d="M11 12l-3-2.5v5zm2 0l3-2.5v5z"/>',
    float: '<path d="M19 7h-8v6h8zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18z"/>'
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;

  const FLOAT_CSS = `
    :root{--acc:#bd77ff;color-scheme:dark}
    *{box-sizing:border-box}
    html,body{margin:0;height:100%;background:#000;overflow:hidden;font:12px/1.3 "Segoe UI",Roboto,Arial,sans-serif;color:#fff}
    .stage{position:fixed;inset:0;background:#000}
    .stage video{position:absolute!important;inset:0!important;left:0!important;top:0!important;width:100%!important;height:100%!important;object-fit:contain!important;transform:none!important;background:#000}
    .frame{position:fixed;inset:0;pointer-events:none;border:1px solid color-mix(in srgb,var(--acc) 55%,transparent);box-shadow:inset 0 0 22px color-mix(in srgb,var(--acc) 30%,transparent)}
    .title{position:fixed;left:0;right:0;top:0;padding:10px 12px 22px;background:linear-gradient(#000c,#0000);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000;opacity:0;transition:opacity .2s}
    .ctl{position:fixed;left:0;right:0;bottom:0;padding:18px 10px 8px;background:linear-gradient(#0000,#000d 55%);opacity:0;transition:opacity .2s}
    body.show .ctl,body.show .title,body.paused .ctl,body.paused .title,body:focus-within .ctl{opacity:1}
    .row{display:flex;align-items:center;gap:6px}
    button{all:unset;display:grid;place-items:center;width:32px;height:32px;border-radius:999px;cursor:pointer;color:#fff;flex:none;transition:background .15s,box-shadow .15s,transform .15s}
    button:hover{background:color-mix(in srgb,var(--acc) 28%,transparent);box-shadow:0 0 12px var(--acc)}
    button:active{transform:scale(.92)}
    button:focus-visible{outline:2px solid var(--acc);outline-offset:1px}
    button svg{width:20px;height:20px;fill:currentColor;filter:drop-shadow(0 0 4px var(--acc))}
    button.main{width:38px;height:38px;background:linear-gradient(135deg,var(--acc),color-mix(in srgb,var(--acc) 45%,#000));box-shadow:0 0 14px color-mix(in srgb,var(--acc) 70%,transparent)}
    .time{min-width:84px;font-variant-numeric:tabular-nums;color:#ddd;text-shadow:0 1px 2px #000}
    .grow{flex:1}
    input[type=range]{-webkit-appearance:none;appearance:none;height:16px;background:transparent;cursor:pointer;margin:0}
    input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--acc) var(--p,0%),#ffffff40 var(--p,0%))}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;margin-top:-4px;border-radius:50%;background:#fff;box-shadow:0 0 8px var(--acc),0 0 0 2px var(--acc)}
    input[type=range]:focus-visible{outline:2px solid var(--acc);outline-offset:2px;border-radius:4px}
    .seek{width:100%;display:block;margin-bottom:4px}
    .vol{width:64px}
    body.fill .stage video{object-fit:fill!important}
    @media (max-width:300px){.vol,.time{display:none}}
    @media (prefers-reduced-motion:reduce){*{transition:none!important}}
  `;

  function buildControls(win, video) {
    const d = win.document;
    d.title = document.title.replace(/ - YouTube$/, "") || "YT Neon";
    const style = d.createElement("style");
    style.textContent = FLOAT_CSS;
    d.head.appendChild(style);
    d.documentElement.style.setProperty("--acc", accent());

    const stage = d.createElement("div");
    stage.className = "stage";
    const frame = d.createElement("div");
    frame.className = "frame";
    const title = d.createElement("div");
    title.className = "title";
    title.textContent = d.title;
    const ctl = d.createElement("div");
    ctl.className = "ctl";
    ctl.innerHTML = `
      <input class="seek" type="range" min="0" max="1000" value="0" aria-label="Posição do vídeo">
      <div class="row">
        <button class="main play" title="Reproduzir ou pausar (espaço)" aria-label="Reproduzir ou pausar"></button>
        <span class="time">0:00 / 0:00</span>
        <span class="grow"></span>
        <button class="mute" title="Som (M)" aria-label="Ligar ou desligar o som"></button>
        <input class="vol" type="range" min="0" max="100" value="100" aria-label="Volume">
        <button class="fit" aria-pressed="false"></button>
        <button class="back" title="Voltar para a página" aria-label="Voltar o vídeo para a página">${svg("back")}</button>
      </div>`;
    d.body.append(stage, frame, title, ctl);
    stage.appendChild(video); // mesmo elemento: continua tocando do mesmo ponto

    const $ = (s) => ctl.querySelector(s);
    const seek = $(".seek"), vol = $(".vol"), play = $(".play"), mute = $(".mute"), time = $(".time");
    let dragging = false;

    const paint = () => {
      const dur = video.duration;
      if (!dragging && isFinite(dur) && dur > 0) seek.value = String(Math.round((video.currentTime / dur) * 1000));
      seek.style.setProperty("--p", seek.value / 10 + "%");
      seek.disabled = !isFinite(dur);
      time.textContent = `${fmt(video.currentTime)} / ${fmt(dur)}`;
      play.innerHTML = svg(video.paused ? "play" : "pause");
      d.body.classList.toggle("paused", video.paused);
      mute.innerHTML = svg(video.muted || video.volume === 0 ? "mute" : "vol");
      vol.value = String(Math.round((video.muted ? 0 : video.volume) * 100));
      vol.style.setProperty("--p", vol.value + "%");
      const t = document.title.replace(/ - YouTube$/, "");
      if (t && t !== d.title) { d.title = t; title.textContent = t; }
    };
    const toggle = () => (video.paused ? video.play().catch(() => {}) : video.pause());
    const nudge = (s) => { video.currentTime = Math.max(0, Math.min((video.duration || 0) - 0.5, video.currentTime + s)); };

    play.addEventListener("click", toggle);
    stage.addEventListener("click", toggle);
    mute.addEventListener("click", () => { video.muted = !video.muted; if (!video.muted && video.volume === 0) video.volume = 0.5; });
    vol.addEventListener("input", () => { video.volume = vol.value / 100; video.muted = vol.value === "0"; paint(); });
    seek.addEventListener("input", () => { dragging = true; seek.style.setProperty("--p", seek.value / 10 + "%"); time.textContent = `${fmt((seek.value / 1000) * video.duration)} / ${fmt(video.duration)}`; });
    seek.addEventListener("change", () => { dragging = false; if (isFinite(video.duration)) video.currentTime = (seek.value / 1000) * video.duration; });
    // Esticar o vídeo até as bordas da janela (sem faixas pretas) ou voltar ao normal. Fica salvo.
    const fitBtn = $(".fit");
    const setFill = (on, save) => {
      d.body.classList.toggle("fill", on);
      fitBtn.innerHTML = svg(on ? "fit" : "stretch");
      fitBtn.title = on ? "Voltar ao normal, com as faixas pretas (E)" : "Esticar para preencher a janela (E)";
      fitBtn.setAttribute("aria-label", on ? "Voltar ao tamanho normal" : "Esticar o vídeo para preencher a janela");
      fitBtn.setAttribute("aria-pressed", String(on));
      if (save) try { chrome.storage.local.set({ floatFill: on }); } catch {}
    };
    const toggleFill = () => setFill(!d.body.classList.contains("fill"), true);
    fitBtn.addEventListener("click", toggleFill);
    setFill(false, false);
    try { chrome.storage.local.get({ floatFill: false }).then((r) => setFill(!!r.floatFill, false)); } catch {}

    $(".back").addEventListener("click", () => { close(); try { window.focus(); } catch {} });

    let hideT = 0;
    const show = () => { d.body.classList.add("show"); clearTimeout(hideT); hideT = setTimeout(() => d.body.classList.remove("show"), 2200); };
    d.addEventListener("pointermove", show);
    d.addEventListener("keydown", (e) => {
      if (e.target instanceof win.HTMLInputElement && e.key !== " ") return;
      const k = e.key.toLowerCase();
      if (k === " " || k === "k") { e.preventDefault(); toggle(); }
      else if (k === "arrowleft" || k === "j") nudge(k === "j" ? -10 : -5);
      else if (k === "arrowright" || k === "l") nudge(k === "l" ? 10 : 5);
      else if (k === "m") video.muted = !video.muted;
      else if (k === "e") toggleFill();
      else if (k === "escape") close();
      else return;
      show();
    });

    const events = ["timeupdate", "play", "pause", "volumechange", "durationchange", "loadedmetadata", "emptied"];
    for (const ev of events) video.addEventListener(ev, paint);
    st.cleanup.push(() => { for (const ev of events) video.removeEventListener(ev, paint); clearTimeout(hideT); });
    paint();
    show();
  }

  // Aviso dentro do player da página enquanto o vídeo está na janela flutuante
  function showHolder() {
    const player = st.home?.closest("#movie_player, .html5-video-player") || st.home;
    if (!player) return;
    const h = document.createElement("div");
    h.id = "ytn-float-holder";
    h.innerHTML = `<div>${svg("float")}<p>Tocando no player flutuante</p><button type="button">Trazer de volta</button></div>`;
    h.querySelector("button").addEventListener("click", (e) => { e.stopPropagation(); close(); });
    player.appendChild(h);
    st.holder = h;
  }

  function restore() {
    const { video, home, next } = st;
    st.cleanup.splice(0).forEach((fn) => { try { fn(); } catch {} });
    st.holder?.remove();
    if (video) {
      const wasPlaying = !video.paused;
      // o contêiner original pode ter sido recriado pelo YouTube: procura de novo
      const dest = home?.isConnected ? home : document.querySelector("#movie_player .html5-video-container");
      if (dest) {
        if (next && next.parentNode === dest) dest.insertBefore(video, next);
        else dest.prepend(video);
      } else {
        video.remove();
      }
      if (wasPlaying && video.paused) video.play().catch(() => {});
      window.dispatchEvent(new Event("resize")); // o YouTube recalcula o tamanho do vídeo
    }
    document.documentElement.classList.remove("ytn-floating");
    Object.assign(st, { win: null, video: null, home: null, next: null, holder: null });
    syncButtons();
  }

  async function openDocPip(video) {
    const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
    const width = 480, height = Math.round(Math.min(480, Math.max(200, width * (vh / vw))));
    // primeira chamada assíncrona: precisa acontecer ainda dentro do gesto do usuário
    const win = await window.documentPictureInPicture.requestWindow({ width, height });
    st.win = win;
    st.video = video;
    st.home = video.parentNode;
    st.next = video.nextSibling;
    const wasPlaying = !video.paused;
    buildControls(win, video);
    if (wasPlaying && video.paused) video.play().catch(() => {});
    showHolder();
    document.documentElement.classList.add("ytn-floating");
    win.addEventListener("pagehide", restore, { once: true });
    syncButtons();
  }

  // Sempre chamada direto de um gesto (clique no botão, no popup ou atalho).
  function open(source = "botao") {
    if (st.win) return Promise.resolve("aberto");
    const video = findVideo();
    if (!video) { toast("YT Neon: abra um vídeo para usar o player flutuante."); return Promise.resolve("sem-video"); }
    const native = () => video.requestPictureInPicture().then(() => "nativo");
    let attempt;
    if ("documentPictureInPicture" in window) {
      attempt = openDocPip(video).then(() => "documento", (error) => {
        console.warn("YT Neon: Document PiP falhou, usando o PiP padrão", error);
        restore();
        return native();
      });
    } else {
      attempt = native();
    }
    return attempt.catch((error) => {
      console.warn("YT Neon: PiP indisponível", source, error);
      toast(error?.name === "NotAllowedError"
        ? "YT Neon: o Chrome só abre o player flutuante depois de um clique ou atalho na página."
        : "YT Neon: não foi possível abrir o player flutuante neste vídeo.");
      return "erro";
    });
  }

  function close() {
    if (st.win) { st.win.close(); return "fechado"; } // o pagehide devolve o vídeo
    if (document.pictureInPictureElement) { document.exitPictureInPicture().catch(() => {}); return "fechado"; }
    return "nada";
  }

  function toggle(source) {
    return st.win || document.pictureInPictureElement ? close() : open(source);
  }

  // ---------- Botão neon na barra do player ----------
  function syncButtons() {
    const on = !!(st.win || document.pictureInPictureElement);
    for (const b of document.querySelectorAll(".ytn-float-btn")) {
      b.classList.toggle("on", on);
      b.title = on ? "Fechar o player flutuante (Alt+Shift+Y)" : "Player flutuante, sempre por cima (Alt+Shift+Y)";
      b.setAttribute("aria-label", b.title);
    }
  }

  function ensureButton() {
    for (const bar of document.querySelectorAll(".html5-video-player .ytp-right-controls")) {
      if (bar.querySelector(".ytn-float-btn")) continue;
      const b = document.createElement("button");
      b.className = "ytp-button ytn-float-btn";
      b.type = "button";
      b.innerHTML = svg("float");
      b.addEventListener("click", (e) => { e.stopPropagation(); toggle("botao"); });
      bar.prepend(b);
    }
    syncButtons();
  }

  document.addEventListener("enterpictureinpicture", syncButtons, true);
  document.addEventListener("leavepictureinpicture", syncButtons, true);

  window.__ytnFloat = {
    toggle, open, close, ensureButton,
    get state() { return { open: !!st.win, native: !!document.pictureInPictureElement }; }
  };
})();
