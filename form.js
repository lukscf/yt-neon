// YT Neon: monta os controles de configuração a partir do esquema (settings.js).
// Usado pelo popup e pela página de opções, para os dois ficarem sempre iguais.
(() => {
  const Y = globalThis.YTN;
  const ACCENTS = Object.fromEntries(Y.SCHEMA.find((f) => f.key === "color").options.map(([k, , c]) => [k, c]));
  const HUES = { purple: 275, blue: 218, pink: 330, cyan: 178, green: 140 };
  const BULLET_LOOK = { "--bg": "#070707", "--panel": "#131313", "--line": "#333333", "--text": "#FFFFFF", "--muted": "#A3A3A3", "--top": "#1A1A1A" };

  // A página inteira acompanha a cor do tema
  function tint(color) {
    const root = document.documentElement;
    root.dataset.look = color;
    root.style.setProperty("--accent", ACCENTS[color] || ACCENTS.purple);
    if (color === "bullet") { for (const [k, v] of Object.entries(BULLET_LOOK)) root.style.setProperty(k, v); return; }
    const h = HUES[color] ?? HUES.purple;
    root.style.setProperty("--bg", `hsl(${h} 50% 4%)`);
    root.style.setProperty("--panel", `hsl(${h} 42% 10%)`);
    root.style.setProperty("--line", `hsl(${h} 30% 24%)`);
    root.style.setProperty("--text", `hsl(${h} 100% 96%)`);
    root.style.setProperty("--muted", `hsl(${h} 22% 70%)`);
    root.style.setProperty("--top", `hsl(${h} 40% 20%)`);
  }

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    n.append(...kids.filter(Boolean));
    return n;
  };
  const fmtRange = (f, v) => (f.zero && +v === 0 ? f.zero : `${String(v).replace(".", ",")}${f.unit || ""}`);

  // status: função (mensagem, erro?) da página
  function render(container, cfg, { status = () => {}, sections = null, open = [] } = {}) {
    const updaters = {};
    const bySection = new Map();
    for (const f of Y.SCHEMA) {
      if (sections && !sections.includes(f.section)) continue;
      if (!bySection.has(f.section)) bySection.set(f.section, []);
      bySection.get(f.section).push(f);
    }
    for (const [section, fields] of bySection) {
      const box = el("details", { class: "section", open: open === true || open.includes(section) }, el("summary", { text: section }));
      for (const f of fields) box.appendChild(field(f, cfg, updaters, status));
      container.appendChild(box);
    }
    if (cfg.color) tint(cfg.color);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      for (const [k, { newValue }] of Object.entries(changes)) {
        cfg[k] = newValue ?? Y.DEFAULTS[k];
        updaters[k]?.(cfg[k]);
        if (k === "color") tint(cfg[k]);
      }
    });
    return updaters;
  }

  function field(f, cfg, updaters, status) {
    const id = "f-" + f.key;
    const save = (v, msg = "Preferência salva.") => { cfg[f.key] = v; Y.save({ [f.key]: v }).then(() => status(msg)); };
    let node;
    if (f.type === "bool") {
      const input = el("input", { id, type: "checkbox" });
      input.checked = !!cfg[f.key];
      input.addEventListener("change", () => {
        save(input.checked);
      });
      updaters[f.key] = (v) => { input.checked = !!v; };
      node = el("label", { class: "switch-row", for: id }, el("span", { text: f.label }), input);
    } else if (f.type === "select") {
      const sel = el("select", { id });
      for (const [v, t] of f.options) sel.appendChild(el("option", { value: v, text: t }));
      sel.value = String(cfg[f.key]);
      sel.addEventListener("change", () => save(sel.value));
      updaters[f.key] = (v) => { sel.value = String(v); };
      node = el("div", { class: "field-row" }, el("label", { class: "field", for: id, text: f.label }), sel);
    } else if (f.type === "range") {
      const out = el("output", { for: id, text: fmtRange(f, cfg[f.key]) });
      const input = el("input", { id, type: "range", min: f.min, max: f.max, step: f.step });
      input.value = cfg[f.key];
      const paint = () => input.style.setProperty("--p", ((input.value - f.min) / (f.max - f.min)) * 100 + "%");
      paint();
      input.addEventListener("input", () => { out.textContent = fmtRange(f, input.value); paint(); });
      input.addEventListener("change", () => save(+input.value));
      updaters[f.key] = (v) => { input.value = v; out.textContent = fmtRange(f, v); paint(); };
      node = el("div", { class: "field-row" }, el("label", { class: "field range-label", for: id }, el("span", { text: f.label }), out), input);
    } else if (f.type === "colors") {
      const group = el("div", { class: "colors", role: "group", "aria-label": f.label });
      for (const [v, t, c] of f.options) {
        group.appendChild(el("button", { type: "button", "data-color": v, class: v === "bullet" ? "bullet" : "", title: t, "aria-label": t, style: `--dot:${c}`,
          onclick: () => {
            // escolher Bullet liga junto o fundo de balas e cripto
            if (v === "bullet") { cfg.background = "bullet"; Y.save({ color: v, background: "bullet" }).then(() => status("Tema Bullet aplicado.")); }
            else save(v, "Cor atualizada.");
            mark(v);
            tint(v);
          } }));
      }
      const mark = (v) => group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.color === v)));
      mark(cfg[f.key]);
      updaters[f.key] = mark;
      node = el("div", { class: "field-row" }, el("span", { class: "field", text: f.label }), group);
    } else if (f.type === "multi") {
      const list = el("div", { class: "multi" });
      const boxes = [];
      for (const [v, t] of f.options) {
        const cb = el("input", { type: "checkbox", value: v });
        cb.checked = (cfg[f.key] || []).includes(v);
        cb.addEventListener("change", () => {
          const vals = boxes.filter((b) => b.checked).map((b) => b.value);
          if (!vals.length) { cb.checked = true; return status("Deixe pelo menos uma categoria marcada.", true); }
          save(vals);
        });
        boxes.push(cb);
        list.appendChild(el("label", { class: "check" }, cb, el("span", { text: t })));
      }
      updaters[f.key] = (vals) => boxes.forEach((b) => { b.checked = (vals || []).includes(b.value); });
      node = el("div", { class: "field-row" }, el("span", { class: "field", text: f.label }), list);
    }
    if (f.note) node.appendChild(el("p", { class: "hint", text: f.note }));
    return node;
  }

  globalThis.YTNForm = { render, tint, el };
})();
