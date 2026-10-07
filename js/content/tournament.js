/*
 * Contenido docente de la selección por torneo.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const variants = {
    with: {
      name: { es: 'Con reemplazo', en: 'With replacement' },
      desc: {
        es: 'Los k contendientes se sortean de uno en uno entre toda la población, así que un individuo puede salir dos veces en el mismo torneo.',
        en: 'The k contestants are drawn one by one from the whole population, so an individual may appear twice in the same tournament.',
      },
    },
    without: {
      name: { es: 'Sin reemplazo', en: 'Without replacement' },
      desc: {
        es: 'Los k contendientes de cada torneo son distintos: el que sale ya no vuelve a sortearse en ese torneo.',
        en: 'The k contestants of each tournament are different: once drawn, an individual is not drawn again in that tournament.',
      },
    },
  };

  const explanation = {
    es: [
      'En la selección por torneo, cada padre sale de un pequeño torneo: se toman k individuos al azar y gana el de mayor aptitud. Se repite N veces, una por padre. Se atribuye a la tesis de Brindle (1981) y Goldberg y Deb (1991) la analizaron junto a la ruleta y el rango. Hoy es probablemente la selección más usada.',
      'El tamaño del torneo k controla la presión de selección. Con k = 1 la selección es al azar; con k = 2 (torneo binario) el mejor de la población gana todos los torneos en que participa y el peor no gana ninguno, salvo que, con reemplazo, se enfrente a sí mismo; cuanto mayor es k, más fácil es que en cada torneo esté alguno de los mejores y menos oportunidades tienen los demás. En el torneo estocástico, el mejor del torneo solo gana con probabilidad p; si no, gana el segundo con p(1 − p), y así sucesivamente. Bajar p suaviza la presión sin cambiar k.',
      'Como solo compara aptitudes, no depende de su escala, igual que el rango: basta con saber cuál de dos individuos es mejor. Tampoco hace falta conocer la aptitud de toda la población ni ordenarla, lo que lo hace muy práctico cuando la población es grande, cuando la aptitud es ruidosa (Miller y Goldberg, 1995) o cuando los torneos se reparten entre varios procesadores.',
      'Con reemplazo, un individuo puede salir dos veces en el mismo torneo; sin reemplazo, los k contendientes son distintos y el peor nunca gana, ni siquiera contra sí mismo. Con k = 2, el número esperado de copias de cada individuo es el mismo que en el ranking lineal: con s = 2 − 1/N si el torneo es con reemplazo (Blickle y Thiele, 1996) y con s = 2 si es sin reemplazo.',
      'Coste: O(k) por torneo y O(N · k) en total, sin ordenar ni normalizar la aptitud.',
    ],
    en: [
      'In tournament selection, each parent comes from a small tournament: k individuals are drawn at random and the fittest wins. It is repeated N times, once per parent. It is attributed to Brindle’s (1981) thesis, and Goldberg and Deb (1991) analysed it alongside the roulette wheel and ranking. Today it is probably the most widely used selection.',
      'The tournament size k controls the selection pressure. With k = 1 selection is random; with k = 2 (binary tournament) the best individual of the population wins every tournament it takes part in and the worst wins none, unless, with replacement, it faces itself; the larger k, the more likely it is that one of the best is in each tournament and the fewer chances the others get. In the stochastic tournament, the best contestant only wins with probability p; otherwise the second wins with p(1 − p), and so on. Lowering p softens the pressure without changing k.',
      'Since it only compares fitness values, it does not depend on their scale, just like ranking: it is enough to know which of two individuals is better. Nor is it necessary to know the fitness of the whole population or to sort it, which makes it very practical when the population is large, when fitness is noisy (Miller and Goldberg, 1995) or when tournaments are spread across several processors.',
      'With replacement, an individual may appear twice in the same tournament; without replacement, the k contestants are different and the worst never wins, not even against itself. With k = 2, the expected number of copies of each individual is the same as in linear ranking: with s = 2 − 1/N if the tournament is with replacement (Blickle and Thiele, 1996) and with s = 2 if it is without replacement.',
      'Cost: O(k) per tournament and O(N · k) in total, with no sorting or normalising of fitness.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Se harán {n} torneos, uno por padre: en cada uno compiten k = {k} individuos tomados al azar y gana el de mayor aptitud.',
      introStoch: 'Partimos de una población de {n} individuos con su aptitud. Se harán {n} torneos, uno por padre: en cada uno compiten k = {k} individuos tomados al azar. Es un torneo estocástico: el mejor gana con probabilidad p = {pt}; si no, el segundo con p(1 − p), y así sucesivamente.',
      tour: 'Torneo {t}: compiten {list}. Gana {who}, el de mayor aptitud, que pasa a la población de padres.',
      tourRepeat: 'Torneo {t}: compiten {list}; con reemplazo, un individuo puede salir dos veces. Gana {who}, el de mayor aptitud, que pasa a la población de padres.',
      tourStochBest: 'Torneo {t}: compiten {list}. r = {r} < p = {pt}: gana el mejor, {who}, que pasa a la población de padres.',
      tourStochOther: 'Torneo {t}: compiten {list}. r = {r} cae en el tramo del puesto {place}, [{lo}, {hi}): no gana el mejor ({bestWho}) sino {who}, que pasa a la población de padres.',
      done: C.doneText.es,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. There will be {n} tournaments, one per parent: in each one k = {k} randomly drawn individuals compete and the fittest wins.',
      introStoch: 'We start from a population of {n} individuals with their fitness. There will be {n} tournaments, one per parent: in each one k = {k} randomly drawn individuals compete. It is a stochastic tournament: the best wins with probability p = {pt}; otherwise the second with p(1 − p), and so on.',
      tour: 'Tournament {t}: {list} compete. {who}, the fittest, wins and joins the parents.',
      tourRepeat: 'Tournament {t}: {list} compete; with replacement, an individual may appear twice. {who}, the fittest, wins and joins the parents.',
      tourStochBest: 'Tournament {t}: {list} compete. r = {r} < p = {pt}: the best, {who}, wins and joins the parents.',
      tourStochOther: 'Tournament {t}: {list} compete. r = {r} falls in the stretch of place {place}, [{lo}, {hi}): the best ({bestWho}) does not win, {who} does, and joins the parents.',
      done: C.doneText.en,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_POR_TORNEO(f, k, p)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'loop', indent: 1, text: 'para t ← 1 hasta N' },
      { id: 'draw', indent: 2, text: 'C ← k individuos al azar (con o sin reemplazo)' },
      { id: 'rank', indent: 2, text: 'ordenar C de mayor a menor aptitud' },
      { id: 'det', indent: 2, text: 'si p = 1: ganador ← C_1' },
      { id: 'stoch', indent: 2, text: 'si no: r ← número aleatorio; ganador ← C_m con m el puesto en cuyo tramo cae r' },
      { id: 'add', indent: 2, text: 'padres_t ← ganador' },
      { id: 'return', indent: 1, text: 'devolver padres' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'TOURNAMENT_SELECTION(f, k, p)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'loop', indent: 1, text: 'for t ← 1 to N' },
      { id: 'draw', indent: 2, text: 'C ← k random individuals (with or without replacement)' },
      { id: 'rank', indent: 2, text: 'sort C from highest to lowest fitness' },
      { id: 'det', indent: 2, text: 'if p = 1: winner ← C_1' },
      { id: 'stoch', indent: 2, text: 'else: r ← random number; winner ← C_m with m the place whose stretch r falls in' },
      { id: 'add', indent: 2, text: 'parents_t ← winner' },
      { id: 'return', indent: 1, text: 'return parents' },
    ],
  };
  const keywords = { es: ['para', 'hasta', 'si no', 'si', 'ordenar', 'devolver'], en: ['for', 'to', 'if', 'else', 'sort', 'return'] };
  const stepLines = {
    intro: ['sig', 'n'], tour: ['loop', 'draw', 'rank', 'det', 'add'], done: ['return'],
  };
  // En el torneo estocástico, la línea resaltada es la del sorteo de r
  stepLines.tourStoch = ['loop', 'draw', 'rank', 'stoch', 'add'];
  const fnName = { python: 'tournament', javascript: 'tournament' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'tournament.py',
      template: `"""
{{title}}
{{ref}}
"""
import random


def tournament(fitness, k=2, p=1.0, rng=random, replacement=True):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    parents = []
    for _ in range(n):
        if replacement:
            contestants = [int(rng.random() * n) for _ in range(k)]  # {{with}}
        else:
            available = list(range(n))
            contestants = []
            for _ in range(k):
                j = int(rng.random() * len(available))  # {{without}}
                contestants.append(available.pop(j))
        ranked = sorted(contestants, key=lambda i: -fitness[i])  # {{rank}}
        place = 0
        if p < 1:
            r = rng.random()  # {{stoch}}
            rest = 1.0
            cumulative = 0.0
            while place < k - 1:
                cumulative += rest * p
                if r < round(cumulative, 9):  # {{round}}
                    break
                rest *= 1 - p
                place += 1
        parents.append(ranked[place])
    return parents


if __name__ == "__main__":
    # {{example}}
    random.seed(1)
    print(tournament([169, 576, 64, 361], k=2))
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'tournament.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function tournament(fitness, k = 2, p = 1, random = Math.random, replacement = true) {
  const n = fitness.length;
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const parents = [];
  for (let t = 0; t < n; t++) {
    let contestants = [];
    if (replacement) {
      for (let m = 0; m < k; m++) contestants.push(Math.floor(random() * n)); // {{with}}
    } else {
      const available = [...fitness.keys()];
      for (let m = 0; m < k; m++) {
        const j = Math.floor(random() * available.length); // {{without}}
        contestants.push(available.splice(j, 1)[0]);
      }
    }
    const ranked = contestants.slice().sort((a, b) => fitness[b] - fitness[a]); // {{rank}}
    let place = 0;
    if (p < 1) {
      const r = random(); // {{stoch}}
      let rest = 1;
      let cumulative = 0;
      while (place < k - 1) {
        cumulative += rest * p;
        if (r < round9(cumulative)) break;
        rest *= 1 - p;
        place++;
      }
    }
    parents.push(ranked[place]);
  }
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tournament };
  if (require.main === module) {
    // {{example}}
    console.log(tournament([169, 576, 64, 361], 2));
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección por torneo (determinista o estocástico).',
      ref: 'Brindle (1981); Goldberg y Deb (1991). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Elige N padres (índices, empezando en 0): cada uno es el ganador de un torneo entre k individuos tomados al azar.',
      doc2: 'Si p < 1, el mejor del torneo gana con probabilidad p, el segundo con p(1 − p)… rng da los números aleatorios en [0, 1).',
      with: 'con reemplazo: un individuo puede salir dos veces',
      without: 'sin reemplazo: el que sale se quita de los disponibles',
      rank: 'de mayor a menor aptitud; a igual aptitud, por orden de sorteo',
      stoch: 'torneo estocástico: un número decide qué puesto gana',
      round: 'se redondea para que los empates se resuelvan como a mano',
      example: 'Ejemplo de Goldberg (x²): torneos binarios con números aleatorios cualesquiera',
    },
    en: {
      title: 'Tournament selection (deterministic or stochastic).',
      ref: 'Brindle (1981); Goldberg and Deb (1991). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Chooses N parents (indices, starting at 0): each one is the winner of a tournament between k randomly drawn individuals.',
      doc2: 'If p < 1, the best contestant wins with probability p, the second with p(1 − p)… rng provides the random numbers in [0, 1).',
      with: 'with replacement: an individual may appear twice',
      without: 'without replacement: once drawn, it is removed from the available ones',
      rank: 'from highest to lowest fitness; with equal fitness, in draw order',
      stoch: 'stochastic tournament: one number decides which place wins',
      round: 'rounded so that ties are resolved as by hand',
      example: 'Goldberg’s example (x²): binary tournaments with arbitrary random numbers',
    },
  };

  const references = [
    C.ref('brindle', {
      es: 'Tesis en la que suele situarse el origen de la selección por torneo (Goldberg y Deb, 1991, la atribuyen a Wetzel y a Brindle).',
      en: 'Thesis usually cited as the origin of tournament selection (Goldberg and Deb, 1991, attribute it to Wetzel and Brindle).',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: selección por torneo y cómo k regula la presión de selección.',
      en: 'Core course reference: tournament selection and how k controls selection pressure.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('goldbergDeb', {
      es: 'Analiza el torneo binario y su tiempo de toma de control frente a la ruleta y el rango.',
      en: 'Analyses the binary tournament and its takeover time compared with the roulette wheel and ranking.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.4: selección por torneo, con y sin reemplazo, y torneo estocástico.',
      en: 'Section 5.2.4: tournament selection, with and without replacement, and the stochastic tournament.',
    }),
    C.ref('millerGoldberg', {
      es: 'Presión de selección del torneo según k y su comportamiento con aptitud ruidosa.',
      en: 'Selection pressure of the tournament as a function of k and its behaviour with noisy fitness.',
    }),
    C.ref('blickle', {
      es: 'Intensidad de selección y pérdida de diversidad del torneo; su equivalencia con el ranking lineal para k = 2.',
      en: 'Selection intensity and loss of diversity of the tournament; its equivalence with linear ranking for k = 2.',
    }),
  ];

  const api = Object.assign({
    id: 'tournament', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).tournament = api;
})(typeof self !== 'undefined' ? self : this);
