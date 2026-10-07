/*
 * Generador de bancos de preguntas para Moodle (formato Moodle XML).
 *
 * Cada pregunta se construye con los mismos mecanismos que la aplicación, así que la respuesta
 * guardada es la que da el mecanismo. La retroalimentación general enlaza a la web publicada con
 * el hash que reproduce el ejercicio.
 *
 * Tipos: «calcular las probabilidades» (cloze numérico, una casilla por individuo), «calcular los
 * padres» (cloze, una letra por hueco) y «detectar el error» (opción múltiple con penalización
 * −1/(k−1) en las erróneas). Niveles: fácil, media y difícil (tamaño de la población, rango de las
 * aptitudes y parámetros).
 *
 * El nombre de cada pregunta (que el alumno no ve) lleva su semilla, para reproducirla. La semilla
 * base del banco es aleatoria en cada exportación, para que no se pueda regenerar el banco.
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const R = isNode ? require('./rng.js') : root.GAX.rng;
  const S = isNode ? require('./operators/sel-utils.js') : root.GAX.selUtils;
  const OPS = isNode ? {
    roulette: require('./operators/roulette.js'),
    sus: require('./operators/sus.js'),
    'linear-ranking': require('./operators/linear-ranking.js'),
    tournament: require('./operators/tournament.js'),
    truncation: require('./operators/truncation.js'),
  } : root.GAX.operators;

  const APP = 'https://josemagalan.github.io/selection-ga/';
  const LEVELS = ['easy', 'medium', 'hard'];
  const MAX_TRIES = 20000;
  const PROB_TOL = 0.005;
  const MARGIN = 0.005;   // distancia mínima de cada r (o puntero) a un límite: a mano se redondea

  const SIZE = { easy: 4, medium: 6, hard: 8 };
  const FIT = { easy: [1, 20], medium: [1, 40], hard: [1, 99] };
  const SP = { easy: 2, medium: 1.5, hard: 1.2 };
  const K = { easy: 2, medium: 3, hard: 4 };
  const TAU = { easy: 0.5, medium: 0.5, hard: 0.3 };

  // ---------- Textos ----------

  const T = {
    es: {
      root: 'Selección',
      level: { easy: 'Fácil', medium: 'Media', hard: 'Difícil' },
      type: { prob: 'Calcular las probabilidades', pool: 'Calcular los padres', error: 'Detectar el error' },
      op: {
        roulette: 'Ruleta', sus: 'SUS', 'linear-ranking': 'Ranking lineal', tournament: 'Torneo', truncation: 'Truncamiento',
      },
      ind: 'Individuo',
      fit: 'Aptitud f',
      prob: 'p',
      parentsRow: 'Padre',
      pool: 'Padres',
      studentPool: 'Padres del estudiante',
      slot: 'Hueco',
      probStem: {
        roulette: '<p>En la <strong>selección por ruleta</strong> (proporcional a la aptitud), calcula la probabilidad de selección p de cada individuo de esta población.</p>',
        'linear-ranking': (s) => `<p>En el <strong>ranking lineal</strong> con presión de selección s = ${s}, calcula la probabilidad de selección p de cada individuo de esta población. El rango va de 1 (el peor) a N (el mejor) y p(rango) = (2 − s)/N + 2 · (rango − 1) · (s − 1) / (N · (N − 1)).</p>`,
      },
      probNote: 'Escribe cada probabilidad con tres decimales (se admite un error de ±0,005).',
      poolStem: {
        roulette: '<p>Aplica la <strong>selección por ruleta</strong> a esta población para elegir tantos padres como individuos, con estos números aleatorios r, uno por giro.</p>',
        sus: '<p>Aplica el <strong>muestreo estocástico universal (SUS)</strong> a esta población para elegir tantos padres como individuos.</p>',
        'linear-ranking': (s) => `<p>Aplica el <strong>ranking lineal</strong> con s = ${s} a esta población, con muestreo por ruleta y estos números aleatorios r, uno por giro.</p>`,
        tournament: (k) => `<p>Aplica la <strong>selección por torneo</strong> con k = ${k} a esta población: en cada torneo gana el de mayor aptitud. Estos son los contendientes sorteados en cada torneo.</p>`,
        truncation: (tau) => `<p>Aplica la <strong>selección por truncamiento</strong> con τ = ${tau}: solo los T = ⌈τ · N⌉ mejores pueden ser padres y cada padre se elige al azar entre ellos. Se da el puesto sorteado para cada padre (1 = el mejor).</p>`,
      },
      convRoulette: 'Probabilidades p_i = f_i / Σf y acumuladas q_i = p_1 + … + p_i; cada giro elige al primer individuo con r &lt; q_i.',
      convSus: (r) => `Copias esperadas e_i = N · f_i / Σf y acumuladas E_i; un único número r = ${r} coloca los punteros en r, r + 1, …, r + N − 1, y cada puntero elige al primer individuo con puntero &lt; E_i.`,
      convRanking: 'Se ordena de peor a mejor; p(rango) = (2 − s)/N + 2 · (rango − 1) · (s − 1) / (N · (N − 1)); acumuladas en el orden de los rangos; cada giro elige el primer rango con r &lt; q.',
      convTour: 'A igual aptitud, gana el que se sorteó antes.',
      poolNote: 'Escribe en cada hueco la letra del individuo elegido.',
      tourItem: (t, list) => `Torneo ${t}: ${list}`,
      placeItem: (k, p) => `Padre ${k}: el ${p}.º mejor`,
      drawRow: 'r',
      solutionProbs: (list) => `<p><strong>Solución.</strong> ${list}</p>`,
      solutionPool: (p) => `<p><strong>Solución.</strong> Padres = ${p}</p>`,
      stepLink: 'Ver la resolución paso a paso de este ejercicio',
      errQ: '<p>¿Qué error ha cometido?</p>',
      errStem: {
        roulette: '<p>Un estudiante aplica la <strong>selección por ruleta</strong> a esta población con estos números aleatorios r, uno por giro.</p>',
        'linear-ranking': (s) => `<p>Un estudiante aplica el <strong>ranking lineal</strong> con s = ${s} y muestreo por ruleta a esta población, con estos números aleatorios r.</p>`,
        tournament: (k) => `<p>Un estudiante aplica la <strong>selección por torneo</strong> con k = ${k} a esta población, con estos contendientes en cada torneo.</p>`,
      },
      err: {
        roulette: {
          noncum: 'Ha comparado r con la probabilidad p de cada individuo en lugar de con la acumulada q.',
          prev: 'Ha elegido al individuo anterior al tramo en que cae r.',
          desc: 'Ha acumulado las probabilidades ordenando antes la población de mayor a menor aptitud.',
        },
        'linear-ranking': {
          reversed: 'Ha dado el rango 1 al mejor: el mejor recibe la probabilidad del peor.',
          proportional: 'Ha usado probabilidades proporcionales a la aptitud, como en la ruleta.',
          unsorted: 'Ha asignado los rangos en el orden de la población, sin ordenarla.',
        },
        tournament: {
          worst: 'En cada torneo ha elegido al de menor aptitud.',
          first: 'En cada torneo ha elegido al primero que salió en el sorteo.',
          last: 'En cada torneo ha elegido al último que salió en el sorteo.',
        },
        none: 'No hay ningún error.',
        wouldGive: (p) => `Con ese error saldría ${p}.`,
        isIt: 'Correcto: es exactamente lo que ha hecho.',
        noneFb: (p) => `Los padres correctos son ${p}.`,
        general: (p) => `<p><strong>Padres correctos:</strong> ${p}.</p>`,
        link: 'Ver en la aplicación la resolución correcta',
      },
      errName: 'error',
    },
    en: {
      root: 'Selection',
      level: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
      type: { prob: 'Compute the probabilities', pool: 'Compute the parents', error: 'Spot the mistake' },
      op: {
        roulette: 'Roulette wheel', sus: 'SUS', 'linear-ranking': 'Linear ranking', tournament: 'Tournament', truncation: 'Truncation',
      },
      ind: 'Individual',
      fit: 'Fitness f',
      prob: 'p',
      parentsRow: 'Parent',
      pool: 'Parents',
      studentPool: 'Student’s parents',
      slot: 'Slot',
      probStem: {
        roulette: '<p>In <strong>roulette-wheel selection</strong> (fitness-proportionate), compute the selection probability p of each individual in this population.</p>',
        'linear-ranking': (s) => `<p>In <strong>linear ranking</strong> with selection pressure s = ${s}, compute the selection probability p of each individual in this population. The rank goes from 1 (the worst) to N (the best) and p(rank) = (2 − s)/N + 2 · (rank − 1) · (s − 1) / (N · (N − 1)).</p>`,
      },
      probNote: 'Write each probability with three decimals (an error of ±0.005 is accepted).',
      poolStem: {
        roulette: '<p>Apply <strong>roulette-wheel selection</strong> to this population to choose as many parents as individuals, with these random numbers r, one per spin.</p>',
        sus: '<p>Apply <strong>stochastic universal sampling (SUS)</strong> to this population to choose as many parents as individuals.</p>',
        'linear-ranking': (s) => `<p>Apply <strong>linear ranking</strong> with s = ${s} to this population, with roulette-wheel sampling and these random numbers r, one per spin.</p>`,
        tournament: (k) => `<p>Apply <strong>tournament selection</strong> with k = ${k} to this population: in each tournament the fittest wins. These are the contestants drawn for each tournament.</p>`,
        truncation: (tau) => `<p>Apply <strong>truncation selection</strong> with τ = ${tau}: only the T = ⌈τ · N⌉ best can become parents and each parent is chosen at random among them. The place drawn for each parent is given (1 = the best).</p>`,
      },
      convRoulette: 'Probabilities p_i = f_i / Σf and cumulative values q_i = p_1 + … + p_i; each spin chooses the first individual with r &lt; q_i.',
      convSus: (r) => `Expected copies e_i = N · f_i / Σf and cumulative values E_i; a single number r = ${r} places the pointers at r, r + 1, …, r + N − 1, and each pointer chooses the first individual with pointer &lt; E_i.`,
      convRanking: 'Sort from worst to best; p(rank) = (2 − s)/N + 2 · (rank − 1) · (s − 1) / (N · (N − 1)); cumulative values in rank order; each spin chooses the first rank with r &lt; q.',
      convTour: 'With equal fitness, the one drawn first wins.',
      poolNote: 'Write in each slot the letter of the chosen individual.',
      tourItem: (t, list) => `Tournament ${t}: ${list}`,
      placeItem: (k, p) => `Parent ${k}: number ${p} from the top`,
      drawRow: 'r',
      solutionProbs: (list) => `<p><strong>Solution.</strong> ${list}</p>`,
      solutionPool: (p) => `<p><strong>Solution.</strong> Parents = ${p}</p>`,
      stepLink: 'See the step-by-step solution of this exercise',
      errQ: '<p>What mistake has the student made?</p>',
      errStem: {
        roulette: '<p>A student applies <strong>roulette-wheel selection</strong> to this population with these random numbers r, one per spin.</p>',
        'linear-ranking': (s) => `<p>A student applies <strong>linear ranking</strong> with s = ${s} and roulette-wheel sampling to this population, with these random numbers r.</p>`,
        tournament: (k) => `<p>A student applies <strong>tournament selection</strong> with k = ${k} to this population, with these contestants in each tournament.</p>`,
      },
      err: {
        roulette: {
          noncum: 'They compared r with each individual’s probability p instead of the cumulative q.',
          prev: 'They chose the individual before the stretch r falls in.',
          desc: 'They accumulated the probabilities after sorting the population from highest to lowest fitness.',
        },
        'linear-ranking': {
          reversed: 'They gave rank 1 to the best: the best gets the probability of the worst.',
          proportional: 'They used probabilities proportional to fitness, as in the roulette wheel.',
          unsorted: 'They assigned the ranks in population order, without sorting it.',
        },
        tournament: {
          worst: 'In each tournament they chose the one with the lowest fitness.',
          first: 'In each tournament they chose the first one drawn.',
          last: 'In each tournament they chose the last one drawn.',
        },
        none: 'There is no mistake.',
        wouldGive: (p) => `With that mistake the result would be ${p}.`,
        isIt: 'Correct: that is exactly what they did.',
        noneFb: (p) => `The correct parents are ${p}.`,
        general: (p) => `<p><strong>Correct parents:</strong> ${p}.</p>`,
        link: 'See the correct solution in the app',
      },
      errName: 'mistake',
    },
  };

  // ---------- Tipos de pregunta ----------

  const KINDS = [
    { id: 'prob-roulette', type: 'prob', op: 'roulette' },
    { id: 'prob-linear-ranking', type: 'prob', op: 'linear-ranking' },
    { id: 'pool-roulette', type: 'pool', op: 'roulette' },
    { id: 'pool-sus', type: 'pool', op: 'sus' },
    { id: 'pool-linear-ranking', type: 'pool', op: 'linear-ranking' },
    { id: 'pool-tournament', type: 'pool', op: 'tournament' },
    { id: 'pool-truncation', type: 'pool', op: 'truncation' },
    { id: 'error-roulette', type: 'error', op: 'roulette' },
    { id: 'error-linear-ranking', type: 'error', op: 'linear-ranking' },
    { id: 'error-tournament', type: 'error', op: 'tournament' },
  ];
  const kindById = (id) => KINDS.find((k) => k.id === id);

  // ---------- Utilidades ----------

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v, lang, d) => {
    const s = v.toFixed(d);
    return lang === 'es' ? s.replace('.', ',') : s;
  };
  const dec = (v, lang) => (lang === 'es' ? String(v).replace('.', ',') : String(v));
  const letters = (pool) => pool.map(S.label).join(' ');
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  // La aplicación reduce el sorteo r= a menos de 10^6: se usa ya reducido para que el enlace lo reproduzca.
  const drawOf = (seed) => (seed % 999999) + 1;

  function appLink(op, fitness, seed, lang, extra) {
    extra = extra || {};
    const q = new URLSearchParams([['op', op], ['lang', lang]]);
    if (extra.v) q.set('v', extra.v);
    if (extra.r) q.set('r', String(extra.r));
    if (extra.params) Object.keys(extra.params).forEach((k) => q.set(k, String(extra.params[k])));
    q.set('f', fitness.join('-'));
    q.set('s', String(seed % 1000000));
    if (extra.step != null) q.set('step', String(extra.step));
    return `${APP}#${q.toString()}`;
  }
  const a = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${text}</a>`;

  const CELL = 'padding:4px 8px;text-align:center;font-family:monospace;font-size:1.1em;';
  function row(label, cells, o) {
    o = o || {};
    const td = cells.map((c) => `<td style="${CELL}">${o.cell ? o.cell(c) : esc(c)}</td>`).join('');
    return `<tr><th style="padding:4px 10px;text-align:left;white-space:nowrap;">${esc(label)}</th>${td}</tr>`;
  }
  const table = (rows) => `<table style="border-collapse:collapse;margin:0.6em 0;">${rows.join('')}</table>`;
  const ul = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const clozeShort = (v) => `{1:SHORTANSWER:=${v}}`;
  const clozeNum = (v) => `{1:NUMERICAL:=${v.toFixed(3)}:${PROB_TOL}}`;
  const popTable = (f, L) => table([row(L.ind, f.map((_, i) => S.label(i))), row(L.fit, f.map(String))]);
  const slotsTable = (n, L, cells, label) => table([row(L.slot, Array.from({ length: n }, (_, k) => String(k + 1))), row(label, cells, { cell: (c) => c })]);

  function base(kind, level, seed, f, L, lang, extraName) {
    const opName = L.op[kind.op];
    const name = [`${opName} · ${L.type[kind.type]}`, L.level[level].toLowerCase(), `N=${f.length}`, `s=${seed}`].concat(extraName || []).join(' · ');
    const tags = [`selection-${kind.op}`, `type-${kind.type}`, `level-${level}`, `lang-${lang}`];
    return { kind: kind.id, level, seed, n: f.length, category: [opName, L.type[kind.type], L.level[level]], name, tags, fitness: f };
  }

  /** Población del nivel: aptitudes enteras distintas (sin empates que exijan reglas extra). */
  function population(seed, level) {
    const rng = R.mulberry32(seed);
    const n = SIZE[level];
    const [lo, hi] = FIT[level];
    const f = Array.from({ length: n }, () => R.randInt(rng, lo, hi));
    return new Set(f).size === n ? f : null;
  }

  /** Ningún valor está a menos de MARGIN de un límite: el resultado no depende de cómo se redondee a mano. */
  const clear = (vals, bounds) => vals.every((v) => bounds.every((b) => Math.abs(v - b) >= MARGIN - 1e-12));

  // Probabilidades del ranking lineal en el orden de la población
  function rankProbs(f, s) {
    const n = f.length;
    const order = S.ascending(f);
    const p = Array(n);
    order.forEach((idx, j) => { p[idx] = OPS['linear-ranking'].rankProb(j, n, s); });
    return p;
  }

  // ---------- «Calcular las probabilidades» ----------

  function probQ(seed, level, L, lang, kind) {
    const f = population(seed, level);
    if (!f) return null;
    const op = kind.op;
    const s = SP[level];
    const p = op === 'roulette' ? f.map((x) => x / S.sum(f)) : rankProbs(f, s);
    const params = op === 'roulette' ? null : { sp: s };
    const link = appLink(op, f, seed, lang, { params, step: 2 });
    const q = base(kind, level, seed, f, L, lang);
    const stem = op === 'roulette' ? L.probStem.roulette : L.probStem['linear-ranking'](dec(s, lang));
    return Object.assign(q, {
      qtype: 'cloze', answer: p.map((x) => Math.round(x * 1000) / 1000), params,
      text: stem + popTable(f, L) + `<p>${L.probNote}</p>` +
        table([row(L.ind, f.map((_, i) => S.label(i))), row(L.prob, p, { cell: clozeNum })]),
      general: L.solutionProbs(p.map((x, i) => `p(${S.label(i)}) = ${num(x, lang, 3)}`).join(' · ')) + `<p>${a(link, L.stepLink)}</p>`,
      link,
    });
  }

  // ---------- «Calcular los padres» ----------

  function poolQ(seed, level, L, lang, kind) {
    const f = population(seed, level);
    if (!f) return null;
    const op = kind.op;
    const n = f.length;
    const draw = drawOf(seed);
    let params = {};
    let v = null;
    if (op === 'linear-ranking') { params = { sp: SP[level] }; v = 'roulette'; }
    if (op === 'tournament') { params = { k: K[level], p: 1 }; v = 'with'; }
    if (op === 'truncation') { params = { tau: TAU[level] }; v = 'random'; }
    const res = OPS[op].spec.run(f, { variant: v, params, seed: draw });
    const pool = res.pool;
    if (new Set(pool).size < 2) return null;
    let given = '';
    if (op === 'roulette' || op === 'linear-ranking') {
      const bounds = res.aux.rows.find((r) => r.id === 'q').values;
      if (!clear(res.draws, bounds)) return null;
      given = table([row(L.slot, pool.map((_, k) => String(k + 1))), row(L.drawRow, res.draws.map((r) => num(r, lang, 2)))]) +
        `<p>${op === 'roulette' ? L.convRoulette : L.convRanking}</p>`;
    } else if (op === 'sus') {
      const E = res.aux.rows.find((r) => r.id === 'E').values;
      const r = res.draws[0];
      if (!clear(pool.map((_, k) => r + k), E)) return null;
      given = `<p>${L.convSus(num(r, lang, 2))}</p>`;
    } else if (op === 'tournament') {
      const tours = res.steps.filter((st) => st.type === 'tour');
      given = ul(tours.map((st) => esc(L.tourItem(st.text.params.t, st.text.params.list)))) + `<p>${L.convTour}</p>`;
    } else {
      const picks = res.steps.filter((st) => st.type === 'pick');
      given = ul(picks.map((st) => esc(L.placeItem(st.text.params.k, st.text.params.place))));
    }
    const shown = Object.keys(params).length ? params : null;
    const link = appLink(op, f, seed, lang, { v, r: draw, params: shown });
    const stem = typeof L.poolStem[op] === 'function'
      ? L.poolStem[op](dec(op === 'linear-ranking' ? params.sp : op === 'tournament' ? params.k : params.tau, lang))
      : L.poolStem[op];
    const q = base(kind, level, seed, f, L, lang, [`r=${draw}`]);
    return Object.assign(q, {
      qtype: 'cloze', answer: pool.map(S.label), draw, params: shown, variant: v,
      text: stem + popTable(f, L) + given + `<p>${L.poolNote}</p>` + slotsTable(n, L, pool.map((i) => clozeShort(S.label(i))), L.pool),
      general: L.solutionPool(letters(pool)) + `<p>${a(link, L.stepLink)}</p>`,
      link,
    });
  }

  // ---------- «Detectar el error» ----------

  /** Ruleta sobre unas probabilidades en un orden dado, con la regla de la herramienta. */
  function wheel(order, pSorted, draws) {
    const acc = S.cumulative(pSorted);
    return draws.map((r) => order[S.firstAbove(acc, r)]);
  }

  /** Padres que salen con cada error de la ruleta. */
  function rouletteMistakes(f, draws) {
    const n = f.length;
    const p = f.map((x) => x / S.sum(f));
    const id = S.range(n);
    const right = wheel(id, p, draws);
    const noncum = draws.map((r) => { const i = p.findIndex((x) => r < x); return i === -1 ? n - 1 : i; });
    const prev = right.map((i) => (i > 0 ? i - 1 : n - 1));
    const desc = S.ascending(f).reverse();
    return { right, noncum, prev, desc: wheel(desc, desc.map((i) => p[i]), draws) };
  }

  function rankingMistakes(f, s, draws) {
    const n = f.length;
    const order = S.ascending(f);
    const pr = order.map((_, j) => OPS['linear-ranking'].rankProb(j, n, s));
    return {
      right: wheel(order, pr, draws),
      reversed: wheel(order, pr.slice().reverse(), draws),
      proportional: wheel(order, order.map((i) => f[i] / S.sum(f)), draws),
      unsorted: wheel(S.range(n), pr, draws),
    };
  }

  function tournamentMistakes(f, tours) {
    const best = (c) => c.reduce((b, i) => (f[i] > f[b] ? i : b));
    const worst = (c) => c.reduce((b, i) => (f[i] < f[b] ? i : b));
    return {
      right: tours.map(best), worst: tours.map(worst), first: tours.map((c) => c[0]), last: tours.map((c) => c[c.length - 1]),
    };
  }

  function errorQ(seed, level, L, lang, kind) {
    const f = population(seed, level);
    if (!f) return null;
    const op = kind.op;
    const n = f.length;
    const draw = drawOf(seed);
    let errs; let order; let stemData; let v = null; let params = null;
    if (op === 'roulette') {
      const res = OPS.roulette.spec.run(f, { seed: draw });
      if (!clear(res.draws, res.aux.rows.find((r) => r.id === 'q').values)) return null;
      errs = rouletteMistakes(f, res.draws);
      order = ['noncum', 'prev', 'desc'];
      stemData = table([row(L.slot, f.map((_, k) => String(k + 1))), row(L.drawRow, res.draws.map((r) => num(r, lang, 2)))]);
    } else if (op === 'linear-ranking') {
      params = { sp: SP[level] === 2 ? 1.8 : SP[level] };
      v = 'roulette';
      const res = OPS['linear-ranking'].spec.run(f, { variant: v, params, seed: draw });
      if (!clear(res.draws, res.aux.rows.find((r) => r.id === 'q').values)) return null;
      errs = rankingMistakes(f, params.sp, res.draws);
      order = ['reversed', 'proportional', 'unsorted'];
      stemData = table([row(L.slot, f.map((_, k) => String(k + 1))), row(L.drawRow, res.draws.map((r) => num(r, lang, 2)))]);
    } else {
      params = { k: K[level], p: 1 };
      v = 'without';
      const res = OPS.tournament.spec.run(f, { variant: v, params, seed: draw });
      const tours = res.steps.filter((st) => st.type === 'tour');
      errs = tournamentMistakes(f, tours.map((st) => st.contestants.map((c) => c.idx)));
      order = ['worst', 'first', 'last'];
      stemData = ul(tours.map((st) => esc(L.tourItem(st.text.params.t, st.text.params.list))));
    }
    const all = [errs.right].concat(order.map((o) => errs[o]));
    if (new Set(all.map((x) => x.join())).size !== all.length) return null;
    const which = order[seed % 3];
    const shown = errs[which];
    const E = L.err;
    const opts = order.concat(['none']);
    const link = appLink(op, f, seed, lang, { v, r: draw, params });
    const stem = op === 'roulette' ? L.errStem.roulette : L.errStem[op](dec(op === 'tournament' ? params.k : params.sp, lang));
    const q = base(kind, level, seed, f, L, lang, [`r=${draw}`, `${L.errName}=${which}`]);
    return Object.assign(q, {
      qtype: 'multichoice', shown, correct: opts.indexOf(which), mistake: which, draw, params, variant: v, right: errs.right,
      options: opts.map((o) => ({
        text: o === 'none' ? E.none : E[op][o], correct: o === which,
        feedback: o === which ? E.isIt : o === 'none' ? esc(E.noneFb(letters(errs.right))) : esc(E.wouldGive(letters(errs[o]))),
      })),
      text: stem + popTable(f, L) + stemData + table([row(L.slot, f.map((_, k) => String(k + 1))), row(L.studentPool, shown.map(S.label))]) + L.errQ,
      general: E.general(letters(errs.right)) + `<p>${a(link, E.link)}</p>`,
      link,
    });
  }

  const BUILDERS = { prob: probQ, pool: poolQ, error: errorQ };

  // ---------- Generación ----------

  /**
   * Genera las preguntas.
   * opts: { lang, kinds: [id], levels: [id], count, seed (base; aleatoria si falta) }
   * → { seed, lang, questions: [...], missing: [{ kind, level, made, wanted }] }
   */
  function generate(opts) {
    const lang = T[opts.lang] ? opts.lang : 'es';
    const L = T[lang];
    const count = Math.max(1, Math.min(50, opts.count || 10));
    const seed = Number.isFinite(opts.seed) ? opts.seed : R.newSeed();
    const questions = [];
    const missing = [];
    const used = new Set();
    let block = 0;
    (opts.kinds || []).forEach((kid) => {
      const kind = kindById(kid);
      if (!kind) return;
      LEVELS.filter((lv) => (opts.levels || []).indexOf(lv) !== -1).forEach((level) => {
        let s = seed * 1000 + (block++) * 100003;
        let made = 0;
        for (let tries = 0; made < count && tries < MAX_TRIES; tries++, s++) {
          const sd = s % 2147483647;
          const q = BUILDERS[kind.type](sd, level, L, lang, kind);
          if (!q) continue;
          const key = `${kid}|${q.fitness.join()}|${q.draw || ''}`;
          if (used.has(key)) continue;
          used.add(key);
          questions.push(q);
          made++;
        }
        if (made < count) missing.push({ kind: kid, level, made, wanted: count });
      });
    });
    return { seed, lang, questions, missing };
  }

  // ---------- Moodle XML ----------

  const cdata = (s) => `<![CDATA[${String(s).replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

  function toXml(result) {
    const L = T[result.lang] || T.es;
    const out = [];
    let lastCat = null;
    result.questions.forEach((q) => {
      const cat = [L.root].concat(q.category).join('/');
      if (cat !== lastCat) {
        out.push(`  <question type="category">\n    <category><text>$course$/top/${esc(cat)}</text></category>\n  </question>`);
        lastCat = cat;
      }
      let body = '';
      if (q.qtype === 'multichoice') {
        const k = q.options.length;
        const wrong = (-(100 / (k - 1))).toFixed(5);
        body = `    <single>true</single>
    <shuffleanswers>1</shuffleanswers>
    <answernumbering>abc</answernumbering>
    <showstandardinstruction>0</showstandardinstruction>
    <correctfeedback format="html"><text></text></correctfeedback>
    <partiallycorrectfeedback format="html"><text></text></partiallycorrectfeedback>
    <incorrectfeedback format="html"><text></text></incorrectfeedback>
