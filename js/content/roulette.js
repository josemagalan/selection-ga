/*
 * Contenido docente de la selección por ruleta (proporcional a la aptitud).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'La selección por ruleta da a cada individuo una probabilidad de ser padre proporcional a su aptitud: p_i = f_i / Σf. Es la selección del algoritmo genético original de Holland y la que popularizó Goldberg (1989) con la imagen de una ruleta con un sector por individuo, de tamaño proporcional a su aptitud, que se gira N veces: cada giro elige un padre. Un individuo puede salir varias veces y otro, ninguna.',
      'Para girarla en un ordenador se calculan las probabilidades acumuladas q_i = p_1 + … + p_i, que reparten el intervalo [0, 1) en tramos consecutivos, uno por individuo: la ruleta desenrollada. Cada giro saca un número aleatorio r en [0, 1) y elige al primer individuo con r < q_i, es decir, aquel en cuyo tramo cae r. Por eso las aptitudes no pueden ser negativas y su suma no puede ser 0.',
      'Cada individuo espera e_i = N · p_i copias, pero la ruleta solo acierta en promedio. Como los giros son independientes, el número de copias varía mucho de una ejecución a otra: Baker (1987) llama a esto dispersión. Con poblaciones pequeñas, un buen individuo puede quedarse sin copias por mala suerte y uno mediocre, llevarse varias. El muestreo estocástico universal (SUS) elimina ese ruido con un solo giro.',
      'Además, la presión de selección depende de la escala de la aptitud. Si al principio un individuo es mucho mejor que el resto, acapara la ruleta y la población converge antes de tiempo hacia él. Al final, cuando todas las aptitudes se parecen, todos tienen casi la misma probabilidad y la selección deja de empujar. Por eso suele usarse con escalado de la aptitud, o se sustituye por la selección basada en el rango o por torneo (Talbi, 2009; Eiben y Smith, 2015).',
      'Coste: O(N) para calcular las probabilidades y, con búsqueda binaria en las acumuladas, O(log N) por giro; con la búsqueda lineal de la animación, O(N) por giro y O(N²) en total.',
    ],
    en: [
      'Roulette-wheel selection gives each individual a probability of becoming a parent proportional to its fitness: p_i = f_i / Σf. It is the selection of Holland’s original genetic algorithm, popularised by Goldberg (1989) with the image of a wheel with one sector per individual, sized in proportion to its fitness, that is spun N times: each spin chooses one parent. An individual may come out several times and another, never.',
      'To spin it on a computer, the cumulative probabilities q_i = p_1 + … + p_i are computed. They divide the interval [0, 1) into consecutive stretches, one per individual: the unrolled wheel. Each spin draws a random number r in [0, 1) and chooses the first individual with r < q_i, that is, the one whose stretch r falls in. That is why fitness values cannot be negative and cannot add up to 0.',
      'Each individual expects e_i = N · p_i copies, but the wheel is only right on average. Since the spins are independent, the number of copies varies a lot from one run to another: Baker (1987) calls this spread. In small populations, a good individual may get no copies through bad luck and a mediocre one, several. Stochastic universal sampling (SUS) removes that noise with a single spin.',
      'Moreover, selection pressure depends on the scale of fitness. If early on one individual is much better than the rest, it takes over the wheel and the population converges prematurely towards it. Later, when all fitness values are similar, everyone has almost the same probability and selection stops pushing. That is why it is usually combined with fitness scaling, or replaced by rank-based or tournament selection (Talbi, 2009; Eiben and Smith, 2015).',
      'Cost: O(N) to compute the probabilities and, with binary search over the cumulative values, O(log N) per spin; with the linear search of the animation, O(N) per spin and O(N²) in total.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud: cuanto mayor, mejor. Hay que elegir {n} padres.',
      sum: 'Se suman las aptitudes: Σf = {expr} = {total}.',
      prob: 'Cada individuo recibe un sector de la ruleta proporcional a su aptitud: p_i = f_i / Σf. Por ejemplo, el mejor, {who}, tiene p = {f} / {total} = {p}.',
      cum: 'Las probabilidades acumuladas q reparten el intervalo [0, 1) en tramos consecutivos, uno por individuo; el último, el de {last}, acaba en 1. Es la ruleta desenrollada.',
      spin: 'Giro {k}: r = {r}. Cae en el tramo de {who}, [{lo}, {hi}): es el primero con r < q. {who} pasa a la población de padres.',
      done: C.doneText.es,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness: the higher, the better. We need to choose {n} parents.',
      sum: 'The fitness values are added up: Σf = {expr} = {total}.',
      prob: 'Each individual gets a sector of the wheel proportional to its fitness: p_i = f_i / Σf. For example, the best one, {who}, has p = {f} / {total} = {p}.',
      cum: 'The cumulative probabilities q divide the interval [0, 1) into consecutive stretches, one per individual; the last one, {last}’s, ends at 1. It is the unrolled wheel.',
      spin: 'Spin {k}: r = {r}. It falls in {who}’s stretch, [{lo}, {hi}): the first one with r < q. {who} joins the parents.',
      done: C.doneText.en,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_POR_RULETA(f)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'sum', indent: 1, text: 'S ← f_1 + f_2 + … + f_N' },
      { id: 'prob', indent: 1, text: 'para i ← 1 hasta N: p_i ← f_i / S' },
      { id: 'cum', indent: 1, text: 'para i ← 1 hasta N: q_i ← p_1 + … + p_i' },
      { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
      { id: 'spin', indent: 2, text: 'r ← número aleatorio en [0, 1)' },
      { id: 'pick', indent: 2, text: 'i ← primer índice con r < q_i' },
      { id: 'add', indent: 2, text: 'padres_k ← individuo i' },
      { id: 'return', indent: 1, text: 'devolver padres' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'ROULETTE_WHEEL_SELECTION(f)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'sum', indent: 1, text: 'S ← f_1 + f_2 + … + f_N' },
      { id: 'prob', indent: 1, text: 'for i ← 1 to N: p_i ← f_i / S' },
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
    intro: ['sig', 'n'], sum: ['sum'], prob: ['prob'], cum: ['cum'], spin: ['loop', 'spin', 'pick', 'add'], done: ['return'],
  };
  const fnName = { python: 'roulette', javascript: 'roulette' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'roulette.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def roulette(fitness, rng=random):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    total = sum(fitness)
    probs = [f / total for f in fitness]  # {{probs}}
    parents = []
    for _ in range(n):
        r = rng.random()  # {{spin}}
        cumulative = 0.0
        for i, p in enumerate(probs):
            cumulative += p
            # {{round}}
            if r < round(cumulative, 9):
                break
        parents.append(i)  # {{add}}
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
    print(roulette(f, Fixed([0.01, 0.06, 0.97, 0.69])))  # [0, 0, 3, 2]: A A D C
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'roulette.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function roulette(fitness, random = Math.random) {
  const n = fitness.length;
  const total = fitness.reduce((s, f) => s + f, 0);
  const probs = fitness.map((f) => f / total); // {{probs}}
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const parents = [];
  for (let k = 0; k < n; k++) {
    const r = random(); // {{spin}}
    let cumulative = 0;
    let i = 0;
    for (; i < n; i++) {
      cumulative += probs[i];
      if (r < round9(cumulative)) break;
    }
    parents.push(Math.min(i, n - 1)); // {{add}}
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { roulette };
  if (require.main === module) {
    // {{example}}
    const draws = [0.01, 0.06, 0.97, 0.69];
    let k = 0;
    console.log(roulette([169, 576, 64, 361], () => draws[k++])); // [0, 0, 3, 2]: A A D C
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección por ruleta (proporcional a la aptitud).',
      ref: 'Holland (1975); Goldberg (1989). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) con N giros de una ruleta cuyos sectores son proporcionales a la aptitud.',
      doc2: 'Las aptitudes no pueden ser negativas ni sumar 0. rng da los números aleatorios en [0, 1).',
      probs: 'probabilidad de cada individuo: p_i = f_i / S',
      spin: 'un giro de la ruleta',
      round: 'se redondea para que 0,1 + 0,2 valga 0,3 y los empates se resuelvan como a mano',
      add: 'el primero con r < q_i (el último, si ninguno)',
      fixed: 'Fuente de números aleatorios fijos, para repetir un ejemplo de la herramienta.',
      example: 'Ejemplo de Goldberg (x²) con los números r = 0,01, 0,06, 0,97 y 0,69',
    },
    en: {
      title: 'Roulette-wheel selection (fitness-proportionate).',
      ref: 'Holland (1975); Goldberg (1989). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) with N spins of a wheel whose sectors are proportional to fitness.',
      doc2: 'Fitness values cannot be negative or add up to 0. rng provides the random numbers in [0, 1).',
      probs: 'probability of each individual: p_i = f_i / S',
      spin: 'one spin of the wheel',
      round: 'rounded so that 0.1 + 0.2 equals 0.3 and ties are resolved as by hand',
      add: 'the first one with r < q_i (the last one, if none)',
      fixed: 'Source of fixed random numbers, to repeat an example from the tool.',
      example: 'Goldberg’s example (x²) with the numbers r = 0.01, 0.06, 0.97 and 0.69',
    },
  };

  const references = [
    C.ref('holland', {
      es: 'Origen de la selección proporcional a la aptitud en el algoritmo genético canónico.',
      en: 'Origin of fitness-proportionate selection in the canonical genetic algorithm.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: métodos de selección de los algoritmos evolutivos (ruleta, SUS, torneo y rango) y su presión de selección.',
      en: 'Core course reference: selection methods of evolutionary algorithms (roulette wheel, SUS, tournament and rank) and their selection pressure.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('goldberg', {
      es: 'Capítulo 1: la ruleta explicada paso a paso con el ejemplo de f(x) = x² que se puede cargar en esta herramienta.',
      en: 'Chapter 1: the roulette wheel explained step by step with the f(x) = x² example that can be loaded in this tool.',
    }),
    C.ref('baker1987', {
      es: 'Define el sesgo y la dispersión de un algoritmo de muestreo y muestra por qué la ruleta tiene dispersión alta; propone SUS.',
      en: 'Defines the bias and spread of a sampling algorithm and shows why the roulette wheel has high spread; proposes SUS.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.1: selección proporcional a la aptitud, sus problemas (convergencia prematura, pérdida de presión) y el escalado.',
      en: 'Section 5.2.1: fitness-proportionate selection, its problems (premature convergence, loss of pressure) and scaling.',
    }),
    C.ref('goldbergDeb', {
      es: 'Compara la presión de selección de la ruleta, el rango y el torneo mediante el tiempo de toma de control.',
      en: 'Compares the selection pressure of the roulette wheel, ranking and tournament through takeover time.',
    }),
  ];

  const api = Object.assign({
    id: 'roulette', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).roulette = api;
})(typeof self !== 'undefined' ? self : this);
