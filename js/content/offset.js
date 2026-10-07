/*
 * Contenido docente del contraejemplo: la ruleta con la aptitud desplazada.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'Este contraejemplo aplica la ruleta a la aptitud desplazada f + C. Sumar una constante no cambia el orden de los individuos ni sus diferencias: quién es mejor sigue igual. Pero la ruleta reparte según los cocientes f_i / Σf, y esos cocientes sí cambian. Con C grande, todas las aptitudes son grandes y parecidas, y todos los individuos reciben casi la misma probabilidad.',
      'Pasa en la práctica más de lo que parece. Si se maximiza un beneficio que va de 1000 a 1040 €, la ruleta apenas distingue la mejor solución de la peor. Lo mismo ocurre al final de cualquier búsqueda, cuando la población ya es buena y las aptitudes se parecen: la selección proporcional deja de empujar justo cuando hace falta afinar.',
      'El problema contrario también existe. Con aptitudes negativas la ruleta no funciona, porque no hay sectores de tamaño negativo, y al minimizar hay que convertir el coste en aptitud, por ejemplo f = C_máx − coste o f = 1 / (1 + coste). Cada conversión cambia las probabilidades, y con ellas la presión de selección, aunque no cambie el orden.',
      'Hay tres salidas: escalar la aptitud antes de girar la ruleta (escalado lineal o truncamiento sigma, en «Ruleta con escalado»), transformarla con una exponencial (selección de Boltzmann) o usar solo el orden (selección basada en el rango o por torneo), que no depende de la escala (Goldberg, 1989; Eiben y Smith, 2015).',
    ],
    en: [
      'This counterexample applies the roulette wheel to the shifted fitness f + C. Adding a constant changes neither the order of the individuals nor their differences: who is better stays the same. But the wheel shares out according to the ratios f_i / Σf, and those ratios do change. With a large C, all fitness values are large and similar, and every individual gets almost the same probability.',
      'This happens in practice more than it seems. When maximising a profit that ranges from 1000 to 1040 €, the wheel barely tells the best solution from the worst. The same happens at the end of any search, when the population is already good and fitness values are similar: proportional selection stops pushing just when fine-tuning is needed.',
      'The opposite problem also exists. With negative fitness values the wheel does not work, because there are no sectors of negative size, and when minimising, cost has to be turned into fitness, for example f = C_max − cost or f = 1 / (1 + cost). Each conversion changes the probabilities, and with them the selection pressure, even if it does not change the order.',
      'There are three ways out: scaling fitness before spinning the wheel (linear scaling or sigma truncation, in “Roulette wheel with scaling”), transforming it with an exponential (Boltzmann selection) or using only the order (rank-based or tournament selection), which does not depend on scale (Goldberg, 1989; Eiben and Smith, 2015).',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Con la ruleta tal cual, el mejor, {who}, tendría p = {p0} y el peor, {worst}, p = {pw0}.',
      shift: 'Se suma C = {c} a todas las aptitudes. El orden no cambia y las diferencias tampoco, pero ahora todas son grandes y parecidas: las barras casi se igualan.',
      sum: 'Se suman las aptitudes desplazadas: Σ(f + C) = {total}.',
      prob: 'Probabilidades p = (f + C) / Σ(f + C): el mejor, {who}, pasa de {p0} a {p} y el peor, {worst}, de {pw0} a {pw}. La ruleta casi no distingue a los buenos de los malos.',
      cum: 'Las probabilidades acumuladas q reparten el intervalo [0, 1) en tramos consecutivos, uno por individuo; el último, el de {last}, acaba en 1.',
      spin: 'Giro {k}: r = {r}. Cae en el tramo de {who}, [{lo}, {hi}): es el primero con r < q. {who} pasa a la población de padres.',
      done: `${C.doneText.es} Sin desplazar, el mejor esperaba {e0} copias; desplazado, {e1}.`,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. With the plain roulette wheel, the best one, {who}, would have p = {p0} and the worst, {worst}, p = {pw0}.',
      shift: 'C = {c} is added to every fitness value. Neither the order nor the differences change, but now all values are large and similar: the bars become almost equal.',
      sum: 'The shifted fitness values are added up: Σ(f + C) = {total}.',
      prob: 'Probabilities p = (f + C) / Σ(f + C): the best one, {who}, goes from {p0} to {p} and the worst, {worst}, from {pw0} to {pw}. The wheel can hardly tell the good from the bad.',
      cum: 'The cumulative probabilities q divide the interval [0, 1) into consecutive stretches, one per individual; the last one, {last}’s, ends at 1.',
      spin: 'Spin {k}: r = {r}. It falls in {who}’s stretch, [{lo}, {hi}): the first one with r < q. {who} joins the parents.',
      done: `${C.doneText.en} Without the shift, the best expected {e0} copies; shifted, {e1}.`,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'RULETA_CON_APTITUD_DESPLAZADA(f, C)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'shift', indent: 1, text: 'para i ← 1 hasta N: g_i ← f_i + C' },
      { id: 'sum', indent: 1, text: 'S ← g_1 + g_2 + … + g_N' },
      { id: 'prob', indent: 1, text: 'para i ← 1 hasta N: p_i ← g_i / S' },
      { id: 'cum', indent: 1, text: 'para i ← 1 hasta N: q_i ← p_1 + … + p_i' },
      { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
      { id: 'spin', indent: 2, text: 'r ← número aleatorio en [0, 1)' },
      { id: 'pick', indent: 2, text: 'i ← primer índice con r < q_i' },
      { id: 'add', indent: 2, text: 'padres_k ← individuo i' },
      { id: 'return', indent: 1, text: 'devolver padres' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'ROULETTE_WITH_SHIFTED_FITNESS(f, C)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'shift', indent: 1, text: 'for i ← 1 to N: g_i ← f_i + C' },
      { id: 'sum', indent: 1, text: 'S ← g_1 + g_2 + … + g_N' },
      { id: 'prob', indent: 1, text: 'for i ← 1 to N: p_i ← g_i / S' },
      { id: 'cum', indent: 1, text: 'for i ← 1 to N: q_i ← p_1 + … + p_i' },
      { id: 'loop', indent: 1, text: 'for k ← 1 to N' },
      { id: 'spin', indent: 2, text: 'r ← random number in [0, 1)' },
      { id: 'pick', indent: 2, text: 'i ← first index with r < q_i' },
      { id: 'add', indent: 2, text: 'parents_k ← individual i' },
      { id: 'return', indent: 1, text: 'return parents' },
    ],
  };
  const keywords = { es: ['para', 'hasta', 'devolver'], en: ['for', 'to', 'return'] };
  const stepLines = {
    intro: ['sig', 'n'], shift: ['shift'], sum: ['sum'], prob: ['prob'], cum: ['cum'], spin: ['loop', 'spin', 'pick', 'add'], done: ['return'],
  };
  const fnName = { python: 'offset_roulette', javascript: 'offsetRoulette' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'offset_roulette.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def offset_roulette(fitness, shift=1000, rng=random):
    """{{doc1}}"""
    shifted = [f + shift for f in fitness]  # {{shift}}
    n = len(shifted)
    total = sum(shifted)
    probs = [g / total for g in shifted]
    parents = []
    for _ in range(n):
        r = rng.random()
        cumulative = 0.0
        for i, p in enumerate(probs):
            cumulative += p
            if r < round(cumulative, 9):  # {{round}}
                break
        parents.append(i)
    return parents


if __name__ == "__main__":
    # {{example}}
    f = [169, 576, 64, 361]
    print([round(g / sum(f), 3) for g in f])  # {{probs0}}
    print([round((g + 1000) / (sum(f) + 4000), 3) for g in f])  # {{probs1}}
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'offset_roulette.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 */
function offsetRoulette(fitness, shift = 1000, random = Math.random) {
  const shifted = fitness.map((f) => f + shift); // {{shift}}
  const n = shifted.length;
  const total = shifted.reduce((s, g) => s + g, 0);
  const probs = shifted.map((g) => g / total);
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const parents = [];
  for (let k = 0; k < n; k++) {
    const r = random();
    let cumulative = 0;
    let i = 0;
    for (; i < n; i++) {
      cumulative += probs[i];
      if (r < round9(cumulative)) break;
    }
    parents.push(Math.min(i, n - 1));
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { offsetRoulette };
  if (require.main === module) {
    // {{example}}
    const f = [169, 576, 64, 361];
    const total = f.reduce((s, g) => s + g, 0);
    console.log(f.map((g) => (g / total).toFixed(3))); // {{probs0}}
    console.log(f.map((g) => ((g + 1000) / (total + 4000)).toFixed(3))); // {{probs1}}
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Contraejemplo: selección por ruleta con la aptitud desplazada f + C.',
      ref: 'Goldberg (1989), cap. 3 (escalado de la aptitud). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) con la ruleta aplicada a f + shift. rng da los números aleatorios en [0, 1).',
      shift: 'el orden no cambia, pero las probabilidades se igualan',
      round: 'se redondea para que los empates se resuelvan como a mano',
      example: 'Ejemplo de Goldberg (x²): probabilidades sin desplazar y con C = 1000',
      probs0: '0,144 · 0,492 · 0,055 · 0,309',
      probs1: '0,226 · 0,305 · 0,206 · 0,263',
    },
    en: {
      title: 'Counterexample: roulette-wheel selection with shifted fitness f + C.',
      ref: 'Goldberg (1989), ch. 3 (fitness scaling). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) with the roulette wheel applied to f + shift. rng provides the random numbers in [0, 1).',
      shift: 'the order does not change, but the probabilities even out',
      round: 'rounded so that ties are resolved as by hand',
      example: 'Goldberg’s example (x²): probabilities without the shift and with C = 1000',
      probs0: '0.144 · 0.492 · 0.055 · 0.309',
      probs1: '0.226 · 0.305 · 0.206 · 0.263',
    },
  };

  const references = [
    C.ref('talbi', {
      es: 'Referencia básica del curso: la presión de selección de la ruleta y por qué depende de la escala de la aptitud.',
      en: 'Core course reference: the selection pressure of the roulette wheel and why it depends on the scale of fitness.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: cómo convertir un coste en aptitud al aplicar algoritmos genéticos a problemas de minimización.',
      en: 'Core course reference: how to turn a cost into fitness when applying genetic algorithms to minimisation problems.',
    }),
    C.ref('goldberg', {
      es: 'Capítulo 3: escalado de la aptitud y el problema de la pérdida de presión al final de la búsqueda.',
      en: 'Chapter 3: fitness scaling and the problem of losing pressure at the end of the search.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.1: problemas de la selección proporcional, entre ellos su sensibilidad a la traslación de la aptitud.',
      en: 'Section 5.2.1: problems of proportional selection, including its sensitivity to shifting fitness.',
    }),
    C.ref('baker1985', {
      es: 'Propone la selección por rango como remedio a los problemas de escala de la selección proporcional.',
      en: 'Proposes rank-based selection as a remedy for the scaling problems of proportional selection.',
    }),
  ];

  const api = Object.assign({
    id: 'offset', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).offset = api;
})(typeof self !== 'undefined' ? self : this);
