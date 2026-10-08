// Backlog dashboard — the page. Reads /api/board, /api/tree and /api/file; draws the views from them; holds no data of
// its own beyond what it last fetched. The register's words are shown as written; only the page's own labels are
// translated (by the browser's language).
"use strict";

// ─── words ─────────────────────────────────────────────────────────────────────────────────────────────────────
const WORDS = {
  en: {
    overview: "Overview", entries: "Entries", docs: "Documents", activity: "Activity",
    progress: "Entries closed", phases: "Phases done", inProgress: "In progress", notStarted: "Not started",
    blocked: "Blocked", pending: "To verify", next: "Next up", recent: "Recent activity", closed: "Recently closed",
    allClosed: "Closed", nextHint: "What blocked entries wait on first, then the written priority, then the oldest. A hint: the move is the backlog review's call.",
    unblocks: (n) => `unblocks ${n}`, citedBy: (n) => `cited by ${n}`, phasesOf: (d, n) => `${d}/${n} phases`,
    now: "current", noCommit: "no commit names it yet", search: "Search id, title, status…", all: "All",
    groupBy: "Group by", noGroup: "No grouping", status: "Status", priority: "Priority", none: "—",
    docsOf: "Documents", links: "Links", cites: "Cites", waitsOn: "Waits on", commits: "Recent commits naming it",
    filterDocs: "Filter documents…", usedBy: "Entries linking it", notFound: "Not found", refreshed: "updated",
    groups: { register: "Register", work: "Work docs", architecture: "Architecture", archive: "Archive", other: "Other" },
    states: { done: "done", active: "in progress", planned: "not started", dropped: "dropped" },
    statuses: { "in-progress": "in progress", open: "open", blocked: "blocked" },
    priorities: { high: "high", medium: "medium", low: "low" },
    showAll: (n) => `Show all ${n}`, nothingPending: "Nothing waiting.", nothing: "Nothing here.",
    offline: "The dashboard server is not answering.", ofTotal: (a, b) => `${a} of ${b}`,
  },
  it: {
    overview: "Panoramica", entries: "Voci", docs: "Documenti", activity: "Attività",
    progress: "Voci chiuse", phases: "Fasi completate", inProgress: "In corso", notStarted: "Da iniziare",
    blocked: "Bloccate", pending: "Da verificare", next: "Prossimi", recent: "Attività recente", closed: "Chiuse di recente",
    allClosed: "Chiuse", nextHint: "Prima ciò che le voci bloccate aspettano, poi la priorità scritta, poi la più vecchia. È un suggerimento: la mossa la decide la revisione del backlog.",
    unblocks: (n) => `sblocca ${n}`, citedBy: (n) => `citata da ${n}`, phasesOf: (d, n) => `${d}/${n} fasi`,
    now: "in corso", noCommit: "nessun commit la nomina ancora", search: "Cerca id, titolo, stato…", all: "Tutte",
    groupBy: "Raggruppa per", noGroup: "Nessun raggruppamento", status: "Stato", priority: "Priorità", none: "—",
    docsOf: "Documenti", links: "Collegamenti", cites: "Cita", waitsOn: "Aspetta", commits: "Commit recenti che la nominano",
    filterDocs: "Filtra documenti…", usedBy: "Voci che lo collegano", notFound: "Non trovato", refreshed: "aggiornato",
    groups: { register: "Registro", work: "Documenti di lavoro", architecture: "Architettura", archive: "Archivio", other: "Altri" },
    states: { done: "fatta", active: "in corso", planned: "da iniziare", dropped: "scartata" },
    statuses: { "in-progress": "in corso", open: "aperta", blocked: "bloccata" },
    priorities: { high: "alta", medium: "media", low: "bassa" },
    showAll: (n) => `Mostra tutte (${n})`, nothingPending: "Niente in attesa.", nothing: "Niente qui.",
    offline: "Il server della dashboard non risponde.", ofTotal: (a, b) => `${a} su ${b}`,
  },
};
const LANG = (navigator.language || "en").toLowerCase().startsWith("it") ? "it" : "en";
const T = WORDS[LANG];

