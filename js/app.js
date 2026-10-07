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
  const { rng: R, i18n, registry, selUtils: S, createPopulationView, createLearnPanel, createHome } = G;

  const $ = (id) => document.getElementById(id);
  const el = {
    homeView: $('homeView'), opView: $('opView'), repGrid: $('repGrid'),
    opEyebrow: $('opEyebrow'), opTitle: $('opTitle'), opSubtitle: $('opSubtitle'),
    opSwitch: $('opSwitch'), vizLabel: $('vizLabel'), legend: $('legend'),
    len: $('len'), lenOut: $('lenOut'), seed: $('seed'),
    variantField: $('variantField'), variant: $('variant'), variantDesc: $('variantDesc'),
    btnRandom: $('btnRandom'), btnGoldberg: $('btnGoldberg'), btnDraw: $('btnDraw'), goldbergNote: $('goldbergNote'),
    manualForm: $('manualForm'), inP: $('inP'), err: $('err'),
    paramsBox: $('paramsBox'),
    btnReset: $('btnReset'), btnPrev: $('btnPrev'), btnPlay: $('btnPlay'), btnNext: $('btnNext'),
    counter: $('stepCounter'), barFill: $('barFill'),
    speed: $('speed'), speedOut: $('speedOut'),
    narration: $('narration'),
    aboutView: $('aboutView'), aboutBody: $('aboutBody'), siteFoot: $('siteFoot'),
  };

  const state = {
    lang: (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es',
    view: null,          // 'home' | 'op' | 'about'
    opId: null,
    variant: null,       // variante del mecanismo, si tiene varias
    draw: 1,             // semilla de los números aleatorios del mecanismo
    params: {},          // parámetros del mecanismo (s, k, p, τ…)
    n: 6, seed: 0, fitness: [], example: null,
    result: null, step: 0,
    playing: false, speed: 1, errKey: null,
  };
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
  };

  const PROB_PARAMS = ['p', 'pBest', 'pWorst', 'lo', 'hi'];
  const EXP_PARAMS = ['e', 'eBest', 'eWorst', 'elo', 'ehi'];
  const DRAW_PARAMS = ['r', 'ptr', 'last'];
  const fill = (s, params) => (params ? s.replace(/\{(\w+)\}/g, (m, p) => {
    const v = params[p];
    if (v == null) return m;
    if (typeof v !== 'number') return v;
    if (PROB_PARAMS.indexOf(p) !== -1) return fmt.prob(v);
    if (EXP_PARAMS.indexOf(p) !== -1) return fmt.exp(v);
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
    Object.assign(state, { seed, n, fitness: S.randomFitness(r, n), example: null });
  }

  function loadGoldberg() {
    Object.assign(state, { n: S.GOLDBERG.fitness.length, fitness: S.GOLDBERG.fitness.slice(), example: 'goldberg' });
  }

  function recompute(step) {
    stop();
    // Un mecanismo proporcional no admite una población cuyas aptitudes sumen 0: se sortea otra.
    if (impl().validatePopulation(state.fitness)) generate(state.seed, state.n);
    state.result = spec().run(state.fitness, { variant: state.variant, seed: state.draw, params: state.params });
    view.setProblem({
      fitness: state.fitness,
      labels: S.LABELS.slice(0, state.n),
      chrom: state.example === 'goldberg' ? S.GOLDBERG.chrom.map((c, i) => `${c}\nx = ${S.GOLDBERG.x[i]}`) : null,
      aux: state.result.aux,
    });
    goTo(step || 0, false);
    syncControls();
    el.opSwitch.querySelectorAll('a.op-chip[data-op]').forEach((a) => { a.href = sameProblemHref(a.dataset.op); });
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
    if (state.step < state.result.steps.length - 1) goTo(state.step + 1, true);
    else stop();
  }
  function prev() { stop(); goTo(state.step - 1, false); }
  function reset() { stop(); goTo(0, false); }

  function play() {
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

  // ---------- Cabecera, selector de mecanismos y leyenda ----------

  const LEGEND = {
    individual: ['sw-ind', 'legendIndividual'],
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
  }

  // Controles de los parámetros del mecanismo (s, k, p, τ).
  function renderParams() {
    const ps = spec().params || [];
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
  const usesDraw = () => !!spec().random && !(state.opId === 'truncation' && state.variant === 'cyclic');
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
    }
    writeHash();
  }

  // ---------- Enrutado ----------

  function showOnly(which) {
    el.homeView.hidden = which !== 'home';
    el.opView.hidden = which !== 'op';
    el.aboutView.hidden = which !== 'about';
  }

  function showHome() {
    stop();
    state.view = 'home';
    showOnly('home');
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
    renderOpHeader();
    recompute(parseInt(q.get('step'), 10) || 0);
    if (changed) window.scrollTo(0, 0);
  }

  function route() {
    const q = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (i18n.languages.indexOf(q.get('lang')) !== -1) state.lang = q.get('lang');
    const id = q.get('op');
    if (id && registry.isReady(id) && G.operators[id] && G.content[id]) showOp(id, q);
    else if (q.get('page') === 'about') showAbout();
    else showHome();
    applyLanguage();
  }

  // Guarda el estado en la URL sin crear entradas de historial (para proyectar o compartir).
  function writeHash() {
    const params = { lang: state.lang };
    let paramIds = [];
    if (state.view === 'about') params.page = 'about';
    if (state.view === 'op') {
      Object.assign(params, {
        op: state.opId,
        v: state.variant || undefined,
        r: usesDraw() ? String(state.draw) : undefined,
        f: state.example ? undefined : state.fitness.join('-'),
        s: String(state.seed),
        ex: state.example || undefined,
        step: String(state.step),
      });
      paramIds = (spec().params || []).map((pr) => pr.id);
      paramIds.forEach((k) => { params[k] = String(state.params[k]); });
    }
    const order = ['page', 'op', 'lang', 'v', 'r'].concat(paramIds, ['f', 's', 'ex', 'step']).filter((k) => params[k] != null && params[k] !== '');
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
    const err = impl().validatePopulation(fitness);
    state.errKey = err;
    el.err.textContent = err ? t(err) : '';
    el.inP.setAttribute('aria-invalid', String(!!err));
    if (err) return;
    Object.assign(state, { n: fitness.length, fitness, example: null });
    afterSizeChange();
    recompute(0);
  });

  el.variant.addEventListener('change', () => {
    state.variant = el.variant.value;
    el.variantDesc.textContent = G.content[state.opId].variants[state.variant].desc[state.lang];
    learn.setVariant(state.variant);
    renderDrawButton();
    recompute(0);
  });

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
  [$('brandLink'), $('backLink'), $('aboutBack')].forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = `lang=${state.lang}`;
  }));

  document.addEventListener('keydown', (e) => {
    if (state.view !== 'op') return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
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
