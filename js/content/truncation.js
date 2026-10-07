/*
 * Contenido docente de la selección por truncamiento.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const variants = {
    random: {
      name: { es: 'Al azar entre los mejores', en: 'At random among the best' },
      desc: {
        es: 'Cada padre se elige con igual probabilidad entre los T mejores, como en Blickle y Thiele (1996) y en la app SelectionMechanisms.',
        en: 'Each parent is chosen with equal probability among the T best, as in Blickle and Thiele (1996) and in the SelectionMechanisms app.',
      },
    },
    cyclic: {
      name: { es: 'Por turnos (determinista)', en: 'In turns (deterministic)' },
      desc: {
        es: 'Los T mejores se copian por orden, del mejor hacia abajo, hasta llenar los N huecos: cada uno recibe N/T copias, sin azar.',
        en: 'The T best are copied in order, from the best down, until the N slots are filled: each gets N/T copies, with no randomness.',
      },
    },
  };

  const explanation = {
    es: [
      'La selección por truncamiento es la de los criadores de animales y plantas: se ordena la población y solo una proporción τ de los mejores puede reproducirse. Los T = ⌈τ · N⌉ mejores pasan el corte y los demás se descartan sin ninguna oportunidad. Mühlenbein y Schlierkamp-Voosen (1993) la usaron en su algoritmo genético del criador (breeder genetic algorithm), y en las estrategias evolutivas la selección (μ, λ) es un truncamiento.',
      'Dentro de los que pasan el corte no hay preferencias: cada padre se elige al azar, con igual probabilidad, entre los T mejores (o se copian por turnos, de modo que cada uno recibe N/T copias). Por eso cada uno de ellos espera N/T copias y el resto, ninguna. Con τ = 1 no se descarta a nadie y la selección es al azar; cuanto menor es τ, mayor es la presión.',
      'Es la selección más dura: para una misma intensidad de selección, es la que más diversidad pierde, porque descarta de golpe a todos los que quedan por debajo del corte (Blickle y Thiele, 1996). Como el rango, solo depende del orden y no de la escala de la aptitud. Se usa sobre todo con poblaciones grandes, cuando conviene una presión fuerte y controlada.',
      'Coste: O(N log N) para ordenar la población y O(1) por padre.',
    ],
    en: [
      'Truncation selection is the one used by animal and plant breeders: the population is sorted and only a proportion τ of the best can reproduce. The T = ⌈τ · N⌉ best pass the cut and the rest are discarded with no chance at all. Mühlenbein and Schlierkamp-Voosen (1993) used it in their breeder genetic algorithm, and in evolution strategies (μ, λ) selection is a truncation.',
      'Among those that pass the cut there are no preferences: each parent is chosen at random, with equal probability, among the T best (or they are copied in turns, so that each gets N/T copies). So each of them expects N/T copies and the rest, none. With τ = 1 no one is discarded and selection is random; the smaller τ, the higher the pressure.',
      'It is the harshest selection: for the same selection intensity, it is the one that loses most diversity, because it discards at once everyone below the cut (Blickle and Thiele, 1996). Like ranking, it depends only on the order and not on the scale of fitness. It is used mainly with large populations, when a strong and controlled pressure is wanted.',
      'Cost: O(N log N) to sort the population and O(1) per parent.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Hay que elegir {n} padres.',
      sort: 'Se ordena la población de peor a mejor. El rango va de 1, el peor ({worst}), a {n}, el mejor ({best}).',
      sortTies: 'Se ordena la población de peor a mejor. El rango va de 1, el peor ({worst}), a {n}, el mejor ({best}). A igual aptitud, va antes el que aparece antes en la población.',
      cut: 'Con τ = {tau}, solo los T = ⌈τ · N⌉ = {cut} mejores pueden ser padres: {top}. Los demás ({out}) se descartan: no tendrán ninguna copia.',
      cutAll: 'Con τ = {tau}, pasan el corte los {cut}: no se descarta a nadie y la selección es al azar.',
      pick: 'Padre {k}: se elige al azar, con igual probabilidad, uno de los {cut} mejores: {who}, el {place}.º mejor.',
      pickCyclic: 'Padre {k}: los {cut} mejores se copian por turnos, del mejor hacia abajo: le toca a {who}, el {place}.º mejor.',
      done: C.doneText.es,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. We need to choose {n} parents.',
      sort: 'The population is sorted from worst to best. The rank goes from 1, the worst ({worst}), to {n}, the best ({best}).',
      sortTies: 'The population is sorted from worst to best. The rank goes from 1, the worst ({worst}), to {n}, the best ({best}). With equal fitness, the one that appears first in the population goes first.',
      cut: 'With τ = {tau}, only the T = ⌈τ · N⌉ = {cut} best can become parents: {top}. The rest ({out}) are discarded: they will get no copies.',
      cutAll: 'With τ = {tau}, all {cut} pass the cut: no one is discarded and selection is random.',
      pick: 'Parent {k}: one of the {cut} best is chosen at random, with equal probability: {who}, number {place} from the top.',
      pickCyclic: 'Parent {k}: the {cut} best are copied in turns, from the best down: it is the turn of {who}, number {place} from the top.',
      done: C.doneText.en,
    },
  };

  const head = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_POR_TRUNCAMIENTO(f, τ)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'sort', indent: 1, text: 'ordenar los individuos de peor a mejor aptitud' },
      { id: 'cut', indent: 1, text: 'T ← ⌈τ · N⌉; M ← los T mejores, del mejor hacia abajo' },
      { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'TRUNCATION_SELECTION(f, τ)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'sort', indent: 1, text: 'sort the individuals from worst to best fitness' },
      { id: 'cut', indent: 1, text: 'T ← ⌈τ · N⌉; M ← the T best, from the best down' },
      { id: 'loop', indent: 1, text: 'for k ← 1 to N' },
    ],
  };
  const tails = {
    random: {
      es: [
        { id: 'pick', indent: 2, text: 'padres_k ← un individuo de M elegido al azar' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'pick', indent: 2, text: 'parents_k ← an individual of M chosen at random' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
    cyclic: {
      es: [
        { id: 'pick', indent: 2, text: 'padres_k ← M_(((k − 1) mod T) + 1)' },
        { id: 'return', indent: 1, text: 'devolver padres' },
      ],
      en: [
        { id: 'pick', indent: 2, text: 'parents_k ← M_(((k − 1) mod T) + 1)' },
        { id: 'return', indent: 1, text: 'return parents' },
      ],
    },
  };
  const pseudocode = (lang, variant) => {
    const l = head[lang] ? lang : 'es';
    return head[l].concat(tails[variant === 'cyclic' ? 'cyclic' : 'random'][l]);
  };
  const keywords = { es: ['para', 'hasta', 'ordenar', 'devolver', 'mod'], en: ['for', 'to', 'sort', 'return', 'mod'] };
  const stepLines = { intro: ['sig', 'n'], sort: ['sort'], cut: ['cut'], pick: ['loop', 'pick'], done: ['return'] };
  const fnName = { python: 'truncation', javascript: 'truncation' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'truncation.py',
      template: `"""
{{title}}
{{ref}}
"""
import math
import random


def truncation(fitness, tau=0.5, rng=random, cyclic=False):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    t = max(1, math.ceil(round(tau * n, 9)))  # {{cut}}
    order = sorted(range(n), key=lambda i: fitness[i])  # {{sort}}
    best = order[n - t:][::-1]  # {{best}}
    parents = []
    for k in range(n):
        if cyclic:
            parents.append(best[k % t])  # {{cyclic}}
        else:
            parents.append(best[int(rng.random() * t)])  # {{random}}
    return parents


if __name__ == "__main__":
    # {{example}}
    print(truncation([169, 576, 64, 361], tau=0.5, cyclic=True))  # [1, 3, 1, 3]: B D B D
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'truncation.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function truncation(fitness, tau = 0.5, random = Math.random, cyclic = false) {
  const n = fitness.length;
  const t = Math.max(1, Math.ceil(Math.round(tau * n * 1e9) / 1e9)); // {{cut}}
  const order = [...fitness.keys()].sort((a, b) => fitness[a] - fitness[b]); // {{sort}}
  const best = order.slice(n - t).reverse(); // {{best}}
  const parents = [];
  for (let k = 0; k < n; k++) {
    if (cyclic) parents.push(best[k % t]); // {{cyclic}}
    else parents.push(best[Math.floor(random() * t)]); // {{random}}
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { truncation };
  if (require.main === module) {
    // {{example}}
    console.log(truncation([169, 576, 64, 361], 0.5, Math.random, true)); // [1, 3, 1, 3]: B D B D
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección por truncamiento.',
      ref: 'Mühlenbein y Schlierkamp-Voosen (1993); Blickle y Thiele (1996). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0) solo entre los T = ⌈τ · N⌉ mejores.',
      doc2: 'cyclic=False: al azar entre ellos; cyclic=True: por turnos, del mejor hacia abajo. rng da los números aleatorios en [0, 1).',
      cut: 'cuántos pasan el corte (el redondeo evita que 0,3 · 10 dé 3,0000000000000004)',
      sort: 'de peor a mejor; a igual aptitud, por orden de aparición',
      best: 'los T mejores, del mejor hacia abajo',
      cyclic: 'por turnos: cada uno recibe N/T copias',
      random: 'al azar, con igual probabilidad',
      example: 'Ejemplo de Goldberg (x²) con τ = 0,5, por turnos',
    },
    en: {
      title: 'Truncation selection.',
      ref: 'Mühlenbein and Schlierkamp-Voosen (1993); Blickle and Thiele (1996). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0) only among the T = ⌈τ · N⌉ best.',
      doc2: 'cyclic=False: at random among them; cyclic=True: in turns, from the best down. rng provides the random numbers in [0, 1).',
      cut: 'how many pass the cut (rounding avoids 0.3 · 10 giving 3.0000000000000004)',
      sort: 'from worst to best; with equal fitness, in order of appearance',
      best: 'the T best, from the best down',
      cyclic: 'in turns: each gets N/T copies',
      random: 'at random, with equal probability',
      example: 'Goldberg’s example (x²) with τ = 0.5, in turns',
    },
  };

  const references = [
    C.ref('muhlenbein', {
      es: 'Fuente original en computación evolutiva: el algoritmo genético del criador, con selección por truncamiento.',
      en: 'Original source in evolutionary computation: the breeder genetic algorithm, with truncation selection.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: métodos de selección de los algoritmos evolutivos y su presión de selección.',
      en: 'Core course reference: selection methods of evolutionary algorithms and their selection pressure.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('blickle', {
      es: 'Define el truncamiento como selección uniforme entre los mejores y muestra que es la que más diversidad pierde.',
      en: 'Defines truncation as uniform selection among the best and shows that it is the one that loses most diversity.',
    }),
    C.ref('selectionMechanisms', {
      es: 'App Shiny de los mismos autores: el mismo truncamiento (⌈τ · N⌉ mejores, al azar) en simulaciones de muchas generaciones.',
      en: 'Shiny app by the same authors: the same truncation (the ⌈τ · N⌉ best, at random) in many-generation simulations.',
    }),
  ];

  const api = Object.assign({
    id: 'truncation', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).truncation = api;
})(typeof self !== 'undefined' ? self : this);
