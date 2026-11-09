// YT Neon: ponte no mundo da página (world MAIN).
// Só aqui dá para chamar a API do player do YouTube (#movie_player), usada para:
//  - aplicar a qualidade padrão escolhida (uma vez por vídeo, sem brigar com a escolha manual);
//  - mudar o volume pelo próprio YouTube, para a barra de volume dele acompanhar.
// Recebe pedidos do script da extensão por eventos "ytn-main" com JSON e não lê nada da conta.
(() => {
  if (window.__ytnMain) return;
  window.__ytnMain = true;

  const root = document.documentElement;
  const ORDER = ["hd2160", "hd1440", "hd1080", "hd720", "large", "medium", "small", "tiny"];
  const player = () => document.getElementById("movie_player");
  let appliedFor = "";
  let timer = 0;

  function applyQuality() {
    const want = root.dataset.ytnQuality;
    const p = player();
    if (!want || want === "auto" || !p?.getAvailableQualityLevels) return;
    if (p.classList.contains("ad-showing")) return schedule(1500); // anúncio: espera o vídeo
    const id = p.getVideoData?.()?.video_id || location.href;
    if (appliedFor === id + want) return;
    const avail = p.getAvailableQualityLevels() || [];
    if (!avail.length) return schedule(1000);
    // a escolhida, ou a melhor abaixo dela que existir neste vídeo
    const pick = avail.includes(want) ? want : ORDER.slice(ORDER.indexOf(want)).find((q) => avail.includes(q)) || avail[avail.length - 1];
    try {
      p.setPlaybackQualityRange?.(pick, pick);
      p.setPlaybackQuality?.(pick);
      appliedFor = id + want;
    } catch {}
  }
  function schedule(ms = 700) {
    clearTimeout(timer);
    timer = setTimeout(applyQuality, ms);
  }

  document.addEventListener("yt-navigate-finish", () => schedule());
  document.addEventListener("loadeddata", () => schedule(), true);
  new MutationObserver(() => { appliedFor = ""; schedule(200); }).observe(root, { attributes: true, attributeFilter: ["data-ytn-quality"] });

  document.addEventListener("ytn-main", (event) => {
    let msg;
    try { msg = JSON.parse(event.detail); } catch { return; }
    const p = player();
    if (!p?.setVolume) return;
    if (msg.cmd === "volume") {
      const v = Math.max(0, Math.min(100, Math.round(msg.value)));
      if (v > 0 && p.isMuted?.()) p.unMute();
      p.setVolume(v);
      if (v === 0) p.mute?.();
    }
  });

  schedule(1200);
})();
