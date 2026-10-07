/*
 * Controlador de la página: enrutado (inicio / mecanismo / acerca de), estado, controles,
 * reproductor, idioma y URL.
 *
 * URL: #lang=es                          → pantalla inicial
 *      #op=roulette&lang=es&v=…&r=…&<parámetros>&f=…&s=…&ex=goldberg&step=…  → página de un mecanismo
 *      (v: variante; r: semilla del sorteo; f: aptitudes separadas por guiones;
 *       s: semilla de la población; ex=goldberg: ejemplo de Goldberg)
 *      #page=about&lang=es               → acerca de
 */
(function () {
  'use strict';
  const G = window.GAX;
  const { rng: R, i18n, registry, selUtils: S, replUtils: P, createPopulationView, createLearnPanel, createHome, createCompareView } = G;

  const $ = (id) => document.getElementById(id);
  const el = {
    homeView: $('homeView'), opView: $('opView'), repGrid: $('repGrid'),
    opEyebrow: $('opEyebrow'), opTitle: $('opTitle'), opSubtitle: $('opSubtitle'),
    opSwitch: $('opSwitch'), vizLabel: $('vizLabel'), legend: $('legend'),
    len: $('len'), lenOut: $('lenOut'), seed: $('seed'),
    variantField: $('variantField'), variant: $('variant'), variantDesc: $('variantDesc'),
    btnRandom: $('btnRandom'), btnGoldberg: $('btnGoldberg'), btnDraw: $('btnDraw'), goldbergNote: $('goldbergNote'),
    manualForm: $('manualForm'), inP: $('inP'), err: $('err'),
    inG: $('inG'), inGLabel: $('inGLabel'), manualHint: $('manualHint'),
    paramsBox: $('paramsBox'),
    btnReset: $('btnReset'), btnPrev: $('btnPrev'), btnPlay: $('btnPlay'), btnNext: $('btnNext'),
    counter: $('stepCounter'), barFill: $('barFill'),
    speed: $('speed'), speedOut: $('speedOut'),
    narration: $('narration'),
    aboutView: $('aboutView'), aboutBody: $('aboutBody'), siteFoot: $('siteFoot'),
    moodleView: $('moodleView'), moodleBody: $('moodleBody'),
    playerBox: $('playerBox'), narrationBox: $('narrationBox'),
    btnPractice: $('btnPractice'), practiceCard: $('practiceCard'), practiceIntro: $('practiceIntro'),
    practiceGivens: $('practiceGivens'), practiceForm: $('practiceForm'), prM: $('prM'),
    practiceErr: $('practiceErr'), practiceResult: $('practiceResult'), btnPracticeExit: $('btnPracticeExit'),
    btnCopies: $('btnCopies'), copiesCard: $('copiesCard'), copiesTable: $('copiesTable'), copiesNote: $('copiesNote'),
    btnCompare: $('btnCompare'),
    cmpView: $('cmpView'), cmpBack: $('cmpBack'), cmpBackText: $('cmpBackText'), cmpProgress: $('cmpProgress'),
    cmpRandom: $('cmpRandom'), cmpGoldberg: $('cmpGoldberg'), cmpDraw: $('cmpDraw'), simAgain: $('simAgain'), simIntro: $('simIntro'),
  };

  const state = {
    lang: (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es',
    view: null,          // 'home' | 'op' | 'about'
    opId: null,
    variant: null,       // variante del mecanismo, si tiene varias
    draw: 1,             // semilla de los números aleatorios del mecanismo
    params: {},          // parámetros del mecanismo (s, k, p, τ…)
    n: 6, seed: 0, fitness: [], example: null,
    offspring: null,     // reemplazo: aptitudes de los hijos (null: se sortean con la semilla)
    result: null, step: 0,
    playing: false, speed: 1, errKey: null,
    practice: false,     // modo «predice los padres»: paso fijo en la intro, sin reproductor
    copies: false,       // tarjeta de las copias en 1000 repeticiones
    cmp: null,           // pantalla de comparar: { from, variant, params, rows, selected, simSeed }
  };
  const COPIES_REPS = 1000;
  let timer = null;
  let learn = null;

  // ---------- Formato de los números ----------

  const locale = () => (state.lang === 'es' ? 'es-ES' : 'en-GB');
  const fmtFixed = (v, d) => v.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtValue = (v) => (typeof v === 'number' && !Number.isInteger(v)
    ? v.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 })
    : v);
  // Números aleatorios y punteros: con dos decimales (0,70 y no 0,7)
  const fmtDraw = (v) => v.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const roundTo = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
  const twoDecimals = (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7;
  /*
   * Límites de los tramos (probabilidades y copias esperadas acumuladas). Los números aleatorios
   * tienen dos decimales, así que un límite que no es exactamente un número de dos decimales se
   * muestra con los decimales necesarios para que no lo parezca: 0,2504 y no 0,250, que haría
   * pensar en un empate con r = 0,25.
   */
  function fmtCum(v, base) {
    let d = base;
    if (!twoDecimals(v)) while (d < 6 && twoDecimals(roundTo(v, d))) d++;
    return fmtFixed(v, d);
  }
  const fmt = {
    fit: (v) => String(v),
    prob: (v) => fmtCum(v, 3),
    exp: (v) => fmtCum(v, 2),
    int: (v) => String(v),
    draw: (v) => fmtDraw(v),
    num: (v) => (Number.isInteger(v) ? String(v) : v.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 })),
    w: (v) => fmtCum(v, 3),
  };

  const PROB_PARAMS = ['p', 'pBest', 'pWorst', 'lo', 'hi', 'p0', 'pw', 'pw0'];
  const EXP_PARAMS = ['e', 'eBest', 'eWorst', 'elo', 'ehi', 'e0', 'e1'];
  const W_PARAMS = ['ww'];
  const DRAW_PARAMS = ['r', 'ptr', 'last'];
  const fill = (s, params) => (params ? s.replace(/\{(\w+)\}/g, (m, p) => {
    const v = params[p];
    if (v == null) return m;
    if (typeof v !== 'number') return v;
    if (PROB_PARAMS.indexOf(p) !== -1) return fmt.prob(v);
    if (EXP_PARAMS.indexOf(p) !== -1) return fmt.exp(v);
    if (W_PARAMS.indexOf(p) !== -1) return fmt.w(v);
    if (DRAW_PARAMS.indexOf(p) !== -1) return fmtDraw(v);
    return fmtValue(v);
  }) : s);
  const t = (key, params) => fill(i18n.t(state.lang, key), params);

  // Textos del mecanismo actual (narración…) con la interfaz general como respaldo.
  function tOp(key, params) {
    const c = state.opId && G.content[state.opId];
    const table = c && c.narration && (c.narration[state.lang] || c.narration.es);
    return table && table[key] != null ? fill(table[key], params) : t(key, params);
  }

  const impl = () => G.operators[state.opId];
  const isRepl = () => !!(state.opId && G.operators[state.opId].spec.replacement);
  const spec = () => impl().spec;
  const meta = () => registry.getOperator(state.opId);
  const famId = () => meta().family;
  const familyEyebrow = (id) => t(`familyOf${id.charAt(0).toUpperCase()}${id.slice(1)}`);

  // ---------- Vista ----------

  const view = createPopulationView($('viz'), {
    label: (key, params) => tOp(key, params),
    format: fmt,
    duration: () => Math.round(700 / state.speed),
  });

  const home = createHome(el.repGrid, { registry, t: (k, p) => t(k, p), lang: () => state.lang });

  // ---------- Problema ----------

  function generate(seed, n) {
    const r = R.mulberry32(seed);
    Object.assign(state, { seed, n, fitness: S.randomFitness(r, n), example: null, offspring: null });
  }

  function loadGoldberg() {
    Object.assign(state, { n: S.GOLDBERG.fitness.length, fitness: S.GOLDBERG.fitness.slice(), example: 'goldberg', offspring: null });
  }

  function recompute(step) {
    stop();
    // Un mecanismo proporcional no admite una población cuyas aptitudes sumen 0: se sortea otra.
    if (impl().validatePopulation(state.fitness)) generate(state.seed, state.n);
    const opts = { variant: state.variant, seed: state.draw, params: state.params };
    if (isRepl()) {
      // Reemplazo: λ hijos (los dados o, si no cuadran con λ, sorteados con la semilla) y la edad de los padres
      const lambda = spec().offspring(state.n, state.params);
      if (!state.offspring || state.offspring.length !== lambda) state.offspring = P.randomOffspring(state.seed, lambda);
      Object.assign(opts, { offspring: state.offspring, ages: P.randomAges(state.seed, state.n) });
    }
    state.result = spec().run(state.fitness, opts);
    view.setProblem({
      fitness: state.result.aux.fitnessAll || state.fitness,
      labels: state.result.aux.labels || S.LABELS.slice(0, state.n),
      chrom: state.example === 'goldberg' ? S.GOLDBERG.chrom.map((c, i) => `${c}\nx = ${S.GOLDBERG.x[i]}`) : null,
      aux: state.result.aux,
    });
    goTo(state.practice ? 0 : (step || 0), false);
    syncControls();
    if (state.practice) { renderPracticeGivens(); resetPracticeForm(); }
    renderCopies();
    el.opSwitch.querySelectorAll('a.op-chip[data-op]').forEach((a) => { a.href = sameProblemHref(a.dataset.op); });
    el.btnCompare.href = compareHref();
  }

  // ---------- Modo práctica («predice los padres») ----------

  function setPracticeMode(on) {
    state.practice = on;
    el.btnPractice.textContent = t(on ? 'exitPractice' : 'practiceMode');
    el.btnPractice.setAttribute('aria-pressed', String(on));
    el.practiceCard.hidden = !on;
    el.playerBox.hidden = on;
    el.narrationBox.hidden = on;
    stop();
    if (on) {
      renderPracticeGivens();
      resetPracticeForm();
      goTo(0, false);
    } else goTo(state.step, false);
  }

  // Lo que el mecanismo ha sorteado: sin ello los padres no tendrían una única respuesta.
  function renderPracticeGivens() {
    el.practiceIntro.textContent = t('practiceIntro');
    const g = G.practice.givens(state.result);
    const rows = [];
    g.global.forEach((x) => rows.push({ text: t(x.key, x.params) }));
    let list = null;
    if (g.slots.length) {
      const tour = g.slots[0].key.indexOf('pgTour') === 0;
      rows.push({ label: t('practiceGivens'), text: '', hint: g.slots[0].key === 'pgTourStoch' ? t('pgTourStochHint') : null });
      list = document.createElement('ol');
      list.className = 'practice-slots';
      g.slots.forEach((x) => {
        const li = document.createElement('li');
        const b = document.createElement('span');
        b.className = 'practice-slot-label';
        b.textContent = `${t(tour ? 'practiceTour' : 'practiceSlot', { k: x.k })}: `;
        li.append(b, document.createTextNode(t(x.key, x.params)));
        list.append(li);
      });
    }
    if (!rows.length) rows.push({ text: t('practiceNoDraws') });
    el.practiceGivens.hidden = false;
    el.practiceGivens.replaceChildren(...rows.map((row) => {
      const p = document.createElement('p');
      p.className = 'practice-given';
      if (row.label) {
        const strong = document.createElement('strong');
        strong.textContent = `${row.label}: `;
        p.append(strong);
      }
      p.append(document.createTextNode(row.text));
      if (row.hint) {
        const hint = document.createElement('span');
        hint.className = 'practice-given-hint';
        hint.textContent = ` ${row.hint}`;
        p.append(hint);
      }
      return p;
    }));
    if (list) el.practiceGivens.append(list);
  }

  function resetPracticeForm() {
    el.prM.value = '';
    el.prM.placeholder = S.LABELS.slice(0, state.n).join(' ');
    el.practiceErr.textContent = '';
    el.prM.removeAttribute('aria-invalid');
    el.practiceResult.replaceChildren();
    el.btnPracticeExit.hidden = true;
  }

  function gradePractice() {
    const res = G.practice.parseGuess(el.prM.value, state.n);
    el.practiceErr.textContent = res.error ? t(res.error) : '';
    el.prM.setAttribute('aria-invalid', String(!!res.error));
    if (res.error) { el.practiceResult.replaceChildren(); el.btnPracticeExit.hidden = true; return; }
    const cells = G.practice.grade(res.guess, state.result.pool);
    const line = document.createElement('div');
    line.className = 'practice-result-row';
    const label = document.createElement('span');
    label.className = 'practice-result-label';
    label.textContent = `${t('rowPool')}:`;
    line.append(label);
    let ok = 0;
    cells.forEach((c) => {
      if (c.ok) ok++;
      const chip = document.createElement('span');
      chip.className = `practice-gene ${c.ok ? 'ok' : 'bad'}`;
      chip.textContent = c.ok ? S.label(c.correct) : `${S.label(c.guess)} → ${S.label(c.correct)}`;
      line.append(chip);
    });
    const summary = document.createElement('p');
    summary.className = `practice-score${ok === cells.length ? ' all' : ''}`;
    summary.textContent = ok === cells.length ? t('practiceAllCorrect') : t('practiceResultScore', { ok, total: cells.length });
    el.practiceResult.replaceChildren(line, summary);
    el.btnPracticeExit.hidden = false;
  }

  // ---------- Copias en 1000 repeticiones ----------

  function renderCopies() {
    el.btnCopies.textContent = t(state.copies ? 'hideCopies' : 'showCopies');
    el.btnCopies.setAttribute('aria-pressed', String(state.copies));
    el.copiesCard.hidden = !state.copies;
    if (!state.copies || state.view !== 'op') return;
    const d = G.compare.copiesDistribution(state.opId, state.fitness, { variant: state.variant, params: state.params }, COPIES_REPS, 1);
    const exp = state.result.aux.expected;
    const head = document.createElement('tr');
    const th = (txt, cls) => { const c = document.createElement('th'); c.textContent = txt; if (cls) c.className = cls; c.scope = 'col'; return c; };
    head.append(th(t('copiesColInd')), th(t('copiesColFit'), 'num'), th(t('copiesColExp'), 'num'), th(t('copiesColMean'), 'num'), th(t('copiesColSd'), 'num'));
    const cols = Array.from({ length: d.maxC + 1 }, (_, c) => c);
    cols.forEach((c) => head.append(th(c === 1 ? t('copiesColC1') : t('copiesColC', { c }), 'num dist')));
    const two = (v) => v.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rows = state.fitness.map((f, i) => {
      const tr = document.createElement('tr');
      const td = (txt, cls) => { const c = document.createElement('td'); c.textContent = txt; if (cls) c.className = cls; return c; };
      const name = document.createElement('th');
      name.scope = 'row';
      name.textContent = S.label(i);
      tr.append(name, td(String(f), 'num'), td(exp ? two(exp[i]) : '—', 'num'), td(two(d.mean[i]), 'num'), td(two(d.sd[i]), 'num'));
      cols.forEach((c) => {
        const v = d.dist[i][c];
        const cell = td(v >= 0.005 ? `${Math.round(v * 100)} %` : '', 'num dist');
        cell.style.setProperty('--a', String(Math.min(1, v * 1.4)));
        if (v > 0.45) cell.classList.add('strong');
        if (exp && (c === Math.floor(exp[i] + 1e-9) || c === Math.ceil(exp[i] - 1e-9))) cell.classList.add('near');
        tr.append(cell);
      });
      return tr;
    });
    el.copiesTable.replaceChildren(head, ...rows);
    el.copiesNote.textContent = t('copiesNote', { spread: two(S.sum(d.sd) / state.n) });
  }

  // ---------- Reproductor ----------

  function goTo(i, animate) {
    const steps = state.result.steps;
    state.step = Math.max(0, Math.min(steps.length - 1, i));
    const step = steps[state.step];
    view.show(step, { animate });
    learn.setStep(stepForLearn(step));
    renderNarration();
    el.btnPrev.disabled = el.btnReset.disabled = state.step === 0;
    el.btnNext.disabled = state.step === steps.length - 1;
    el.barFill.style.width = `${(100 * state.step) / Math.max(1, steps.length - 1)}%`;
    writeHash();
  }

  const stepForLearn = (step) => step;

  function renderNarration() {
    const steps = state.result.steps;
    const step = steps[state.step];
    el.counter.textContent = t('stepOf', { i: state.step + 1, n: steps.length });
    el.narration.textContent = tOp(step.text.key, step.text.params);
  }

  function next() {
    if (!state.result || state.view !== 'op') return;
    if (state.step < state.result.steps.length - 1) goTo(state.step + 1, true);
    else stop();
  }
  const canPlay = () => !!state.result && state.view === 'op';
  function prev() { stop(); if (canPlay()) goTo(state.step - 1, false); }
  function reset() { stop(); if (canPlay()) goTo(0, false); }

  function play() {
    if (!canPlay()) return;
    if (state.step >= state.result.steps.length - 1) goTo(0, false);
    state.playing = true;
    el.btnPlay.classList.add('playing');
    el.btnPlay.title = t('pause');
    el.btnPlay.setAttribute('aria-label', t('pause'));
    const tick = () => {
      if (!state.playing) return;
      next();
      if (state.step >= state.result.steps.length - 1) { stop(); return; }
      timer = setTimeout(tick, Math.round(2600 / state.speed));
    };
    timer = setTimeout(tick, 250);
  }
  function stop() {
    state.playing = false;
    clearTimeout(timer);
    el.btnPlay.classList.remove('playing');
    el.btnPlay.title = t('play');
    el.btnPlay.setAttribute('aria-label', t('play'));
  }
  function togglePlay() { if (state.playing) stop(); else play(); }

  // ---------- Comparar mecanismos ----------

  // Colores fijos de cada mecanismo en las gráficas (el color sigue al mecanismo, nunca al orden).
  const SLOT = {
    roulette: 1, tournament: 2, 'linear-ranking': 3, truncation: 4, sus: 5, boltzmann: 6, 'exponential-ranking': 7, 'scaled-roulette': 8,
  };
  const SIM = { size: 50, gens: 40, runs: 50 };
  const CMP_REPS = 1000;
  const PARAM_SYMBOL = { sp: 's', k: 'k', p: 'p', tau: 'τ', temp: 'T', base: 'c', shift: 'C', cm: 'cm', c: 'c' };
  let cmpToken = 0;

  const cmpView = createCompareView({
    pop: $('cmpPop'), pools: $('cmpPools'), table: $('cmpTable'), defs: $('cmpDefs'),
    chips: $('simChips'), distinct: $('simDistinct'), fit: $('simFit'), simTable: $('simTable'),
  }, {
    t: (k, p) => t(k, p),
    format: {
      two: (v) => v.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      one: (v) => v.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      pct: (v) => v.toLocaleString(locale(), { style: 'percent', maximumFractionDigits: 0 }),
    },
  });

  const readyOps = () => registry.families.flatMap((f) => f.operators)
    .filter((op) => op.ready && G.operators[op.id] && G.content[op.id] && !G.operators[op.id].spec.replacement).map((op) => op.id);

  // Ajustes de cada mecanismo en la comparación: los suyos por defecto, salvo el de la página de
  // la que se viene, que conserva los del usuario.
  function cmpSettings(id) {
    const sp = G.operators[id].spec;
    if (id === state.cmp.from) return { variant: state.cmp.variant, params: state.cmp.params };
    const params = {};
    (sp.params || []).forEach((pr) => { params[pr.id] = pr.default; });
    return { variant: sp.variants ? sp.defaultVariant : null, params };
  }

  function cmpMeta(id, o) {
    const sp = G.operators[id].spec;
    const parts = [];
    if (o.variant) parts.push(G.content[id].variants[o.variant].name[state.lang]);
    (sp.params || []).filter((pr) => !pr.variants || pr.variants.indexOf(o.variant) !== -1)
      .forEach((pr) => parts.push(`${PARAM_SYMBOL[pr.id] || pr.id} = ${fmtValue(o.params[pr.id])}`));
    return parts.join(' · ');
  }

  function cmpOpHref(id, o) {
    const sp = G.operators[id].spec;
    const q = new URLSearchParams([['op', id], ['lang', state.lang]]);
    if (o.variant) q.set('v', o.variant);
    q.set('r', String(state.draw));
    (sp.params || []).filter((pr) => !pr.variants || pr.variants.indexOf(o.variant) !== -1)
      .forEach((pr) => q.set(pr.id, String(o.params[pr.id])));
    if (state.example) q.set('ex', state.example);
    else q.set('f', state.fitness.join('-'));
    q.set('s', String(state.seed));
    return `#${q.toString()}`;
  }

  const METRICS = [
    { id: 'best', kind: 'two' },
    { id: 'intensity', kind: 'two' },
    { id: 'lost', kind: 'pct', max: 1 },
    { id: 'spread', kind: 'two' },
  ];

  function cmpRows() {
    const c = state.cmp;
    return readyOps().filter((id) => G.operators[id].spec.proportional ? !G.operators[id].validatePopulation(state.fitness) : true).map((id) => {
      const o = cmpSettings(id);
      const res = G.operators[id].spec.run(state.fitness, { variant: o.variant, params: o.params, seed: state.draw });
      const old = c.rows ? c.rows.find((r) => r.id === id) : null;
      return {
        id, o, from: id === c.from, slot: SLOT[id] || null,
        name: registry.getOperator(id).name[state.lang], short: t(`short_${id}`),
        meta: cmpMeta(id, o), href: cmpOpHref(id, o),
        pool: res.pool, distinct: new Set(res.pool).size, labels: S.LABELS,
        metrics: old && old.fitKey === state.fitness.join('-') ? old.metrics : undefined,
        sim: old ? old.sim : undefined,
        fitKey: state.fitness.join('-'),
      };
    });
  }

  function renderCompare() {
    const c = state.cmp;
    document.title = t('compareDocTitle');
    if (c.from) {
      el.cmpBackText.textContent = t('compareBackTo', { name: registry.getOperator(c.from).name[state.lang] });
      el.cmpBack.href = cmpOpHref(c.from, cmpSettings(c.from));
    } else {
      el.cmpBackText.textContent = t('allOperators');
      el.cmpBack.href = `#lang=${state.lang}`;
    }
    c.rows.forEach((row) => {
      row.name = registry.getOperator(row.id).name[state.lang];
      row.short = t(`short_${row.id}`);
      row.meta = cmpMeta(row.id, row.o);
      row.href = cmpOpHref(row.id, row.o);
    });
    cmpView.renderPopulation(state.fitness, S.LABELS);
    cmpView.renderPools(c.rows);
    renderCmpTable();
    el.simIntro.textContent = t('simIntro', SIM);
    renderSimPart();
  }

  function renderCmpTable() {
    const rows = state.cmp.rows;
    const metrics = METRICS.map((m) => {
      if (m.max) return m;
      const vals = rows.map((r) => (r.metrics ? r.metrics[m.id] : null)).filter((v) => v != null);
      return Object.assign({}, m, { max: Math.max(1e-9, ...vals) });
    });
    cmpView.renderTable(metrics, rows);
  }

  function renderSimPart() {
    const c = state.cmp;
    const chartable = c.rows.filter((r) => r.slot);
    c.selected = c.selected.filter((id) => chartable.some((r) => r.id === id));
    cmpView.renderChips(chartable, c.selected, (id) => {
      const k = c.selected.indexOf(id);
      if (k !== -1) c.selected.splice(k, 1);
      else if (c.selected.length < 4) c.selected.push(id);
      renderSimPart();
    });
    const series = c.selected.map((id) => c.rows.find((r) => r.id === id)).filter((r) => r && r.sim);
    cmpView.renderSim({ size: SIM.size, series });
    cmpView.renderSimTable(c.rows);
  }

  // Primero los padres (rápido); las métricas y la simulación, por tandas, sin bloquear la página.
  function recomputeCompare(keepSim) {
    const token = ++cmpToken;
    const c = state.cmp;
    if (!keepSim && c.rows) c.rows.forEach((r) => { r.sim = undefined; });
    c.rows = cmpRows();
    renderCompare();
    writeHash();
    const queue = [];
    c.rows.forEach((row) => { if (row.metrics === undefined) queue.push(['m', row]); });
    c.rows.forEach((row) => { if (row.sim === undefined) queue.push(['s', row]); });
    const total = queue.length;
    const tick = () => {
      if (token !== cmpToken || state.view !== 'cmp') return;
      const job = queue.shift();
      if (!job) { el.cmpProgress.textContent = ''; return; }
      const [kind, row] = job;
      if (kind === 'm') {
        row.metrics = G.compare.metrics(row.id, state.fitness, row.o, CMP_REPS, 1);
        renderCmpTable();
      } else {
        row.sim = G.compare.simulate(row.id, row.o, Object.assign({ seed: c.simSeed }, SIM));
        renderSimPart();
      }
      el.cmpProgress.textContent = queue.length ? t('compareProgress', { p: Math.floor((100 * (total - queue.length)) / total) }) : '';
      setTimeout(tick, 0);
    };
    setTimeout(tick, 30);
  }

  function showCompare(q) {
    stop();
    state.view = 'cmp';
    const ids = readyOps();
    const from = ids.indexOf(q.get('from')) !== -1 ? q.get('from') : null;
    const fromSpec = from ? G.operators[from].spec : null;
    const variant = fromSpec && fromSpec.variants ? (fromSpec.variants.indexOf(q.get('v')) !== -1 ? q.get('v') : fromSpec.defaultVariant) : null;
    const params = {};
    if (fromSpec) {
      (fromSpec.params || []).forEach((pr) => {
        const v = q.has(pr.id) && q.get(pr.id) !== '' ? Number(q.get(pr.id)) : NaN;
        params[pr.id] = Number.isFinite(v) && v >= pr.min && v <= pr.max ? v : pr.default;
      });
    }
    const r = parseInt(q.get('r'), 10);
    state.draw = Number.isFinite(r) && r > 0 ? r % 1000000 : R.newSeed() + 1;
    const sim = parseInt(q.get('sim'), 10);
    state.cmp = {
      from, variant, params, rows: null,
      selected: ['roulette', 'linear-ranking', 'tournament'],
      simSeed: Number.isFinite(sim) && sim > 0 ? sim : 1,
    };
    const seed = parseInt(q.get('s'), 10);
    const s0 = Number.isFinite(seed) ? Math.abs(seed) % 1000000 : R.newSeed();
    const fitness = (q.get('f') || '').split('-').filter((x) => x !== '').map(Number);
    if (q.get('ex') === 'goldberg') { state.seed = s0; loadGoldberg(); }
    else if (fitness.length && !S.validateProportional(fitness)) Object.assign(state, { fitness, n: fitness.length, seed: s0, example: null });
    else generate(s0, state.n);
    showOnly('cmp');
    recomputeCompare();
    window.scrollTo(0, 0);
  }

  // Enlace a la comparación con esta población y los ajustes del mecanismo actual.
  function compareHref() {
    const q = new URLSearchParams([['cmp', 'all'], ['lang', state.lang], ['from', state.opId]]);
    if (state.variant) q.set('v', state.variant);
    activeParams().forEach((pr) => q.set(pr.id, String(state.params[pr.id])));
    if (state.example) q.set('ex', state.example);
    else q.set('f', state.fitness.join('-'));
    q.set('s', String(state.seed));
    return `#${q.toString()}`;
  }

  // ---------- Cabecera, selector de mecanismos y leyenda ----------

  const LEGEND = {
    individual: ['sw-ind', 'legendIndividual'],
    parentInd: ['sw-ind', 'legendParentInd'],
    childInd: ['sw-off', 'legendChildInd'],
    survivor: ['sw-pool', 'legendSurvivor'],
    cutSurv: ['sw-cut', 'legendCutSurv'],
    chosen: ['sw-chosen', 'legendChosen'],
    pointer: ['sw-pointer', 'legendPointer'],
    pool: ['sw-pool', 'legendPool'],
    contestant: ['sw-contestant', 'legendContestant'],
    cut: ['sw-cut', 'legendCut'],
  };

  // Enlace a otro mecanismo de la misma familia con la misma población.
  function sameProblemHref(id) {
    const q = new URLSearchParams([['op', id], ['lang', state.lang], ['f', state.fitness.join('-')], ['s', String(state.seed)]]);
    if (state.example) q.set('ex', state.example);
    if (isRepl() && G.operators[id].spec.replacement && state.offspring) q.set('g', state.offspring.join('-'));
    return `#${q.toString()}`;
  }

  function renderOpHeader() {
    const m = meta();
    const fam = registry.getFamily(m.family);
    const l = state.lang;
    el.opEyebrow.textContent = familyEyebrow(fam.id);
    el.opTitle.textContent = m.name[l];
    el.opSubtitle.textContent = m.subtitle ? m.subtitle[l] : m.summary[l];
    el.vizLabel.textContent = t('svgLabel', { name: m.name[l] });
    document.title = t('opTitleDoc', { name: m.name[l] });

    el.opSwitch.replaceChildren(...fam.operators.map((op) => {
      const current = op.id === state.opId;
      const chip = document.createElement(op.ready && !current ? 'a' : 'span');
      chip.className = 'op-chip' + (current ? ' current' : '') + (op.ready ? '' : ' soon');
      chip.textContent = op.name[l];
      if (current) chip.setAttribute('aria-current', 'page');
      else if (op.ready) { chip.dataset.op = op.id; chip.href = sameProblemHref(op.id); }
      else {
        chip.title = t('comingSoon');
        const s = document.createElement('span');
        s.className = 'sr-only';
        s.textContent = ` (${t('comingSoon')})`;
        chip.append(s);
      }
      return chip;
    }));

    el.legend.replaceChildren(...spec().legend.map((key) => {
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = `sw ${LEGEND[key][0]}`;
      const lab = document.createElement('span');
      lab.textContent = tOp(LEGEND[key][1]);
      li.append(sw, lab);
      return li;
    }));
    renderVariants();
    renderParams();
    // Práctica, copias y comparación son de la selección de padres; el reemplazo no las tiene
    [el.btnPractice, el.btnCopies, el.btnCompare].forEach((b) => { b.hidden = isRepl(); });
    el.inG.hidden = el.inGLabel.hidden = !isRepl();
    el.manualHint.textContent = t(isRepl() ? 'manualHintRepl' : 'manualHint');
  }

  // Controles de los parámetros del mecanismo (s, k, p, τ).
  // Parámetros que se aplican con la variante actual (algunos solo valen para una variante)
  const activeParams = () => (spec().params || []).filter((pr) => !pr.variants || pr.variants.indexOf(state.variant) !== -1);

  function renderParams() {
    const ps = activeParams();
    el.paramsBox.hidden = !ps.length;
    el.paramsBox.replaceChildren(...ps.map((pr) => {
      const id = `param-${pr.id}`;
      const field = document.createElement('div');
      field.className = 'field';
      const lab = document.createElement('label');
      lab.htmlFor = id;
      lab.textContent = tOp(`param${pr.id.toUpperCase()}`);
      const wrap = document.createElement('div');
      wrap.className = 'range-wrap';
      const input = document.createElement('input');
      const max = pr.id === 'k' ? Math.min(pr.max, state.n) : pr.max;
      Object.assign(input, { type: 'range', id, min: pr.min, max, step: pr.step, value: state.params[pr.id] });
      const out = document.createElement('output');
      out.htmlFor = id;
      out.textContent = fmtValue(state.params[pr.id]);
      input.addEventListener('input', () => { out.textContent = fmtValue(Number(input.value)); });
      input.addEventListener('change', () => {
        state.params[pr.id] = Number(input.value);
        renderDrawButton();
        recompute(0);
      });
      wrap.append(input, out);
      field.append(lab, wrap);
      return field;
    }));
  }

  // «Sortear de nuevo» solo si el mecanismo usa números aleatorios con estos ajustes
  const usesDraw = () => {
    const sp = spec();
    if (sp.randomVariants) return sp.randomVariants.indexOf(state.variant) !== -1;
    return !!sp.random && !(state.opId === 'truncation' && state.variant === 'cyclic');
  };
  function renderDrawButton() { el.btnDraw.hidden = !usesDraw(); }

  function renderVariants() {
    const vs = spec().variants;
    el.variantField.hidden = !vs;
    el.variantDesc.hidden = !vs;
    renderDrawButton();
    if (!vs) return;
    const vm = G.content[state.opId].variants;
    const l = state.lang;
    el.variant.replaceChildren(...vs.map((v) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = vm[v].name[l];
      return o;
    }));
    el.variant.value = state.variant;
    el.variantDesc.textContent = vm[state.variant].desc[l];
  }

  // ---------- Idioma ----------

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach((node) => node.setAttribute('aria-label', t(node.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-title]').forEach((node) => {
      node.title = t(node.dataset.i18nTitle);
      node.setAttribute('aria-label', t(node.dataset.i18nTitle));
    });
    document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    el.err.textContent = state.errKey ? t(state.errKey) : '';
    if (state.playing) { el.btnPlay.title = t('pause'); el.btnPlay.setAttribute('aria-label', t('pause')); }
    G.about.renderFooter(el.siteFoot, state.lang);
    $('sisterCrossover').href = G.about.sisterUrl('crossover', state.lang);
    $('sisterMutation').href = G.about.sisterUrl('mutation', state.lang);
    $('cmpHomeLink').href = `#cmp=all&lang=${state.lang}`;
    $('moodleLink').href = `#page=moodle&lang=${state.lang}`;
    if (state.view === 'moodle') {
      document.title = `${G.moodlePage.text[state.lang].title} · ${t('brand')}`;
      G.moodlePage.renderMoodle(el.moodleBody, state.lang);
    }
    if (state.view === 'about') {
      document.title = `${G.about.text[state.lang].title} · ${t('brand')}`;
      G.about.renderAbout(el.aboutBody, state.lang);
    }
    if (state.view === 'home') {
      document.title = t('homeTitleDoc');
      home.render();
    } else if (state.view === 'op') {
      renderOpHeader();
      view.refreshLabels();
      view.show(state.result.steps[state.step], { animate: false });   // números con la coma o el punto del idioma
      learn.refresh();
      renderNarration();
      syncControls();
      el.btnPractice.textContent = t(state.practice ? 'exitPractice' : 'practiceMode');
      if (state.practice) { renderPracticeGivens(); resetPracticeForm(); }
      renderCopies();
      el.btnCompare.href = compareHref();
    } else if (state.view === 'cmp') {
      renderCompare();
    }
    writeHash();
  }

  // ---------- Enrutado ----------

  function showOnly(which) {
    el.homeView.hidden = which !== 'home';
    el.opView.hidden = which !== 'op';
    el.aboutView.hidden = which !== 'about';
    el.cmpView.hidden = which !== 'cmp';
    el.moodleView.hidden = which !== 'moodle';
  }

  function showHome() {
    stop();
    state.view = 'home';
    showOnly('home');
  }

  function showMoodle() {
    stop();
    const changed = state.view !== 'moodle';
    state.view = 'moodle';
    showOnly('moodle');
    if (changed) window.scrollTo(0, 0);
  }

  function showAbout() {
    stop();
    const changed = state.view !== 'about';
    state.view = 'about';
    showOnly('about');
    if (changed) window.scrollTo(0, 0);
  }

  function showOp(id, q) {
    stop();
    const changed = id !== state.opId || state.view !== 'op';
    state.view = 'op';
    state.opId = id;
    state.errKey = null;
    state.practice = false;
    state.copies = q.get('cp') === '1';
    el.practiceCard.hidden = true;
    el.playerBox.hidden = false;
    el.narrationBox.hidden = false;
    el.btnPractice.setAttribute('aria-pressed', 'false');
    showOnly('op');   // visible antes de dibujar, para medir el ancho disponible

    const vs = spec().variants;
    const v = q.get('v');
    state.variant = vs ? (vs.indexOf(v) !== -1 ? v : spec().defaultVariant) : null;
    state.params = {};
    (spec().params || []).forEach((pr) => {
      const x = q.has(pr.id) && q.get(pr.id) !== '' ? Number(q.get(pr.id)) : NaN;
      state.params[pr.id] = Number.isFinite(x) && x >= pr.min && x <= pr.max ? x : pr.default;
    });
    const r = parseInt(q.get('r'), 10);
    state.draw = Number.isFinite(r) && r > 0 ? r % 1000000 : R.newSeed() + 1;
    if (!learn) {
      learn = createLearnPanel({ content: G.content[id], t: (k, p) => t(k, p), lang: () => state.lang });
      learn.setVariant(state.variant);
    } else learn.setContent(G.content[id], state.variant);

    const seed = parseInt(q.get('s'), 10);
    const s0 = Number.isFinite(seed) ? Math.abs(seed) % 1000000 : R.newSeed();
    const fitness = (q.get('f') || '').split('-').filter((x) => x !== '').map(Number);
    if (q.get('ex') === 'goldberg') {
      state.seed = s0;
      loadGoldberg();
    } else if (fitness.length && !impl().validatePopulation(fitness)) {
      Object.assign(state, { fitness, n: fitness.length, seed: s0, example: null });
    } else {
      generate(s0, state.n);
    }
    if (state.params.k > state.n) state.params.k = state.n;
    // Reemplazo: los hijos de la URL, si son válidos
    const g = (q.get('g') || '').split('-').filter((x) => x !== '').map(Number);
    state.offspring = isRepl() && g.length && !P.validateOffspring(g) ? g : null;
    renderOpHeader();
    recompute(parseInt(q.get('step'), 10) || 0);
    if (changed) window.scrollTo(0, 0);
  }

  function route() {
    const q = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (i18n.languages.indexOf(q.get('lang')) !== -1) state.lang = q.get('lang');
    const id = q.get('op');
    if (id && registry.isReady(id) && G.operators[id] && G.content[id]) showOp(id, q);
    else if (q.get('cmp')) showCompare(q);
    else if (q.get('page') === 'about') showAbout();
    else if (q.get('page') === 'moodle') showMoodle();
    else showHome();
    applyLanguage();
  }

  // Guarda el estado en la URL sin crear entradas de historial (para proyectar o compartir).
  function writeHash() {
    const params = { lang: state.lang };
    let paramIds = [];
    if (state.view === 'about') params.page = 'about';
    if (state.view === 'moodle') params.page = 'moodle';
    if (state.view === 'op') {
      Object.assign(params, {
        op: state.opId,
        v: state.variant || undefined,
        r: usesDraw() ? String(state.draw) : undefined,
        f: state.example ? undefined : state.fitness.join('-'),
        s: String(state.seed),
        ex: state.example || undefined,
        g: isRepl() && state.offspring ? state.offspring.join('-') : undefined,
        step: String(state.step),
        cp: state.copies ? '1' : undefined,
      });
      paramIds = activeParams().map((pr) => pr.id);
      paramIds.forEach((k) => { params[k] = String(state.params[k]); });
    }
    if (state.view === 'cmp') {
      const c = state.cmp;
      Object.assign(params, {
        cmp: 'all',
        from: c.from || undefined,
        v: c.variant || undefined,
        r: String(state.draw),
        f: state.example ? undefined : state.fitness.join('-'),
        s: String(state.seed),
        ex: state.example || undefined,
        sim: c.simSeed > 1 ? String(c.simSeed) : undefined,
      });
      paramIds = Object.keys(c.params);
      paramIds.forEach((k) => { params[k] = String(c.params[k]); });
    }
    const order = ['page', 'op', 'cmp', 'lang', 'from', 'v', 'r'].concat(paramIds, ['f', 'g', 's', 'ex', 'cp', 'sim', 'step']).filter((k) => params[k] != null && params[k] !== '');
    const h = new URLSearchParams(order.map((k) => [k, params[k]])).toString();
    if (location.hash.replace(/^#/, '') === h) return;
    try { history.replaceState(null, '', `#${h}`); } catch (err) { /* file:// en algunos navegadores */ }
  }

  // ---------- Controles ----------

  function syncControls() {
    el.len.value = state.n;
    el.lenOut.textContent = state.n;
    el.seed.value = state.seed;
    el.inP.value = state.fitness.join(' ');
    el.inG.value = state.offspring ? state.offspring.join(' ') : '';
    el.goldbergNote.hidden = state.example !== 'goldberg';
    el.btnGoldberg.setAttribute('aria-pressed', String(state.example === 'goldberg'));
  }

  // Cambiar N limita el tamaño del torneo, que no puede ser mayor que la población
  function afterSizeChange() {
    if (state.params.k != null && state.params.k > state.n) state.params.k = state.n;
    renderParams();
  }

  el.len.addEventListener('input', () => { el.lenOut.textContent = el.len.value; });
  el.len.addEventListener('change', () => {
    generate(state.seed, Number(el.len.value));
    afterSizeChange();
    recompute(0);
  });
  el.seed.addEventListener('change', () => {
    const s = Math.abs(parseInt(el.seed.value, 10));
    if (!Number.isFinite(s)) { el.seed.value = state.seed; return; }
    generate(s % 1000000, state.n);
    recompute(0);
  });
  el.btnRandom.addEventListener('click', () => {
    generate(R.newSeed(), state.n);
    afterSizeChange();
    recompute(0);
  });
  el.btnGoldberg.addEventListener('click', () => {
    loadGoldberg();
    afterSizeChange();
    recompute(0);
  });
  el.btnDraw.addEventListener('click', () => {
    state.draw = R.newSeed() + 1;
    recompute(0);
  });

  const parseList = (s) => s.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
  el.manualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fitness = parseList(el.inP.value);
    let err = impl().validatePopulation(fitness);
    let offspring = null;
    if (!err && isRepl()) {
      offspring = parseList(el.inG.value);
      // si el mecanismo tiene λ como parámetro, λ pasa a ser el número de hijos escritos
      const lp = (spec().params || []).find((pr) => pr.id === 'lambda');
      if (lp) {
        err = P.validateOffspring(offspring);
        if (!err && spec().id === 'mu-comma-lambda' && offspring.length < fitness.length) err = 'errLambdaMu';
        if (!err && (offspring.length < lp.min || offspring.length > lp.max)) err = 'errLambdaRange';
        if (!err) state.params = Object.assign({}, state.params, { lambda: offspring.length });
      } else {
        err = P.validateOffspring(offspring, spec().offspring(fitness.length, state.params));
        if (err === 'errLambda') err = 'errLambdaEqual';
      }
    }
    state.errKey = err;
    el.err.textContent = err ? t(err) : '';
    el.inP.setAttribute('aria-invalid', String(!!err));
    if (err) return;
    Object.assign(state, { n: fitness.length, fitness, example: null, offspring });
    afterSizeChange();
    recompute(0);
  });

  el.variant.addEventListener('change', () => {
    state.variant = el.variant.value;
    el.variantDesc.textContent = G.content[state.opId].variants[state.variant].desc[state.lang];
    learn.setVariant(state.variant);
    renderDrawButton();
    renderParams();
    recompute(0);
  });

  el.btnPractice.addEventListener('click', () => setPracticeMode(!state.practice));
  el.btnPracticeExit.addEventListener('click', () => setPracticeMode(false));
  el.practiceForm.addEventListener('submit', (e) => { e.preventDefault(); gradePractice(); });
  el.btnCopies.addEventListener('click', () => {
    state.copies = !state.copies;
    renderCopies();
    writeHash();
    if (state.copies) el.copiesCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  el.cmpRandom.addEventListener('click', () => { generate(R.newSeed(), state.n); recomputeCompare(true); });
  el.cmpGoldberg.addEventListener('click', () => { loadGoldberg(); recomputeCompare(true); });
  el.cmpDraw.addEventListener('click', () => { state.draw = R.newSeed() + 1; recomputeCompare(true); });
  el.simAgain.addEventListener('click', () => { state.cmp.simSeed += 1; recomputeCompare(false); });
  el.cmpBack.addEventListener('click', () => { stop(); });

  el.speed.addEventListener('input', () => {
    state.speed = Number(el.speed.value);
    el.speedOut.textContent = `${state.speed}×`;
  });

  el.btnNext.addEventListener('click', () => { stop(); next(); });
  el.btnPrev.addEventListener('click', prev);
  el.btnReset.addEventListener('click', reset);
  el.btnPlay.addEventListener('click', togglePlay);

  document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => {
    state.lang = b.dataset.lang;
    applyLanguage();
  }));

  // Enlaces a la pantalla inicial conservando el idioma
  [$('brandLink'), $('backLink'), $('aboutBack'), $('moodleBack')].forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = `lang=${state.lang}`;
  }));

  document.addEventListener('keydown', (e) => {
    if (state.view !== 'op') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (state.practice) return;   // el paso queda fijo en la intro mientras se practica
    if (e.key === 'ArrowRight') { e.preventDefault(); stop(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === ' ' && tag !== 'button' && tag !== 'summary' && tag !== 'a') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'Home') { e.preventDefault(); reset(); }
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('resize', (() => {
    let w = window.innerWidth;
    let tm = null;
    return () => {
      clearTimeout(tm);
      tm = setTimeout(() => {
        if (state.view !== 'op' || (w < 700) === (window.innerWidth < 700)) { w = window.innerWidth; return; }
        w = window.innerWidth;
        recompute(state.step);   // la ruleta se oculta o aparece al cruzar el ancho de móvil
      }, 200);
    };
  })());

  // ---------- Arranque ----------
  route();
})();
