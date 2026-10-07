'use strict';
// Comprueba que el material docente de cada mecanismo disponible es coherente con la herramienta:
// el código descargable (Python y JavaScript, en los dos idiomas) elige los mismos padres que la
// animación con los mismos números aleatorios, y cada paso de la animación resalta líneas que
// existen en el pseudocódigo y tiene su narración.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const registry = require('../js/registry.js');
const rng = require('../js/rng.js');
const S = require('../js/operators/sel-utils.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ga-sel-content-'));
const PY = ['python3', 'python'].find((cmd) => spawnSync(cmd, ['--version']).status === 0);
const readyOps = registry.families.flatMap((f) => f.operators).filter((o) => o.ready);

/*
 * Cómo llamar a la función descargable de cada mecanismo con los datos de un caso:
 *   js: argumentos en JavaScript (el azar es una función que devuelve c.draws en orden)
 *   py: la misma llamada en Python (el azar es un objeto con random() que devuelve c.draws)
 */
const CALLS = {
  roulette: {
    js: 'f(c.fitness, fixed(c.draws))',
    py: 'f(c["fitness"], Fixed(c["draws"]))',
  },
  sus: {
    js: 'f(c.fitness, fixed(c.draws))',
    py: 'f(c["fitness"], Fixed(c["draws"]))',
  },
  'linear-ranking': {
    params: (t) => ({ sp: [1, 1.2, 1.5, 1.7, 1.9, 2][t % 6] }),
    js: 'f(c.fitness, c.params.sp, fixed(c.draws), c.v)',
    py: 'f(c["fitness"], c["params"]["sp"], Fixed(c["draws"]), c["v"])',
  },
  tournament: {
    params: (t, n) => ({ k: Math.min(n, 2 + (t % 4)), p: [1, 0.75, 0.5, 0.9, 0.55][t % 5] }),
    js: 'f(c.fitness, c.params.k, c.params.p, fixed(c.draws), c.v === "with")',
    py: 'f(c["fitness"], c["params"]["k"], c["params"]["p"], Fixed(c["draws"]), c["v"] == "with")',
  },
  truncation: {
    params: (t) => ({ tau: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1][t % 10] }),
    js: 'f(c.fitness, c.params.tau, fixed(c.draws), c.v === "cyclic")',
    py: 'f(c["fitness"], c["params"]["tau"], Fixed(c["draws"]), c["v"] == "cyclic")',
  },
};

function makeCases(op, spec, count, seed, variant) {
  const call = CALLS[op.id];
  const r = rng.mulberry32(seed);
  const cases = [];
  for (let t = 0; t < count; t++) {
    const n = rng.randInt(r, 4, 10);
    let fitness;
    do {
      fitness = Array.from({ length: n }, () => (r() < 0.1 ? 0 : rng.randInt(r, 1, r() < 0.2 ? 999 : 40)));
      if (r() < 0.3) fitness[1] = fitness[0];
    } while (S.sum(fitness) === 0);
    const params = call.params ? call.params(t, n) : {};
    const res = spec.run(fitness, { variant, seed: t + 1, params });
    cases.push({ v: variant || null, fitness, params, draws: res.draws, expected: res.pool });
  }
  return cases;
}

