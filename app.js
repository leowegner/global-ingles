// ====== UTIL ======
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const shuffle = (a) => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[''`´]/g, "'");

const UNITS = ["unit1", "unit2", "unit3", "unit4", "unit5"];
const unitLabel = (k) => "Unit " + k.replace("unit", "");

// ====== TABS ======
$$(".tab").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});
$$("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.go));
});
function switchView(name) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  window.scrollTo({ top: 0 });
}

// ====== VOCAB ======
const vocabUnit = $("#vocab-unit");
const vocabSection = $("#vocab-section");
const vocabMode = $("#vocab-mode");
const vocabDir = $("#vocab-direction");
const vocabFilter = $("#vocab-filter");
const vocabArea = $("#vocab-area");

UNITS.forEach((u) => {
  const opt = document.createElement("option");
  opt.value = u; opt.textContent = unitLabel(u);
  vocabUnit.appendChild(opt);
});

// --- known / to-review tracking, persisted in localStorage ---
const KNOWN_KEY = "ge_known_v1";
function loadKnown() {
  try { return JSON.parse(localStorage.getItem(KNOWN_KEY) || "{}"); }
  catch { return {}; }
}
function saveKnown(map) {
  localStorage.setItem(KNOWN_KEY, JSON.stringify(map));
}
function isKnown(en) { return !!loadKnown()[en]; }
function setKnown(en, val) {
  const m = loadKnown();
  if (val) m[en] = 1; else delete m[en];
  saveKnown(m);
}

function refreshVocabSections() {
  const unit = window.VOCAB[vocabUnit.value];
  vocabSection.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "__all__"; allOpt.textContent = "All sections";
  vocabSection.appendChild(allOpt);
  Object.keys(unit.sections).forEach((sec) => {
    const opt = document.createElement("option");
    opt.value = sec; opt.textContent = sec;
    vocabSection.appendChild(opt);
  });
}
function getVocabPairs() {
  const unit = window.VOCAB[vocabUnit.value];
  const sec = vocabSection.value;
  let pairs;
  if (sec === "__all__") {
    pairs = Object.entries(unit.sections).flatMap(([s, list]) =>
      list.map(([en, es]) => ({ en, es, section: s }))
    );
  } else {
    pairs = unit.sections[sec].map(([en, es]) => ({ en, es, section: sec }));
  }
  if (vocabFilter && vocabFilter.value === "todo") {
    pairs = pairs.filter((p) => !isKnown(p.en));
  }
  return pairs;
}
function renderVocab() {
  const pairs = getVocabPairs();
  const mode = vocabMode.value;
  if (!pairs.length) {
    vocabArea.innerHTML = `<p class="muted">No words match this filter. Try switching "Filter" to "All words".</p>`;
    return;
  }
  if (mode === "list") renderVocabList(pairs);
  else if (mode === "flashcards") renderFlashcards(pairs);
  else if (mode === "quiz") renderVocabQuiz(pairs);
  else if (mode === "spelling") renderSpellingTest(pairs);
  else if (mode === "definition") renderDefinitionTest(pairs);
}
function renderVocabList(pairs) {
  const dir = vocabDir.value;
  const rows = pairs
    .map((p) => {
      const known = isKnown(p.en);
      return `<tr data-en="${escapeAttr(p.en)}">
        <td>${dir === "en-es" ? p.en : p.es}</td>
        <td>${dir === "en-es" ? p.es : p.en}</td>
        <td class="muted">${p.section}</td>
        <td><button class="btn small mark-btn ${known ? "known" : ""}">${known ? "✓ known" : "mark known"}</button></td>
      </tr>`;
    })
    .join("");
  vocabArea.innerHTML = `
    <table class="vocab-table">
      <thead><tr>
        <th>${dir === "en-es" ? "English" : "Spanish"}</th>
        <th>${dir === "en-es" ? "Spanish" : "English"}</th>
        <th>Section</th>
        <th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  $$(".mark-btn", vocabArea).forEach((b) => {
    b.addEventListener("click", () => {
      const en = b.closest("tr").dataset.en;
      const next = !isKnown(en);
      setKnown(en, next);
      b.classList.toggle("known", next);
      b.textContent = next ? "✓ known" : "mark known";
    });
  });
}
function renderFlashcards(pairs) {
  const deck = shuffle(pairs);
  let idx = 0;
  const dir = vocabDir.value;
  vocabArea.innerHTML = `
    <div class="flashcard" id="flashcard">
      <div class="flashcard-inner">
        <div class="flashcard-face front"></div>
        <div class="flashcard-face back"></div>
      </div>
    </div>
    <div class="fc-controls">
      <button class="btn small" id="fc-prev">←</button>
      <span class="fc-progress" id="fc-progress"></span>
      <button class="btn small" id="fc-flip">Flip</button>
      <button class="btn small" id="fc-next">→</button>
    </div>
    <div class="fc-controls">
      <button class="btn small" id="fc-known">✓ I know this</button>
      <button class="btn small" id="fc-review">↻ Review again</button>
    </div>`;
  const card = $("#flashcard");
  const front = $(".flashcard-face.front", card);
  const back = $(".flashcard-face.back", card);
  const progress = $("#fc-progress");
  const knownBtn = $("#fc-known");
  function show() {
    card.classList.remove("flipped");
    const p = deck[idx];
    front.textContent = dir === "en-es" ? p.en : p.es;
    back.textContent = dir === "en-es" ? p.es : p.en;
    progress.textContent = `${idx + 1} / ${deck.length} · ${p.section}`;
    knownBtn.classList.toggle("known", isKnown(p.en));
    knownBtn.textContent = isKnown(p.en) ? "✓ known" : "✓ I know this";
  }
  function next() { idx = (idx + 1) % deck.length; show(); }
  card.addEventListener("click", () => card.classList.toggle("flipped"));
  $("#fc-flip").addEventListener("click", (e) => { e.stopPropagation(); card.classList.toggle("flipped"); });
  $("#fc-next").addEventListener("click", next);
  $("#fc-prev").addEventListener("click", () => { idx = (idx - 1 + deck.length) % deck.length; show(); });
  knownBtn.addEventListener("click", () => { setKnown(deck[idx].en, true); next(); });
  $("#fc-review").addEventListener("click", () => { setKnown(deck[idx].en, false); next(); });
  show();
}
function renderVocabQuiz(pairs) {
  const dir = vocabDir.value;
  const deck = shuffle(pairs).slice(0, Math.min(10, pairs.length));
  vocabArea.innerHTML = `
    <div class="score-bar"><span class="label">Translate each word</span><button class="btn small" id="quiz-check">Check answers</button></div>
    <div id="quiz-items"></div>`;
  const list = $("#quiz-items");
  deck.forEach((p, i) => {
    const prompt = dir === "en-es" ? p.en : p.es;
    const answer = dir === "en-es" ? p.es : p.en;
    const el = document.createElement("div");
    el.className = "quiz-item";
    el.innerHTML = `
      <div class="topic">${p.section}</div>
      <div class="prompt">${i + 1}. ${prompt}</div>
      <input type="text" data-answer="${escapeAttr(answer)}" placeholder="Type translation..." />
      <div class="feedback"></div>`;
    list.appendChild(el);
  });
  $("#quiz-check").addEventListener("click", () => {
    let score = 0;
    $$(".quiz-item", list).forEach((row) => {
      const input = $("input", row);
      const fb = $(".feedback", row);
      const want = normalize(input.dataset.answer);
      const got = normalize(input.value);
      if (got && (got === want || want.includes(got) || got.includes(want))) {
        fb.textContent = "Correct";
        fb.className = "feedback ok";
        score++;
      } else {
        fb.textContent = "Answer: " + input.dataset.answer;
        fb.className = "feedback no";
      }
    });
    $(".score-bar .label", vocabArea).textContent = `Score: ${score} / ${deck.length}`;
  });
}

