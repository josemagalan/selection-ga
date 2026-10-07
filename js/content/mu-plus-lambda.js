/*
 * Contenido docente de la selección (μ + λ).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'El reemplazo, o selección de supervivientes, es la segunda selección de un algoritmo evolutivo. La selección de padres decide quién se reproduce; el reemplazo decide, una vez creados los hijos por cruce y mutación, quién forma la generación siguiente. Aquí los μ padres se llaman A, B, C… y los λ hijos, a, b, c…',
      'En la selección (μ + λ), que viene de las estrategias evolutivas de Rechenberg y Schwefel (Schwefel, 1981), padres e hijos compiten juntos: se ordenan los μ + λ individuos por aptitud y sobreviven los μ mejores. Es un truncamiento determinista sobre la unión de las dos generaciones.',
      'Es elitista: el mejor individuo encontrado nunca se pierde, y la aptitud del mejor de la población nunca baja. A cambio, un individuo muy bueno puede sobrevivir indefinidamente, la población pierde diversidad rápido y la búsqueda puede estancarse en un óptimo local. A igual aptitud, aquí se prefiere al hijo, para que la población se renueve.',
      'Coste: O((μ + λ) log(μ + λ)) para ordenar la unión.',
    ],
    en: [
      'Replacement, or survivor selection, is the second selection of an evolutionary algorithm. Parent selection decides who reproduces; replacement decides, once the offspring have been created by crossover and mutation, who makes up the next generation. Here the μ parents are called A, B, C… and the λ offspring, a, b, c…',
      'In (μ + λ) selection, which comes from Rechenberg and Schwefel’s evolution strategies (Schwefel, 1981), parents and offspring compete together: the μ + λ individuals are sorted by fitness and the μ best survive. It is a deterministic truncation over the union of both generations.',
      'It is elitist: the best individual found is never lost, and the best fitness in the population never decreases. In exchange, a very good individual may survive indefinitely, the population loses diversity fast and the search may stagnate in a local optimum. With equal fitness, the offspring is preferred here, so that the population renews itself.',
      'Cost: O((μ + λ) log(μ + λ)) to sort the union.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de μ = {mu} padres (en azul) y λ = {lambda} hijos (en naranja), ya creados por cruce y mutación. Hay que elegir los {mu} supervivientes que formarán la generación siguiente.',
      sort: 'Padres e hijos compiten juntos: se ordenan los {total} individuos de peor ({worst}) a mejor ({best}). A igual aptitud, el hijo va por delante.',
      cut: 'Sobreviven los μ = {mu} mejores: {top}. Son {np} padres y {nc} hijos. Los demás ({out}) desaparecen.',
      keepParent: 'Superviviente {k}: {who} (f = {f}), un padre que sigue siendo de los mejores.',
      keepChild: 'Superviviente {k}: {who} (f = {f}), un hijo.',
      done: C.replDone.es,
      doneLost: C.replDone.es + C.replLost.es,
    },
    en: {
      intro: 'We start from μ = {mu} parents (in blue) and λ = {lambda} offspring (in orange), already created by crossover and mutation. We need to choose the {mu} survivors that will make up the next generation.',
      sort: 'Parents and offspring compete together: the {total} individuals are sorted from worst ({worst}) to best ({best}). With equal fitness, the child goes ahead.',
      cut: 'The μ = {mu} best survive: {top}. They are {np} parents and {nc} offspring. The rest ({out}) disappear.',
      keepParent: 'Survivor {k}: {who} (f = {f}), a parent that is still among the best.',
      keepChild: 'Survivor {k}: {who} (f = {f}), a child.',
      done: C.replDone.en,
      doneLost: C.replDone.en + C.replLost.en,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_MU_MAS_LAMBDA(P, H)' },
      { id: 'n', indent: 1, text: 'μ ← número de padres P; λ ← número de hijos H' },
      { id: 'sort', indent: 1, text: 'U ← P ∪ H ordenada de mejor a peor aptitud' },
      { id: 'cut', indent: 1, text: 'devolver los μ primeros de U' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'MU_PLUS_LAMBDA_SELECTION(P, O)' },
      { id: 'n', indent: 1, text: 'μ ← number of parents P; λ ← number of offspring O' },
      { id: 'sort', indent: 1, text: 'U ← P ∪ O sorted from best to worst fitness' },
      { id: 'cut', indent: 1, text: 'return the first μ of U' },
    ],
  };
  const keywords = { es: ['devolver'], en: ['return'] };
  const stepLines = { intro: ['sig', 'n'], sort: ['sort'], cut: ['cut'], keep: ['cut'], done: ['cut'] };
  const fnName = { python: 'mu_plus_lambda', javascript: 'muPlusLambda' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'mu_plus_lambda.py',
      template: `"""
{{title}}
{{ref}}
"""


def mu_plus_lambda(parents, offspring):
    """{{doc1}}"""
    mu = len(parents)
    union = parents + offspring  # {{union}}
    order = sorted(range(len(union)), key=lambda i: (union[i], i))  # {{sort}}
    return order[-mu:][::-1]  # {{best}}


if __name__ == "__main__":
    # {{example}}
    print(mu_plus_lambda([12, 30, 5, 21], [25, 3, 18, 30]))  # [7, 1, 4, 3]: d B a D
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'mu_plus_lambda.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 */
function muPlusLambda(parents, offspring) {
  const mu = parents.length;
  const union = parents.concat(offspring); // {{union}}
  const order = [...union.keys()].sort((a, b) => union[a] - union[b] || a - b); // {{sort}}
  return order.slice(-mu).reverse(); // {{best}}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { muPlusLambda };
  if (require.main === module) {
    // {{example}}
    console.log(muPlusLambda([12, 30, 5, 21], [25, 3, 18, 30])); // [7, 1, 4, 3]: d B a D
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección (μ + λ): sobreviven los μ mejores de padres e hijos juntos.',
      ref: 'Schwefel (1981). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Devuelve los índices de los supervivientes en la lista padres + hijos (los hijos empiezan en μ), del mejor al peor.',
      union: 'padres e hijos compiten juntos',
      sort: 'de peor a mejor; a igual aptitud, el de índice mayor (el hijo) va después',
      best: 'los μ mejores, del mejor al peor',
      example: 'Cuatro padres (A–D) y cuatro hijos (a–d)',
    },
    en: {
      title: '(μ + λ) selection: the μ best of parents and offspring together survive.',
      ref: 'Schwefel (1981). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Returns the indices of the survivors in the list parents + offspring (offspring start at μ), from best to worst.',
      union: 'parents and offspring compete together',
      sort: 'from worst to best; with equal fitness, the higher index (the child) goes after',
      best: 'the μ best, from best to worst',
      example: 'Four parents (A–D) and four offspring (a–d)',
    },
  };

  const references = [
    C.ref('schwefel', {
      es: 'Fuente original: las estrategias evolutivas multimiembro con selección (μ + λ) y (μ, λ).',
      en: 'Original source: multimembered evolution strategies with (μ + λ) and (μ, λ) selection.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: estrategias de reemplazo (generacional, estado estacionario, elitismo) y la notación de las estrategias evolutivas.',
      en: 'Core course reference: replacement strategies (generational, steady state, elitism) and the notation of evolution strategies.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.3: selección de supervivientes, entre ellas (μ + λ) y (μ, λ).',
      en: 'Section 5.3: survivor selection, including (μ + λ) and (μ, λ).',
    }),
    C.ref('beyer', {
      es: 'Introducción a las estrategias evolutivas, con la discusión de (μ + λ) frente a (μ, λ).',
      en: 'Introduction to evolution strategies, with the discussion of (μ + λ) versus (μ, λ).',
    }),
  ];

  const api = Object.assign({
    id: 'mu-plus-lambda', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {})['mu-plus-lambda'] = api;
})(typeof self !== 'undefined' ? self : this);
