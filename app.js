/* =========================================================
   RathnaHub – app.js
   Depends on: FIELD_DEFS and GEMS from data.js
   ========================================================= */
(() => {
  "use strict";

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);

  const state = {
    lang: "both",      // "en" | "si" | "both"
    query: "",
    group: "All",
    openId: null       // id of gem shown in the dialog
  };

  const el = {
    body: document.body,
    grid: $("#gemGrid"),
    chips: $("#groupChips"),
    count: $("#resultCount"),
    empty: $("#emptyState"),
    search: $("#searchInput"),
    reset: $("#resetBtn"),
    total: $("#totalCount"),
    dialog: $("#gemDialog"),
    dlgGem: $("#dlgGem"),
    dlgNo: $("#dlgNo"),
    dlgTitle: $("#dlgTitle"),
    dlgSi: $("#dlgSi"),
    dlgProps: $("#dlgProps"),
    prev: $("#dlgPrev"),
    next: $("#dlgNext")
  };

  /* Turn "text" or {en, si} into {en, si} */
  const norm = (v) => {
    if (v == null || v === "") return { en: "", si: "" };
    if (typeof v === "string") return { en: v, si: "" };
    return { en: v.en || "", si: v.si || "" };
  };

  /* Create an element quickly */
  const make = (tag, className, text) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  };

  /* Faceted gem icon, tinted with any hex colour */
  const gemSVG = (color) => `
    <svg class="gem-svg" viewBox="0 0 100 90" aria-hidden="true" focusable="false">
      <polygon points="25,4 75,4 98,34 50,88 2,34" fill="${color}"/>
      <polygon points="25,4 50,34 2,34"   fill="#fff" fill-opacity=".30"/>
      <polygon points="25,4 75,4 50,34"   fill="#fff" fill-opacity=".14"/>
      <polygon points="75,4 98,34 50,34"  fill="#000" fill-opacity=".10"/>
      <polygon points="2,34 50,34 50,88"  fill="#000" fill-opacity=".14"/>
      <polygon points="98,34 50,34 50,88" fill="#000" fill-opacity=".28"/>
    </svg>`;

  /* Chemical formulas: 2 -> subscript. Result is built from our own data. */
  const formulaHTML = (text) =>
    text.replace(/[<>&]/g, "").replace(/(\d+)/g, "<sub>$1</sub>");

  /* ---------- filtering ---------- */
  const haystack = (gem) => {
    const f = gem.fields;
    return [
      gem.name.en, gem.name.si, gem.group,
      norm(f.formula).en, norm(f.composition).en,
      norm(f.colour).en, norm(f.colour).si,
      norm(f.locality).en
    ].join(" ").toLowerCase();
  };

  const visibleGems = () => {
    const q = state.query.trim().toLowerCase();
    return GEMS.filter((g) =>
      (state.group === "All" || g.group === state.group) &&
      (!q || haystack(g).includes(q))
    );
  };

  /* ---------- render: chips ---------- */
  const renderChips = () => {
    const groups = ["All", ...new Set(GEMS.map((g) => g.group))].sort((a, b) =>
      a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)
    );
    el.chips.replaceChildren(
      ...groups.map((name) => {
        const b = make("button", "chip", name);
        b.type = "button";
        b.dataset.group = name;
        b.setAttribute("aria-pressed", String(name === state.group));
        return b;
      })
    );
  };

  /* ---------- render: cards ---------- */
  const cardFor = (gem) => {
    const li = make("li");
    const btn = make("button", "card");
    btn.type = "button";
    btn.dataset.id = gem.id;
    btn.style.setProperty("--gem", gem.swatch);

    const no = String(gem.no).padStart(2, "0");
    const hardness = norm(gem.fields.hardness).en || "—";
    const sg = norm(gem.fields.sg).en || "—";

    btn.innerHTML = `
      <div class="card-visual">
        <span class="card-no">${no}</span>
        ${gemSVG(gem.swatch)}
      </div>
      <div class="card-body">
        <h3 class="en-only"></h3>
        <p class="card-si si-only"></p>
        <p class="card-group"></p>
        <dl class="card-meta">
          <div><dt>Hardness</dt><dd class="h"></dd></div>
          <div><dt>SG</dt><dd class="s"></dd></div>
        </dl>
      </div>`;
    // textContent for user-facing strings (safe by default)
    $("h3", btn).textContent = gem.name.en;
    $(".card-si", btn).textContent = gem.name.si;
    $(".card-group", btn).textContent = gem.group;
    $(".h", btn).textContent = hardness;
    $(".s", btn).textContent = sg;

    li.append(btn);
    return li;
  };

  const renderGrid = () => {
    const list = visibleGems();
    el.grid.replaceChildren(...list.map(cardFor));
    el.empty.hidden = list.length > 0;
    el.count.textContent = `Showing ${list.length} of ${GEMS.length} gems`;
  };

  /* ---------- render: dialog ---------- */
  const renderDialog = (gem) => {
    el.dlgGem.innerHTML = gemSVG(gem.swatch);
    el.dlgNo.textContent = `No. ${String(gem.no).padStart(2, "0")} · ${gem.group}`;
    el.dlgTitle.textContent = gem.name.en;
    el.dlgSi.textContent = gem.name.si;

    const rows = FIELD_DEFS.map((def) => {
      const row = make("div", "prop");

      const dt = make("dt");
      dt.append(make("span", "en-only", def.en));
      dt.append(make("span", "si-label si-only", def.si));

      const dd = make("dd");
      const v = norm(gem.fields[def.key]);
      if (!v.en && !v.si) {
        dd.className = "blank";
        dd.textContent = "—";
      } else if (def.key === "formula") {
        dd.innerHTML = formulaHTML(v.en);
      } else if (v.si) {
        dd.append(make("span", "en-only", v.en));
        dd.append(make("span", "si-val si-only", v.si));
      } else {
        dd.textContent = v.en;
      }

      row.append(dt, dd);
      return row;
    });
    el.dlgProps.replaceChildren(...rows);

    // prev / next among the currently visible list
    const list = visibleGems();
    const i = list.findIndex((g) => g.id === gem.id);
    el.prev.disabled = i <= 0;
    el.next.disabled = i === -1 || i >= list.length - 1;
    $(".sheet-body", el.dialog).scrollTop = 0;
  };

  const openGem = (id) => {
    const gem = GEMS.find((g) => g.id === id);
    if (!gem) return;
    state.openId = id;
    renderDialog(gem);
    if (!el.dialog.open) el.dialog.showModal();
  };

  const step = (dir) => {
    const list = visibleGems();
    const i = list.findIndex((g) => g.id === state.openId);
    const target = list[i + dir];
    if (target) openGem(target.id);
  };

  /* ---------- language ---------- */
  const setLang = (lang) => {
    state.lang = lang;
    el.body.dataset.lang = lang;
    document.documentElement.lang = lang === "si" ? "si" : "en";
    document.querySelectorAll(".lang-btn").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang))
    );
    try { localStorage.setItem("rathnahub-lang", lang); } catch (_) { /* ignore */ }
  };

  /* ---------- events ---------- */
  el.search.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderGrid();
  });

  el.chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    state.group = chip.dataset.group;
    renderChips();
    renderGrid();
  });

  el.grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) openGem(card.dataset.id);
  });

  el.reset.addEventListener("click", () => {
    state.query = "";
    state.group = "All";
    el.search.value = "";
    renderChips();
    renderGrid();
    el.search.focus();
  });

  document.querySelectorAll(".lang-btn").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang))
  );

  $("#dlgClose").addEventListener("click", () => el.dialog.close());
  el.prev.addEventListener("click", () => step(-1));
  el.next.addEventListener("click", () => step(1));

  // click on the dark backdrop closes the dialog
  el.dialog.addEventListener("click", (e) => {
    if (e.target === el.dialog) el.dialog.close();
  });

  // arrow keys move between gems while the dialog is open
  el.dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  el.dialog.addEventListener("close", () => { state.openId = null; });

  /* ---------- init ---------- */
  const init = () => {
    $("#brandGem").innerHTML = gemSVG("#7fd6b0");
    $("#heroGem").innerHTML = gemSVG("#5fc9a0");
    $("#year").textContent = new Date().getFullYear();
    el.total.textContent = GEMS.length;

    let saved = "both";
    try { saved = localStorage.getItem("rathnahub-lang") || "both"; } catch (_) { /* ignore */ }
    setLang(["en", "si", "both"].includes(saved) ? saved : "both");

    GEMS.sort((a, b) => a.no - b.no);
    renderChips();
    renderGrid();
  };

  init();
})();
