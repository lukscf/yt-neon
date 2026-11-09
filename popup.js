const Y = globalThis.YTN;
const YT = "https://www.youtube.com/";
const $ = (s) => document.querySelector(s);
let tab = null;

function status(message, error = false) {
  const el = $("#status");
  el.textContent = message;
  el.style.color = error ? "#ff9db1" : "var(--accent)";
}

Y.load().then((cfg) => {
  YTNForm.render($("#settings"), cfg, { status, open: ["Aparência"] });
});

$("#options").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

// Estado do vídeo da aba aberta (velocidade, loop, volume extra)
async function refresh() {
  if (!tab?.url?.startsWith(YT)) return;
  try {
    const s = await chrome.tabs.sendMessage(tab.id, { type: "state" });
    $("#speed").textContent = `${String(+s.speed.toFixed(2)).replace(".", ",")}x`;
    document.querySelector('[data-action="loop"]').classList.toggle("on", !!s.loop);
    document.querySelector('[data-action="abLoop"]').classList.toggle("on", !!s.ab);
    const bits = [];
    if (!s.video) bits.push("Nenhum vídeo aberto nesta aba.");
    if (s.boost > 100) bits.push(`Volume extra em ${s.boost}%.`);
    $("#video-state").textContent = bits.join(" ");
  } catch {}
}

document.querySelectorAll("#actions [data-action]").forEach((b) => b.addEventListener("click", async () => {
  if (!tab?.url?.startsWith(YT)) return status("Abra um vídeo do YouTube nesta aba.", true);
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "action", action: b.dataset.action });
    setTimeout(refresh, 150);
  } catch {
    status("Recarregue o YouTube (F5) para ativar o YT Neon.", true);
  }
}));

// Player flutuante: o clique no popup é o gesto que o Chrome exige para abrir a janela.
$("#float").addEventListener("click", async () => {
  if (!tab?.url?.startsWith(YT)) return status("Abra um vídeo do YouTube nesta aba.", true);
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (window.__ytnFloat ? window.__ytnFloat.toggle("popup") : "sem-player")
    });
    const r = res?.result;
    if (r === "sem-player") status("Recarregue o YouTube (F5) para ativar o YT Neon.", true);
    else if (r === "sem-video") status("Não há vídeo nesta página.", true);
    else if (r === "erro") status("O navegador não abriu a janela. Use o botão Flutuar no vídeo.", true);
    else if (r === "fechado") status("Player flutuante fechado.");
    else window.close();
  } catch {
    status("Recarregue o YouTube (F5) para ativar o YT Neon.", true);
  }
});

// Diagnóstico: mostra se a extensão está ativa na aba aberta.
(async () => {
  const diag = $("#diag");
  const version = chrome.runtime.getManifest().version;
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith(YT)) {
    diag.textContent = `YT Neon ${version}. Abra o YouTube para usar as ações do vídeo.`;
    document.body.classList.add("no-yt");
    return;
  }
  try {
    const info = await chrome.tabs.sendMessage(tab.id, { type: "ping" });
    diag.textContent = `YT Neon ${version} ativo nesta aba. Tema ${info.theme ? "aplicado" : "desligado"}.`;
    refresh();
  } catch {
    diag.textContent = `YT Neon ${version} instalado, mas não está rodando nesta aba. Recarregue o YouTube (F5).`;
  }
})();
