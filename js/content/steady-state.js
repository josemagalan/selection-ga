/*
 * Contenido docente del reemplazo en estado estacionario.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const variants = {
    worst: {
      name: { es: 'Sustituir al peor', en: 'Replace the worst' },
      desc: {
        es: 'Cada hijo sustituye al peor de la población (GENITOR, Whitley, 1989): muy elitista y con mucha presión.',
        en: 'Each child replaces the worst member of the population (GENITOR, Whitley, 1989): very elitist, with high pressure.',
      },
    },
    oldest: {
      name: { es: 'Sustituir al más viejo', en: 'Replace the oldest' },
      desc: {
        es: 'Cada hijo sustituye al que lleva más tiempo en la población (FIFO), sea bueno o malo. A igual edad, al primero.',
        en: 'Each child replaces the one that has been in the population longest (FIFO), good or bad. With equal age, the first one.',
      },
    },
    random: {
      name: { es: 'Sustituir a uno al azar', en: 'Replace a random one' },
      desc: {
        es: 'Cada hijo sustituye a un miembro elegido al azar: el reemplazo no ejerce presión y el mejor puede perderse.',
        en: 'Each child replaces a randomly chosen member: replacement applies no pressure and the best may be lost.',
      },
    },
    'worst-better': {
      name: { es: 'Sustituir al peor si es mejor', en: 'Replace the worst if better' },
      desc: {
        es: 'Cada hijo sustituye al peor solo si es mejor que él; si no, se descarta. Es una combinación muy usada (Lozano, Herrera y Cano, 2008).',
        en: 'Each child replaces the worst only if it is better; otherwise it is discarded. A widely used combination (Lozano, Herrera & Cano, 2008).',
      },
    },
  };

  const explanation = {
    es: [
      'En el modelo de estado estacionario (steady state) no se renueva la población entera en cada generación: se crean unos pocos hijos (λ, a menudo 1 o 2) y cada uno entra en la población sustituyendo a un miembro. Las generaciones se solapan y un buen hijo puede ser padre enseguida. Syswerda (1991) comparó este modelo con el generacional.',
      'Lo que decide el comportamiento es a quién se sustituye. Sustituir al peor, como en GENITOR (Whitley, 1989), es muy elitista: los buenos no se pierden nunca y la población converge rápido. Sustituir al más viejo (FIFO) da a cada individuo una vida fija, sea bueno o malo, y puede perder al mejor. Sustituir a uno al azar no añade presión: toda la presión viene de la selección de padres.',
      'Son dos decisiones distintas: a quién se sustituye y con qué condición. Con las tres primeras variantes, cada hijo entra sin condiciones, aunque sea peor que aquel a quien sustituye. Con «Sustituir al peor si es mejor», solo entra si mejora al peor; si no, se descarta (Lozano, Herrera y Cano, 2008). La edad cuenta los pasos que lleva cada individuo en la población: los recién llegados empiezan en 0 y todos envejecen uno en cada paso.',
      'Coste: O(μ) por hijo para buscar al peor o al más viejo; O(1) al azar.',
    ],
    en: [
      'In the steady-state model the whole population is not renewed at each generation: a few offspring are created (λ, often 1 or 2) and each one enters the population replacing a member. Generations overlap and a good child can become a parent straight away. Syswerda (1991) compared this model with the generational one.',
      'What decides the behaviour is who gets replaced. Replacing the worst, as in GENITOR (Whitley, 1989), is very elitist: good individuals are never lost and the population converges fast. Replacing the oldest (FIFO) gives each individual a fixed lifespan, good or bad, and may lose the best. Replacing a random one adds no pressure: all the pressure comes from parent selection.',
      'These are two different decisions: whom to replace and under what condition. With the first three variants, each child enters unconditionally, even if it is worse than the one it replaces. With “Replace the worst if better”, it only enters if it beats the worst; otherwise it is discarded (Lozano, Herrera & Cano, 2008). Age counts the steps each individual has spent in the population: newcomers start at 0 and everyone ages by one at each step.',
      'Cost: O(μ) per child to find the worst or the oldest; O(1) at random.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de μ = {mu} padres (en azul), con su edad, y λ = {lambda} hijos nuevos (en naranja). Cada hijo entrará en la población sustituyendo a un miembro.',
      introBetter: 'Partimos de μ = {mu} padres (en azul), con su edad, y λ = {lambda} hijos nuevos (en naranja). Cada hijo sustituirá al peor de la población, pero solo si es mejor que él.',
      copy: 'La generación siguiente empieza siendo la población actual.',
      replaceWorst: 'Hijo {k}, {child} (f = {fc}): sustituye al peor de la población, {victim} (f = {fv}), en el hueco {slot}.',
      replaceOldest: 'Hijo {k}, {child} (f = {fc}): sustituye al más viejo, {victim} (edad {age}, f = {fv}), en el hueco {slot}. Después, todos envejecen un paso.',
      replaceRandom: 'Hijo {k}, {child} (f = {fc}): sustituye a uno elegido al azar, {victim} (f = {fv}), en el hueco {slot}.',
      rejectWorse: 'Hijo {k}, {child} (f = {fc}): no es mejor que el peor de la población, {victim} (f = {fv}), y se descarta. La población no cambia.',
      done: C.replDone.es,
      doneLost: C.replDone.es + C.replLost.es,
    },
    en: {
      intro: 'We start from μ = {mu} parents (in blue), with their age, and λ = {lambda} new offspring (in orange). Each child will enter the population replacing a member.',
      introBetter: 'We start from μ = {mu} parents (in blue), with their age, and λ = {lambda} new offspring (in orange). Each child will replace the worst in the population, but only if it is better.',
      copy: 'The next generation starts as the current population.',
      replaceWorst: 'Child {k}, {child} (f = {fc}): it replaces the worst in the population, {victim} (f = {fv}), in slot {slot}.',
      replaceOldest: 'Child {k}, {child} (f = {fc}): it replaces the oldest, {victim} (age {age}, f = {fv}), in slot {slot}. Then everyone ages one step.',
      replaceRandom: 'Child {k}, {child} (f = {fc}): it replaces a randomly chosen one, {victim} (f = {fv}), in slot {slot}.',
      rejectWorse: 'Child {k}, {child} (f = {fc}): it is not better than the worst in the population, {victim} (f = {fv}), so it is discarded. The population does not change.',
      done: C.replDone.en,
      doneLost: C.replDone.en + C.replLost.en,
    },
  };

  const rule = {
    worst: { es: 'v ← hueco del peor de Q', en: 'v ← slot of the worst in Q' },
    oldest: { es: 'v ← hueco del más viejo de Q', en: 'v ← slot of the oldest in Q' },
    random: { es: 'v ← hueco al azar de Q', en: 'v ← random slot of Q' },
    'worst-better': { es: 'v ← hueco del peor de Q', en: 'v ← slot of the worst in Q' },
  };
  const pseudocode = (lang, variant) => {
    const l = lang === 'en' ? 'en' : 'es';
    const v = rule[variant] ? variant : 'worst';
    const cond = v === 'worst-better';
    return l === 'es' ? [
      { id: 'sig', indent: 0, text: 'REEMPLAZO_ESTADO_ESTACIONARIO(P, H)' },
      { id: 'copy', indent: 1, text: 'Q ← copia de P' },
      { id: 'loop', indent: 1, text: 'para cada hijo h de H' },
      { id: 'pick', indent: 2, text: rule[v].es },
      ...(cond ? [{ id: 'cond', indent: 2, text: 'si f(h) > f(Q_v)' }] : []),
      { id: 'put', indent: cond ? 3 : 2, text: 'Q_v ← h' },
      { id: 'return', indent: 1, text: 'devolver Q' },
    ] : [
      { id: 'sig', indent: 0, text: 'STEADY_STATE_REPLACEMENT(P, O)' },
      { id: 'copy', indent: 1, text: 'Q ← copy of P' },
      { id: 'loop', indent: 1, text: 'for each child h in O' },
      { id: 'pick', indent: 2, text: rule[v].en },
      ...(cond ? [{ id: 'cond', indent: 2, text: 'if f(h) > f(Q_v)' }] : []),
      { id: 'put', indent: cond ? 3 : 2, text: 'Q_v ← h' },
      { id: 'return', indent: 1, text: 'return Q' },
    ];
  };
  const keywords = { es: ['para cada', 'si', 'de', 'devolver'], en: ['for each', 'if', 'in', 'return'] };
  const stepLines = { intro: ['sig'], copy: ['copy'], replace: ['loop', 'pick', 'put'], reject: ['loop', 'pick', 'cond'], done: ['return'] };
  const fnName = { python: 'steady_state', javascript: 'steadyState' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'steady_state.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def steady_state(parents, offspring, ages, rule="worst", rng=random):
    """{{doc1}}

    {{doc2}}
    """
    mu = len(parents)
    union = parents + offspring
    pop = list(range(mu))  # {{copy}}
    age = list(ages)
    for k in range(len(offspring)):
        if rule in ("worst", "worst-better"):
            v = min(range(mu), key=lambda j: (union[pop[j]], j))  # {{worst}}
        elif rule == "oldest":
            v = max(range(mu), key=lambda j: (age[j], -j))  # {{oldest}}
        else:
            v = int(rng.random() * mu)  # {{random}}
        if rule == "worst-better" and union[mu + k] <= union[pop[v]]:  # {{better}}
            age = [x + 1 for x in age]
            continue
        pop[v] = mu + k
        age = [x + 1 for x in age]
        age[v] = 0
    return pop


if __name__ == "__main__":
    # {{example}}
    print(steady_state([12, 30, 5, 21], [25, 3], [2, 5, 1, 3], "oldest"))  # [0, 4, 2, 5]: A a C b
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'steady_state.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function steadyState(parents, offspring, ages, rule = 'worst', random = Math.random) {
  const mu = parents.length;
  const union = parents.concat(offspring);
  const pop = [...Array(mu).keys()]; // {{copy}}
  let age = ages.slice();
  offspring.forEach((_, k) => {
    let v = 0;
    if (rule === 'worst' || rule === 'worst-better') {
      for (let j = 1; j < mu; j++) if (union[pop[j]] < union[pop[v]]) v = j; // {{worst}}
    } else if (rule === 'oldest') {
      for (let j = 1; j < mu; j++) if (age[j] > age[v]) v = j; // {{oldest}}
    } else {
      v = Math.floor(random() * mu); // {{random}}
    }
    if (rule === 'worst-better' && union[mu + k] <= union[pop[v]]) { // {{better}}
      age = age.map((x) => x + 1);
      return;
    }
    pop[v] = mu + k;
    age = age.map((x) => x + 1);
    age[v] = 0;
  });
  return pop;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { steadyState };
  if (require.main === module) {
    // {{example}}
    console.log(steadyState([12, 30, 5, 21], [25, 3], [2, 5, 1, 3], 'oldest')); // [0, 4, 2, 5]: A a C b
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Reemplazo en estado estacionario: cada hijo sustituye al peor, al más viejo o a uno al azar, o al peor solo si es mejor.',
      ref: 'Whitley (1989); Syswerda (1991); Lozano, Herrera y Cano (2008). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Devuelve la población siguiente como índices en la lista padres + hijos (los hijos empiezan en μ), hueco a hueco.',
      doc2: 'rule: "worst", "oldest", "random" o "worst-better"; ages: edad de cada padre. rng da los números aleatorios en [0, 1).',
      copy: 'la población siguiente empieza siendo la actual',
      worst: 'el peor; a igual aptitud, el primer hueco',
      oldest: 'el más viejo; a igual edad, el primer hueco',
      random: 'un hueco cualquiera, con igual probabilidad',
      better: 'si el hijo no mejora al peor, se descarta',
      example: 'Cuatro padres (A–D) con edades 2, 5, 1 y 3, y dos hijos (a, b): el mejor, B, se pierde por viejo',
    },
    en: {
      title: 'Steady-state replacement: each child replaces the worst, the oldest or a random member, or the worst only if it is better.',
      ref: 'Whitley (1989); Syswerda (1991); Lozano, Herrera & Cano (2008). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Returns the next population as indices in the list parents + offspring (offspring start at μ), slot by slot.',
      doc2: 'rule: "worst", "oldest", "random" or "worst-better"; ages: age of each parent. rng provides the random numbers in [0, 1).',
      copy: 'the next population starts as the current one',
      worst: 'the worst; with equal fitness, the first slot',
      oldest: 'the oldest; with equal age, the first slot',
      random: 'any slot, with equal probability',
      better: 'if the child does not beat the worst, it is discarded',
      example: 'Four parents (A–D) aged 2, 5, 1 and 3, and two offspring (a, b): the best, B, is lost for being old',
    },
  };

  const references = [
    C.ref('whitley', {
      es: 'Fuente original de GENITOR: reemplazo del peor, uno a uno, con selección por rango.',
      en: 'Original source of GENITOR: replacement of the worst, one at a time, with rank-based selection.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: estrategias de reemplazo, entre ellas la de estado estacionario.',
      en: 'Core course reference: replacement strategies, including steady state.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('syswerda1991', {
      es: 'Compara el modelo generacional con el de estado estacionario.',
      en: 'Compares the generational model with the steady-state one.',
    }),
    C.ref('lozano2008', {
      es: 'Estrategias de reemplazo en estado estacionario: a quién sustituir y con qué condición; sustituir al peor solo si el hijo es mejor.',
      en: 'Replacement strategies in steady-state GAs: whom to replace and under what condition; replacing the worst only if the child is better.',
    }),
    C.ref('eiben', {
      es: 'Apartados 5.1 y 5.3: modelos de población y reemplazo por edad o por aptitud.',
      en: 'Sections 5.1 and 5.3: population models and age-based or fitness-based replacement.',
    }),
  ];

  const api = Object.assign({
    id: 'steady-state', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {})['steady-state'] = api;
})(typeof self !== 'undefined' ? self : this);