${q.options.map((o) => `    <answer fraction="${o.correct ? 100 : wrong}" format="html">
      <text>${cdata(o.text)}</text>
      <feedback format="html"><text>${cdata(o.feedback)}</text></feedback>
    </answer>`).join('\n')}
`;
      }
      out.push(`  <question type="${q.qtype}">
    <name><text>${esc(q.name)}</text></name>
    <questiontext format="html"><text>${cdata(q.text)}</text></questiontext>
    <generalfeedback format="html"><text>${cdata(q.general)}</text></generalfeedback>
    <defaultgrade>1</defaultgrade>
    <penalty>0</penalty>
    <hidden>0</hidden>
    <idnumber></idnumber>
${body}    <tags>${q.tags.map((t) => `<tag><text>${esc(t)}</text></tag>`).join('')}</tags>
  </question>`);
    });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- ${esc(L.root)} · seed ${result.seed} · ${APP} -->\n<quiz>\n${out.join('\n')}\n</quiz>\n`;
  }

  /** Texto de la pregunta para la vista previa: las casillas cloze se sustituyen por campos vacíos. */
  function previewHtml(q) {
    return q.text.replace(/\{1:(SHORTANSWER|NUMERICAL):=[^}]*\}/g, '<input size="3" disabled aria-label="…">');
  }

  const api = {
    generate, toXml, previewHtml, KINDS, LEVELS, SIZE, FIT, SP, K, TAU, PROB_TOL, MARGIN, texts: T, APP,
    rouletteMistakes, rankingMistakes, tournamentMistakes, rankProbs,
  };
  if (isNode) module.exports = api;
  else (root.GAX = root.GAX || {}).moodle = api;
})(typeof self !== 'undefined' ? self : this);
