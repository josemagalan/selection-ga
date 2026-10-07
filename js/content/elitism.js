/*
 * Contenido docente del reemplazo generacional con elitismo.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'En el reemplazo generacional, el del algoritmo genético canónico, cada generación crea tantos hijos como padres y los hijos sustituyen a todos los padres. Es sencillo, pero el mejor individuo encontrado se puede perder si ninguno de sus hijos es tan bueno como él.',
      'El elitismo lo evita: los e mejores padres (la élite, normalmente 1 o 2) pasan sin cambios a la generación siguiente y ocupan el lugar de los e peores hijos. De Jong (1975) lo introdujo en su tesis y mostró que mejora la búsqueda en funciones unimodales; con él, la aptitud del mejor de la población nunca baja.',
      'El precio es algo de diversidad: la élite tiende a dominar la población, sobre todo si además la selección de padres aprieta mucho. Por eso la élite se mantiene pequeña. Con e = 0, este mecanismo es el reemplazo generacional puro.',
      'Coste: O(μ log μ) para encontrar la élite y los peores hijos.',
    ],
    en: [
      'In generational replacement, the one of the canonical genetic algorithm, each generation creates as many offspring as parents and the offspring replace all the parents. It is simple, but the best individual found may be lost if none of its offspring is as good.',
      'Elitism prevents this: the e best parents (the elite, usually 1 or 2) pass unchanged into the next generation and take the place of the e worst offspring. De Jong (1975) introduced it in his thesis and showed that it improves the search on unimodal functions; with it, the best fitness in the population never decreases.',
      'The price is some diversity: the elite tends to dominate the population, especially if parent selection is also strong. That is why the elite is kept small. With e = 0, this mechanism is pure generational replacement.',
      'Cost: O(μ log μ) to find the elite and the worst offspring.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de μ = {mu} padres (en azul) y {mu} hijos (en naranja), ya creados por cruce y mutación. Hay que formar la generación siguiente, de {mu} individuos.',
      replace: 'En el reemplazo generacional, los {mu} hijos sustituyen a los {mu} padres.',
      elite: 'Pero los e = {e} mejores padres forman la élite y sobreviven: {elite}.',
      drop: 'Para dejarles sitio, desaparecen los {e} peores hijos: {dropped}.',
      keepParent: 'Superviviente {k}: {who} (f = {f}), de la élite.',
      keepChild: 'Superviviente {k}: {who} (f = {f}), un hijo.',
      done: C.replDone.es,
      doneElite: `${C.replDone.es} Con la élite, la mejor aptitud nunca baja.`,
      doneLost: C.replDone.es + C.replLost.es,
    },
    en: {
      intro: 'We start from μ = {mu} parents (in blue) and {mu} offspring (in orange), already created by crossover and mutation. We need to form the next generation, of {mu} individuals.',
      replace: 'In generational replacement, the {mu} offspring replace the {mu} parents.',
      elite: 'But the e = {e} best parents form the elite and survive: {elite}.',
      drop: 'To make room for them, the {e} worst offspring disappear: {dropped}.',
      keepParent: 'Survivor {k}: {who} (f = {f}), from the elite.',
      keepChild: 'Survivor {k}: {who} (f = {f}), a child.',
      done: C.replDone.en,
      doneElite: `${C.replDone.en} With the elite, the best fitness never goes down.`,
      doneLost: C.replDone.en + C.replLost.en,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'REEMPLAZO_GENERACIONAL_CON_ELITISMO(P, H, e)' },
      { id: 'n', indent: 1, text: 'μ ← número de padres P (y de hijos H)' },
      { id: 'elite', indent: 1, text: 'E ← los e mejores de P' },
      { id: 'drop', indent: 1, text: 'quitar de H sus e peores hijos' },
      { id: 'next', indent: 1, text: 'devolver E ∪ H' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'GENERATIONAL_REPLACEMENT_WITH_ELITISM(P, O, e)' },
      { id: 'n', indent: 1, text: 'μ ← number of parents P (and of offspring O)' },
      { id: 'elite', indent: 1, text: 'E ← the e best of P' },
      { id: 'drop', indent: 1, text: 'remove from O its e worst offspring' },
      { id: 'next', indent: 1, text: 'return E ∪ O' },
    ],
  };
  const keywords = { es: ['quitar', 'devolver'], en: ['remove', 'return'] };
  const stepLines = { intro: ['sig', 'n'], replace: ['n'], elite: ['elite'], drop: ['drop'], keep: ['next'], done: ['next'] };
  const fnName = { python: 'elitism', javascript: 'elitism' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'elitism.py',
      template: `"""
{{title}}
{{ref}}
"""


def elitism(parents, offspring, e=1):
    """{{doc1}}"""
    mu = len(parents)
    union = parents + offspring
    elite = sorted(range(mu), key=lambda i: (union[i], i))[mu - e:][::-1]  # {{elite}}
    worst = sorted(range(mu, 2 * mu), key=lambda i: (union[i], i))[:e]  # {{worst}}
    return elite + [i for i in range(mu, 2 * mu) if i not in worst]  # {{next}}


if __name__ == "__main__":
    # {{example}}
    print(elitism([12, 30, 5, 21], [25, 3, 18, 9], e=1))  # [1, 4, 6, 7]: B a c d
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'elitism.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 */
function elitism(parents, offspring, e = 1) {
  const mu = parents.length;
  const union = parents.concat(offspring);
  const byFitness = (a, b) => union[a] - union[b] || a - b;
  const elite = [...Array(mu).keys()].sort(byFitness).slice(mu - e).reverse(); // {{elite}}
  const children = [...Array(mu).keys()].map((k) => mu + k);
  const worst = children.slice().sort(byFitness).slice(0, e); // {{worst}}
  return elite.concat(children.filter((i) => !worst.includes(i))); // {{next}}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { elitism };
  if (require.main === module) {
    // {{example}}
    console.log(elitism([12, 30, 5, 21], [25, 3, 18, 9], 1)); // [1, 4, 6, 7]: B a c d
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Reemplazo generacional con elitismo.',
      ref: 'De Jong (1975). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Devuelve los índices de la generación siguiente en la lista padres + hijos (los hijos empiezan en μ; hay tantos hijos como padres).',
      elite: 'los e mejores padres, del mejor hacia abajo',
      worst: 'los e peores hijos, que dejan su sitio a la élite',
      next: 'la élite y el resto de los hijos, en su orden',
      example: 'Cuatro padres (A–D), cuatro hijos (a–d) y una élite de 1',
    },
    en: {
      title: 'Generational replacement with elitism.',
      ref: 'De Jong (1975). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Returns the indices of the next generation in the list parents + offspring (offspring start at μ; there are as many offspring as parents).',
      elite: 'the e best parents, from the best down',
      worst: 'the e worst offspring, who make room for the elite',
      next: 'the elite and the rest of the offspring, in their order',
      example: 'Four parents (A–D), four offspring (a–d) and an elite of 1',
    },
  };

  const references = [
    C.ref('deJong', {
      es: 'Fuente original: introduce el elitismo en los algoritmos genéticos y estudia su efecto.',
      en: 'Original source: introduces elitism in genetic algorithms and studies its effect.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: estrategias de reemplazo, generacional y con elitismo.',
      en: 'Core course reference: replacement strategies, generational and with elitism.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('eiben', {
      es: 'Apartados 5.1 y 5.3: modelos generacional y de estado estacionario, y elitismo.',
      en: 'Sections 5.1 and 5.3: generational and steady-state models, and elitism.',
    }),
    C.ref('goldberg', {
      es: 'El algoritmo genético simple, con reemplazo generacional.',
      en: 'The simple genetic algorithm, with generational replacement.',
    }),
  ];

  const api = Object.assign({
    id: 'elitism', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).elitism = api;
})(typeof self !== 'undefined' ? self : this);
