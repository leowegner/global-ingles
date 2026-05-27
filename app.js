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
const vocabArea = $("#vocab-area");

UNITS.forEach((u) => {
  const opt = document.createElement("option");
  opt.value = u; opt.textContent = unitLabel(u);
  vocabUnit.appendChild(opt);
});
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
  if (sec === "__all__") {
    return Object.entries(unit.sections).flatMap(([s, list]) =>
      list.map(([en, es]) => ({ en, es, section: s }))
    );
  }
  return unit.sections[sec].map(([en, es]) => ({ en, es, section: sec }));
}
function renderVocab() {
  const pairs = getVocabPairs();
  const mode = vocabMode.value;
  if (mode === "list") renderVocabList(pairs);
  else if (mode === "flashcards") renderFlashcards(pairs);
  else renderVocabQuiz(pairs);
}
function renderVocabList(pairs) {
  const dir = vocabDir.value;
  const rows = pairs
    .map(
      (p) =>
        `<tr><td>${dir === "en-es" ? p.en : p.es}</td><td>${dir === "en-es" ? p.es : p.en}</td><td class="muted">${p.section}</td></tr>`
    )
    .join("");
  vocabArea.innerHTML = `
    <table class="vocab-table">
      <thead><tr><th>${dir === "en-es" ? "English" : "Spanish"}</th><th>${dir === "en-es" ? "Spanish" : "English"}</th><th>Section</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
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
    </div>`;
  const card = $("#flashcard");
  const front = $(".flashcard-face.front", card);
  const back = $(".flashcard-face.back", card);
  const progress = $("#fc-progress");
  function show() {
    card.classList.remove("flipped");
    const p = deck[idx];
    front.textContent = dir === "en-es" ? p.en : p.es;
    back.textContent = dir === "en-es" ? p.es : p.en;
    progress.textContent = `${idx + 1} / ${deck.length} · ${p.section}`;
  }
  card.addEventListener("click", () => card.classList.toggle("flipped"));
  $("#fc-flip").addEventListener("click", (e) => { e.stopPropagation(); card.classList.toggle("flipped"); });
  $("#fc-next").addEventListener("click", () => { idx = (idx + 1) % deck.length; show(); });
  $("#fc-prev").addEventListener("click", () => { idx = (idx - 1 + deck.length) % deck.length; show(); });
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
function escapeAttr(s) { return String(s).replace(/"/g, "&quot;"); }

vocabUnit.addEventListener("change", () => { refreshVocabSections(); renderVocab(); });
vocabSection.addEventListener("change", renderVocab);
vocabMode.addEventListener("change", renderVocab);
vocabDir.addEventListener("change", renderVocab);
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