// --- Spelling test: walks ALL words, one at a time, repeats wrong ones at the end ---
function answerMatches(got, want, alts) {
  const candidates = (alts && alts.length ? alts : [want]).map(normalize);
  const g = normalize(got);
  if (!g) return false;
  return candidates.some((a) =>
    a === g || (g.length > 2 && (a.includes(g) || g.includes(a)))
  );
}
function altsFor(p, dir) {
  // Build acceptable answers (handles parenthetical hints like "accomplish (your goals)")
  const ans = dir === "en-es" ? p.es : p.en;
  const stripped = ans.replace(/\(([^)]+)\)/g, "$1").replace(/\s+/g, " ").trim();
  const noParen = ans.replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
  const list = [ans, stripped, noParen];
  if (dir === "es-en" && /\s/.test(ans)) {
    // for short phrases also accept the bare base form (e.g. "live up to" → "live up to")
  }
  return [...new Set(list.filter(Boolean))];
}
function renderSpellingTest(pairs) {
  const dir = vocabDir.value;
  vocabArea.innerHTML = `
    <div class="score-bar">
      <span class="label" id="sp-progress">Loading…</span>
      <span class="label" id="sp-score">0 / 0</span>
    </div>
    <div class="quiz-item" id="sp-card">
      <div class="topic" id="sp-topic"></div>
      <div class="prompt" id="sp-prompt"></div>
      <input type="text" id="sp-input" placeholder="Type your answer and press Enter..." autocomplete="off" autocapitalize="off" spellcheck="false" />
      <div class="feedback" id="sp-feedback"></div>
      <div class="row">
        <button class="btn primary" id="sp-check">Check</button>
        <button class="btn" id="sp-skip">Skip</button>
        <button class="btn" id="sp-known">✓ Mark known</button>
        <button class="btn" id="sp-reveal">Reveal</button>
      </div>
    </div>`;
  let queue = shuffle(pairs).slice();
  const wrongAgain = [];
  let total = queue.length;
  let answered = 0;
  let score = 0;
  let current = null;
  let waitingForNext = false;

  const promptEl = $("#sp-prompt");
  const topicEl = $("#sp-topic");
  const input = $("#sp-input");
  const fb = $("#sp-feedback");
  const progEl = $("#sp-progress");
  const scoreEl = $("#sp-score");
  const checkBtn = $("#sp-check");

  function nextCard() {
    waitingForNext = false;
    if (!queue.length && wrongAgain.length) {
      queue = wrongAgain.splice(0);
      total += queue.length;
    }
    if (!queue.length) {
      vocabArea.innerHTML = `<div class="score-bar"><span class="label">Done!</span><span class="label">Score: ${score} / ${answered}</span></div>
        <p class="muted">You've worked through every word in this set. Switch the Filter to "Only to review" to drill the ones you haven't marked as known.</p>`;
      return;
    }
    current = queue.shift();
    const prompt = dir === "en-es" ? current.en : current.es;
    topicEl.textContent = current.section;
    promptEl.textContent = `${answered + 1} / ${total} — ${prompt}`;
    input.value = "";
    fb.textContent = "";
    fb.className = "feedback";
    checkBtn.textContent = "Check";
    progEl.textContent = `Remaining: ${queue.length + wrongAgain.length}`;
    input.focus();
  }
  function commitCheck() {
    if (waitingForNext) { nextCard(); return; }
    const accept = altsFor(current, dir);
    const ok = answerMatches(input.value, accept[0], accept);
    answered++;
    if (ok) {
      score++;
      fb.textContent = "✓ Correct";
      fb.className = "feedback ok";
    } else {
      fb.innerHTML = `✗ Answer: <b>${escapeHtml(dir === "en-es" ? current.es : current.en)}</b>`;
      fb.className = "feedback no";
      wrongAgain.push(current);
    }
    scoreEl.textContent = `${score} / ${answered}`;
    checkBtn.textContent = "Next →";
    waitingForNext = true;
  }
  checkBtn.addEventListener("click", commitCheck);
  $("#sp-skip").addEventListener("click", () => { wrongAgain.push(current); nextCard(); });
  $("#sp-known").addEventListener("click", () => { setKnown(current.en, true); nextCard(); });
  $("#sp-reveal").addEventListener("click", () => {
    fb.innerHTML = `Answer: <b>${escapeHtml(dir === "en-es" ? current.es : current.en)}</b>`;
    fb.className = "feedback no";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitCheck(); }
  });
  nextCard();
}

