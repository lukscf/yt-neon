const Y = globalThis.YTN;
const $ = (s) => document.querySelector(s);
const { el } = YTNForm;
let cfg;

function status(message, error = false) {
  const s = $("#status");
  s.textContent = message;
  s.style.color = error ? "#ff9db1" : "var(--accent)";
}

// ---------- Atalhos editáveis ----------
let recording = null; // { action, button }
function renderKeys() {
  const box = $("#keys");
  box.textContent = "";
  const used = {};
  for (const [k] of Y.SHORTCUTS) if (cfg.shortcuts[k]) used[cfg.shortcuts[k]] = (used[cfg.shortcuts[k]] || 0) + 1;
  for (const [action, label] of Y.SHORTCUTS) {
    const combo = cfg.shortcuts[action];
    const kbd = el("kbd", { class: used[combo] > 1 ? "dup" : "", title: used[combo] > 1 ? "Mesma tecla em duas ações" : "", text: Y.prettyCombo(combo) });
    const btn = el("button", { type: "button", "aria-label": `Mudar o atalho de ${label}`, text: "Mudar",
      onclick: () => startRecording(action, btn) });
    box.append(el("span", { text: label }), kbd, btn);
  }
}
function startRecording(action, button) {
  stopRecording();
  recording = { action, button };
  button.classList.add("rec");
  button.textContent = "Aperte…";
}
function stopRecording() {
  if (!recording) return;
  recording.button.classList.remove("rec");
  recording.button.textContent = "Mudar";
  recording = null;
}
document.addEventListener("keydown", (e) => {
  if (!recording) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === "Escape") return stopRecording();
  const combo = e.key === "Backspace" ? "" : Y.comboOf(e);
  if (combo === null || (e.key !== "Backspace" && !combo)) return; // só modificador: espera a tecla
  const shortcuts = { ...cfg.shortcuts, [recording.action]: combo };
  stopRecording();
  Y.save({ shortcuts }).then(() => status(combo ? `Atalho salvo: ${Y.prettyCombo(combo)}` : "Atalho removido."));
}, true);
$("#reset-keys").addEventListener("click", () => Y.save({ shortcuts: { ...Y.DEFAULTS.shortcuts } }).then(() => status("Atalhos padrão restaurados.")));
$("#open-shortcuts").addEventListener("click", (e) => { e.preventDefault(); chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); });
chrome.commands.getAll().then((cmds) => {
  const c = cmds.find((x) => x.name === "toggle-float");
  $("#global-key").textContent = c?.shortcut || "sem atalho (defina em chrome://extensions/shortcuts)";
});

// ---------- Exportar / importar ----------
$("#export").addEventListener("click", async () => {
  const data = { app: "yt-neon", version: chrome.runtime.getManifest().version, exportedAt: new Date().toISOString(), settings: await Y.load() };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `yt-neon-configuracoes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  status("Arquivo exportado.");
});
$("#import").addEventListener("click", () => $("#file").click());
$("#file").addEventListener("change", async () => {
  const file = $("#file").files[0];
  $("#file").value = "";
  if (!file) return;
  try {
    if (file.size > 200000) throw new Error("grande");
    const data = JSON.parse(await file.text());
    if (data?.app !== "yt-neon" || typeof data.settings !== "object") throw new Error("formato");
    const clean = Y.sanitize(data.settings);
    await Y.save(clean);
    status(`Importado: ${Object.keys(clean).length} configurações.`);
  } catch {
    status("Arquivo inválido: use um .json exportado pelo YT Neon.", true);
  }
});
$("#reset-all").addEventListener("click", async () => {
  if (!confirm("Voltar todas as configurações do YT Neon ao padrão?")) return;
  await chrome.storage.sync.clear();
  location.reload();
});
$("#clear-local").addEventListener("click", async () => {
  if (!confirm("Apagar as posições salvas dos vídeos e as velocidades lembradas por canal?")) return;
  await chrome.storage.local.remove(["resume", "chanSpeed"]);
  status("Posições e velocidades apagadas.");
});

Y.load().then((c) => {
  cfg = c;
  YTNForm.render($("#settings"), cfg, { status, open: true });
  renderKeys();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.shortcuts) { cfg.shortcuts = { ...Y.DEFAULTS.shortcuts, ...(changes.shortcuts.newValue || {}) }; renderKeys(); }
  });
});
