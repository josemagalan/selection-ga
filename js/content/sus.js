/*
 * Contenido docente del muestreo estocástico universal (SUS).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'El muestreo estocástico universal (stochastic universal sampling, SUS) es la ruleta de Baker (1987), que se gira una sola vez. Cada individuo ocupa en ella un tramo igual a sus copias esperadas, e_i = N · f_i / Σf, de modo que la ruleta mide N. Sobre ella se colocan N punteros separados exactamente 1: un único número aleatorio r en [0, 1) fija el primero y los demás caen en r + 1, r + 2, …, r + N − 1. Cada puntero elige al individuo en cuyo tramo cae.',
      'Como los punteros están separados 1, en un tramo de longitud e_i caben ⌊e_i⌋ o ⌈e_i⌉ punteros: cada individuo recibe las copias que espera, redondeadas hacia abajo o hacia arriba. Baker lo resume en dos propiedades. Sesgo nulo: la probabilidad de cada individuo sigue siendo proporcional a su aptitud, como en la ruleta. Dispersión mínima: las copias obtenidas nunca se alejan de las esperadas en una o más.',
      'Es la forma recomendada de muestrear cuando se conocen las probabilidades de todos los individuos (Eiben y Smith, 2015). No cambia la presión de selección de la ruleta ni sus problemas de escala: solo elimina el ruido del muestreo. Por eso también se usa para muestrear las probabilidades de la selección basada en el rango.',
      'El orden de los individuos en la ruleta no cambia cuántas copias espera cada uno, pero sí qué individuos salen juntos en una misma ejecución; algunas implementaciones barajan antes la población. Aquí se usa el orden de la población para que se pueda seguir a mano.',
      'Coste: O(N) en total, porque las acumuladas y los punteros se recorren una sola vez en paralelo; la ruleta necesita O(N log N) con búsqueda binaria.',
    ],
    en: [
      'Stochastic universal sampling (SUS) is Baker’s (1987) roulette wheel, spun only once. Each individual takes up a stretch of it equal to its expected copies, e_i = N · f_i / Σf, so the wheel measures N. N pointers exactly 1 apart are placed on it: a single random number r in [0, 1) sets the first one and the others fall at r + 1, r + 2, …, r + N − 1. Each pointer chooses the individual whose stretch it falls in.',
      'Because the pointers are 1 apart, a stretch of length e_i holds ⌊e_i⌋ or ⌈e_i⌉ pointers: each individual gets the copies it expects, rounded down or up. Baker sums this up in two properties. Zero bias: each individual’s probability is still proportional to its fitness, as with the roulette wheel. Minimum spread: the copies obtained never differ from the expected ones by one or more.',
      'It is the recommended way of sampling when the probabilities of all individuals are known (Eiben and Smith, 2015). It does not change the selection pressure of the roulette wheel or its scaling problems: it only removes the sampling noise. That is why it is also used to sample the probabilities of rank-based selection.',
      'The order of the individuals on the wheel does not change how many copies each one expects, but it does change which individuals come out together in a given run; some implementations shuffle the population first. Here the population order is used so that it can be followed by hand.',
      'Cost: O(N) in total, because the cumulative values and the pointers are traversed once, side by side; the roulette wheel needs O(N log N) with binary search.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud: cuanto mayor, mejor. Hay que elegir {n} padres.',
      sum: 'Se suman las aptitudes: Σf = {expr} = {total}.',
      expected: 'Cada individuo espera e_i = N · f_i / Σf copias; entre todos, {n}. Por ejemplo, el mejor, {who}, espera {n} · {f} / {total} = {e}. Son los tramos de la ruleta, que ahora mide {n}.',
      cum: 'Las copias esperadas acumuladas E reparten el intervalo [0, {n}) en tramos consecutivos, uno por individuo; el último, el de {last}, acaba en {n}.',
      pointers: 'Un único número aleatorio, r = {r}, coloca el primer puntero; los demás van separados exactamente 1, hasta {last}. Es un solo giro de una ruleta con {n} punteros.',
      pick: 'Puntero {k}, en {ptr}: cae en el tramo de {who}, [{elo}, {ehi}). {who} pasa a la población de padres.',
      done: `${C.doneText.es} Con SUS, cada individuo recibe sus copias esperadas redondeadas hacia abajo o hacia arriba.`,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness: the higher, the better. We need to choose {n} parents.',
      sum: 'The fitness values are added up: Σf = {expr} = {total}.',
      expected: 'Each individual expects e_i = N · f_i / Σf copies; {n} in total. For example, the best one, {who}, expects {n} · {f} / {total} = {e}. These are the stretches of the wheel, which now measures {n}.',
      cum: 'The cumulative expected copies E divide the interval [0, {n}) into consecutive stretches, one per individual; the last one, {last}’s, ends at {n}.',
      pointers: 'A single random number, r = {r}, places the first pointer; the others are exactly 1 apart, up to {last}. It is a single spin of a wheel with {n} pointers.',
      pick: 'Pointer {k}, at {ptr}: it falls in {who}’s stretch, [{elo}, {ehi}). {who} joins the parents.',
      done: `${C.doneText.en} With SUS, each individual gets its expected copies rounded down or up.`,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'SUS(f)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'sum', indent: 1, text: 'S ← f_1 + f_2 + … + f_N' },
      { id: 'exp', indent: 1, text: 'para i ← 1 hasta N: e_i ← N · f_i / S' },
      { id: 'cum', indent: 1, text: 'para i ← 1 hasta N: E_i ← e_1 + … + e_i' },
      { id: 'draw', indent: 1, text: 'r ← número aleatorio en [0, 1)' },
      { id: 'init', indent: 1, text: 'i ← 1' },
      { id: 'loop', indent: 1, text: 'para k ← 0 hasta N − 1' },
      { id: 'ptr', indent: 2, text: 'mientras r + k ≥ E_i: i ← i + 1' },
      { id: 'add', indent: 2, text: 'padres_(k+1) ← individuo i' },
      { id: 'return', indent: 1, text: 'devolver padres' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'SUS(f)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'sum', indent: 1, text: 'S ← f_1 + f_2 + … + f_N' },
      { id: 'exp', indent: 1, text: 'for i ← 1 to N: e_i ← N · f_i / S' },
      { id: 'cum', indent: 1, text: 'for i ← 1 to N: E_i ← e_1 + … + e_i' },
      { id: 'draw', indent: 1, text: 'r ← random number in [0, 1)' },
      { id: 'init', indent: 1, text: 'i ← 1' },
      { id: 'loop', indent: 1, text: 'for k ← 0 to N − 1' },
      { id: 'ptr', indent: 2, text: 'while r + k ≥ E_i: i ← i + 1' },
      { id: 'add', indent: 2, text: 'parents_(k+1) ← individual i' },
      { id: 'return', indent: 1, text: 'return parents' },
    ],
  };
  const keywords = { es: ['para', 'hasta', 'mientras', 'devolver'], en: ['for', 'to', 'while', 'return'] };
  const stepLines = {
    intro: ['sig', 'n'], sum: ['sum'], expected: ['exp'], cum: ['cum'], pointers: ['draw', 'init'], pick: ['loop', 'ptr', 'add'], done: ['return'],
  };
  const fnName = { python: 'sus', javascript: 'sus' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'sus.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def sus(fitness, rng=random):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    total = sum(fitness)
    expected = [n * f / total for f in fitness]  # {{expected}}
    r = rng.random()  # {{draw}}
    parents = []
    i = 0
    cumulative = expected[0]
    for k in range(n):
        pointer = r + k  # {{pointer}}
        # {{round}}
        while i < n - 1 and round(pointer, 9) >= round(cumulative, 9):
            i += 1
            cumulative += expected[i]
        parents.append(i)
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
    print(sus(f, Fixed([0.01])))  # [0, 1, 1, 3]: A B B D
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'sus.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function sus(fitness, random = Math.random) {
  const n = fitness.length;
  const total = fitness.reduce((s, f) => s + f, 0);
  const expected = fitness.map((f) => (n * f) / total); // {{expected}}
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const r = random(); // {{draw}}
  const parents = [];
  let i = 0;
  let cumulative = expected[0];
  for (let k = 0; k < n; k++) {
    const pointer = r + k; // {{pointer}}
    while (i < n - 1 && round9(pointer) >= round9(cumulative)) {
      i++;
      cumulative += expected[i];
    }
    parents.push(i);
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sus };
  if (require.main === module) {
    // {{example}}
    console.log(sus([169, 576, 64, 361], () => 0.01)); // [0, 1, 1, 3]: A B B D
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Muestreo estocástico universal (SUS).',
      ref: 'Baker (1987). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) con un solo giro de una ruleta con N punteros separados 1.',
      doc2: 'Las aptitudes no pueden ser negativas ni sumar 0. rng da el único número aleatorio, en [0, 1).',
      expected: 'copias esperadas: e_i = N · f_i / S (suman N)',
      draw: 'un único número aleatorio para los N punteros',
      pointer: 'los punteros van separados exactamente 1',
      round: 'se redondea para que 0,1 + 0,2 valga 0,3 y los empates se resuelvan como a mano',
      fixed: 'Fuente de números aleatorios fijos, para repetir un ejemplo de la herramienta.',
      example: 'Ejemplo de Goldberg (x²) con r = 0,01',
    },
    en: {
      title: 'Stochastic universal sampling (SUS).',
      ref: 'Baker (1987). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) with a single spin of a wheel with N pointers 1 apart.',
      doc2: 'Fitness values cannot be negative or add up to 0. rng provides the single random number, in [0, 1).',
      expected: 'expected copies: e_i = N · f_i / S (they add up to N)',
      draw: 'a single random number for the N pointers',
      pointer: 'the pointers are exactly 1 apart',
      round: 'rounded so that 0.1 + 0.2 equals 0.3 and ties are resolved as by hand',
      fixed: 'Source of fixed random numbers, to repeat an example from the tool.',
      example: 'Goldberg’s example (x²) with r = 0.01',
    },
  };

  const references = [
    C.ref('baker1987', {
      es: 'Fuente original: propone SUS y define el sesgo y la dispersión con que se comparan los algoritmos de muestreo.',
      en: 'Original source: proposes SUS and defines the bias and spread used to compare sampling algorithms.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: métodos de selección de los algoritmos evolutivos, entre ellos SUS frente a la ruleta.',
      en: 'Core course reference: selection methods of evolutionary algorithms, including SUS versus the roulette wheel.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.3: algoritmos de muestreo; recomienda SUS frente a la ruleta.',
      en: 'Section 5.2.3: sampling algorithms; recommends SUS over the roulette wheel.',
    }),
    C.ref('goldberg', {
      es: 'Capítulo 1: el ejemplo de f(x) = x² que se puede cargar en esta herramienta.',
      en: 'Chapter 1: the f(x) = x² example that can be loaded in this tool.',
    }),
  ];

  const api = Object.assign({
    id: 'sus', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).sus = api;
})(typeof self !== 'undefined' ? self : this);
