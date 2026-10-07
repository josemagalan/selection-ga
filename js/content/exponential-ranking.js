/*
 * Contenido docente del ranking exponencial (selección basada en el rango).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const variants = {
    roulette: {
      name: { es: 'Muestreo con ruleta', en: 'Roulette-wheel sampling' },
      desc: {
        es: 'Las probabilidades de cada rango se muestrean con N giros independientes de la ruleta.',
        en: 'The probability of each rank is sampled with N independent spins of the wheel.',
      },
    },
    sus: {
      name: { es: 'Muestreo con SUS', en: 'SUS sampling' },
      desc: {
        es: 'Las probabilidades de cada rango se muestrean con un solo giro de N punteros (SUS).',
        en: 'The probability of each rank is sampled with a single spin of N pointers (SUS).',
      },
    },
  };

  const explanation = {
    es: [
      'El ranking exponencial es una selección basada en el rango, como el ranking lineal: se ordena la población de peor a mejor y la probabilidad de cada individuo solo depende de su rango. La diferencia está en la forma: aquí crece de forma geométrica. Con la formulación de Blickle y Thiele (1996), el rango j (0 para el peor, N − 1 para el mejor) recibe un peso c^(N − 1 − j), con 0 < c < 1, y p_j = c^(N − 1 − j) / Σ_k c^k.',
      'Cada individuo tiene 1/c veces la probabilidad del anterior. Con c cerca de 1 todos se parecen y la selección es casi al azar; cuanto menor es c, mayor es la presión. El ranking lineal no puede dar al mejor más de 2 copias esperadas (s ≤ 2); el exponencial sí, así que permite presiones más altas, y además reparte las probabilidades de forma que los mejores se distinguen mucho entre sí.',
      'Blickle y Thiele (1996) comparan los mecanismos de selección por su intensidad (cuánto sube la aptitud media) y por la diversidad que pierden: para una misma intensidad, el truncamiento es el que más diversidad pierde y el ranking exponencial, de los que menos. Eiben y Smith (2015) usan otra forma, p ∝ 1 − e^(−j), con la misma idea.',
      'Coste: O(N log N) para ordenar la población y O(N) para los pesos, más el del muestreo (ruleta o SUS).',
    ],
    en: [
      'Exponential ranking is rank-based selection, like linear ranking: the population is sorted from worst to best and each individual’s probability depends only on its rank. The difference lies in the shape: here it grows geometrically. In Blickle and Thiele’s (1996) formulation, rank j (0 for the worst, N − 1 for the best) gets a weight c^(N − 1 − j), with 0 < c < 1, and p_j = c^(N − 1 − j) / Σ_k c^k.',
      'Each individual gets 1/c times the probability of the previous one. With c close to 1 everyone is similar and selection is almost random; the smaller c, the higher the pressure. Linear ranking cannot give the best more than 2 expected copies (s ≤ 2); exponential ranking can, so it allows higher pressures, and it also spreads the probabilities so that the best individuals are clearly told apart from each other.',
      'Blickle and Thiele (1996) compare selection mechanisms by their intensity (how much mean fitness rises) and by the diversity they lose: for the same intensity, truncation loses the most diversity and exponential ranking, among the least. Eiben and Smith (2015) use a different form, p ∝ 1 − e^(−j), with the same idea.',
      'Cost: O(N log N) to sort the population and O(N) for the weights, plus the cost of sampling (roulette wheel or SUS).',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Hay que elegir {n} padres, pero aquí la aptitud solo sirve para ordenarlos.',
      sort: 'Se ordena la población de peor a mejor. El rango va de 1, el peor ({worst}), a {n}, el mejor ({best}).',
      sortTies: 'Se ordena la población de peor a mejor. El rango va de 1, el peor ({worst}), a {n}, el mejor ({best}). A igual aptitud, recibe el rango menor el que aparece antes en la población.',
      prob: 'La probabilidad crece de forma geométrica con el rango: p ∝ c^(N − rango), con c = {base}. Cada individuo tiene 1/c = {inv} veces la probabilidad del anterior. El mejor ({best}) tiene p = {pBest} y el peor ({worst}), p = {pWorst}.',
      probSus: 'La probabilidad crece de forma geométrica con el rango: p ∝ c^(N − rango), con c = {base}. Con SUS se usan las copias esperadas e = N · p: el mejor ({best}) espera {eBest} y el peor ({worst}), {eWorst}.',
      cum: 'Las probabilidades acumuladas q, en el orden de los rangos, reparten [0, 1) en tramos consecutivos; el último, el del mejor ({best}), acaba en 1.',
      cumSus: 'Las copias esperadas acumuladas E, en el orden de los rangos, reparten [0, {n}) en tramos consecutivos; el último, el del mejor ({best}), acaba en {n}.',
      spin: 'Giro {k}: r = {r}. Cae en el tramo de {who} (rango {rank}), [{lo}, {hi}). {who} pasa a la población de padres.',
      pointers: 'Un único número aleatorio, r = {r}, coloca el primer puntero; los demás van separados exactamente 1, hasta {last}.',
      pick: 'Puntero {k}, en {ptr}: cae en el tramo de {who} (rango {rank}), [{elo}, {ehi}). {who} pasa a la población de padres.',
      done: C.doneText.es,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. We need to choose {n} parents, but here fitness is only used to sort them.',
      sort: 'The population is sorted from worst to best. The rank goes from 1, the worst ({worst}), to {n}, the best ({best}).',
      sortTies: 'The population is sorted from worst to best. The rank goes from 1, the worst ({worst}), to {n}, the best ({best}). With equal fitness, the one that appears first in the population gets the lower rank.',
      prob: 'The probability grows geometrically with the rank: p ∝ c^(N − rank), with c = {base}. Each individual gets 1/c = {inv} times the probability of the previous one. The best ({best}) has p = {pBest} and the worst ({worst}), p = {pWorst}.',
      probSus: 'The probability grows geometrically with the rank: p ∝ c^(N − rank), with c = {base}. With SUS the expected copies e = N · p are used: the best ({best}) expects {eBest} and the worst ({worst}), {eWorst}.',
      cum: 'The cumulative probabilities q, in rank order, divide [0, 1) into consecutive stretches; the last one, the best’s ({best}), ends at 1.',
      cumSus: 'The cumulative expected copies E, in rank order, divide [0, {n}) into consecutive stretches; the last one, the best’s ({best}), ends at {n}.',
      spin: 'Spin {k}: r = {r}. It falls in {who}’s stretch (rank {rank}), [{lo}, {hi}). {who} joins the parents.',
      pointers: 'A single random number, r = {r}, places the first pointer; the others are exactly 1 apart, up to {last}.',
      pick: 'Pointer {k}, at {ptr}: it falls in {who}’s stretch (rank {rank}), [{elo}, {ehi}). {who} joins the parents.',
      done: C.doneText.en,
    },
  };

  const head = {
    es: [
      { id: 'sig', indent: 0, text: 'RANKING_EXPONENCIAL(f, c)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'sort', indent: 1, text: 'ordenar los individuos de peor a mejor aptitud' },
      { id: 'prob', indent: 1, text: 'para j ← 0 hasta N − 1: w_j ← c^(N − 1 − j); p_j ← w_j / (w_0 + … + w_(N−1))' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'EXPONENTIAL_RANKING(f, c)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'sort', indent: 1, text: 'sort the individuals from worst to best fitness' },
      { id: 'prob', indent: 1, text: 'for j ← 0 to N − 1: w_j ← c^(N − 1 − j); p_j ← w_j / (w_0 + … + w_(N−1))' },
    ],
  };
  const tails = {
    roulette: {
      es: [
        { id: 'cum', indent: 1, text: 'para j ← 0 hasta N − 1: q_j ← p_0 + … + p_j' },
        { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
        { id: 'spin', indent: 2, text: 'r ← número aleatorio en [0, 1)' },
        { id: 'pick', indent: 2, text: 'padres_k ← individuo del primer rango j con r < q_j' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'cum', indent: 1, text: 'for j ← 0 to N − 1: q_j ← p_0 + … + p_j' },
        { id: 'loop', indent: 1, text: 'for k ← 1 to N' },
        { id: 'spin', indent: 2, text: 'r ← random number in [0, 1)' },
        { id: 'pick', indent: 2, text: 'parents_k ← individual of the first rank j with r < q_j' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
    sus: {
      es: [
        { id: 'cum', indent: 1, text: 'para j ← 0 hasta N − 1: E_j ← N · (p_0 + … + p_j)' },
        { id: 'draw', indent: 1, text: 'r ← número aleatorio en [0, 1); j ← 0' },
        { id: 'loop', indent: 1, text: 'para k ← 0 hasta N − 1' },
        { id: 'ptr', indent: 2, text: 'mientras r + k ≥ E_j: j ← j + 1' },
        { id: 'pick', indent: 2, text: 'padres_(k+1) ← individuo de rango j' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'cum', indent: 1, text: 'for j ← 0 to N − 1: E_j ← N · (p_0 + … + p_j)' },
        { id: 'draw', indent: 1, text: 'r ← random number in [0, 1); j ← 0' },
        { id: 'loop', indent: 1, text: 'for k ← 0 to N − 1' },
        { id: 'ptr', indent: 2, text: 'while r + k ≥ E_j: j ← j + 1' },
        { id: 'pick', indent: 2, text: 'parents_(k+1) ← individual with rank j' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
  };
  const pseudocode = (lang, variant) => {
    const l = head[lang] ? lang : 'es';
    return head[l].concat(tails[variant === 'sus' ? 'sus' : 'roulette'][l]);
  };
  const keywords = { es: ['para', 'hasta', 'mientras', 'ordenar', 'devolver'], en: ['for', 'to', 'while', 'sort', 'return'] };
  const stepLines = {
    intro: ['sig', 'n'], sort: ['sort'], prob: ['prob'], cum: ['cum'], spin: ['loop', 'spin', 'pick'],
    pointers: ['draw'], pick: ['loop', 'ptr', 'pick'], done: ['return'],
  };
  const fnName = { python: 'exponential_ranking', javascript: 'exponentialRanking' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'exponential_ranking.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def exponential_ranking(fitness, c=0.8, rng=random, sampling="roulette"):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    order = sorted(range(n), key=lambda i: fitness[i])  # {{sort}}
    weights = [c ** (n - 1 - j) for j in range(n)]  # {{weights}}
    total = sum(weights)
    probs = [w / total for w in weights]
    parents = []
    # {{round}}
    if sampling == "roulette":
        for _ in range(n):
            r = rng.random()
            cumulative = 0.0
            for j in range(n):
                cumulative += probs[j]
                if r < round(cumulative, 9):
                    break
            parents.append(order[j])
    else:  # {{sus}}
        r = rng.random()
        j = 0
        cumulative = n * probs[0]
        for k in range(n):
            while j < n - 1 and round(r + k, 9) >= round(cumulative, 9):
                j += 1
                cumulative += n * probs[j]
            parents.append(order[j])
    return parents


class Fixed:
    """{{fixed}}"""

    def __init__(self, values):
        self.values = iter(values)

    def random(self):
        return next(self.values)


if __name__ == "__main__":
    # {{example}}
    f = [169, 576, 64, 361]
    print(exponential_ranking(f, 0.5, Fixed([0.01, 0.06, 0.97, 0.69])))  # [2, 2, 1, 1]: C C B B
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'exponential_ranking.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function exponentialRanking(fitness, c = 0.8, random = Math.random, sampling = 'roulette') {
  const n = fitness.length;
  const order = [...fitness.keys()].sort((a, b) => fitness[a] - fitness[b]); // {{sort}}
  const weights = order.map((_, j) => Math.pow(c, n - 1 - j)); // {{weights}}
  const total = weights.reduce((s, w) => s + w, 0);
  const probs = weights.map((w) => w / total);
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const parents = [];
  if (sampling === 'roulette') {
    for (let k = 0; k < n; k++) {
      const r = random();
      let cumulative = 0;
      let j = 0;
      for (; j < n; j++) {
        cumulative += probs[j];
        if (r < round9(cumulative)) break;
      }
      parents.push(order[Math.min(j, n - 1)]);
    }
  } else { // {{sus}}
    const r = random();
    let j = 0;
    let cumulative = n * probs[0];
    for (let k = 0; k < n; k++) {
      while (j < n - 1 && round9(r + k) >= round9(cumulative)) {
        j++;
        cumulative += n * probs[j];
      }
      parents.push(order[j]);
    }
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { exponentialRanking };
  if (require.main === module) {
    // {{example}}
    const draws = [0.01, 0.06, 0.97, 0.69];
    let k = 0;
    console.log(exponentialRanking([169, 576, 64, 361], 0.5, () => draws[k++])); // [2, 2, 1, 1]: C C B B
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Ranking exponencial (selección basada en el rango).',
      ref: 'Blickle y Thiele (1996). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) con una probabilidad que crece de forma geométrica con el rango; 0 < c < 1 (menor c, más presión).',
      doc2: 'sampling: "roulette" (N giros) o "sus" (un giro con N punteros). rng da los números aleatorios en [0, 1).',
      sort: 'de peor a mejor; a igual aptitud, por orden de aparición',
      weights: 'rango j (0 = peor): el mejor pesa 1 y cada uno, c veces el siguiente',
      round: 'se redondea para que 0,1 + 0,2 valga 0,3 y los empates se resuelvan como a mano',
      sus: 'SUS: un solo número aleatorio y N punteros separados 1 sobre las copias esperadas N · p',
      fixed: 'Fuente de números aleatorios fijos, para repetir un ejemplo de la herramienta.',
      example: 'Ejemplo de Goldberg (x²) con c = 0,5 y r = 0,01, 0,06, 0,97 y 0,69',
    },
    en: {
      title: 'Exponential ranking (rank-based selection).',
      ref: 'Blickle and Thiele (1996). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) with a probability that grows geometrically with the rank; 0 < c < 1 (smaller c, more pressure).',
      doc2: 'sampling: "roulette" (N spins) or "sus" (one spin with N pointers). rng provides the random numbers in [0, 1).',
      sort: 'from worst to best; with equal fitness, in order of appearance',
      weights: 'rank j (0 = worst): the best weighs 1 and each one, c times the next',
      round: 'rounded so that 0.1 + 0.2 equals 0.3 and ties are resolved as by hand',
      sus: 'SUS: a single random number and N pointers 1 apart over the expected copies N · p',
      fixed: 'Source of fixed random numbers, to repeat an example from the tool.',
      example: 'Goldberg’s example (x²) with c = 0.5 and r = 0.01, 0.06, 0.97 and 0.69',
    },
  };

  const references = [
    C.ref('talbi', {
      es: 'Referencia básica del curso: selección basada en el rango y su presión de selección.',
      en: 'Core course reference: rank-based selection and its selection pressure.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('blickle', {
      es: 'La formulación con base c que se usa aquí y su comparación con los demás mecanismos por intensidad de selección y pérdida de diversidad.',
      en: 'The formulation with base c used here and its comparison with the other mechanisms by selection intensity and loss of diversity.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.2: ranking lineal y exponencial (con la forma 1 − e^(−j)).',
      en: 'Section 5.2.2: linear and exponential ranking (with the form 1 − e^(−j)).',
    }),
    C.ref('baker1985', {
      es: 'Origen de la selección basada en el rango.',
      en: 'Origin of rank-based selection.',
    }),
  ];

  const api = Object.assign({
    id: 'exponential-ranking', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {})['exponential-ranking'] = api;
})(typeof self !== 'undefined' ? self : this);
