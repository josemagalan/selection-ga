'use strict';
// Bancos de preguntas para Moodle: todas las categorías se llenan, lo que se guarda como respuesta
// es lo que se resuelve a partir del enunciado (con una resolución independiente y exacta), los
// enlaces reproducen el ejercicio y el XML está bien formado.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const M = require('../js/moodle.js');
const S = require('../js/operators/sel-utils.js');

const ALL = M.KINDS.map((k) => k.id);
const bank = {};
['es', 'en'].forEach((lang) => {
  bank[lang] = M.generate({ lang, kinds: ALL, levels: M.LEVELS, count: 8, seed: 424242 });
  bank[lang].xml = M.toXml(bank[lang]);
});
const PY = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['--version']).status === 0);

// ---------- Lectura de lo que ve el alumno ----------

const numOf = (s) => Number(String(s).replace(',', '.'));
function rows(html) {
  const out = [];
  for (const m of html.matchAll(/<tr><th[^>]*>([^<]*)<\/th>(.*?)<\/tr>/g)) {
    out.push({ label: m[1], cells: [...m[2].matchAll(/<td style="[^"]*">(.*?)<\/td>/g)].map((t) => t[1]) });
  }
  return out;
}
const items = (html) => [...html.matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);
const cloze = (c) => {
  const m = c.match(/^\{1:(SHORTANSWER|NUMERICAL):=([^:}]+)(?::([\d.]+))?\}$/);
  return { v: m[2], tol: m[3] ? Number(m[3]) : 0, type: m[1] };
};
function read(q) {
  const rs = rows(q.text);
  const fit = rs.find((r) => /^(Aptitud f|Fitness f)$/.test(r.label)).cells.map(Number);
  const r = rs.find((x) => x.label === 'r');
  const ans = rs.find((x) => x.cells.length && x.cells[0].startsWith('{1:'));
  const student = rs.find((x) => /estudiante|Student/.test(x.label));
  return {
    fit,
    r: r ? r.cells.map(numOf) : null,
    answer: ans ? ans.cells.map(cloze) : null,
    student: student ? student.cells.map((c) => S.LABELS.indexOf(c)) : null,
    list: items(q.text),
    single: (q.text.match(/r = (\d+[.,]\d+)/) || [])[1],
  };
}

// ---------- Resolución independiente (aritmética entera) ----------

const cum = (a) => { let c = 0; return a.map((v) => (c += v)); };
function exactWheel(order, weights, rs) {
  const W = weights.reduce((a, b) => a + b, 0);
  const C = cum(weights);
  return rs.map((r) => {
    const m = Math.round(r * 100);
    const j = C.findIndex((c) => m * W < 100 * c);
    return order[j === -1 ? C.length - 1 : j];
  });
}
const ascending = (f) => f.map((_, i) => i).sort((a, b) => f[a] - f[b]);
// Pesos enteros del ranking lineal con s = s10 / 10: 10 · N · (N − 1) · p
const rankW = (n, s10) => Array.from({ length: n }, (_, j) => (20 - s10) * (n - 1) + 2 * j * (s10 - 10));

function solvePool(q, s) {
  const n = s.fit.length;
  if (q.kind === 'pool-roulette') return exactWheel(S.range(n), s.fit, s.r);
  if (q.kind === 'pool-linear-ranking') return exactWheel(ascending(s.fit), rankW(n, Math.round(M.SP[q.level] * 10)), s.r);
  if (q.kind === 'pool-sus') {
    const m = Math.round(numOf(s.single) * 100);
    const W = s.fit.reduce((a, b) => a + b, 0);
    const C = cum(s.fit);
    const out = [];
    let i = 0;
    for (let k = 0; k < n; k++) {
      while (i < n - 1 && !((m + 100 * k) * W < 100 * n * C[i])) i++;
      out.push(i);
    }
    return out;
  }
  if (q.kind === 'pool-tournament') {
    return s.list.map((li) => {
      const cont = li.split(': ')[1].split(', ').map((x) => S.LABELS.indexOf(x[0]));
      return cont.reduce((b, i) => (s.fit[i] > s.fit[b] ? i : b));
    });
  }
  // truncamiento: el puesto p entre los mejores
  const desc = ascending(s.fit).reverse();
  return s.list.map((li) => desc[Number(li.match(/(\d+)/g).pop()) - 1]);
}

// ---------- Pruebas ----------

test('se generan todos los tipos y niveles sin huecos, en ES y EN', () => {
  ['es', 'en'].forEach((lang) => {
    assert.equal(bank[lang].missing.length, 0, JSON.stringify(bank[lang].missing));
    assert.equal(bank[lang].questions.length, ALL.length * 3 * 8);
  });
});

test('«calcular las probabilidades»: las casillas son las de la fórmula', () => {
  ['es', 'en'].forEach((lang) => bank[lang].questions.filter((q) => q.kind.startsWith('prob-')).forEach((q) => {
    const s = read(q);
    const n = s.fit.length;
    let p;
    if (q.kind === 'prob-roulette') p = s.fit.map((f) => f / s.fit.reduce((a, b) => a + b, 0));
    else {
      const w = rankW(n, Math.round(M.SP[q.level] * 10));
      const order = ascending(s.fit);
      p = Array(n);
      order.forEach((idx, j) => { p[idx] = w[j] / (10 * n * (n - 1)); });
    }
    assert.equal(s.answer.length, n);
    s.answer.forEach((c, i) => {
      assert.equal(c.type, 'NUMERICAL');
      assert.equal(c.tol, M.PROB_TOL);
      assert.ok(Math.abs(Number(c.v) - p[i]) <= 0.0005 + 1e-12, `${q.name}: ${c.v} ≠ ${p[i]}`);
    });
    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  }));
});

test('«calcular los padres»: la respuesta es la que se resuelve con los datos del enunciado', () => {
  ['es', 'en'].forEach((lang) => bank[lang].questions.filter((q) => q.kind.startsWith('pool-')).forEach((q) => {
    const s = read(q);
    const want = solvePool(q, s).map(S.label);
    assert.deepEqual(s.answer.map((c) => c.v), want, q.name);
    assert.ok(new Set(want).size >= 2);
    // los r están lejos de los límites
    if (s.r) {
      const n = s.fit.length;
      const w = q.kind === 'pool-roulette' ? s.fit : rankW(n, Math.round(M.SP[q.level] * 10));
      const W = w.reduce((a, b) => a + b, 0);
      const bounds = cum(w).map((c) => c / W);
      s.r.forEach((r) => bounds.forEach((b) => assert.ok(Math.abs(r - b) >= M.MARGIN - 1e-9, `${q.name}: r = ${r}, límite ${b}`)));
    }
  }));
});

test('«detectar el error»: una sola opción correcta y los padres del estudiante llevan ese error', () => {
  ['es', 'en'].forEach((lang) => bank[lang].questions.filter((q) => q.kind.startsWith('error-')).forEach((q) => {
    const s = read(q);
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o.correct).length, 1);
    assert.ok(q.options[3].text && !q.options[3].correct);
    const op = q.kind.replace('error-', '');
    let errs;
    if (op === 'roulette') errs = M.rouletteMistakes(s.fit, s.r);
    else if (op === 'linear-ranking') errs = M.rankingMistakes(s.fit, q.params.sp, s.r);
    else errs = M.tournamentMistakes(s.fit, s.list.map((li) => li.split(': ')[1].split(', ').map((x) => S.LABELS.indexOf(x[0]))));
    assert.deepEqual(s.student, errs[q.mistake], q.name);
    assert.notDeepEqual(errs[q.mistake], errs.right);
    // la solución correcta, independiente
    if (op === 'roulette') assert.deepEqual(errs.right, exactWheel(S.range(s.fit.length), s.fit, s.r));
  }));
  // los tres errores de cada tipo aparecen
  ['error-roulette', 'error-linear-ranking', 'error-tournament'].forEach((k) => {
    assert.equal(new Set(bank.es.questions.filter((q) => q.kind === k).map((q) => q.mistake)).size, 3, k);
  });
});

