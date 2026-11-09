// YT Neon: esquema único das configurações. Usado pelos scripts da página, pelo popup e pela página de opções.
// As preferências ficam em chrome.storage.sync (acompanham o navegador da conta, se a sincronização estiver ligada).
// Dados que mudam toda hora (posição dos vídeos, velocidade por canal) ficam em chrome.storage.local.
(() => {
  if (globalThis.YTN) return;

  // type: bool | select | range | colors | multi
  const SCHEMA = [
    { section: "Aparência", key: "theme", type: "bool", label: "Tema neon", def: true },
    { section: "Aparência", key: "color", type: "colors", label: "Cor do tema", def: "purple",
      options: [["purple", "Roxo", "#bd77ff"], ["blue", "Azul", "#5c9dff"], ["pink", "Rosa", "#ff74bb"], ["cyan", "Ciano", "#4fe0db"], ["green", "Verde", "#75df95"], ["bullet", "Bullet", "#C2F141"]] },
    { section: "Aparência", key: "background", type: "select", label: "Fundo animado", def: "bullet",
      options: [["bullet", "Bullet: balas e cripto"], ["aurora", "Aurora suave"], ["stars", "Estrelas cintilantes"], ["matrix", "Chuva Matrix"], ["synthwave", "Grade synthwave"], ["bokeh", "Bolhas de luz"], ["warp", "Hiperespaço"], ["rain", "Chuva neon"], ["fireflies", "Vaga-lumes"], ["orbit", "Órbitas de luz"], ["none", "Nenhum"]] },
    { section: "Aparência", key: "font", type: "select", label: "Fonte", def: "youtube",
      options: [["youtube", "Do tema (YouTube; Open Sans no Bullet)"], ["mono", "Mono robot (Roboto Mono)"], ["opensans", "Open Sans"], ["arial", "Arial"]] },
    { section: "Aparência", key: "tilt", type: "bool", label: "Hover 3D com o mouse", def: true },

    { section: "Player", key: "floatButton", type: "bool", label: "Botão do player flutuante", def: true },
    { section: "Player", key: "floatMode", type: "select", label: "Player flutuante", def: "doc",
      options: [["doc", "Completo: controles neon e esticar"], ["native", "Mínimo: só o vídeo, sem a barra do navegador"]],
      note: "No modo completo, o Chrome sempre mostra uma barra com o endereço do site no topo da janela (é uma regra de segurança dele). O modo mínimo não tem barra, mas usa os controles do navegador e não estica." },
    { section: "Player", key: "floatFill", type: "bool", label: "Esticar o vídeo no player flutuante", def: false },
    { section: "Player", key: "defaultSpeed", type: "range", label: "Velocidade padrão", def: 1, min: 0.25, max: 4, step: 0.05, unit: "x" },
    { section: "Player", key: "speedStep", type: "select", label: "Passo da velocidade nos atalhos", def: "0.1", options: [["0.05", "0,05x"], ["0.1", "0,10x"], ["0.25", "0,25x"]] },
    { section: "Player", key: "speedPerChannel", type: "bool", label: "Lembrar a velocidade de cada canal", def: true },
    { section: "Player", key: "boost", type: "range", label: "Volume extra (acima de 100%)", def: 100, min: 100, max: 400, step: 10, unit: "%" },
    { section: "Player", key: "normalize", type: "bool", label: "Normalizar o volume (iguala partes altas e baixas)", def: false },
    { section: "Player", key: "wheelVolume", type: "bool", label: "Roda do mouse no player muda o volume", def: true },
    { section: "Player", key: "quality", type: "select", label: "Qualidade padrão", def: "auto",
      options: [["auto", "Automática (do YouTube)"], ["hd2160", "4K (2160p)"], ["hd1440", "1440p"], ["hd1080", "1080p"], ["hd720", "720p"], ["large", "480p"], ["medium", "360p"], ["small", "240p"]] },
    { section: "Player", key: "resume", type: "bool", label: "Retomar de onde parou", def: true },

    { section: "Interface", key: "focusMode", type: "bool", label: "Modo foco (só o player na página do vídeo)", def: false },
    { section: "Interface", key: "hideShorts", type: "bool", label: "Esconder Shorts", def: false },
    { section: "Interface", key: "hideComments", type: "bool", label: "Esconder comentários", def: false },
    { section: "Interface", key: "hideRelated", type: "bool", label: "Esconder recomendações da lateral", def: false },
    { section: "Interface", key: "hideCards", type: "bool", label: "Esconder cards durante o vídeo", def: false },
    { section: "Interface", key: "hideEndscreens", type: "bool", label: "Esconder telas finais", def: false },
    { section: "Interface", key: "gridColumns", type: "range", label: "Colunas na página inicial", def: 0, min: 0, max: 8, step: 1, zero: "Automático" }

  ];

  // Atalhos dentro da página do YouTube (editáveis na página de opções).
  // Evitam as teclas do próprio YouTube (K, J, L, F, M, C, T, I, números, < >, Shift+N/P).
  const SHORTCUTS = [
    ["speedUp", "Acelerar", "]"],
    ["speedDown", "Desacelerar", "["],
    ["speedReset", "Velocidade normal (1x)", "\\"],
    ["boostUp", "Mais volume extra", "Alt+ArrowUp"],
    ["boostDown", "Menos volume extra", "Alt+ArrowDown"],
    ["loop", "Repetir o vídeo (loop)", "Shift+R"],
    ["abLoop", "Loop A-B (marca A, marca B, desliga)", "Shift+A"],
    ["screenshot", "Capturar o frame (PNG)", "Shift+S"],
    ["focus", "Modo foco", "Shift+C"],
    ["float", "Player flutuante", "Alt+P"]
  ];

  const DEFAULTS = Object.fromEntries(SCHEMA.map((f) => [f.key, f.def]));
  DEFAULTS.shortcuts = Object.fromEntries(SHORTCUTS.map(([k, , d]) => [k, d]));

  // Normaliza uma tecla para comparar e guardar: "Ctrl+Alt+Shift+Meta+Tecla".
  function comboOf(e) {
    const k = e.key;
    if (!k || ["Control", "Alt", "Shift", "Meta", "AltGraph", "Dead", "Unidentified"].includes(k)) return "";
    const key = k === " " ? "Space" : k.length === 1 ? k.toUpperCase() : k;
    // Shift muda o símbolo (] vira }) em vez de ser um modificador: só conta para letras e teclas com nome
    const shift = e.shiftKey && (k.length > 1 || /[a-z]/i.test(k));
    return [e.ctrlKey && "Ctrl", e.altKey && "Alt", shift && "Shift", e.metaKey && "Meta", key].filter(Boolean).join("+");
  }
  const prettyCombo = (c) => (c || "—").replace("ArrowUp", "↑").replace("ArrowDown", "↓").replace("ArrowLeft", "←").replace("ArrowRight", "→");

  // Confere tipos e limites: usado ao carregar e ao importar um arquivo
  function sanitize(input) {
    const out = {};
    for (const f of SCHEMA) {
      if (!(f.key in (input || {}))) continue;
      const v = input[f.key];
      if (f.type === "bool" && typeof v === "boolean") out[f.key] = v;
      else if ((f.type === "select" || f.type === "colors") && f.options.some(([o]) => o === String(v))) out[f.key] = String(v);
      else if (f.type === "range" && typeof v === "number" && isFinite(v)) out[f.key] = Math.min(f.max, Math.max(f.min, v));
      else if (f.type === "multi" && Array.isArray(v)) out[f.key] = v.filter((x) => f.options.some(([o]) => o === x));
    }
    if (input?.shortcuts && typeof input.shortcuts === "object") {
      out.shortcuts = { ...DEFAULTS.shortcuts };
      for (const [k] of SHORTCUTS) if (typeof input.shortcuts[k] === "string" && input.shortcuts[k].length < 40) out.shortcuts[k] = input.shortcuts[k];
    }
    return out;
  }

  async function load() {
    const got = await chrome.storage.sync.get(DEFAULTS);
    return { ...DEFAULTS, ...sanitize(got), shortcuts: { ...DEFAULTS.shortcuts, ...(sanitize(got).shortcuts || {}) } };
  }
  const save = (patch) => chrome.storage.sync.set(patch);

  globalThis.YTN = { SCHEMA, SHORTCUTS, DEFAULTS, comboOf, prettyCombo, sanitize, load, save };
})();