// --- Definition test: shows English definition, user writes the English word ---
function renderDefinitionTest(pairs) {
  const defined = pairs.filter((p) => window.DEFINITIONS && window.DEFINITIONS[p.en]);
  if (!defined.length) {
    vocabArea.innerHTML = `<p class="muted">No definitions available for this selection.</p>`;
    return;
  }
  vocabArea.innerHTML = `
    <div class="score-bar">
      <span class="label" id="df-progress">Loading…</span>
      <span class="label" id="df-score">0 / 0</span>
    </div>
    <div class="quiz-item" id="df-card">
      <div class="topic" id="df-topic"></div>
      <div class="prompt" id="df-prompt" style="font-style: italic"></div>
      <input type="text" id="df-input" placeholder="Type the English word/phrase and press Enter..." autocomplete="off" autocapitalize="off" spellcheck="false" />
      <div class="feedback" id="df-feedback"></div>
      <div class="row">
        <button class="btn primary" id="df-check">Check</button>
        <button class="btn" id="df-skip">Skip</button>
        <button class="btn" id="df-known">✓ Mark known</button>
        <button class="btn" id="df-reveal">Reveal</button>
        <button class="btn" id="df-hint">Hint</button>
      </div>
    </div>`;
  let queue = shuffle(defined).slice();
  const wrongAgain = [];
  let total = queue.length;
  let answered = 0;
  let score = 0;
  let current = null;
  let waitingForNext = false;

  const promptEl = $("#df-prompt");
  const topicEl = $("#df-topic");
  const input = $("#df-input");
  const fb = $("#df-feedback");
  const progEl = $("#df-progress");
  const scoreEl = $("#df-score");
  const checkBtn = $("#df-check");

  function defAcceptedForms(en) {
    // Accept the English entry with or without parenthetical hints
    const stripped = en.replace(/\(([^)]+)\)/g, "$1").replace(/\s+/g, " ").trim();
    const noParen = en.replace(/\([^)]+\)/g, "").replace(/\s+/g, " ").trim();
    const noSmthSb = noParen.replace(/\b(smth|sb)\b/g, "").replace(/\s+/g, " ").trim();
    return [...new Set([en, stripped, noParen, noSmthSb].filter(Boolean))];
  }
  function hintFor(en) {
    // First letter of each word, with length: "live up to" → "l___ u_ t_"
    return en.replace(/[A-Za-z]+/g, (w) => w[0] + "_".repeat(Math.max(0, w.length - 1)));
  }
  function nextCard() {
    waitingForNext = false;
    if (!queue.length && wrongAgain.length) {
      queue = wrongAgain.splice(0);
      total += queue.length;
    }
    if (!queue.length) {
      vocabArea.innerHTML = `<div class="score-bar"><span class="label">Done!</span><span class="label">Score: ${score} / ${answered}</span></div>
        <p class="muted">You answered every definition in this set.</p>`;
      return;
    }
    current = queue.shift();
    const def = window.DEFINITIONS[current.en];
    topicEl.textContent = current.section;
    promptEl.textContent = `${answered + 1} / ${total} — ${def}`;
    input.value = "";
    fb.textContent = "";
    fb.className = "feedback";
    checkBtn.textContent = "Check";
    progEl.textContent = `Remaining: ${queue.length + wrongAgain.length}`;
    input.focus();
  }
  function commitCheck() {
    if (waitingForNext) { nextCard(); return; }
    const accept = defAcceptedForms(current.en);
    const ok = answerMatches(input.value, accept[0], accept);
    answered++;
    if (ok) {
      score++;
      fb.innerHTML = `✓ Correct — <b>${escapeHtml(current.en)}</b> · ${escapeHtml(current.es)}`;
      fb.className = "feedback ok";
    } else {
      fb.innerHTML = `✗ Answer: <b>${escapeHtml(current.en)}</b> · ${escapeHtml(current.es)}`;
      fb.className = "feedback no";
      wrongAgain.push(current);
    }
    scoreEl.textContent = `${score} / ${answered}`;
    checkBtn.textContent = "Next →";
    waitingForNext = true;
  }
  checkBtn.addEventListener("click", commitCheck);
  $("#df-skip").addEventListener("click", () => { wrongAgain.push(current); nextCard(); });
  $("#df-known").addEventListener("click", () => { setKnown(current.en, true); nextCard(); });
  $("#df-reveal").addEventListener("click", () => {
    fb.innerHTML = `Answer: <b>${escapeHtml(current.en)}</b> · ${escapeHtml(current.es)}`;
    fb.className = "feedback no";
  });
  $("#df-hint").addEventListener("click", () => {
    fb.innerHTML = `Hint: <span style="letter-spacing:2px">${escapeHtml(hintFor(current.en))}</span>`;
    fb.className = "feedback";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); commitCheck(); }
  });
  nextCard();
}