/** How often the page asks whether the register changed. */
const POLL_MS = 5000;
/** How many items each overview list shows before "show all". */
const OVERVIEW_LIMIT = { inProgress: 10, next: 8, recent: 10, closed: 8 };
/** Phase states in drawing order (the board's own order). */
const PHASE_STATES = ["done", "active", "planned", "dropped"];
/** Fields every entry has and that are shown elsewhere: not offered as a grouping. */
const NOT_GROUPS = new Set(["Summary", "Status", "Doc", "Added", "Issue"]);

// ─── small helpers ─────────────────────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const RELATIVE = new Intl.RelativeTimeFormat(LANG, { numeric: "auto" });
const STEPS = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
function ago(iso) {
  if (!iso) return "";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  return RELATIVE.format(0, "minute");
}

/** A root-relative path joined from a document's folder and a link in it. */
function resolvePath(baseDir, link) {
  const raw = decodeURIComponent(link);
  const parts = (raw.startsWith("/") ? raw.slice(1) : `${baseDir ? baseDir + "/" : ""}${raw}`).split("/");
  const out = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}
const dirOf = (p) => p.split("/").slice(0, -1).join("/");
/** A folder as the tree labels it: from the register's folder when it is inside it (the full path is the tooltip). */
const shortDir = (dir) => {
  const docsDir = Store.board?.project.docsDir;
  return docsDir && dir.startsWith(`${docsDir}/`) ? dir.slice(docsDir.length + 1) : dir;
};
const slug = (text) => text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");

// ─── markdown ──────────────────────────────────────────────────────────────────────────────────────────────────
const Markdown = {
  ready: () => Boolean(window.marked && window.DOMPurify),
  /** `[[BKLG-NNN]]` → a link to the entry, before markdown sees it. */
  prepare: (text) => String(text ?? "").replace(/\[\[(BKLG-\d+)\]\]/g, "[$1](#/entry/$1)"),
  /** The text alone, for a place that is itself a link (a link inside a link breaks the layout). */
  plain: (text) => String(text ?? "").replace(/\[\[([^\]]+)\]\]/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*`]/g, ""),
  inline(text) {
    if (!this.ready()) return esc(text);
    return DOMPurify.sanitize(marked.parseInline(this.prepare(text)));
  },
  block(text) {
    if (!this.ready()) return `<pre>${esc(text)}</pre>`;
    return DOMPurify.sanitize(marked.parse(this.prepare(text), { gfm: true }));
  },
  /** Links and images resolved from the document's folder; bare ids linked; headings given anchors. */
  enhance(root, baseDir) {
    for (const h of $$("h1, h2, h3, h4, h5, h6", root)) if (!h.id) h.id = slug(h.textContent);
    for (const img of $$("img[src]", root)) {
      const src = img.getAttribute("src");
      if (!/^([a-z]+:|\/\/|data:)/i.test(src)) img.src = `/api/file?path=${encodeURIComponent(resolvePath(baseDir, src))}`;
    }
    for (const a of $$("a[href]", root)) {
      const href = a.getAttribute("href");
      if (href.startsWith("#/")) continue;
      if (href.startsWith("#")) { a.dataset.anchor = href.slice(1); continue; }
      if (/^([a-z]+:|\/\/)/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; continue; }
      const [file, anchor] = href.split("#");
      const target = resolvePath(baseDir, file);
      if (/\.md$/i.test(target)) a.href = `#/doc/${target}${anchor ? "#" + anchor : ""}`;
      else if (/\.(png|jpe?g|gif|webp|svg|pdf|ico)$/i.test(target)) { a.href = `/api/file?path=${encodeURIComponent(target)}`; a.target = "_blank"; }
      else { a.removeAttribute("href"); a.title = target; a.classList.add("muted"); }
    }
    linkBareIds(root);
  },
};

/** Wrap every `BKLG-NNN` in plain text (not inside a link or code) in a link to the entry. */
function linkBareIds(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (/BKLG-\d+/.test(n.nodeValue) && !n.parentElement.closest("a, code, pre") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const span = document.createElement("span");
    span.innerHTML = esc(node.nodeValue).replace(/BKLG-\d+/g, (id) => `<a class="entry-link" href="#/entry/${id}">${id}</a>`);
    node.replaceWith(...span.childNodes);
  }
}

