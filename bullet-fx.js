// Bullet FX — fundo animado do tema Bullet (balas com rastro, moedas cripto e uma linha de preço).
// Paleta do Bullet Identity Source v1.27: fundo ink-990, superfícies ink, texto paper-100,
// acento lime-500 só em detalhe (cota de 10%, nunca como fundo), textura de ruído sobre preto.
//
// Uso: o content script da extensão liga/desliga pelo atributo
//   document.documentElement.dataset.bulletFx = "<seletor do contêiner>"   (ex.: "#gmn-fx" ou "body")
//   document.documentElement.dataset.bulletFx = "off"
// O canvas ocupa o contêiner inteiro, não recebe clique e pausa com a aba escondida.
(() => {
  if (window.__bulletFxLoaded) return;
  window.__bulletFxLoaded = true;

  const INK = "#070707", PAPER = "248,243,233", LIME = "194,241,65", GREY = "163,163,163";
  const COINS = ["₿", "Ξ", "₮", "$", "◎", "Ł", "₳", "◈"];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  let canvas = null, ctx = null, host = null, raf = 0, last = 0, W = 0, H = 0, dpr = 1, ro = null;
  let bullets = [], coins = [], chart = [], noise = null, chartT = 0;

  const rnd = (a, b) => a + Math.random() * (b - a);

  function makeNoise() {
    const n = document.createElement("canvas");
    n.width = n.height = 128;
    const g = n.getContext("2d"), img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 14;
    }
    g.putImageData(img, 0, 0);
    return n;
  }

  function newBullet(initial) {
    const z = Math.random();                 // 0 = longe, 1 = perto
    return {
      z,
      x: initial ? rnd(-0.2, 1.1) * W : rnd(-0.35, -0.05) * W,
      y: rnd(0.04, 0.96) * H,
      v: (260 + z * 900) * rnd(0.85, 1.15),  // px/s
      len: 12 + z * 26,                      // corpo da bala
      trail: 90 + z * 320,                   // rastro
      lime: Math.random() < 0.12,            // poucas com rastro lime (cota de acento)
      wob: rnd(0, Math.PI * 2)
    };
  }

  function newCoin(initial) {
    const z = rnd(0.2, 1);
    return {
      z,
      x: initial ? rnd(0, 1) * W : W + rnd(40, 200),
      y: rnd(0.08, 0.92) * H,
      r: 10 + z * 22,
      v: 14 + z * 26,
      spin: rnd(0, Math.PI * 2),
      sv: rnd(0.6, 1.6) * (Math.random() < 0.5 ? -1 : 1),
      bob: rnd(0, Math.PI * 2),
      sym: COINS[(Math.random() * COINS.length) | 0],
      lime: Math.random() < 0.15
    };
  }

  function resize() {
    if (!canvas) return;
    const r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // densidade por extensão: data-bullet-fx-density no <html> (1 = padrão, 0.3 = poucas balas)
    const density = Math.min(1, Math.max(0.1, +(root.dataset.bulletFxDensity || 1)));
    const nb = Math.max(3, Math.round(Math.min(34, Math.max(10, (W * H) / 52000)) * density));
    const nc = Math.round(Math.min(12, Math.max(4, (W * H) / 150000)));
    bullets = Array.from({ length: nb }, () => newBullet(true));
    coins = Array.from({ length: nc }, () => newCoin(true));
    chart = [];
    let p = 0.5;
    for (let i = 0; i <= 80; i++) { p = Math.min(0.9, Math.max(0.1, p + rnd(-0.06, 0.065))); chart.push(p); }
  }

  function drawBullet(b) {
    const tilt = -0.06;                         // leve subida, como um disparo
    const a = 0.25 + b.z * 0.75;
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(b.wob) * 0.6);
    ctx.rotate(tilt);
    // rastro
    const tg = ctx.createLinearGradient(-b.trail, 0, 0, 0);
    const tc = b.lime ? LIME : PAPER;
    tg.addColorStop(0, `rgba(${tc},0)`);
    tg.addColorStop(1, `rgba(${tc},${0.55 * a})`);
    ctx.fillStyle = tg;
    const th = 0.8 + b.z * 1.6;
    ctx.fillRect(-b.trail, -th / 2, b.trail, th);
    // corpo: cilindro com ponta ogival, metal claro
    const h = 3 + b.z * 5, L = b.len;
    const bg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    bg.addColorStop(0, `rgba(255,255,255,${a})`);
    bg.addColorStop(0.45, `rgba(${PAPER},${a})`);
    bg.addColorStop(1, `rgba(120,118,112,${a})`);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(L * 0.62, -h / 2);
    ctx.quadraticCurveTo(L, -h / 2, L * 1.12, 0);
    ctx.quadraticCurveTo(L, h / 2, L * 0.62, h / 2);
    ctx.lineTo(0, h / 2);
    ctx.closePath();
    ctx.fill();
    // brilho na ponta (lime só nas marcadas)
    if (b.z > 0.55) {
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(L, 0, 0, L, 0, 10 + b.z * 14);
      glow.addColorStop(0, `rgba(${b.lime ? LIME : PAPER},${0.35 * a})`);
      glow.addColorStop(1, `rgba(${b.lime ? LIME : PAPER},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(L - 30, -30, 60, 60);
    }
    ctx.restore();
  }

  function drawCoin(c) {
    const a = 0.4 + c.z * 0.55;
    const sx = Math.cos(c.spin);                // giro 3D no eixo vertical
    const face = Math.abs(sx);
    ctx.save();
    ctx.translate(c.x, c.y + Math.sin(c.bob) * 6);
    // borda da moeda (espessura aparece quando ela está de lado)
    ctx.save();
    ctx.scale(Math.max(0.12, face), 1);
    ctx.translate(-(1 - face) * 3, 0);
    ctx.fillStyle = `rgba(36,36,36,${a})`;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.scale(Math.max(0.08, face), 1);
    // face metálica escura com luz no alto
    const g = ctx.createRadialGradient(-c.r * 0.35, -c.r * 0.45, c.r * 0.05, 0, 0, c.r);
    g.addColorStop(0, `rgba(92,92,90,${a})`);
    g.addColorStop(0.55, `rgba(42,42,41,${a})`);
    g.addColorStop(1, `rgba(19,19,19,${a})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = c.lime ? `rgba(${LIME},${a * 0.8})` : `rgba(${PAPER},${a * 0.45})`;
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, c.r * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${GREY},${a * 0.4})`; ctx.lineWidth = 1; ctx.stroke();
    if (sx > 0.2) {                              // símbolo só do lado da frente
      ctx.fillStyle = `rgba(${PAPER},${Math.min(1, a * 1.25) * face})`;
      ctx.font = `600 ${Math.round(c.r * 1.0)}px "Open Sans","Segoe UI","Segoe UI Symbol",Arial,sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(c.sym, 0, c.r * 0.05);
    }
    ctx.restore();
  }

  function drawChart() {
    // linha de preço discreta no terço de baixo, andando para a esquerda
    const top = H * 0.62, h = H * 0.3, step = W / 70;
    const off = (chartT % 1) * step;
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `rgba(${LIME},0.16)`;
    ctx.beginPath();
    chart.forEach((p, i) => {
      const x = i * step - off, y = top + (1 - p) * h;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    const fill = ctx.createLinearGradient(0, top, 0, top + h);
    fill.addColorStop(0, `rgba(${LIME},0.05)`);
    fill.addColorStop(1, `rgba(${LIME},0)`);
    ctx.lineTo(W, top + h); ctx.lineTo(0, top + h); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  }

  function frame(t) {
    raf = 0;
    if (!canvas) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    ctx.clearRect(0, 0, W, H);
    if (noise) { ctx.fillStyle = ctx.createPattern(noise, "repeat"); ctx.fillRect(0, 0, W, H); }

    chartT += dt * 0.35;
    while (chartT >= 1) {
      chartT -= 1;
      chart.shift();
      const p = chart[chart.length - 1];
      chart.push(Math.min(0.9, Math.max(0.1, p + rnd(-0.06, 0.065))));
    }
    drawChart();

    coins.sort((a, b) => a.z - b.z);
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i];
      c.x -= c.v * dt; c.spin += c.sv * dt; c.bob += dt * 0.8;
      if (c.x < -c.r * 2) coins[i] = newCoin(false);
      drawCoin(c);
    }
    bullets.sort((a, b) => a.z - b.z);
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      b.x += b.v * dt; b.wob += dt * 9;
      if (b.x - b.trail > W) bullets[i] = newBullet(false);
      drawBullet(b);
    }
    if (!reduce.matches && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function start(sel) {
    const target = sel === "body" ? document.body : document.querySelector(sel);
    if (!target) return false;
    if (canvas && host === target) { resize(); kick(); return true; }
    stop();
    host = target;
    canvas = document.createElement("canvas");
    canvas.id = "bullet-fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = (host === document.body ? "position:fixed;" : "position:absolute;") +
      "inset:0;width:100%;height:100%;pointer-events:none;display:block;background:transparent";
    host.appendChild(canvas);
    ctx = canvas.getContext("2d");
    noise ??= makeNoise();
    resize();
    // o contêiner muda de tamanho junto com o layout da página (barra lateral, painel aberto)
    ro = new ResizeObserver(() => {
      const r = host?.getBoundingClientRect();
      if (r && (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2)) { resize(); kick(); }
    });
    ro.observe(host);
    kick();
    return true;
  }

  function kick() {
    if (canvas && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ro?.disconnect();
    ro = null;
    canvas?.remove();
    canvas = ctx = host = null;
  }

  function sync() {
    const sel = root.dataset.bulletFx;
    if (!sel || sel === "off") return stop();
    if (!start(sel)) setTimeout(sync, 500); // contêiner ainda não existe
  }

  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["data-bullet-fx", "data-bullet-fx-density"] });
  addEventListener("resize", () => { if (canvas) { resize(); kick(); } });
  document.addEventListener("visibilitychange", kick);
  reduce.addEventListener("change", kick);
  // o contêiner pode ser recriado pela página: confere de tempos em tempos
  setInterval(() => { if (canvas && !canvas.isConnected) { canvas = null; sync(); } }, 2000);
  sync();
})();
