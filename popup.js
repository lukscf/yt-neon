const DEFAULTS = {
  theme: true, tilt: true, floatButton: true,
  color: "purple", background: "bullet", font: "youtube"
};
const COLORS = { purple: "#bd77ff", blue: "#5c9dff", pink: "#ff74bb", cyan: "#4fe0db", green: "#75df95", bullet: "#C2F141" };
// Tema Bullet: tons neutros do Bullet Identity Source em vez de um matiz.
const BULLET_LOOK = { "--bg": "#070707", "--panel": "#131313", "--line": "#333333", "--text": "#FFFFFF", "--muted": "#A3A3A3", "--top": "#1A1A1A" };
// O popup inteiro acompanha a cor: fundo, painéis, linhas e texto secundário têm o mesmo tom.
const HUES = { purple: 275, blue: 218, pink: 330, cyan: 178, green: 140 };
function tint(color) {
  document.documentElement.dataset.look = color;
  const root = document.documentElement.style;
  if (color === "bullet") {
    for (const [k, v] of Object.entries(BULLET_LOOK)) root.setProperty(k, v);
    return;
  }
  const h = HUES[color] ?? HUES.purple;
  root.setProperty("--bg", `hsl(${h} 50% 4%)`);
  root.setProperty("--panel", `hsl(${h} 42% 10%)`);
  root.setProperty("--line", `hsl(${h} 30% 24%)`);
  root.setProperty("--text", `hsl(${h} 100% 96%)`);
  root.setProperty("--muted", `hsl(${h} 22% 70%)`);
  root.setProperty("--top", `hsl(${h} 40% 20%)`);
}
const YT = "https://www.youtube.com/";
const $ = (selector) => document.querySelector(selector);

function status(message, error = false) {
  const el = $("#status");
  el.textContent = message;
  el.style.color = error ? "#ff9db1" : "var(--accent)";
}

function showColor(color) {
  document.documentElement.style.setProperty("--accent", COLORS[color] || COLORS.purple);
  tint(color);
  document.querySelectorAll(".colors button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.color === color));
  });
}

chrome.storage.local.get(DEFAULTS).then((settings) => {
  for (const key of ["theme", "tilt", "floatButton"]) $("#" + key).checked = !!settings[key];
  $("#background").value = settings.background;
  $("#font").value = settings.font;
  showColor(settings.color);
});

for (const key of ["theme", "tilt", "floatButton"]) {
  $("#" + key).addEventListener("change", (event) => {
    chrome.storage.local.set({ [key]: event.target.checked });
    status("Preferência salva.");
  });
}
$("#background").addEventListener("change", (event) => {
  chrome.storage.local.set({ background: event.target.value });
  status("Fundo atualizado.");
});
$("#font").addEventListener("change", (event) => {
  chrome.storage.local.set({ font: event.target.value });
  status("Fonte atualizada.");
});
document.querySelectorAll(".colors button").forEach((button) => button.addEventListener("click", () => {
  const color = button.dataset.color;
  showColor(color);
  // Escolher Bullet liga também o fundo de balas e cripto
  if (color === "bullet") {
    chrome.storage.local.set({ color, background: "bullet" });
    $("#background").value = "bullet";
    status("Tema Bullet aplicado.");
    return;
  }
  chrome.storage.local.set({ color });
  status("Cor atualizada.");
}));

// Player flutuante: o clique no popup é o gesto que o Chrome exige para abrir a janela.
$("#float").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith(YT)) return status("Abra um vídeo do YouTube nesta aba.", true);
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (window.__ytnFloat ? window.__ytnFloat.toggle("popup") : "sem-player")
    });
    const r = res?.result;
    if (r === "sem-player") status("Recarregue o YouTube (F5) para ativar o YT Neon.", true);
    else if (r === "sem-video") status("Não há vídeo nesta página.", true);
    else if (r === "erro") status("O Chrome não abriu a janela. Use o botão no player.", true);
    else if (r === "fechado") status("Player flutuante fechado.");
    else window.close(); // abriu: fecha o popup
  } catch {
    status("Recarregue o YouTube (F5) para ativar o YT Neon.", true);
  }
});

// Diagnóstico: mostra se a extensão está ativa na aba do YouTube aberta.
(async () => {
  const diag = $("#diag");
  const version = chrome.runtime.getManifest().version;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith(YT)) {
      diag.textContent = `YT Neon ${version}. Abra o YouTube para ver o diagnóstico.`;
      return;
    }
    const info = await chrome.tabs.sendMessage(tab.id, { type: "ping" });
    diag.textContent = `YT Neon ${version} ativo nesta aba. Tema ${info.theme ? "aplicado" : "desligado"}.`;
  } catch {
    diag.textContent = `YT Neon ${version} instalado, mas não está rodando nesta aba. Recarregue o YouTube (F5).`;
  }
})();
