/*
 * Contenido docente del ranking lineal (selección basada en el rango).
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
        es: 'Las probabilidades de cada rango se muestrean con un solo giro de N punteros (SUS), como hacía Baker.',
        en: 'The probability of each rank is sampled with a single spin of N pointers (SUS), as Baker did.',
      },
    },
  };

  const explanation = {
    es: [
      'En la selección basada en el rango solo importa el orden de los individuos, no cuánto mejor es uno que otro. Se ordena la población de peor a mejor, cada individuo recibe un rango (aquí, de 1 para el peor a N para el mejor) y su probabilidad de ser padre depende solo de ese rango. Baker (1985) la propuso para evitar los problemas de escala de la ruleta y Whitley (1989) defendió que es la mejor forma de repartir las copias.',
      'En el ranking lineal la probabilidad crece en línea recta con el rango. Con la notación de Eiben y Smith (2015), si j = rango − 1 va de 0 (el peor) a N − 1 (el mejor), p(j) = (2 − s)/N + 2 · j · (s − 1) / (N · (N − 1)). El parámetro s, entre 1 y 2, es la presión de selección: el mejor espera s copias y el peor, 2 − s. Con s = 1 todos tienen la misma probabilidad; con s = 2 el peor no tiene ninguna.',
      'Así la presión ya no depende de la escala de la aptitud. Da igual que el mejor sea un 1 % o un 1000 % mejor que el segundo: recibe lo mismo. Al principio de la búsqueda frena a un superindividuo que en la ruleta acapararía la población; al final, cuando las aptitudes se parecen, sigue empujando hacia los mejores. El precio es ordenar la población, O(N log N), y que se pierde la información de cuánto mejor es cada uno.',
      'Las probabilidades se muestrean después como en la ruleta (N giros) o, mejor, con SUS (un giro, N punteros). Con empates de aptitud, aquí recibe el rango menor el que aparece antes en la población; otras implementaciones les dan el rango medio.',
    ],
    en: [
      'In rank-based selection only the order of the individuals matters, not how much better one is than another. The population is sorted from worst to best, each individual gets a rank (here, from 1 for the worst to N for the best) and its probability of becoming a parent depends only on that rank. Baker (1985) proposed it to avoid the scaling problems of the roulette wheel, and Whitley (1989) argued that it is the best way to allocate copies.',
      'In linear ranking the probability grows linearly with the rank. In Eiben and Smith’s (2015) notation, if j = rank − 1 goes from 0 (the worst) to N − 1 (the best), p(j) = (2 − s)/N + 2 · j · (s − 1) / (N · (N − 1)). The parameter s, between 1 and 2, is the selection pressure: the best expects s copies and the worst, 2 − s. With s = 1 everyone has the same probability; with s = 2 the worst has none.',
      'So the pressure no longer depends on the scale of fitness. Whether the best is 1% or 1000% better than the second, it gets the same. Early in the search it holds back a super-individual that would take over the population with the roulette wheel; later, when fitness values are similar, it keeps pushing towards the best. The price is sorting the population, O(N log N), and losing the information about how much better each one is.',
      'The probabilities are then sampled as with the roulette wheel (N spins) or, better, with SUS (one spin, N pointers). With fitness ties, here the individual that appears first in the population gets the lower rank; other implementations give them the average rank.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Hay que elegir {n} padres, pero aquí la aptitud solo sirve para ordenarlos.',
      sort: 'Se ordena la población de peor a mejor. El rango va de 1, el peor ({worst}), a {n}, el mejor ({best}).',
      sortTies: 'Se ordena la población de peor a mejor. El rango va de 1, el peor ({worst}), a {n}, el mejor ({best}). A igual aptitud, recibe el rango menor el que aparece antes en la población.',
      prob: 'La probabilidad solo depende del rango: p = (2 − s)/N + 2 · (rango − 1) · (s − 1) / (N · (N − 1)). Con s = {s}, el mejor ({best}) tiene p = {pBest} y el peor ({worst}), p = {pWorst}: esperan {eBest} y {eWorst} copias.',
      probSus: 'La probabilidad solo depende del rango: p = (2 − s)/N + 2 · (rango − 1) · (s − 1) / (N · (N − 1)). Con SUS se usan las copias esperadas e = N · p: con s = {s}, el mejor ({best}) espera {eBest} y el peor ({worst}), {eWorst}.',
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
      prob: 'The probability depends only on the rank: p = (2 − s)/N + 2 · (rank − 1) · (s − 1) / (N · (N − 1)). With s = {s}, the best ({best}) has p = {pBest} and the worst ({worst}), p = {pWorst}: they expect {eBest} and {eWorst} copies.',
      probSus: 'The probability depends only on the rank: p = (2 − s)/N + 2 · (rank − 1) · (s − 1) / (N · (N − 1)). With SUS the expected copies e = N · p are used: with s = {s}, the best ({best}) expects {eBest} and the worst ({worst}), {eWorst}.',
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
      { id: 'sig', indent: 0, text: 'RANKING_LINEAL(f, s)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'sort', indent: 1, text: 'ordenar los individuos de peor a mejor aptitud' },
      { id: 'prob', indent: 1, text: 'para j ← 0 hasta N − 1: p_j ← (2 − s)/N + 2·j·(s − 1) / (N·(N − 1))' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'LINEAR_RANKING(f, s)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'sort', indent: 1, text: 'sort the individuals from worst to best fitness' },
      { id: 'prob', indent: 1, text: 'for j ← 0 to N − 1: p_j ← (2 − s)/N + 2·j·(s − 1) / (N·(N − 1))' },
    ],
  };
  const tails = {
    roulette: {
      es: [
        { id: 'cum', indent: 1, text: 'para j ← 0 hasta N − 1: q_j ← p_0 + … + p_j' },
        { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
        { id: 'spin', indent: 2, text: 'r ← número aleatorio en [0, 1)' },
        { id: 'pick', indent: 2, text: 'j ← primer rango con r < q_j' },
        { id: 'add', indent: 2, text: 'padres_k ← individuo de rango j' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'cum', indent: 1, text: 'for j ← 0 to N − 1: q_j ← p_0 + … + p_j' },
        { id: 'loop', indent: 1, text: 'for k ← 1 to N' },
        { id: 'spin', indent: 2, text: 'r ← random number in [0, 1)' },
        { id: 'pick', indent: 2, text: 'j ← first rank with r < q_j' },
        { id: 'add', indent: 2, text: 'parents_k ← individual with rank j' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
    sus: {
      es: [
        { id: 'cum', indent: 1, text: 'para j ← 0 hasta N − 1: E_j ← N · (p_0 + … + p_j)' },
        { id: 'draw', indent: 1, text: 'r ← número aleatorio en [0, 1); j ← 0' },
        { id: 'loop', indent: 1, text: 'para k ← 0 hasta N − 1' },
        { id: 'ptr', indent: 2, text: 'mientras r + k ≥ E_j: j ← j + 1' },
        { id: 'add', indent: 2, text: 'padres_(k+1) ← individuo de rango j' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'cum', indent: 1, text: 'for j ← 0 to N − 1: E_j ← N · (p_0 + … + p_j)' },
        { id: 'draw', indent: 1, text: 'r ← random number in [0, 1); j ← 0' },
        { id: 'loop', indent: 1, text: 'for k ← 0 to N − 1' },
        { id: 'ptr', indent: 2, text: 'while r + k ≥ E_j: j ← j + 1' },
        { id: 'add', indent: 2, text: 'parents_(k+1) ← individual with rank j' },
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
    intro: ['sig', 'n'], sort: ['sort'], prob: ['prob'], cum: ['cum'], spin: ['loop', 'spin', 'pick', 'add'],
    pointers: ['draw'], pick: ['loop', 'ptr', 'add'], done: ['return'],
  };
  const fnName = { python: 'linear_ranking', javascript: 'linearRanking' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'linear_ranking.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def linear_ranking(fitness, s=1.5, rng=random, sampling="roulette"):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    order = sorted(range(n), key=lambda i: fitness[i])  # {{sort}}
    probs = [(2 - s) / n + 2 * j * (s - 1) / (n * (n - 1)) for j in range(n)]  # {{probs}}
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
    print(linear_ranking(f, 1.5, Fixed([0.01, 0.06, 0.97, 0.69])))  # [2, 2, 1, 1]: C C B B
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'linear_ranking.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function linearRanking(fitness, s = 1.5, random = Math.random, sampling = 'roulette') {
  const n = fitness.length;
  const order = [...fitness.keys()].sort((a, b) => fitness[a] - fitness[b]); // {{sort}}
  const probs = order.map((_, j) => (2 - s) / n + (2 * j * (s - 1)) / (n * (n - 1))); // {{probs}}
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
  module.exports = { linearRanking };
  if (require.main === module) {
    // {{example}}
    const draws = [0.01, 0.06, 0.97, 0.69];
    let k = 0;
    console.log(linearRanking([169, 576, 64, 361], 1.5, () => draws[k++])); // [2, 2, 1, 1]: C C B B
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Ranking lineal (selección basada en el rango).',
      ref: 'Baker (1985); notación de Eiben y Smith (2015). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) con una probabilidad que solo depende del rango; s, entre 1 y 2, es la presión de selección.',
      doc2: 'sampling: "roulette" (N giros) o "sus" (un giro con N punteros). rng da los números aleatorios en [0, 1).',
      sort: 'de peor a mejor; a igual aptitud, por orden de aparición',
      probs: 'probabilidad del rango j (0 = peor): el mejor espera s copias y el peor, 2 − s',
      round: 'se redondea para que 0,1 + 0,2 valga 0,3 y los empates se resuelvan como a mano',
      sus: 'SUS: un solo número aleatorio y N punteros separados 1 sobre las copias esperadas N · p',
      fixed: 'Fuente de números aleatorios fijos, para repetir un ejemplo de la herramienta.',
      example: 'Ejemplo de Goldberg (x²) con s = 1,5 y r = 0,01, 0,06, 0,97 y 0,69',
    },
    en: {
      title: 'Linear ranking (rank-based selection).',
      ref: 'Baker (1985); notation of Eiben and Smith (2015). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) with a probability that depends only on the rank; s, between 1 and 2, is the selection pressure.',
      doc2: 'sampling: "roulette" (N spins) or "sus" (one spin with N pointers). rng provides the random numbers in [0, 1).',
      sort: 'from worst to best; with equal fitness, in order of appearance',
      probs: 'probability of rank j (0 = worst): the best expects s copies and the worst, 2 − s',
      round: 'rounded so that 0.1 + 0.2 equals 0.3 and ties are resolved as by hand',
      sus: 'SUS: a single random number and N pointers 1 apart over the expected copies N · p',
      fixed: 'Source of fixed random numbers, to repeat an example from the tool.',
      example: 'Goldberg’s example (x²) with s = 1.5 and r = 0.01, 0.06, 0.97 and 0.69',
    },
  };

  const references = [
    C.ref('baker1985', {
      es: 'Fuente original: propone asignar las copias según el rango y no según la aptitud, para controlar la presión de selección.',
      en: 'Original source: proposes allocating copies according to rank rather than fitness, to control selection pressure.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: selección basada en el rango y su presión de selección.',
      en: 'Core course reference: rank-based selection and its selection pressure.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.2: ranking lineal y exponencial; la fórmula y la notación con s que se usan aquí.',
      en: 'Section 5.2.2: linear and exponential ranking; the formula and the notation with s used here.',
    }),
    C.ref('whitley', {
      es: 'Defiende el reparto de copias por rango frente a la selección proporcional (algoritmo GENITOR).',
      en: 'Argues for rank-based allocation of copies over proportional selection (the GENITOR algorithm).',
    }),
    C.ref('blickle', {
      es: 'Compara ruleta, ranking lineal y exponencial, torneo y truncamiento con la intensidad de selección y la pérdida de diversidad.',
      en: 'Compares roulette wheel, linear and exponential ranking, tournament and truncation through selection intensity and loss of diversity.',
    }),
  ];

  const api = Object.assign({
    id: 'linear-ranking', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {})['linear-ranking'] = api;
})(typeof self !== 'undefined' ? self : this);