for (const op of readyOps) {
  const spec = require(path.join('..', 'js', 'operators', `${op.id}.js`)).spec;
  const content = require(path.join('..', 'js', 'content', `${op.id}.js`));
  const call = CALLS[op.id];

  test(`«${op.id}»: el pseudocódigo y la narración cubren todos los pasos de la traza`, () => {
    assert.ok(call, `falta la forma de llamar a ${op.id} en CALLS`);
    for (const variant of spec.variants || [undefined]) {
      for (const lang of ['es', 'en']) {
        const ids = new Set(content.pseudocodeFor(lang, variant).map((l) => l.id));
        for (const c of makeCases(op, spec, 60, 3, variant)) {
          const res = spec.run(c.fitness, { variant, params: c.params, draws: c.draws });
          for (const step of res.steps) {
            const lines = content.stepLines[step.type];
            assert.ok(lines && lines.length, `${op.id}: paso «${step.type}» sin líneas`);
            lines.forEach((id) => assert.ok(ids.has(id), `${op.id}: línea «${id}» no está en el pseudocódigo (${lang}, ${variant})`));
            const text = content.narration[lang][step.text.key];
            assert.ok(text, `${op.id}: falta la narración «${step.text.key}» (${lang})`);
            (text.match(/\{(\w+)\}/g) || []).forEach((m) => assert.ok(step.text.params && step.text.params[m.slice(1, -1)] != null, `${op.id}: «${step.text.key}» sin ${m}`));
          }
        }
      }
    }
  });

  for (const lang of ['es', 'en']) {
    test(`«${op.id}»: el código JavaScript descargable (${lang}) elige los mismos padres`, () => {
      const file = path.join(tmp, `${op.id}-${lang}.js`);
      fs.writeFileSync(file, content.getCode('javascript', lang));
      const f = require(file)[content.fnName.javascript];
      const fixed = (draws) => { let k = 0; return () => draws[k++]; };
      for (const variant of spec.variants || [undefined]) {
        for (const c of makeCases(op, spec, 400, 7, variant)) {
          // eslint-disable-next-line no-new-func
          const got = new Function('f', 'c', 'fixed', `return ${call.js};`)(f, c, fixed);
          assert.deepEqual(got, c.expected, `${op.id}: ${JSON.stringify(c)}`);
        }
      }
      const run = spawnSync(process.execPath, [file], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr);
    });

    test(`«${op.id}»: el código Python descargable (${lang}) elige los mismos padres`, { skip: !PY && 'sin Python' }, () => {
      const dir = path.join(tmp, `py-${lang}`);
      fs.mkdirSync(dir, { recursive: true });
      const modName = content.codeTemplates.python.filename.replace(/\.py$/, '');
      fs.writeFileSync(path.join(dir, `${modName}.py`), content.getCode('python', lang));
      const cases = [];
      for (const variant of spec.variants || [undefined]) cases.push(...makeCases(op, spec, 400, 7, variant));
      fs.writeFileSync(path.join(dir, `${modName}-cases.json`), JSON.stringify(cases));
      const script = `
import json, sys
sys.path.insert(0, ${JSON.stringify(dir)})
from ${modName} import ${content.fnName.python} as f

class Fixed:
    def __init__(self, draws):
        self.draws = list(draws)
        self.k = 0
    def random(self):
        v = self.draws[self.k]
        self.k += 1
        return v

cases = json.load(open(${JSON.stringify(path.join(dir, `${modName}-cases.json`))}))
bad = 0
for c in cases:
    got = ${call.py}
    if got != c["expected"]:
        bad += 1
        print("diferente", c, got)
print("mal", bad)
sys.exit(1 if bad else 0)
`;
      const run = spawnSync(PY, ['-c', script], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stdout.slice(-2000) + run.stderr);
      const demo = spawnSync(PY, [path.join(dir, `${modName}.py`)], { encoding: 'utf8' });
      assert.equal(demo.status, 0, demo.stderr);
    });
  }

  test(`«${op.id}»: los ejemplos de los ficheros descargables dan lo que dicen`, () => {
    for (const kind of ['python', 'javascript']) {
      const code = content.getCode(kind, 'es');
      const m = code.match(/(?:#|\/\/) \[([\d, ]+)\]/);
      if (!m) continue;   // ejemplo con azar real: no hay resultado fijo
      const expected = m[1].split(',').map((x) => Number(x.trim()));
      let out;
      if (kind === 'javascript') {
        const file = path.join(tmp, `${op.id}-demo.js`);
        fs.writeFileSync(file, code);
        out = spawnSync(process.execPath, [file], { encoding: 'utf8' }).stdout;
      } else {
        if (!PY) continue;
        const file = path.join(tmp, `${op.id}-demo.py`);
        fs.writeFileSync(file, code);
        out = spawnSync(PY, [file], { encoding: 'utf8' }).stdout;
      }
      const got = out.match(/\[([\d, ]+)\]/)[1].split(',').map((x) => Number(x.trim()));
      assert.deepEqual(got, expected, `${op.id} (${kind})`);
    }
  });
}
