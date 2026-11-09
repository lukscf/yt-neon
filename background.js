// YT Neon: ícone da barra na cor escolhida e atalho do player flutuante.
const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);

function iconPaths(color) {
  const c = COLORS.has(color) ? color : "purple";
  const path = {};
  for (const n of [16, 32, 48, 128]) path[n] = `icons/${c}/icon${n}.png`;
  return path;
}

async function applyIcon(color) {
  if (color === undefined) ({ color } = await chrome.storage.local.get({ color: "purple" }));
  try {
    await chrome.action.setIcon({ path: iconPaths(color) });
  } catch (error) {
    console.warn("YT Neon: não foi possível trocar o ícone", error);
  }
}

chrome.runtime.onInstalled.addListener(() => applyIcon());
chrome.runtime.onStartup.addListener(() => applyIcon());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.color) applyIcon(changes.color.newValue);
});
applyIcon();

// Atalho (Alt+Shift+Y, dá para trocar em chrome://extensions/shortcuts).
// A janela flutuante só abre com um gesto do usuário. O Chrome repassa o gesto do atalho
// para o script injetado aqui, que chama o float.js que já está na página.
async function toggleFloat(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (window.__ytnFloat ? window.__ytnFloat.toggle("atalho") : "sem-player")
    });
    return res?.result;
  } catch (error) {
    console.warn("YT Neon: atalho fora do YouTube", error);
    return "fora";
  }
}

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "toggle-float") return;
  if (!tab) [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url?.startsWith("https://www.youtube.com/")) toggleFloat(tab.id);
});