function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

vocabUnit.addEventListener("change", () => { refreshVocabSections(); renderVocab(); });
vocabSection.addEventListener("change", renderVocab);
vocabMode.addEventListener("change", renderVocab);
vocabDir.addEventListener("change", renderVocab);
if (vocabFilter) vocabFilter.addEventListener("change", renderVocab);
refreshVocabSections();
renderVocab();

// ====== GRAMMAR ======
const grammarUnit = $("#grammar-unit");
const grammarArea = $("#grammar-area");
UNITS.forEach((u) => {
  const opt = document.createElement("option");
  opt.value = u; opt.textContent = unitLabel(u);
  grammarUnit.appendChild(opt);
});
function renderGrammar() {
  const data = window.GRAMMAR[grammarUnit.value];
  grammarArea.innerHTML = `<h3>${data.title}</h3>` + data.topics.map((t) => `
    <div class="grammar-topic">
      <h4>${t.name}</h4>
      ${t.notes.map((n) => `<div class="row-item"><div class="label">${n.label}</div><div class="value">${n.value}</div></div>`).join("")}
    </div>`).join("");
}
grammarUnit.addEventListener("change", renderGrammar);
renderGrammar();

// ====== TRAINING ======
const trainUnit = $("#train-unit");
const trainTypes = $("#train-types");
const trainCount = $("#train-count");
const trainArea = $("#train-area");
UNITS.forEach((u) => {
  const opt = document.createElement("option");
  opt.value = u; opt.textContent = unitLabel(u);
  opt.selected = true;
  trainUnit.appendChild(opt);
});