// ─── data ──────────────────────────────────────────────────────────────────────────────────────────────────────
const Store = {
  board: null,
  etag: null,
  tree: null,
  error: null,
  async refresh() {
    try {
      const res = await fetch("/api/board", { cache: "no-store", headers: this.etag ? { "if-none-match": this.etag } : {} });
      if (res.status === 304) { this.error = null; return false; }
      if (!res.ok) throw new Error(await res.text());
      this.etag = res.headers.get("etag");
      this.board = await res.json();
      this.error = null;
      return true;
    } catch (error) {
      this.error = error;
      return false;
    }
  },
  async loadTree() {
    if (!this.tree) this.tree = await (await fetch("/api/tree", { cache: "no-store" })).json();
    return this.tree;
  },
  entry: (id) => Store.board?.entries.find((e) => e.id === id) ?? null,
};

// ─── pieces ────────────────────────────────────────────────────────────────────────────────────────────────────
const chip = (cls, text) => `<span class="chip ${esc(cls)}">${esc(text)}</span>`;
const entryChip = (id) => `<a class="chip entry" href="#/entry/${esc(id)}">${esc(id)}</a>`;
const priorityChip = (p) => (p ? chip(p, T.priorities[p] ?? p) : "");
const statusChip = (s) => (s ? chip(s, T.statuses[s] ?? s) : "");

/** The note a Status carries after its word (`in-progress — step 2` → `step 2`). */
const statusNote = (text) => {
  const m = /^[^—–]*?[—–]\s*(.*)$/s.exec(text ?? "");
  return m ? m[1] : "";
};

function bar(counts, total = PHASE_STATES.reduce((n, s) => n + (counts[s] ?? 0), 0)) {
  if (!total) return "";
  return `<div class="bar" role="img" aria-label="${esc(PHASE_STATES.map((s) => `${T.states[s]} ${counts[s] ?? 0}`).join(", "))}">${PHASE_STATES.map((s) => (counts[s] ? `<span class="${s}" style="width:${(100 * counts[s]) / total}%"></span>` : "")).join("")}</div>`;
}
const legend = (counts) => `<div class="legend small muted">${PHASE_STATES.filter((s) => counts[s]).map((s) => `<span class="${s}">${esc(T.states[s])} ${counts[s]}</span>`).join("")}</div>`;
const phaseTotal = (c) => PHASE_STATES.reduce((n, s) => n + (c[s] ?? 0), 0);

function currentPhase(e) {
  const p = e.phases.find((x) => x.state === "active");
  return p ? `<span class="small"><b>${esc(p.name)}</b> ${Markdown.inline(p.label)}</span>` : "";
}

function lastLine(e) {
  return e.last
    ? `<span class="small muted" title="${esc(e.last.subject)}">${esc(ago(e.last.date))} · ${esc(e.last.subject.slice(0, 80))}</span>`
    : `<span class="small muted">${esc(T.noCommit)}</span>`;
}

function entryCard(e) {
  const total = phaseTotal(e.phaseCounts);
  // A div, not a link: the status note carries links of its own, and a link inside a link breaks the card apart.
  return `<article class="card clickable" data-href="#/entry/${esc(e.id)}">
    <div class="head"><span class="id">${esc(e.id)}</span><span class="title">${Markdown.inline(e.title)}</span>${priorityChip(e.priority)}</div>
    ${statusNote(e.statusText) ? `<p class="note">${Markdown.inline(statusNote(e.statusText))}</p>` : ""}
    <div class="foot">${total ? `${bar(e.phaseCounts)}<span class="small muted">${esc(T.phasesOf(e.phaseCounts.done, total - (e.phaseCounts.dropped ?? 0)))}</span>` : ""}${currentPhase(e)}</div>
    <div class="foot">${lastLine(e)}</div>
  </article>`;
}

const panel = (title, body, extra = "") => `<section class="panel"><header><h2>${esc(title)}</h2>${extra}</header>${body}</section>`;
const more = (n, limit, href) => (n > limit ? `<a class="small" href="${href}">${esc(T.showAll(n))}</a>` : "");

