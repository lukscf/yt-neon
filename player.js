// YT Neon: recursos do player.
// Velocidade fina com memória por canal, volume extra (Web Audio) e normalização, loop e loop A-B,
// captura de frame, retomar de onde parou, roda do mouse no volume e modo foco.
// Nada disso age durante anúncios: com o anúncio na tela, velocidade, saltos e loops ficam parados.
(() => {
  if (window.__ytnPlayer) return;
  window.__ytnPlayer = true;

  const Y = globalThis.YTN;
  const root = document.documentElement;
  let cfg = { ...Y.DEFAULTS };
  let video = null;          // o <video> principal (pode estar na janela flutuante)
  let videoId = "";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
  };
  const playerEl = () => document.getElementById("movie_player");
  const adShowing = () => !!playerEl()?.classList.contains("ad-showing");
  const isWatch = () => location.pathname === "/watch";

  function currentId() {
    const u = new URL(location.href);
    if (u.pathname === "/watch") return u.searchParams.get("v") || "";
    const m = u.pathname.match(/^\/(?:shorts|live)\/([\w-]{11})/);
    return m ? m[1] : "";
  }

  function getVideo() {
    const floating = window.__ytnFloat?.video?.();
    if (floating?.isConnected) return floating;
    const v = document.querySelector("#movie_player video.html5-main-video");
    if (v) video = v;
    return video?.isConnected ? video : null;
  }

  // ---------- Aviso na tela (OSD) ----------
  let osdTimer = 0;
  function osd(text, actionLabel, action) {
    const host = playerEl() && isWatch() ? playerEl() : document.body;
    let el = document.getElementById("ytn-osd");
    if (!el || el.parentNode !== host) {
      el?.remove();
      el = document.createElement("div");
      el.id = "ytn-osd";
      el.setAttribute("role", "status");
      host.appendChild(el);
    }
    el.classList.toggle("in-page", host === document.body);
    el.textContent = text;
    if (actionLabel) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = actionLabel;
      b.addEventListener("click", (e) => { e.stopPropagation(); action(); el.classList.remove("show"); });
      el.appendChild(b);
    }
    el.classList.add("show");
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => el.classList.remove("show"), actionLabel ? 5000 : 1400);
  }

  // ---------- Dados locais (mudam toda hora: ficam fora do sync) ----------
  let local = { chanSpeed: {}, resume: {} };
  chrome.storage.local.get({ chanSpeed: {}, resume: {} }).then((r) => { local = r; });
  let localTimer = 0;
  function saveLocal() {
    clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      // guarda só os 400 vídeos mais recentes
      const entries = Object.entries(local.resume);
      if (entries.length > 400) local.resume = Object.fromEntries(entries.sort((a, b) => b[1].at - a[1].at).slice(0, 400));
      chrome.storage.local.set(local);
    }, 1500);
  }
  let syncTimer = 0;
  function saveSetting(patch) {
    Object.assign(cfg, patch);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => Y.save(patch), 800); // o sync tem limite de gravações por minuto
  }

  // ---------- Velocidade ----------
  function channelKey() {
    const a = document.querySelector("ytd-watch-metadata #owner ytd-channel-name a, ytd-watch-metadata ytd-channel-name a, #owner #channel-name a");
    return a?.getAttribute("href") || "";
  }
  function setSpeed(rate, remember = true) {
    const v = getVideo();
    if (!v || adShowing()) return;
    rate = Math.round(clamp(rate, 0.25, 4) * 100) / 100;
    v.playbackRate = rate;
    osd(`Velocidade ${rate.toFixed(2).replace(/0$/, "").replace(".", ",")}x`);
    if (remember && cfg.speedPerChannel) {
      const ch = channelKey();
      if (ch) { if (rate === +cfg.defaultSpeed) delete local.chanSpeed[ch]; else local.chanSpeed[ch] = rate; saveLocal(); }
    }
  }
  let speedFor = "";
  function applyStartSpeed(force) {
    const v = getVideo();
    if (!v || adShowing() || !isWatch()) return;
    // uma vez por vídeo (e de novo quando o nome do canal aparece): não desfaz a escolha manual
    const ch = cfg.speedPerChannel ? channelKey() : "";
    if (!force && speedFor === videoId + "|" + ch) return;
    speedFor = videoId + "|" + ch;
    const rate = (ch && local.chanSpeed[ch]) || +cfg.defaultSpeed || 1;
    if (Math.abs(v.playbackRate - rate) > 0.001) { v.playbackRate = rate; if (rate !== 1) osd(`Velocidade ${String(rate).replace(".", ",")}x`); }
  }

  // ---------- Volume extra e normalização (Web Audio) ----------
  // O grafo só é criado quando o volume extra ou a normalização estão ligados, e sempre depois de um gesto
  // na página (o Chrome deixa o áudio mudo se o AudioContext nasce sem gesto).
  let audio = null; // { ctx, src, comp, gain, el }
  function wantGraph() { return cfg.boost > 100 || cfg.normalize; }
  function ensureGraph() {
    const v = getVideo();
    if (!v || !wantGraph()) return false;
    if (audio?.el === v) return true;
    if (!navigator.userActivation?.hasBeenActive) return false;
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(v);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -26; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
      const gain = ctx.createGain();
      audio = { ctx, src, comp, gain, el: v };
      route();
      return true;
    } catch (error) {
      console.warn("YT Neon: volume extra indisponível", error);
      return false;
    }
  }
  function route() {
    if (!audio) return;
    const { ctx, src, comp, gain } = audio;
    try { src.disconnect(); comp.disconnect(); gain.disconnect(); } catch {}
    if (cfg.normalize) { src.connect(comp); comp.connect(gain); } else src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = cfg.boost / 100 * (cfg.normalize ? 1.4 : 1); // compensação do compressor
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }
  function setBoost(pct, show = true) {
    pct = clamp(Math.round(pct / 10) * 10, 100, 400);
    saveSetting({ boost: pct });
    if (pct > 100) ensureGraph();
    route();
    if (show) osd(pct > 100 ? `Volume extra ${pct}%` : "Volume extra desligado (100%)");
  }
  // primeiro gesto na página: retoma o áudio e monta o grafo se ele já estava ligado
  const onGesture = () => { if (wantGraph()) ensureGraph(); if (audio?.ctx.state === "suspended") audio.ctx.resume().catch(() => {}); };
  document.addEventListener("pointerdown", onGesture, true);
  document.addEventListener("keydown", onGesture, true);

  // ---------- Roda do mouse no player ----------
  function ytVolume(value) {
    document.dispatchEvent(new CustomEvent("ytn-main", { detail: JSON.stringify({ cmd: "volume", value }) }));
  }
  document.addEventListener("wheel", (e) => {
    if (!cfg.wheelVolume || e.ctrlKey || !isWatch()) return;
    const p = e.target instanceof Element ? e.target.closest("#movie_player") : null;
    if (!p || e.target.closest(".ytp-settings-menu, .ytp-panel-menu, .ytp-popup, .ytp-chapter-container")) return;
    const v = getVideo();
    if (!v) return;
    e.preventDefault();
    const up = e.deltaY < 0;
    const vol = v.muted ? 0 : Math.round(v.volume * 100);
    if (up && vol >= 100 && cfg.boost < 400) return setBoost(cfg.boost + 10);  // passou de 100%: volume extra
    if (!up && cfg.boost > 100) return setBoost(cfg.boost - 10);
    const next = clamp(vol + (up ? 5 : -5), 0, 100);
    ytVolume(next);
    osd(`Volume ${next}%`);
  }, { passive: false, capture: true });

  // ---------- Loop e loop A-B ----------
  let ab = { a: null, b: null };
  function toggleLoop() {
    const v = getVideo();
    if (!v) return;
    v.loop = !v.loop;
    osd(v.loop ? "Repetir vídeo: ligado" : "Repetir vídeo: desligado");
  }
  function abStep() {
    const v = getVideo();
    if (!v || adShowing()) return;
    if (ab.a === null) { ab.a = v.currentTime; osd(`Loop A-B: A em ${fmt(ab.a)}. Marque o B.`); }
    else if (ab.b === null) {
      if (v.currentTime <= ab.a + 0.3) { osd("O ponto B precisa vir depois do A."); return; }
      ab.b = v.currentTime; v.currentTime = ab.a;
      osd(`Loop A-B: ${fmt(ab.a)} até ${fmt(ab.b)}`);
      watchAB();
    } else { ab = { a: null, b: null }; osd("Loop A-B desligado"); }
    paintMarkers();
  }
  // requestVideoFrameCallback é bem mais preciso que o timeupdate (4 vezes por segundo)
  function watchAB() {
    const v = getVideo();
    if (!v || ab.b === null) return;
    const tick = () => {
      if (ab.b === null || !v.isConnected) return;
      if (!adShowing() && (v.currentTime >= ab.b || v.currentTime < ab.a - 1)) v.currentTime = ab.a;
      v.requestVideoFrameCallback ? v.requestVideoFrameCallback(tick) : setTimeout(tick, 100);
    };
    v.requestVideoFrameCallback ? v.requestVideoFrameCallback(tick) : setTimeout(tick, 100);
  }

  // ---------- Captura do frame ----------
  function screenshot() {
    const v = getVideo();
    if (!v || !v.videoWidth) return osd("Nenhum frame para capturar.");
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      c.toBlob((blob) => {
        if (!blob) return osd("Não foi possível capturar este frame.");
        const title = (document.title.replace(/ - YouTube$/, "") || "youtube").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${title} ${fmt(v.currentTime).replace(/:/g, "-")}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        osd(`Frame salvo (${v.videoWidth}×${v.videoHeight})`);
      }, "image/png");
    } catch {
      osd("Não foi possível capturar este frame.");
    }
  }

  // ---------- Retomar de onde parou ----------
  let resumed = "";
  function tryResume() {
    const v = getVideo();
    if (!cfg.resume || !v || !videoId || resumed === videoId || adShowing() || !isWatch()) return;
    if (!isFinite(v.duration) || v.duration < 60) return; // ao vivo ou curto demais
    resumed = videoId;
    if (/[?&#]t=/.test(location.href)) return;           // o link já pede um ponto: respeita
    const saved = local.resume[videoId];
    if (saved && saved.t > 15 && saved.t < v.duration - 20 && v.currentTime < saved.t - 5) {
      const from = v.currentTime;
      v.currentTime = saved.t;
      osd(`Retomado em ${fmt(saved.t)}`, "Do início", () => { v.currentTime = from < 5 ? 0 : from; });
    }
  }
  let lastSave = 0;
  function trackProgress() {
    const v = getVideo();
    if (!cfg.resume || !v || !videoId || adShowing() || !isFinite(v.duration) || v.duration < 60) return;
    const now = Date.now();
    if (now - lastSave < 5000) return;
    lastSave = now;
    if (v.currentTime > v.duration - 20) delete local.resume[videoId]; // terminou: começa do zero na próxima
    else if (v.currentTime > 15) local.resume[videoId] = { t: Math.floor(v.currentTime), at: now };
    saveLocal();
  }

  // marca do loop A-B na barra de progresso
  function paintMarkers() {
    const bar = document.querySelector("#movie_player .ytp-progress-bar");
    let layer = bar?.querySelector(".ytn-marks");
    const v = getVideo();
    const d = v?.duration;
    if (!bar || !isFinite(d) || d <= 0 || ab.a === null) { layer?.remove(); return; }
    if (!layer) { layer = document.createElement("div"); layer.className = "ytn-marks"; bar.appendChild(layer); }
    layer.textContent = "";
    const add = (cls, s, e) => {
      const m = document.createElement("i");
      m.className = cls;
      m.style.left = (s / d) * 100 + "%";
      m.style.width = Math.max(0.3, ((e - s) / d) * 100) + "%";
      layer.appendChild(m);
    };
    if (ab.a !== null) add("ab", ab.a, ab.b ?? ab.a);
  }

  // ---------- Modo foco ----------
  function setFocus(on) {
    root.classList.toggle("ytn-focus", !!on);
    let exit = document.getElementById("ytn-focus-exit");
    if (on && !exit) {
      exit = document.createElement("button");
      exit.id = "ytn-focus-exit";
      exit.type = "button";
      exit.textContent = "Sair do modo foco";
      exit.addEventListener("click", () => Y.save({ focusMode: false }));
      document.body.appendChild(exit);
    } else if (!on) exit?.remove();
    setTimeout(() => window.dispatchEvent(new Event("resize")), 60); // o YouTube recalcula o tamanho do player
  }

  // ---------- Atalhos ----------
  const ACTIONS = {
    speedUp: () => setSpeed((getVideo()?.playbackRate || 1) + +cfg.speedStep),
    speedDown: () => setSpeed((getVideo()?.playbackRate || 1) - +cfg.speedStep),
    speedReset: () => setSpeed(1),
    boostUp: () => setBoost(cfg.boost + 10),
    boostDown: () => setBoost(cfg.boost - 10),
    loop: toggleLoop,
    abLoop: abStep,
    screenshot,
    focus: () => Y.save({ focusMode: !cfg.focusMode }),
    float: () => window.__ytnFloat?.toggle("atalho-pagina")
  };
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t instanceof Element && (t.closest("input, textarea, select, [contenteditable=''], [contenteditable=true]") || t.isContentEditable)) return;
    const combo = Y.comboOf(e);
    if (!combo) return;
    const action = Object.keys(cfg.shortcuts).find((k) => cfg.shortcuts[k] === combo);
    if (!action || !ACTIONS[action]) return;
    if (e.repeat && !/^(speed|boost)/.test(action)) return;
    if (action !== "focus" && action !== "float" && !getVideo()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    ACTIONS[action]();
  }, true);

  // pedidos vindos do popup
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg?.type === "action" && ACTIONS[msg.action]) { ACTIONS[msg.action](); reply({ ok: true }); }
    else if (msg?.type === "state") {
      const v = getVideo();
      reply({ video: !!v, speed: v?.playbackRate || 1, loop: !!v?.loop, ab: ab.a !== null, boost: cfg.boost });
    }
  });

  // ---------- Eventos do vídeo e navegação ----------
  function onNewVideo() {
    const id = currentId();
    if (id === videoId) return;
    videoId = id;
    ab = { a: null, b: null };
    resumed = "";
    lastSave = 0;
  }
  document.addEventListener("yt-navigate-finish", () => {
    onNewVideo();
    setTimeout(() => { applyStartSpeed(); paintMarkers(); }, 700); // o nome do canal chega um pouco depois
  });
  // eventos de mídia não sobem na árvore, mas passam pela captura
  document.addEventListener("loadedmetadata", (e) => {
    if (!(e.target instanceof HTMLVideoElement) || !e.target.matches("#movie_player video")) return;
    video = e.target;
    onNewVideo();
    setTimeout(() => { applyStartSpeed(); tryResume(); paintMarkers(); if (wantGraph()) ensureGraph(); }, 300);
  }, true);
  const onTime = (e) => {
    if (e.target !== getVideo()) return;
    // reserva do loop A-B: o requestVideoFrameCallback para quando a aba fica em segundo plano
    const v = e.target;
    if (ab.b !== null && !adShowing() && v.currentTime >= ab.b) v.currentTime = ab.a;
    trackProgress();
    if (!resumed && videoId) tryResume();
  };
  document.addEventListener("timeupdate", onTime, true);
  // na janela flutuante o vídeo sai desta página: escuta direto no elemento também
  let boundTo = null;
  setInterval(() => {
    const v = getVideo();
    if (v && v !== boundTo) { boundTo?.removeEventListener("timeupdate", onTimeDirect); v.addEventListener("timeupdate", onTimeDirect); boundTo = v; }
  }, 3000);
  function onTimeDirect(e) { if (e.target.ownerDocument !== document) onTime(e); }

  // ---------- Configurações ----------
  function apply(prev) {
    root.dataset.ytnQuality = cfg.quality;
    root.classList.toggle("ytn-hide-shorts", !!cfg.hideShorts);
    root.classList.toggle("ytn-hide-comments", !!cfg.hideComments);
    root.classList.toggle("ytn-hide-related", !!cfg.hideRelated);
    root.classList.toggle("ytn-hide-cards", !!cfg.hideCards);
    root.classList.toggle("ytn-hide-endscreens", !!cfg.hideEndscreens);
    if (cfg.gridColumns > 0) { root.dataset.ytnCols = String(cfg.gridColumns); root.style.setProperty("--ytn-cols", String(cfg.gridColumns)); }
    else { delete root.dataset.ytnCols; root.style.removeProperty("--ytn-cols"); }
    if (!prev || prev.focusMode !== cfg.focusMode) setFocus(cfg.focusMode);
    window.__ytnFloat?.setMode(cfg.floatMode);
    window.__ytnFloat?.setFill(cfg.floatFill);
    if (wantGraph()) ensureGraph();
    route();
    if (prev && prev.defaultSpeed !== cfg.defaultSpeed) applyStartSpeed(true);
  }
  Y.load().then((c) => { cfg = c; onNewVideo(); apply(null); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const prev = { ...cfg };
    for (const [k, { newValue }] of Object.entries(changes)) if (k in Y.DEFAULTS) cfg[k] = newValue ?? Y.DEFAULTS[k];
    cfg = { ...cfg, ...Y.sanitize(cfg), shortcuts: { ...Y.DEFAULTS.shortcuts, ...(cfg.shortcuts || {}) } };
    apply(prev);
  });
})();