test('los enlaces reproducen el ejercicio en la aplicación', () => {
  bank.es.questions.forEach((q) => {
    const h = new URLSearchParams(q.link.split('#')[1]);
    const op = h.get('op');
    const spec = require(`../js/operators/${op}.js`).spec;
    const f = h.get('f').split('-').map(Number);
    assert.deepEqual(f, q.fitness);
    const params = {};
    (spec.params || []).forEach((pr) => { params[pr.id] = h.has(pr.id) ? Number(h.get(pr.id)) : pr.default; });
    const res = spec.run(f, { variant: h.get('v') || spec.defaultVariant, params, seed: Number(h.get('r')) || 1 });
    if (q.kind.startsWith('pool-')) assert.deepEqual(res.pool.map(S.label), q.answer, q.name);
    if (q.kind.startsWith('error-')) assert.deepEqual(res.pool, q.right, q.name);
    assert.ok(Number(h.get('s')) < 1000000);
  });
});

test('XML bien formado, una categoría por mecanismo, tipo y nivel, y sin español en el banco inglés', { skip: !PY && 'sin Python' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-sel-moodle-'));
  ['es', 'en'].forEach((lang) => {
    const file = path.join(dir, `${lang}.xml`);
    fs.writeFileSync(file, bank[lang].xml);
    const run = spawnSync(PY, ['-c', `import xml.etree.ElementTree as ET,sys
t=ET.parse(sys.argv[1]).getroot()
cats=[q.find('category/text').text for q in t if q.get('type')=='category']
print(len(cats), len(set(cats)), sum(1 for q in t if q.get('type')!='category'))`, file], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const [ncat, nuniq, nq] = run.stdout.trim().split(' ').map(Number);
    assert.equal(ncat, ALL.length * 3);
    assert.equal(nuniq, ncat);
    assert.equal(nq, ALL.length * 3 * 8);
  });
  assert.ok(!/(Individuo|Aptitud|Padres|ruleta|torneo|Solución)/.test(bank.en.xml));
});