function gatherExercises(units, types) {
  const all = [];
  units.forEach((u) => {
    (window.EXERCISES[u] || []).forEach((ex) => {
      if (types.includes(ex.type)) all.push(ex);
    });
  });
  return all;
}

function renderExerciseItem(ex, i) {
  const el = document.createElement("div");
  el.className = "quiz-item";
  el.dataset.idx = i;
  let inner = `<div class="topic">${unitLabel("unit" + ex.unit)} · ${ex.topic} · ${ex.type}</div>
    <div class="prompt">${i + 1}. ${ex.prompt.replace(/\n/g, "<br/>")}</div>`;
  if (ex.type === "multiple-choice") {
    inner += `<div class="choices">${shuffle(ex.choices)
      .map(
        (c, k) =>
          `<label><input type="radio" name="ex-${i}" value="${escapeAttr(c)}" /> ${c}</label>`
      )
      .join("")}</div>`;
  } else if (ex.type === "matching") {
    const rights = shuffle(ex.pairs.map((p) => p[1]));
    inner += ex.pairs
      .map(
        (p, k) => `<div class="matching-row"><div>${p[0]}</div>
        <select data-left="${escapeAttr(p[0])}">
          <option value="">— choose —</option>
          ${rights.map((r) => `<option value="${escapeAttr(r)}">${r}</option>`).join("")}
        </select></div>`
      )
      .join("");
  } else {
    inner += `<input type="text" placeholder="Type your answer..." />`;
  }
  inner += `<div class="feedback"></div>`;
  el.innerHTML = inner;
  return el;
}

