/*
 * Contenido docente de la selección de Axelrod (1986), con el ajuste del tamaño de la población y
 * el caso σ = 0 de Galán e Izquierdo (2005).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const explanation = {
    es: [
      'Esta regla no viene de los algoritmos genéticos, sino de la simulación social. Axelrod (1986) la usó en su modelo evolutivo de las normas (el juego de las normas y el de las metanormas): veinte agentes juegan, acumulan una puntuación y, al final de cada generación, la selección decide qué estrategias se copian en la siguiente. Se incluye aquí como propuesta no estándar porque enseña algo que los mecanismos de los manuales no enseñan.',
      'La regla es sencilla: se calculan la media f̄ y la desviación típica σ de la población, y cada individuo tiene 2 hijos si su aptitud llega a f̄ + σ, ninguno si no pasa de f̄ − σ y 1 en el resto. Dicho con la distancia a la media en desviaciones típicas, z = (f − f̄)/σ: z ≥ 1 → 2 hijos, z ≤ −1 → ninguno. Como el truncamiento sigma de «Ruleta con escalado», solo depende de f̄ y σ, así que no cambia si se suma una constante a todas las aptitudes (compárala con el contraejemplo de la aptitud desplazada) o si se multiplican por un número positivo. Con aptitudes aproximadamente normales, en torno al 16 % de la población tiene 2 hijos y otro 16 %, ninguno.',
      'El problema está en lo que la regla no dice. El número de hijos M no tiene por qué ser N, y Axelrod (1986) no explica cómo se mantiene constante el tamaño de la población. Galán e Izquierdo (2005), al reimplementar el modelo, eliminan hijos al azar si sobran y duplican hijos al azar si faltan. Además, si todos tienen la misma aptitud, σ = 0 y la regla es ambigua: cada individuo cumple a la vez f ≥ f̄ + σ y f ≤ f̄ − σ. En su código (nota 4), todos se replican dos veces y después se elimina al azar la mitad, y avisan de que resolverlo de otra forma puede cambiar mucho los resultados a largo plazo. Esta herramienta hace exactamente lo mismo, para no añadir una tercera versión.',
      'Lo que enseña: casi todo es determinista (solo el ajuste a N es aleatorio), así que el muestreo apenas tiene ruido; compara su «variabilidad del muestreo» con la de la ruleta o el torneo en «Comparar mecanismos». Ese detalle importa. Galán e Izquierdo (2005, §6.11–6.16) repitieron el juego de las metanormas con torneo, ruleta y otra selección por la media, y los resultados cambiaron mucho: con mecanismos más ruidosos, la norma que parecía establecida se derrumbaba, porque el ruido (la deriva) ayuda a salir de ese estado. La elección del mecanismo de selección, y describirlo por completo, forma parte del modelo.',
      'La presión está acotada: nadie tiene más de 2 hijos, por mucho que destaque, y los que están cerca de la media tienen 1 tanto si están un poco por encima como un poco por debajo. Coste: O(N) para la media, σ y los hijos, más los ajustes.',
    ],
    en: [
      'This rule does not come from genetic algorithms but from social simulation. Axelrod (1986) used it in his evolutionary model of norms (the norms game and the metanorms game): twenty agents play, collect a score and, at the end of each generation, selection decides which strategies are copied into the next one. It is included here as a non-standard proposal because it teaches something the textbook mechanisms do not.',
      'The rule is simple: compute the mean f̄ and the standard deviation σ of the population; each individual gets 2 offspring if its fitness reaches f̄ + σ, none if it does not exceed f̄ − σ, and 1 otherwise. In terms of the distance to the mean in standard deviations, z = (f − f̄)/σ: z ≥ 1 → 2 offspring, z ≤ −1 → none. Like sigma truncation in “Roulette wheel with scaling”, it depends only on f̄ and σ, so it does not change if a constant is added to every fitness value (compare it with the shifted-fitness counterexample) or if they are multiplied by a positive number. With roughly normal fitness, about 16% of the population gets 2 offspring and another 16% gets none.',
      'The trouble lies in what the rule does not say. The number of offspring M need not be N, and Axelrod (1986) does not explain how the population size is kept constant. Galán and Izquierdo (2005), re-implementing the model, remove offspring at random if there are too many and duplicate offspring at random if there are too few. Besides, if everyone has the same fitness, σ = 0 and the rule is ambiguous: every individual meets both f ≥ f̄ + σ and f ≤ f̄ − σ. In their code (footnote 4), everyone is replicated twice and then half of them are removed at random, and they warn that handling it differently can change the long-term results significantly. This tool does exactly the same, so as not to add a third version.',
      'What it teaches: almost everything is deterministic (only the adjustment to N is random), so sampling has hardly any noise; compare its “sampling variability” with that of the roulette wheel or the tournament in “Compare mechanisms”. That detail matters. Galán and Izquierdo (2005, §6.11–6.16) re-ran the metanorms game with tournament, roulette wheel and another selection based on the mean, and the results changed a lot: with noisier mechanisms, the norm that seemed established collapsed, because noise (drift) helps to escape from that state. Choosing the selection mechanism, and describing it completely, is part of the model.',
      'The pressure is bounded: no one gets more than 2 offspring, however much it stands out, and those near the mean get 1 whether they are slightly above or slightly below it. Cost: O(N) for the mean, σ and the offspring, plus the adjustments.',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Axelrod (1986) no gira ninguna ruleta: cada individuo tiene 0, 1 o 2 hijos según lo lejos que esté de la media, medido en desviaciones típicas.',
      stats: 'Media f̄ = {mean} y desviación típica σ = {sd} (dividiendo entre N). Las líneas marcan los umbrales: quien llegue a f̄ + σ = {plus} tendrá 2 hijos y quien no pase de f̄ − σ = {minus}, ninguno.',
      statsNeg: 'Media f̄ = {mean} y desviación típica σ = {sd} (dividiendo entre N). Quien llegue a f̄ + σ = {plus} (la línea) tendrá 2 hijos. El otro umbral, f̄ − σ = {minus}, es negativo: nadie queda por debajo, así que nadie se quedará sin hijos.',
      statsFlat: 'Todos los individuos tienen la misma aptitud, f̄ = {mean}: la desviación típica es σ = 0 y los dos umbrales, f̄ + σ y f̄ − σ, coinciden con la media.',
      z: 'Para cada individuo, z = (f − f̄)/σ dice a cuántas desviaciones típicas está de la media. Por ejemplo, el mejor, {who} (f = {f}), está a z = {zb}.',
      classify: 'Regla de Axelrod: z ≥ 1 → 2 hijos ({two}); z ≤ −1 → ninguno ({zero}); el resto → 1 hijo ({one}). En total, M = {m} hijos.',
      classifyFlat: 'Con σ = 0 la regla es ambigua: cada individuo cumple a la vez f ≥ f̄ + σ y f ≤ f̄ − σ. Como en el código de Galán e Izquierdo (2005, nota 4), todos se replican dos veces: M = 2 · {n} = {m} hijos.',
      balanced: 'M = N = {n}: el número de hijos coincide con el de individuos y no hace falta ajustar nada. Esta vez el azar no interviene.',
      excess: 'Hay M = {m} hijos para N = {n} huecos: sobran {d}. Axelrod (1986) no dice cómo se mantiene el tamaño; como en Galán e Izquierdo (2005), se eliminan hijos al azar, de uno en uno.',
      deficit: 'Hay M = {m} hijos para N = {n} huecos: faltan {d}. Axelrod (1986) no dice cómo se mantiene el tamaño; como en Galán e Izquierdo (2005), se duplican hijos elegidos al azar, de uno en uno.',
      adjustFlat: 'Hay M = {m} hijos para N = {n} huecos. Como en Galán e Izquierdo (2005, nota 4), se elimina al azar la mitad, de uno en uno.',
      remove: 'Ajuste {k}: se sortea uno de los {m} hijos (en orden: A, A, B…). Sale el {pos}.º, una copia de {who}, y se elimina. Quedan {left}.',
      add: 'Ajuste {k}: se sortea uno de los {m} hijos (en orden: A, A, B…). Sale el {pos}.º, una copia de {who}, y se duplica. Ya hay {left}.',
      pick: 'Padre {k}: los hijos ocupan los huecos en orden; le toca a una copia de {who} ({who} tendrá {c} en total).',
      done: C.doneText.es,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. Axelrod (1986) spins no wheel: each individual gets 0, 1 or 2 offspring depending on how far it is from the mean, measured in standard deviations.',
      stats: 'Mean f̄ = {mean} and standard deviation σ = {sd} (dividing by N). The lines mark the thresholds: whoever reaches f̄ + σ = {plus} will get 2 offspring, and whoever does not exceed f̄ − σ = {minus}, none.',
      statsNeg: 'Mean f̄ = {mean} and standard deviation σ = {sd} (dividing by N). Whoever reaches f̄ + σ = {plus} (the line) will get 2 offspring. The other threshold, f̄ − σ = {minus}, is negative: no one falls below it, so no one will be left without offspring.',
      statsFlat: 'All individuals have the same fitness, f̄ = {mean}: the standard deviation is σ = 0 and both thresholds, f̄ + σ and f̄ − σ, coincide with the mean.',
      z: 'For each individual, z = (f − f̄)/σ tells how many standard deviations it is from the mean. For example, the best, {who} (f = {f}), is at z = {zb}.',
      classify: 'Axelrod’s rule: z ≥ 1 → 2 offspring ({two}); z ≤ −1 → none ({zero}); the rest → 1 offspring ({one}). In total, M = {m} offspring.',
      classifyFlat: 'With σ = 0 the rule is ambiguous: every individual meets both f ≥ f̄ + σ and f ≤ f̄ − σ. As in the code of Galán and Izquierdo (2005, footnote 4), everyone is replicated twice: M = 2 · {n} = {m} offspring.',
      balanced: 'M = N = {n}: the number of offspring matches the number of individuals and nothing needs adjusting. This time chance plays no part.',
      excess: 'There are M = {m} offspring for N = {n} slots: {d} too many. Axelrod (1986) does not say how the size is kept; as in Galán and Izquierdo (2005), offspring are removed at random, one at a time.',
      deficit: 'There are M = {m} offspring for N = {n} slots: {d} too few. Axelrod (1986) does not say how the size is kept; as in Galán and Izquierdo (2005), randomly chosen offspring are duplicated, one at a time.',
      adjustFlat: 'There are M = {m} offspring for N = {n} slots. As in Galán and Izquierdo (2005, footnote 4), half of them are removed at random, one at a time.',
      remove: 'Adjustment {k}: one of the {m} offspring (in order: A, A, B…) is drawn. Number {pos} comes out, a copy of {who}, and it is removed. {left} remain.',
      add: 'Adjustment {k}: one of the {m} offspring (in order: A, A, B…) is drawn. Number {pos} comes out, a copy of {who}, and it is duplicated. There are now {left}.',
      pick: 'Parent {k}: the offspring fill the slots in order; this one is a copy of {who} ({who} will have {c} in total).',
      done: C.doneText.en,
    },
  };

  const pseudocode = {
    es: [
      { id: 'sig', indent: 0, text: 'SELECCIÓN_DE_AXELROD(f)' },
      { id: 'n', indent: 1, text: 'N ← número de individuos' },
      { id: 'stats', indent: 1, text: 'f̄ ← media de f; σ ← desviación típica de f (dividiendo entre N)' },
      { id: 'loop', indent: 1, text: 'para cada individuo i' },
      { id: 'flat', indent: 2, text: 'si σ = 0 entonces c_i ← 2   // Galán e Izquierdo (2005), nota 4' },
      { id: 'two', indent: 2, text: 'si no, si (f_i − f̄)/σ ≥ 1 entonces c_i ← 2' },
      { id: 'zero', indent: 2, text: 'si no, si (f_i − f̄)/σ ≤ −1 entonces c_i ← 0' },
      { id: 'one', indent: 2, text: 'si no c_i ← 1' },
      { id: 'list', indent: 1, text: 'H ← lista con c_i copias de cada individuo i, en orden (A, A, B…)' },
      { id: 'remove', indent: 1, text: 'mientras |H| > N: quitar de H un hijo elegido al azar' },
      { id: 'add', indent: 1, text: 'mientras |H| < N: duplicar, junto a él, un hijo de H elegido al azar' },
      { id: 'return', indent: 1, text: 'devolver H como padres' },
    ],
    en: [
      { id: 'sig', indent: 0, text: 'AXELROD_SELECTION(f)' },
      { id: 'n', indent: 1, text: 'N ← number of individuals' },
      { id: 'stats', indent: 1, text: 'f̄ ← mean of f; σ ← standard deviation of f (dividing by N)' },
      { id: 'loop', indent: 1, text: 'for each individual i' },
      { id: 'flat', indent: 2, text: 'if σ = 0 then c_i ← 2   // Galán and Izquierdo (2005), footnote 4' },
      { id: 'two', indent: 2, text: 'else if (f_i − f̄)/σ ≥ 1 then c_i ← 2' },
      { id: 'zero', indent: 2, text: 'else if (f_i − f̄)/σ ≤ −1 then c_i ← 0' },
      { id: 'one', indent: 2, text: 'else c_i ← 1' },
      { id: 'list', indent: 1, text: 'H ← list with c_i copies of each individual i, in order (A, A, B…)' },
      { id: 'remove', indent: 1, text: 'while |H| > N: remove from H a randomly chosen offspring' },
      { id: 'add', indent: 1, text: 'while |H| < N: duplicate, next to it, a randomly chosen offspring of H' },
      { id: 'return', indent: 1, text: 'return H as parents' },
    ],
  };
  const keywords = {
    es: ['para cada', 'si no', 'si', 'entonces', 'mientras', 'devolver'],
    en: ['for each', 'else', 'if', 'then', 'while', 'return'],
  };
  const stepLines = {
    intro: ['sig', 'n'],
    stats: ['stats'],
    z: ['loop'],
    classify: ['loop', 'two', 'zero', 'one', 'list'],
    classifyFlat: ['loop', 'flat', 'list'],
    balanced: ['remove', 'add'],
    adjust: ['remove', 'add'],
    remove: ['remove'],
    add: ['add'],
    pick: ['return'],
    done: ['return'],
  };
  const fnName = { python: 'axelrod', javascript: 'axelrod' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'axelrod.py',
      template: `"""
{{title}}
{{ref}}
"""
import math
import random


def axelrod(fitness, rng=random):
    """{{doc1}}

    {{doc2}}
    """
    n = len(fitness)
    mean = sum(fitness) / n
    sd = math.sqrt(sum((f - mean) ** 2 for f in fitness) / n)  # {{sd}}
    kids = []
    for i, f in enumerate(fitness):
        if sd == 0:
            c = 2  # {{flat}}
        else:
            z = round((f - mean) / sd, 9)  # {{z}}
            c = 2 if z >= 1 else 0 if z <= -1 else 1
        kids += [i] * c  # {{list}}
    while len(kids) > n:
        del kids[int(rng.random() * len(kids))]  # {{remove}}
    while len(kids) < n:
        j = int(rng.random() * len(kids))
        kids.insert(j, kids[j])  # {{add}}
    return kids


if __name__ == "__main__":
    # {{example}}
    print(axelrod([169, 576, 64, 361]))  # [0, 1, 1, 3]: A B B D
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'axelrod.js',
      template: `/**
 * {{title}}
 * {{ref}}
 *
 * {{doc1}}
 * {{doc2}}
 */