// ─── views ─────────────────────────────────────────────────────────────────────────────────────────────────────
const Views = {
  overview(b) {
    const t = b.totals;
    const all = t.open + t.closed;
    const ph = t.phases;
    const phaseCount = phaseTotal(ph) - (ph.dropped ?? 0);
    const kpis = `<div class="kpis">
      <div class="kpi wide"><div class="l">${esc(T.progress)}</div><div class="n">${all ? Math.round((100 * t.closed) / all) : 0}%</div>
        <div class="small muted">${esc(T.ofTotal(t.closed, all))}</div>
        ${bar({ done: t.closed, active: t.inProgress, planned: t.notStarted, dropped: t.blocked }, all)}</div>
      <div class="kpi wide"><div class="l">${esc(T.phases)}</div><div class="n">${phaseCount ? Math.round((100 * ph.done) / phaseCount) : 0}%</div>
        <div class="small muted">${esc(T.ofTotal(ph.done, phaseCount))}</div>${bar(ph)}</div>
      <a class="kpi card" href="#/entries?status=in-progress"><div class="l">${esc(T.inProgress)}</div><div class="n">${t.inProgress}</div></a>
      <a class="kpi card" href="#/entries?status=open"><div class="l">${esc(T.notStarted)}</div><div class="n">${t.notStarted}</div></a>
      <a class="kpi card" href="#/entries?status=blocked"><div class="l">${esc(T.blocked)}</div><div class="n">${t.blocked}</div></a>
      <div class="kpi"><div class="l">${esc(T.pending)}</div><div class="n">${t.pending}</div></div>
    </div>`;

    const inProgress = b.inProgress.map(Store.entry);
    const left = panel(
      T.inProgress,
      `<div class="cards">${inProgress.slice(0, OVERVIEW_LIMIT.inProgress).map(entryCard).join("") || `<p class="empty">${esc(T.nothing)}</p>`}</div>`,
      more(inProgress.length, OVERVIEW_LIMIT.inProgress, "#/entries?status=in-progress"),
    );

    const next = panel(T.next, `<p class="hint small muted">${esc(T.nextHint)}</p><ul class="list">${b.next.slice(0, OVERVIEW_LIMIT.next).map((n) => {
      const e = Store.entry(n.id);
      return `<li><div class="row"><a class="id" href="#/entry/${esc(n.id)}">${esc(n.id)}</a><a class="grow" href="#/entry/${esc(n.id)}">${esc(Markdown.plain(e.title))}</a>${priorityChip(n.priority)}</div>
        <div class="row meta">${n.unblocks ? chip("blocked", T.unblocks(n.unblocks)) : ""}${n.citedBy ? chip("", T.citedBy(n.citedBy)) : ""}${n.added ? `<span>${esc(n.added)}</span>` : ""}</div></li>`;
    }).join("")}</ul>`, more(b.next.length, OVERVIEW_LIMIT.next, "#/entries?status=open"));

    const pending = panel(T.pending, b.pending.map((l) => `<p class="small muted">${esc(l.kind)}</p><ul class="list">${l.items.map((i) =>
      `<li><div class="row">${i.label ? chip("", i.label) : ""}<span class="grow">${Markdown.inline(i.text)}</span></div></li>`).join("")}</ul>`).join("") || `<p class="empty">${esc(T.nothingPending)}</p>`);

    const recent = panel(T.recent, Views.commitList(b.activity.slice(0, OVERVIEW_LIMIT.recent)), `<a class="small" href="#/activity">${esc(T.activity)}</a>`);
    const closed = panel(T.closed, Views.closedList(b.closed.slice(0, OVERVIEW_LIMIT.closed)), more(b.closed.length, OVERVIEW_LIMIT.closed, "#/activity"));

    return `${kpis}<div class="grid"><div class="stack">${left}${recent}</div><div class="stack">${next}${pending}${closed}</div></div>`;
  },

  commitList(commits) {
    if (!commits.length) return `<p class="empty">${esc(T.nothing)}</p>`;
    return `<ul class="list">${commits.map((c) => `<li><div class="row"><span class="grow">${esc(c.subject)}</span></div>
      <div class="row meta"><code>${esc(c.sha.slice(0, 7))}</code><span title="${esc(c.date)}">${esc(ago(c.date))}</span>${c.ids.map(entryChip).join("")}</div></li>`).join("")}</ul>`;
  },

  closedList(closed) {
    if (!closed.length) return `<p class="empty">${esc(T.nothing)}</p>`;
    return `<ul class="list">${closed.map((c) => `<li><div class="row"><span class="id">${esc(c.id)}${c.phase ? " " + esc(c.phase) : ""}</span><span class="grow">${Markdown.inline(c.title)}</span>${c.day ? `<span class="meta">${esc(c.day)}</span>` : ""}</div>
      ${c.docs.length ? `<div class="row meta">${c.docs.map((d) => `<a href="#/doc/${esc(d.path)}">${esc(d.label)}</a>`).join(" · ")}</div>` : ""}</li>`).join("")}</ul>`;
  },

  entries(b, query) {
    const fields = [...new Set(b.entries.flatMap((e) => Object.keys(e.fields)))].filter((f) => !NOT_GROUPS.has(f));
    const state = Views.entriesState;
    if (query.has("status")) state.status = query.get("status");
    const options = (values, current, labels = {}) => values.map((v) => `<option value="${esc(v)}"${v === current ? " selected" : ""}>${esc(labels[v] ?? v)}</option>`).join("");
    return `<section class="panel">
      <div class="filters">
        <input id="f-q" type="search" placeholder="${esc(T.search)}" value="${esc(state.q)}">
        <select id="f-status" aria-label="${esc(T.status)}">${options(["", "in-progress", "open", "blocked"], state.status, { "": `${T.status}: ${T.all}`, ...T.statuses })}</select>
        <select id="f-priority" aria-label="${esc(T.priority)}">${options(["", "high", "medium", "low"], state.priority, { "": `${T.priority}: ${T.all}` })}</select>
        <select id="f-group" aria-label="${esc(T.groupBy)}">${options(["", "Priority", ...fields.filter((f) => f !== "Priority")], state.group, { "": T.noGroup })}</select>
      </div>
      <div id="entry-rows">${Views.entryRows(b)}</div>
    </section>`;
  },
  entriesState: { q: "", status: "", priority: "", group: "" },

  entryRows(b) {
    const s = Views.entriesState;
    const q = s.q.trim().toLowerCase();
    const rows = b.entries.filter((e) =>
      (!s.status || (e.status ?? "open") === s.status) &&
      (!s.priority || e.priority === s.priority) &&
      (!q || `${e.id} ${e.title} ${e.statusText} ${e.summary}`.toLowerCase().includes(q)));
    if (!rows.length) return `<p class="empty">${esc(T.nothing)}</p>`;
    const groups = new Map();
    for (const e of rows) {
      const key = s.group ? Markdown.plain(e.fields[s.group] || T.none).replace(/\s+\(.*$/s, "") : "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    const order = ([a], [b]) => (a === T.none) - (b === T.none) || a.localeCompare(b, LANG, { numeric: true });
    return [...groups].sort(order).map(([key, list]) => `<div class="group">${s.group ? `<h3>${esc(key)} · ${list.length}</h3>` : ""}
      <table class="entries"><tbody>${list.map((e) => `<tr data-id="${esc(e.id)}">
        <td class="id">${esc(e.id)}</td>
        <td><div><b>${Markdown.inline(e.title)}</b></div>${statusNote(e.statusText) ? `<div class="small muted">${Markdown.inline(statusNote(e.statusText).slice(0, 220))}</div>` : ""}</td>
        <td>${statusChip(e.status)} ${priorityChip(e.priority)}</td>
        <td class="bar-cell">${bar(e.phaseCounts)}${phaseTotal(e.phaseCounts) ? `<div class="small muted">${esc(T.phasesOf(e.phaseCounts.done, phaseTotal(e.phaseCounts) - (e.phaseCounts.dropped ?? 0)))}</div>` : ""}</td>
        <td class="small muted" title="${esc(e.last?.subject ?? "")}">${esc(ago(e.last?.date))}</td>
      </tr>`).join("")}</tbody></table></div>`).join("");
  },

  bindEntries() {
    const s = Views.entriesState;
    const redraw = () => { $("#entry-rows").innerHTML = Views.entryRows(Store.board); };
    $("#f-q").addEventListener("input", (ev) => { s.q = ev.target.value; redraw(); });
    for (const [id, key] of [["#f-status", "status"], ["#f-priority", "priority"], ["#f-group", "group"]]) {
      $(id).addEventListener("change", (ev) => { s[key] = ev.target.value; redraw(); });
    }
    $("#entry-rows").addEventListener("click", (ev) => {
      const row = ev.target.closest("tr[data-id]");
      if (row && !ev.target.closest("a")) location.hash = `#/entry/${row.dataset.id}`;
    });
  },

  entry(b, id) {
    const e = Store.entry(id);
    if (!e) {
      const c = b.closed.find((x) => x.id === id && !x.phase);
      if (!c) return panel(T.notFound, `<p class="empty">${esc(id)}</p>`);
      return panel(`${c.id} — ${T.allClosed}`, `<div class="md">${Markdown.block(c.text)}</div>${c.docs.map((d) => `<p><a href="#/doc/${esc(d.path)}">${esc(d.label)}</a></p>`).join("")}`);
    }
    const body = e.block.split(/\r?\n/).slice(1).join("\n");
    const phases = e.phases.length ? panel(T.phases, `${bar(e.phaseCounts)}${legend(e.phaseCounts)}<table class="phases">${e.phases.map((p) =>
      `<tr><td><span class="dot ${p.state}"></span>${esc(p.name)}</td><td>${Markdown.inline(p.label)}${p.note ? `<div class="small muted">${Markdown.inline(p.note.slice(0, 300))}</div>` : ""}</td></tr>`).join("")}</table>`) : "";
    const links = [
      [T.waitsOn, e.waitsOn], [T.unblocks(e.unblocks.length).replace(/\s*\d+$/, ""), e.unblocks],
      [T.cites, e.cites], [T.citedBy(e.citedBy.length).replace(/\s*\d+$/, ""), e.citedBy],
    ].filter(([, ids]) => ids.length).map(([label, ids]) => `<dt>${esc(label)}</dt><dd>${ids.map(entryChip).join(" ")}</dd>`).join("");
    const commits = b.activity.filter((c) => c.ids.includes(e.id));
    return `<div class="page"><div class="stack">
        <section class="panel"><header><h2><span class="id">${esc(e.id)}</span> ${Markdown.inline(e.title)}</h2><span>${statusChip(e.status)} ${priorityChip(e.priority)}</span></header>
        ${lastLine(e)}</section>${phases}
        <section class="panel"><div class="md" id="entry-md">${Markdown.block(body)}</div></section>
      </div><div class="stack">
        ${panel(T.docsOf, e.docs.length ? `<ul class="list">${e.docs.map((d) => `<li><a href="#/doc/${esc(d.path)}">${esc(d.label)}</a><div class="meta">${esc(d.path)}</div></li>`).join("")}</ul>` : `<p class="empty">${esc(T.nothing)}</p>`)}
        ${links ? panel(T.links, `<dl class="fields">${links}</dl>`) : ""}
        ${panel(T.commits, e.last && !commits.length ? `<p class="small">${lastLine(e)}</p>` : Views.commitList(commits))}
      </div></div>`;
  },

  docs(tree, current, filter = "") {
    const f = filter.trim().toLowerCase();
    const groups = tree.map(({ group, docs }) => {
      const shown = docs.filter((d) => !f || d.toLowerCase().includes(f));
      if (!shown.length) return "";
      const byDir = new Map();
      for (const d of shown) {
        const dir = dirOf(d);
        if (!byDir.has(dir)) byDir.set(dir, []);
        byDir.get(dir).push(d);
      }
      const open = f || group === "register" || group === "work" || (current && shown.includes(current));
      return `<details${open ? " open" : ""}><summary>${esc(T.groups[group] ?? group)} <span class="muted small">${shown.length}</span></summary>
        ${[...byDir].map(([dir, list]) => `<div class="dir" title="${esc(dir)}">${esc(shortDir(dir) || "/")}</div>${list.map((d) => `<a href="#/doc/${esc(d)}"${d === current ? ' class="on"' : ""}>${esc(d.split("/").pop())}</a>`).join("")}`).join("")}
      </details>`;
    }).join("");
    return groups || `<p class="empty">${esc(T.nothing)}</p>`;
  },

  activity(b) {
    return `<div class="grid"><div class="stack">${panel(T.recent, Views.commitList(b.activity))}</div>
      <div class="stack">${panel(T.allClosed, Views.closedList(b.closed))}</div></div>`;
  },
};

// ─── document page ─────────────────────────────────────────────────────────────────────────────────────────────
const DocPage = {
  filter: "",
  async render(view, docPath, anchor) {
    const tree = await Store.loadTree();
    view.innerHTML = `<div class="docs">
      <aside class="panel tree"><input id="doc-filter" type="search" placeholder="${esc(T.filterDocs)}" value="${esc(this.filter)}"><div id="doc-tree">${Views.docs(tree, docPath, this.filter)}</div></aside>
      <section class="panel" id="doc-body">${docPath ? "" : `<p class="empty">${esc(T.filterDocs)}</p>`}</section>
    </div>`;
    $("#doc-filter").addEventListener("input", (ev) => {
      this.filter = ev.target.value;
      $("#doc-tree").innerHTML = Views.docs(tree, docPath, this.filter);
    });
    if (!docPath) return;
    const body = $("#doc-body");
    const res = await fetch(`/api/file?path=${encodeURIComponent(docPath)}`, { cache: "no-store" });
    if (!res.ok) { body.innerHTML = `<p class="error">${esc(T.notFound)}: ${esc(docPath)}</p>`; return; }
    const usedBy = (Store.board?.entries ?? []).filter((e) => e.docs.some((d) => d.path === docPath));
    body.innerHTML = `<div class="crumbs small muted">${esc(docPath)}${usedBy.length ? ` · ${esc(T.usedBy)}: ${usedBy.map((e) => entryChip(e.id)).join(" ")}` : ""}</div>
      <div class="md" id="doc-md">${Markdown.block(await res.text())}</div>`;
    Markdown.enhance($("#doc-md"), dirOf(docPath));
    if (anchor) document.getElementById(anchor)?.scrollIntoView();
    else window.scrollTo(0, 0);
  },
};

// ─── routing ───────────────────────────────────────────────────────────────────────────────────────────────────
const TABS = [["overview", "#/"], ["entries", "#/entries"], ["docs", "#/docs"], ["activity", "#/activity"]];

function parseRoute() {
  const hash = decodeURI(location.hash.replace(/^#/, "")) || "/";
  const [pathPart, queryPart = ""] = hash.split("?");
  if (pathPart.startsWith("/doc/")) {
    const rest = pathPart.slice("/doc/".length);
    const at = rest.indexOf("#");
    return { tab: "docs", doc: at < 0 ? rest : rest.slice(0, at), anchor: at < 0 ? "" : rest.slice(at + 1) };
  }
  if (pathPart.startsWith("/entry/")) return { tab: "entries", entry: pathPart.slice("/entry/".length) };
  const tab = pathPart.replace(/^\//, "") || "overview";
  return { tab, query: new URLSearchParams(queryPart) };
}

async function render() {
  const view = $("#view");
  const route = parseRoute();
  $("#tabs").innerHTML = TABS.map(([key, href]) => `<a href="${href}"${route.tab === key ? ' class="on"' : ""}>${esc(T[key])}</a>`).join("");
  if (route.tab === "docs") return DocPage.render(view, route.doc, route.anchor);
  const b = Store.board;
  if (!b) { view.innerHTML = `<p class="${Store.error ? "error" : "empty"}">${esc(Store.error ? T.offline : "…")}</p>`; return; }
  if (route.entry) {
    view.innerHTML = Views.entry(b, route.entry);
    const md = $("#entry-md");
    if (md) Markdown.enhance(md, b.project.docsDir);
    window.scrollTo(0, 0);
  } else if (route.tab === "entries") {
    view.innerHTML = Views.entries(b, route.query);
    Views.bindEntries();
  } else if (route.tab === "activity") {
    view.innerHTML = Views.activity(b);
  } else {
    view.innerHTML = Views.overview(b);
  }
  for (const a of $$("a[data-anchor]", view)) a.addEventListener("click", (ev) => { ev.preventDefault(); document.getElementById(a.dataset.anchor)?.scrollIntoView(); });
}

function header() {
  const b = Store.board;
  if (b) {
    $("#project-name").textContent = b.project.name;
    $("#project-path").textContent = b.project.backlog;
    document.title = `${b.project.name} — backlog`;
  }
  $("#refreshed").textContent = Store.error ? T.offline : `${T.refreshed} ${new Date().toLocaleTimeString(LANG)}`;
}

/** Redraw a board view when the register changed — never the document page or a view being typed in. */
async function poll() {
  const changed = await Store.refresh();
  header();
  const typing = document.activeElement?.matches?.("input, select");
  if (changed && parseRoute().tab !== "docs" && !typing) render();
}

window.addEventListener("hashchange", render);
// A card is opened by a click anywhere on it, except on a link of its own.
document.addEventListener("click", (ev) => {
  const card = ev.target.closest("[data-href]");
  if (card && !ev.target.closest("a")) location.hash = card.dataset.href;
});
(async () => {
  document.documentElement.lang = LANG;
  await Store.refresh();
  header();
  await render();
  setInterval(poll, POLL_MS);
})();
