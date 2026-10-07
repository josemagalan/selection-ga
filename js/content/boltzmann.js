/*
 * Contenido docente de la selección de Boltzmann.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const variants = {
    roulette: {
      name: { es: 'Muestreo con ruleta', en: 'Roulette-wheel sampling' },
      desc: {
        es: 'Las probabilidades se muestrean con N giros independientes de la ruleta.',
        en: 'The probabilities are sampled with N independent spins of the wheel.',
      },
    },
    sus: {
      name: { es: 'Muestreo con SUS', en: 'SUS sampling' },
      desc: {
        es: 'Las probabilidades se muestrean con un solo giro de N punteros (SUS).',
        en: 'The probabilities are sampled with a single spin of N pointers (SUS).',
      },
    },
  };

  const explanation = {
    es: [
      'La selección de Boltzmann toma su nombre de la distribución de Boltzmann de la física estadística y del recocido simulado. Cada individuo recibe un peso w_i = exp(f_i / T) y una probabilidad proporcional a ese peso, p_i = w_i / Σw. La temperatura T regula la presión de selección: con T alta todos los pesos se parecen y la selección es casi al azar; con T baja el mejor se lo lleva casi todo (de la Maza y Tidor, 1993).',
      'Lo que cuenta son las diferencias de aptitud, no los cocientes: dos individuos que se diferencian en ΔF tienen probabilidades en la proporción exp(ΔF / T), valga lo que valga la aptitud. Por eso, a diferencia de la ruleta, sumar una constante a todas las aptitudes no cambia nada. Aquí se usa w_i = exp((f_i − f_máx) / T), que da las mismas probabilidades, hace que el mejor pese exactamente 1 y evita números demasiado grandes. Es la misma fórmula de la app SelectionMechanisms.',
      'Como en el recocido simulado, la temperatura puede ir bajando a lo largo de las generaciones: al principio la selección es suave y la población explora; al final se vuelve exigente y explota la mejor zona encontrada. Aquí T es fija, para ver su efecto en una sola generación. Cuidado con la escala: T se mide en las mismas unidades que la aptitud, así que un buen valor depende del problema.',
      'Las probabilidades se muestrean después como en la ruleta (N giros) o con SUS (un giro, N punteros). Coste: O(N) para los pesos más el del muestreo.',
    ],
    en: [
      'Boltzmann selection takes its name from the Boltzmann distribution of statistical physics and simulated annealing. Each individual gets a weight w_i = exp(f_i / T) and a probability proportional to that weight, p_i = w_i / Σw. The temperature T controls the selection pressure: with high T all weights are similar and selection is almost random; with low T the best takes almost everything (de la Maza and Tidor, 1993).',
      'What matters are fitness differences, not ratios: two individuals that differ by ΔF have probabilities in the proportion exp(ΔF / T), whatever the fitness values are. So, unlike the roulette wheel, adding a constant to every fitness value changes nothing. Here w_i = exp((f_i − f_max) / T) is used, which gives the same probabilities, makes the best weigh exactly 1 and avoids numbers that are too large. It is the same formula as in the SelectionMechanisms app.',
      'As in simulated annealing, the temperature can be lowered over the generations: early on selection is gentle and the population explores; at the end it becomes demanding and exploits the best region found. Here T is fixed, to see its effect in a single generation. Mind the scale: T is measured in the same units as fitness, so a good value depends on the problem.',
      'The probabilities are then sampled as with the roulette wheel (N spins) or with SUS (one spin, N pointers). Cost: O(N) for the weights plus the cost of sampling.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Hay que elegir {n} padres.',
      weights: 'Cada aptitud se convierte en un peso w = exp((f − f_máx) / T), con f_máx = {fmax} y T = {temp}: el mejor pesa 1 y cada individuo pesa menos cuanto más lejos está del mejor. El peor, {worst} (f = {fw}), pesa {ww}.',
      sum: 'Se suman los pesos: Σw = {total}.',
      prob: 'Cada individuo recibe un sector proporcional a su peso: p_i = w_i / Σw. El mejor, {who}, tiene p = {p} y el peor, {worst}, p = {pWorst}.',
      probSus: 'Cada individuo espera e_i = N · w_i / Σw copias: el mejor, {who}, espera {e} y el peor, {worst}, {eWorst}.',
      cum: 'Las probabilidades acumuladas q reparten el intervalo [0, 1) en tramos consecutivos, uno por individuo; el último, el de {last}, acaba en 1.',
      cumSus: 'Las copias esperadas acumuladas E reparten el intervalo [0, {n}) en tramos consecutivos; el último, el de {last}, acaba en {n}.',
      spin: 'Giro {k}: r = {r}. Cae en el tramo de {who}, [{lo}, {hi}): es el primero con r < q. {who} pasa a la población de padres.',
      pointers: 'Un único número aleatorio, r = {r}, coloca el primer puntero; los demás van separados exactamente 1, hasta {last}.',
      pick: 'Puntero {k}, en {ptr}: cae en el tramo de {who}, [{elo}, {ehi}). {who} pasa a la población de padres.',
      done: `${C.doneText.es} Prueba a bajar o subir la temperatura T.`,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. We need to choose {n} parents.',
      weights: 'Each fitness value becomes a weight w = exp((f − f_max) / T), with f_max = {fmax} and T = {temp}: the best weighs 1 and each individual weighs less the further it is from the best. The worst, {worst} (f = {fw}), weighs {ww}.',
      sum: 'The weights are added up: Σw = {total}.',
      prob: 'Each individual gets a sector proportional to its weight: p_i = w_i / Σw. The best, {who}, has p = {p} and the worst, {worst}, p = {pWorst}.',
      probSus: 'Each individual expects e_i = N · w_i / Σw copies: the best, {who}, expects {e} and the worst, {worst}, {eWorst}.',
      cum: 'The cumulative probabilities q divide the interval [0, 1) into consecutive stretches, one per individual; the last one, {last}’s, ends at 1.',
      cumSus: 'The cumulative expected copies E divide the interval [0, {n}) into consecutive stretches; the last one, {last}’s, ends at {n}.',
      spin: 'Spin {k}: r = {r}. It falls in {who}’s stretch, [{lo}, {hi}): the first one with r < q. {who} joins the parents.',
      pointers: 'A single random number, r = {r}, places the first pointer; the others are exactly 1 apart, up to {last}.',
      pick: 'Pointer {k}, at {ptr}: it falls in {who}’s stretch, [{elo}, {ehi}). {who} joins the parents.',
      done: `${C.doneText.en} Try lowering or raising the temperature T.`,
    },
  };

  const head = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_DE_BOLTZMANN(f, T)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos; f_máx ← máximo de f' },
      { id: 'w', indent: 1, text: 'para i ← 1 hasta N: w_i ← exp((f_i − f_máx) / T)' },
      { id: 'sum', indent: 1, text: 'S ← w_1 + … + w_N' },
      { id: 'prob', indent: 1, text: 'para i ← 1 hasta N: p_i ← w_i / S' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'BOLTZMANN_SELECTION(f, T)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals; f_max ← maximum of f' },
      { id: 'w', indent: 1, text: 'for i ← 1 to N: w_i ← exp((f_i − f_max) / T)' },
      { id: 'sum', indent: 1, text: 'S ← w_1 + … + w_N' },
      { id: 'prob', indent: 1, text: 'for i ← 1 to N: p_i ← w_i / S' },
    ],
  };
  const tails = {
    roulette: {
      es: [
        { id: 'cum', indent: 1, text: 'para i ← 1 hasta N: q_i ← p_1 + … + p_i' },
        { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
        { id: 'spin', indent: 2, text: 'r ← número aleatorio en [0, 1)' },
        { id: 'pick', indent: 2, text: 'padres_k ← primer individuo i con r < q_i' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'cum', indent: 1, text: 'for i ← 1 to N: q_i ← p_1 + … + p_i' },
        { id: 'loop', indent: 1, text: 'for k ← 1 to N' },
        { id: 'spin', indent: 2, text: 'r ← random number in [0, 1)' },
        { id: 'pick', indent: 2, text: 'parents_k ← first individual i with r < q_i' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
    sus: {
      es: [
        { id: 'cum', indent: 1, text: 'para i ← 1 hasta N: E_i ← N · (p_1 + … + p_i)' },
        { id: 'draw', indent: 1, text: 'r ← número aleatorio en [0, 1); i ← 1' },
        { id: 'loop', indent: 1, text: 'para k ← 0 hasta N − 1' },
        { id: 'ptr', indent: 2, text: 'mientras r + k ≥ E_i: i ← i + 1' },
        { id: 'pick', indent: 2, text: 'padres_(k+1) ← individuo i' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'cum', indent: 1, text: 'for i ← 1 to N: E_i ← N · (p_1 + … + p_i)' },
        { id: 'draw', indent: 1, text: 'r ← random number in [0, 1); i ← 1' },
        { id: 'loop', indent: 1, text: 'for k ← 0 to N − 1' },
        { id: 'ptr', indent: 2, text: 'while r + k ≥ E_i: i ← i + 1' },
        { id: 'pick', indent: 2, text: 'parents_(k+1) ← individual i' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
  };
  const pseudocode = (lang, variant) => {
    const l = head[lang] ? lang : 'es';
    return head[l].concat(tails[variant === 'sus' ? 'sus' : 'roulette'][l]);
  };
  const keywords = { es: ['para', 'hasta', 'mientras', 'devolver'], en: ['for', 'to', 'while', 'return'] };
  const stepLines = {
    intro: ['sig', 'n'], weights: ['w'], sum: ['sum'], prob: ['prob'], cum: ['cum'],
    spin: ['loop', 'spin', 'pick'], pointers: ['draw'], pick: ['loop', 'ptr', 'pick'], done: ['return'],
  };
  const fnName = { python: 'boltzmann', javascript: 'boltzmann' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'boltzmann.py',
      template: `"""
{{title}}
{{ref}}
"""
import math
import random


def boltzmann(fitness, temp=10.0, rng=random, sampling="roulette"):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    fmax = max(fitness)
    weights = [math.exp((f - fmax) / temp) for f in fitness]  # {{weights}}
    total = sum(weights)
    probs = [w / total for w in weights]
    parents = []
    # {{round}}
    if sampling == "roulette":
        for _ in range(n):
            r = rng.random()
            cumulative = 0.0
            for i, p in enumerate(probs):
                cumulative += p
                if r < round(cumulative, 9):
                    break
            parents.append(i)
    else:  # {{sus}}
        expected = [n * p for p in probs]
        r = rng.random()
        i = 0
        cumulative = expected[0]
        for k in range(n):
            while i < n - 1 and round(r + k, 9) >= round(cumulative, 9):
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
    print(boltzmann([12, 30, 5, 21], 10, Fixed([0.01, 0.06, 0.97, 0.69])))  # [0, 0, 3, 1]: A A D B
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'boltzmann.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function boltzmann(fitness, temp = 10, random = Math.random, sampling = 'roulette') {
  const n = fitness.length;
  const fmax = Math.max(...fitness);
  const weights = fitness.map((f) => Math.exp((f - fmax) / temp)); // {{weights}}
  const total = weights.reduce((s, w) => s + w, 0);
  const probs = weights.map((w) => w / total);
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const parents = [];
  if (sampling === 'roulette') {
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
  } else { // {{sus}}
    const expected = probs.map((p) => n * p);
    const r = random();
    let i = 0;
    let cumulative = expected[0];
    for (let k = 0; k < n; k++) {
      while (i < n - 1 && round9(r + k) >= round9(cumulative)) {
        i++;
        cumulative += expected[i];
      }
      parents.push(i);
    }
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { boltzmann };
  if (require.main === module) {
    // {{example}}
    const draws = [0.01, 0.06, 0.97, 0.69];
    let k = 0;
    console.log(boltzmann([12, 30, 5, 21], 10, () => draws[k++])); // [0, 0, 3, 1]: A A D B
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección de Boltzmann.',
      ref: 'de la Maza y Tidor (1993). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) con probabilidad proporcional a exp((f − f_max) / T).',
      doc2: 'sampling: "roulette" (N giros) o "sus" (un giro con N punteros). rng da los números aleatorios en [0, 1).',
      weights: 'el mejor pesa 1; restar f_max no cambia las probabilidades',
      round: 'se redondea para que 0,1 + 0,2 valga 0,3 y los empates se resuelvan como a mano',
      sus: 'SUS: un solo número aleatorio y N punteros separados 1 sobre las copias esperadas N · p',
      fixed: 'Fuente de números aleatorios fijos, para repetir un ejemplo de la herramienta.',
      example: 'Población de aptitudes 12, 30, 5 y 21 con T = 10 y r = 0,01, 0,06, 0,97 y 0,69',
    },
    en: {
      title: 'Boltzmann selection.',
      ref: 'de la Maza and Tidor (1993). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) with probability proportional to exp((f − f_max) / T).',
      doc2: 'sampling: "roulette" (N spins) or "sus" (one spin with N pointers). rng provides the random numbers in [0, 1).',
      weights: 'the best weighs 1; subtracting f_max does not change the probabilities',
      round: 'rounded so that 0.1 + 0.2 equals 0.3 and ties are resolved as by hand',
      sus: 'SUS: a single random number and N pointers 1 apart over the expected copies N · p',
      fixed: 'Source of fixed random numbers, to repeat an example from the tool.',
      example: 'Population with fitness 12, 30, 5 and 21, T = 10 and r = 0.01, 0.06, 0.97 and 0.69',
    },
  };

  const references = [
    C.ref('delaMaza', {
      es: 'Fuente original: la selección de Boltzmann y su comparación con la selección proporcional.',
      en: 'Original source: Boltzmann selection and its comparison with proportional selection.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: presión de selección y la temperatura del recocido simulado, de la que viene la idea.',
      en: 'Core course reference: selection pressure and the temperature of simulated annealing, where the idea comes from.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos y recocido simulado aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms and simulated annealing applied to industrial engineering problems.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.1: Boltzmann entre los remedios de la selección proporcional.',
      en: 'Section 5.2.1: Boltzmann among the remedies for proportional selection.',
    }),
    C.ref('selectionMechanisms', {
      es: 'App Shiny de los mismos autores: la misma fórmula, exp((f − f_max) / T), en simulaciones de muchas generaciones.',
      en: 'Shiny app by the same authors: the same formula, exp((f − f_max) / T), in many-generation simulations.',
    }),
  ];

  const api = Object.assign({
    id: 'boltzmann', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).boltzmann = api;
})(typeof self !== 'undefined' ? self : this);
