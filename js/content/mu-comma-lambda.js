/*
 * Contenido docente de la selección (μ, λ).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'En la selección (μ, λ), también de las estrategias evolutivas (Schwefel, 1981), los padres no compiten: desaparecen todos, y de los λ hijos sobreviven los μ mejores. Por eso hace falta que haya al menos tantos hijos como padres (λ ≥ μ); en las estrategias evolutivas se suele usar λ ≈ 7μ.',
      'No es elitista: si todos los hijos son peores que el mejor padre, la aptitud del mejor de la población baja. Puede parecer un defecto, pero tiene ventajas: ningún individuo sobrevive para siempre, así que la población no se queda atascada en un óptimo local, se adapta mejor si el problema cambia con el tiempo y, en las estrategias evolutivas, permite que los parámetros de mutación (que viajan con cada individuo) se ajusten de verdad (Beyer y Schwefel, 2002).',
      'Cuanto mayor es λ respecto a μ, más hijos hay para elegir y mayor es la presión de selección: con λ = μ no hay selección ninguna y todos los hijos sobreviven.',
      'Coste: O(λ log λ) para ordenar los hijos.',
    ],
    en: [
      'In (μ, λ) selection, also from evolution strategies (Schwefel, 1981), the parents do not compete: they all disappear, and the μ best of the λ offspring survive. That is why there must be at least as many offspring as parents (λ ≥ μ); evolution strategies commonly use λ ≈ 7μ.',
      'It is not elitist: if every child is worse than the best parent, the best fitness in the population goes down. It may look like a flaw, but it has advantages: no individual survives forever, so the population does not get stuck in a local optimum, it adapts better if the problem changes over time and, in evolution strategies, it lets the mutation parameters (which travel with each individual) really adjust (Beyer and Schwefel, 2002).',
      'The larger λ is relative to μ, the more offspring there are to choose from and the higher the selection pressure: with λ = μ there is no selection at all and every child survives.',
      'Cost: O(λ log λ) to sort the offspring.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de μ = {mu} padres (en azul) y λ = {lambda} hijos (en naranja), ya creados por cruce y mutación. Hay que elegir los {mu} supervivientes de la generación siguiente.',
      discard: 'En (μ, λ) los padres no compiten: desaparecen los {mu}, incluido el mejor, {best} (f = {fb}).',
      sort: 'Se ordenan los λ = {lambda} hijos de peor ({worst}) a mejor ({best}).',
      cut: 'Sobreviven los μ = {mu} mejores hijos: {top}. Los demás ({out}) desaparecen.',
      cutAll: 'Con λ = μ = {mu} no hay nada que elegir: sobreviven todos los hijos ({top}).',
      keepChild: 'Superviviente {k}: {who} (f = {f}).',
      done: C.replDone.es,
      doneLost: C.replDone.es + C.replLost.es,
    },
    en: {
      intro: 'We start from μ = {mu} parents (in blue) and λ = {lambda} offspring (in orange), already created by crossover and mutation. We need to choose the {mu} survivors of the next generation.',
      discard: 'In (μ, λ) the parents do not compete: all {mu} disappear, including the best, {best} (f = {fb}).',
      sort: 'The λ = {lambda} offspring are sorted from worst ({worst}) to best ({best}).',
      cut: 'The μ = {mu} best offspring survive: {top}. The rest ({out}) disappear.',
      cutAll: 'With λ = μ = {mu} there is nothing to choose: every child survives ({top}).',
      keepChild: 'Survivor {k}: {who} (f = {f}).',
      done: C.replDone.en,
      doneLost: C.replDone.en + C.replLost.en,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_MU_COMA_LAMBDA(P, H)' },
      { id: 'n', indent: 1, text: 'μ ← número de padres P; λ ← número de hijos H (λ ≥ μ)' },
      { id: 'discard', indent: 1, text: 'descartar todos los padres P' },
      { id: 'sort', indent: 1, text: 'ordenar H de mejor a peor aptitud' },
      { id: 'cut', indent: 1, text: 'devolver los μ primeros de H' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'MU_COMMA_LAMBDA_SELECTION(P, O)' },
      { id: 'n', indent: 1, text: 'μ ← number of parents P; λ ← number of offspring O (λ ≥ μ)' },
      { id: 'discard', indent: 1, text: 'discard all the parents P' },
      { id: 'sort', indent: 1, text: 'sort O from best to worst fitness' },
      { id: 'cut', indent: 1, text: 'return the first μ of O' },
    ],
  };
  const keywords = { es: ['descartar', 'ordenar', 'devolver'], en: ['discard', 'sort', 'return'] };
  const stepLines = { intro: ['sig', 'n'], discard: ['discard'], sort: ['sort'], cut: ['cut'], keep: ['cut'], done: ['cut'] };
  const fnName = { python: 'mu_comma_lambda', javascript: 'muCommaLambda' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'mu_comma_lambda.py',
      template: `"""
{{title}}
{{ref}}
"""


def mu_comma_lambda(parents, offspring):
    """{{doc1}}"""
    mu = len(parents)
    assert len(offspring) >= mu  # {{need}}
    order = sorted(range(len(offspring)), key=lambda k: (offspring[k], k))  # {{sort}}
    return [mu + k for k in order[-mu:][::-1]]  # {{best}}


if __name__ == "__main__":
    # {{example}}
    print(mu_comma_lambda([12, 30, 5, 21], [25, 3, 18, 9, 14, 7]))  # [4, 6, 8, 7]: a c e d
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'mu_comma_lambda.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 */
function muCommaLambda(parents, offspring) {
  const mu = parents.length;
  if (offspring.length < mu) throw new Error('lambda < mu'); // {{need}}
  const order = [...offspring.keys()].sort((a, b) => offspring[a] - offspring[b] || a - b); // {{sort}}
  return order.slice(-mu).reverse().map((k) => mu + k); // {{best}}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { muCommaLambda };
  if (require.main === module) {
    // {{example}}
    console.log(muCommaLambda([12, 30, 5, 21], [25, 3, 18, 9, 14, 7])); // [4, 6, 8, 7]: a c e d
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección (μ, λ): sobreviven los μ mejores hijos; los padres desaparecen.',
      ref: 'Schwefel (1981). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Devuelve los índices de los supervivientes en la lista padres + hijos (los hijos empiezan en μ), del mejor al peor.',
      need: 'hacen falta al menos tantos hijos como padres',
      sort: 'solo compiten los hijos; a igual aptitud, por orden',
      best: 'los μ mejores hijos, con su índice en padres + hijos',
      example: 'Cuatro padres (A–D) y seis hijos (a–f): el mejor padre, B, se pierde',
    },
    en: {
      title: '(μ, λ) selection: the μ best offspring survive; the parents disappear.',
      ref: 'Schwefel (1981). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Returns the indices of the survivors in the list parents + offspring (offspring start at μ), from best to worst.',
      need: 'there must be at least as many offspring as parents',
      sort: 'only the offspring compete; with equal fitness, in order',
      best: 'the μ best offspring, with their index in parents + offspring',
      example: 'Four parents (A–D) and six offspring (a–f): the best parent, B, is lost',
    },
  };

  const references = [
    C.ref('schwefel', {
      es: 'Fuente original: las estrategias evolutivas multimiembro con selección (μ + λ) y (μ, λ).',
      en: 'Original source: multimembered evolution strategies with (μ + λ) and (μ, λ) selection.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: estrategias de reemplazo y estrategias evolutivas.',
      en: 'Core course reference: replacement strategies and evolution strategies.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('beyer', {
      es: 'Por qué la selección (μ, λ), no elitista, favorece la autoadaptación de los parámetros de mutación; el valor habitual λ ≈ 7μ.',
      en: 'Why non-elitist (μ, λ) selection favours the self-adaptation of mutation parameters; the usual value λ ≈ 7μ.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.3: selección de supervivientes, entre ellas (μ + λ) y (μ, λ).',
      en: 'Section 5.3: survivor selection, including (μ + λ) and (μ, λ).',
    }),
  ];

  const api = Object.assign({
    id: 'mu-comma-lambda', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {})['mu-comma-lambda'] = api;
})(typeof self !== 'undefined' ? self : this);