function axelrod(fitness, random = Math.random) {
  const n = fitness.length;
  const mean = fitness.reduce((s, f) => s + f, 0) / n;
  const sd = Math.sqrt(fitness.reduce((s, f) => s + (f - mean) * (f - mean), 0) / n); // {{sd}}
  const kids = [];
  fitness.forEach((f, i) => {
    let c;
    if (sd === 0) {
      c = 2; // {{flat}}
    } else {
      const z = Math.round(((f - mean) / sd) * 1e9) / 1e9; // {{z}}
      c = z >= 1 ? 2 : z <= -1 ? 0 : 1;
    }
    for (let k = 0; k < c; k++) kids.push(i); // {{list}}
  });
  while (kids.length > n) {
    kids.splice(Math.floor(random() * kids.length), 1); // {{remove}}
  }
  while (kids.length < n) {
    const j = Math.floor(random() * kids.length);
    kids.splice(j, 0, kids[j]); // {{add}}
  }
  return kids;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { axelrod };
  if (require.main === module) {
    // {{example}}
    console.log(axelrod([169, 576, 64, 361])); // [0, 1, 1, 3]: A B B D
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección de Axelrod (1986): 0, 1 o 2 hijos según la distancia a la media en desviaciones típicas.',
      ref: 'Axelrod (1986); ajuste del tamaño y caso σ = 0 como en Galán e Izquierdo (2005, §3.4 y nota 4). Herramienta docente «Selección en algoritmos genéticos».',
      doc1: 'Devuelve N padres (índices, empezando en 0), ordenados por individuo: 2 hijos si z ≥ 1, ninguno si z ≤ −1 y 1 si no.',
      doc2: 'Si sobran hijos se quitan al azar; si faltan, se duplican al azar. rng da los números aleatorios en [0, 1).',
      sd: 'desviación típica poblacional (dividiendo entre N)',
      flat: 'σ = 0: todos se replican dos veces y después sobra la mitad (Galán e Izquierdo, 2005, nota 4)',
      z: 'distancia a la media en σ (el redondeo hace que z = 1 exacto no quede en 0,9999999999)',
      list: 'lista de hijos ordenada por individuo',
      remove: 'sobran: se quita un hijo cualquiera, con igual probabilidad',
      add: 'faltan: se duplica un hijo cualquiera; la copia va junto al original',
      example: 'Ejemplo de Goldberg (x²): B tiene 2 hijos, C ninguno y no hace falta ajustar',
    },
    en: {
      title: 'Axelrod’s selection (1986): 0, 1 or 2 offspring depending on the distance to the mean in standard deviations.',
      ref: 'Axelrod (1986); size adjustment and the σ = 0 case as in Galán and Izquierdo (2005, §3.4 and footnote 4). Teaching tool “Selection in genetic algorithms”.',
      doc1: 'Returns N parents (indices, starting at 0), sorted by individual: 2 offspring if z ≥ 1, none if z ≤ −1 and 1 otherwise.',
      doc2: 'If there are too many offspring they are removed at random; if too few, they are duplicated at random. rng provides the random numbers in [0, 1).',
      sd: 'population standard deviation (dividing by N)',
      flat: 'σ = 0: everyone is replicated twice and then half are left over (Galán and Izquierdo, 2005, footnote 4)',
      z: 'distance to the mean in σ (rounding keeps an exact z = 1 from becoming 0.9999999999)',
      list: 'list of offspring sorted by individual',
      remove: 'too many: any offspring is removed, with equal probability',
      add: 'too few: any offspring is duplicated; the copy goes next to the original',
      example: 'Goldberg’s example (x²): B gets 2 offspring, C none, and no adjustment is needed',
    },
  };

  const references = [
    C.ref('axelrod1986', {
      es: 'Fuente original: el modelo evolutivo de las normas y las metanormas, con esta regla de selección por desviaciones típicas.',
      en: 'Original source: the evolutionary model of norms and metanorms, with this standard-deviation selection rule.',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: métodos de selección de los algoritmos evolutivos, para compararlos con esta regla.',
      en: 'Core course reference: selection methods of evolutionary algorithms, to compare them with this rule.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('galanIzquierdo2005', {
      es: 'Reimplementación del modelo de Axelrod: cómo mantener N (§3.4), el caso σ = 0 (nota 4) y la comparación con torneo, ruleta y selección por la media (§6.11–6.16). La herramienta sigue sus decisiones.',
      en: 'Re-implementation of Axelrod’s model: how to keep N (§3.4), the σ = 0 case (footnote 4) and the comparison with tournament, roulette wheel and selection by the mean (§6.11–6.16). The tool follows their choices.',
    }),
    C.ref('selectionMechanisms', {
      es: 'App Shiny de los mismos autores: simulaciones de muchas generaciones con los mecanismos clásicos, para contrastar el ruido de cada uno.',
      en: 'Shiny app by the same authors: many-generation simulations with the classic mechanisms, to contrast the noise of each one.',
    }),
  ];

  const api = Object.assign({
    id: 'axelrod', explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {}).axelrod = api;
})(typeof self !== 'undefined' ? self : this);