function checkExerciseItem(el, ex) {
  const fb = $(".feedback", el);
  if (ex.type === "matching") {
    const selects = $$("select", el);
    let allOk = true;
    selects.forEach((sel) => {
      const left = sel.dataset.left;
      const right = sel.value;
      const want = ex.pairs.find((p) => p[0] === left)[1];
      if (right !== want) allOk = false;
    });
    if (allOk) { fb.textContent = "Correct"; fb.className = "feedback ok"; return 1; }
    fb.innerHTML = "Answer: " + ex.pairs.map((p) => `<b>${p[0]}</b> → ${p[1]}`).join(", ");
    fb.className = "feedback no";
    return 0;
  }
  if (ex.type === "multiple-choice") {
    const sel = $("input[type=radio]:checked", el);
    if (sel && normalize(sel.value) === normalize(ex.answer)) {
      fb.textContent = "Correct"; fb.className = "feedback ok"; return 1;
    }
    fb.textContent = "Answer: " + ex.answer;
    fb.className = "feedback no";
    return 0;
  }
  const input = $("input[type=text]", el);
  const got = normalize(input.value);
  const accepts = (ex.alts || [ex.answer]).map(normalize);
  if (accepts.some((a) => a === got || (got.length > 2 && (a.includes(got) || got.includes(a))))) {
    fb.textContent = "Correct"; fb.className = "feedback ok"; return 1;
  }
  fb.textContent = "Answer: " + ex.answer;
  fb.className = "feedback no";
  return 0;
}

$("#train-start").addEventListener("click", () => {
  const units = $$("option:checked", trainUnit).map((o) => o.value);
  const types = $$("option:checked", trainTypes).map((o) => o.value);
  if (!units.length || !types.length) {
    trainArea.innerHTML = `<p class="muted">Pick at least one unit and one type.</p>`;
    return;
  }
  const pool = gatherExercises(units, types);
  if (!pool.length) {
    trainArea.innerHTML = `<p class="muted">No exercises match those filters.</p>`;
    return;
  }
  const count = Math.min(parseInt(trainCount.value, 10), pool.length);
  const deck = shuffle(pool).slice(0, count);
  trainArea.innerHTML = `
    <div class="score-bar">
      <span class="label">${deck.length} questions</span>
      <button class="btn small" id="train-check">Check answers</button>
    </div>
    <div id="train-list"></div>`;
  const list = $("#train-list");
  deck.forEach((ex, i) => list.appendChild(renderExerciseItem(ex, i)));
  $("#train-check").addEventListener("click", () => {
    let score = 0;
    $$(".quiz-item", list).forEach((el, i) => {
      score += checkExerciseItem(el, deck[i]);
    });
    $(".score-bar .label", trainArea).textContent = `Score: ${score} / ${deck.length}`;
  });
});

// ====== EXAM MAKER ======
const examUnits = $("#exam-units");
const examSections = $("#exam-sections");
UNITS.forEach((u) => {
  const opt = document.createElement("option");
  opt.value = u; opt.textContent = unitLabel(u);
  opt.selected = true;
  examUnits.appendChild(opt);
});

const EXAM_TYPES = [
  { key: "gap-fill", label: "Gap fill", default: 5 },
  { key: "multiple-choice", label: "Multiple choice", default: 5 },
  { key: "transformation", label: "Sentence transformation", default: 4 },
  { key: "translation", label: "Translation (ES→EN)", default: 6 },
  { key: "matching", label: "Matching", default: 1 }
];

function renderExamSections() {
  examSections.innerHTML = EXAM_TYPES.map(
    (t) => `
    <div class="section-row">
      <label><input type="checkbox" data-type="${t.key}" checked /> ${t.label}</label>
      <input type="number" data-count="${t.key}" min="0" max="30" value="${t.default}" />
      <span class="muted">qs</span>
    </div>`
  ).join("");
}
renderExamSections();

function buildExam() {
  const title = $("#exam-title").value || "English Global Exam · 4º ESO";
  const selectedUnits = $$("option:checked", examUnits).map((o) => o.value);
  const shuffleQ = $("#exam-shuffle").checked;
  const includeKey = $("#exam-answerkey").checked;
  const includeName = $("#exam-name").value === "yes";

  const sections = [];
  EXAM_TYPES.forEach((t) => {
    const enabled = $(`input[data-type="${t.key}"]`).checked;
    const n = parseInt($(`input[data-count="${t.key}"]`).value, 10) || 0;
    if (!enabled || n <= 0) return;
    const pool = [];
    selectedUnits.forEach((u) => {
      (window.EXERCISES[u] || []).forEach((ex) => {
        if (ex.type === t.key) pool.push(ex);
      });
    });
    if (!pool.length) return;
    const picked = (shuffleQ ? shuffle(pool) : pool).slice(0, Math.min(n, pool.length));
    sections.push({ type: t.key, label: t.label, items: picked });
  });

  return { title, sections, includeKey, includeName, date: new Date().toLocaleDateString() };
}

function exerciseToText(ex, n) {
  if (ex.type === "matching") {
    const lefts = ex.pairs.map((p) => p[0]);
    const rights = shuffle(ex.pairs.map((p) => p[1]));
    return {
      lines: [
        `${n}. Match each item on the left with the correct one on the right.`,
        "   Left:  " + lefts.map((l, i) => `${String.fromCharCode(97 + i)}) ${l}`).join("   "),
        "   Right: " + rights.map((r, i) => `${i + 1}) ${r}`).join("   ")
      ],
      answer:
        ex.pairs
          .map((p, i) => {
            const ri = rights.indexOf(p[1]) + 1;
            return `${String.fromCharCode(97 + i)}-${ri}`;
          })
          .join(", ")
    };
  }
  if (ex.type === "multiple-choice") {
    const choices = shuffle(ex.choices);
    return {
      lines: [
        `${n}. ${ex.prompt}`,
        ...choices.map((c, i) => `   ${String.fromCharCode(97 + i)}) ${c}`)
      ],
      answer: ex.answer
    };
  }
  return {
    lines: [`${n}. ${ex.prompt}`, "   _________________________________________________"],
    answer: ex.answer
  };
}

function renderExamPreview() {
  const exam = buildExam();
  const area = $("#exam-preview-area");
  area.style.display = "block";
  let html = `<div class="exam-preview">
    <h1>${exam.title}</h1>
    <p>Date: ${exam.date}</p>
    ${exam.includeName ? "<p>Name: ______________________________   Class: ____</p>" : ""}`;
  let counter = 1;
  exam.sections.forEach((sec, si) => {
    html += `<h2 class="section-title">${si + 1}. ${sec.label}</h2><ol start="${counter}">`;
    sec.items.forEach((ex) => {
      const t = exerciseToText(ex, counter);
      if (ex.type === "matching") {
        html += `<li>${t.lines.slice(1).join("<br/>")}</li>`;
      } else if (ex.type === "multiple-choice") {
        html += `<li>${ex.prompt}<br/>${ex.choices.map((c, i) => `${String.fromCharCode(97 + i)}) ${c}`).join(" &nbsp; ")}</li>`;
      } else {
        html += `<li>${ex.prompt.replace(/\n/g, "<br/>")}</li>`;
      }
      counter++;
    });
    html += `</ol>`;
  });
  if (exam.includeKey) {
    html += `<div class="answer-key"><h2>Answer key</h2><ol>`;
    let kn = 1;
    exam.sections.forEach((sec) => {
      sec.items.forEach((ex) => {
        const t = exerciseToText(ex, kn);
        html += `<li>${t.answer}</li>`;
        kn++;
      });
    });
    html += `</ol></div>`;
  }
  html += `</div>`;
  area.innerHTML = html;
}

$("#exam-preview").addEventListener("click", renderExamPreview);

$("#exam-download").addEventListener("click", () => {
  const exam = buildExam();
  generatePdf(exam);
});

function generatePdf(exam) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  function addPageIfNeeded(extra = 14) {
    if (y + extra > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }
  function writeLine(text, size = 11, style = "normal", indent = 0) {
    doc.setFont("Times", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW - indent);
    lines.forEach((ln) => {
      addPageIfNeeded(size + 4);
      doc.text(ln, margin + indent, y);
      y += size + 4;
    });
  }

  writeLine(exam.title, 18, "bold");
  writeLine("Date: " + exam.date, 11);
  if (exam.includeName) {
    y += 6;
    writeLine("Name: ______________________________   Class: ____", 11);
  }
  y += 8;

  let counter = 1;
  exam.sections.forEach((sec, si) => {
    y += 6;
    addPageIfNeeded(28);
    writeLine(`${si + 1}. ${sec.label}`, 13, "bold");
    y += 2;
    sec.items.forEach((ex) => {
      const t = exerciseToText(ex, counter);
      if (ex.type === "multiple-choice") {
        writeLine(`${counter}. ${ex.prompt}`, 11);
        ex.choices.forEach((c, i) => {
          writeLine(`${String.fromCharCode(97 + i)}) ${c}`, 11, "normal", 18);
        });
      } else if (ex.type === "matching") {
        writeLine(`${counter}. Match each item on the left with the correct one on the right.`, 11);
        const lefts = ex.pairs.map((p) => p[0]);
        const rights = shuffle(ex.pairs.map((p) => p[1]));
        writeLine("Left:  " + lefts.map((l, i) => `${String.fromCharCode(97 + i)}) ${l}`).join("   "), 11, "normal", 18);
        writeLine("Right: " + rights.map((r, i) => `${i + 1}) ${r}`).join("   "), 11, "normal", 18);
      } else if (ex.type === "translation") {
        writeLine(`${counter}. Translate into English: ${ex.prompt}`, 11);
        writeLine("_________________________________________________", 11, "normal", 18);
      } else if (ex.type === "transformation") {
        ex.prompt.split("\n").forEach((p, k) => writeLine(k === 0 ? `${counter}. ${p}` : p, 11));
        writeLine("_________________________________________________", 11, "normal", 18);
      } else {
        writeLine(`${counter}. ${ex.prompt}`, 11);
        writeLine("_________________________________________________", 11, "normal", 18);
      }
      y += 4;
      counter++;
    });
  });

  if (exam.includeKey) {
    doc.addPage();
    y = margin;
    writeLine("Answer key", 16, "bold");
    y += 4;
    let kn = 1;
    exam.sections.forEach((sec) => {
      writeLine(sec.label, 12, "bold");
      sec.items.forEach((ex) => {
        const t = exerciseToText(ex, kn);
        writeLine(`${kn}. ${t.answer}`, 11);
        kn++;
      });
      y += 4;
    });
  }

  const slug = exam.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  doc.save(`${slug || "exam"}.pdf`);
}
