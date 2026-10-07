/*
 * Contenido docente de la ruleta con escalado de la aptitud (lineal y truncamiento sigma).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const C = isNode ? require('./common.js') : root.GAX.contentCommon;

  const variants = {
    linear: {
      name: { es: 'Escalado lineal', en: 'Linear scaling' },
      desc: {
        es: 'f′ = a · f + b, con la media igual y el mejor en cm veces la media; si el peor quedara negativo, se escala para que valga 0.',
        en: 'f′ = a · f + b, keeping the mean and putting the best at cm times the mean; if the worst became negative, it is scaled to 0 instead.',
      },
    },
    sigma: {
      name: { es: 'Truncamiento sigma', en: 'Sigma truncation' },
      desc: {
        es: 'f′ = máx(0, f − (f̄ − c · σ)): se resta una base que depende de la dispersión de la población y lo negativo se deja en 0.',
        en: 'f′ = max(0, f − (f̄ − c · σ)): a baseline that depends on the population’s spread is subtracted and anything negative is set to 0.',
      },
    },
  };

  const explanation = {
    es: [
      'El escalado transforma la aptitud f en una aptitud escalada f′ antes de girar la ruleta, para que la presión de selección no dependa de la escala de la aptitud ni de la fase de la búsqueda. Goldberg (1989) lo presenta como el remedio de los dos males de la ruleta: al principio, un superindividuo acapara la población; al final, cuando las aptitudes se parecen, la selección deja de empujar.',
      'Escalado lineal: f′ = a · f + b, con a y b elegidos para que la media no cambie (cada individuo medio sigue esperando una copia) y el mejor valga cm veces la media (espera cm copias; se suele usar cm entre 1,2 y 2). Así se frena al superindividuo del principio y se estira la diferencia entre aptitudes parecidas del final. Si al estirar el peor quedara con aptitud negativa, se escala en su lugar para que el peor valga 0 y la media se mantenga.',
      'Truncamiento sigma (Forrest, 1985, citado por Goldberg, 1989): f′ = máx(0, f − (f̄ − c · σ)), donde f̄ y σ son la media y la desviación típica de la población y c suele valer entre 1 y 3. Restar la base f̄ − c · σ hace que la presión dependa de cuánto destaca cada individuo respecto a la dispersión de la población, no del valor absoluto de la aptitud; los que quedan por debajo de la base reciben 0 y no pueden ser padres.',
      'El escalado se recalcula en cada generación, con la población de ese momento. Es una solución a medias: sigue usando los valores de la aptitud y hay que ajustar cm o c. Por eso hoy se prefieren la selección por rango o por torneo, que no dependen de la escala (Eiben y Smith, 2015).',
    ],
    en: [
      'Scaling transforms fitness f into a scaled fitness f′ before spinning the wheel, so that selection pressure depends neither on the scale of fitness nor on the stage of the search. Goldberg (1989) presents it as the remedy for the two ills of the roulette wheel: early on, a super-individual takes over the population; later, when fitness values are similar, selection stops pushing.',
      'Linear scaling: f′ = a · f + b, with a and b chosen so that the mean does not change (each average individual still expects one copy) and the best is worth cm times the mean (it expects cm copies; cm between 1.2 and 2 is usual). This holds back the early super-individual and stretches the differences between similar fitness values later on. If stretching left the worst with negative fitness, it is scaled instead so that the worst is worth 0 and the mean is kept.',
      'Sigma truncation (Forrest, 1985, cited by Goldberg, 1989): f′ = max(0, f − (f̄ − c · σ)), where f̄ and σ are the mean and standard deviation of the population and c is usually between 1 and 3. Subtracting the baseline f̄ − c · σ makes pressure depend on how much each individual stands out relative to the population’s spread, not on the absolute value of fitness; those below the baseline get 0 and cannot become parents.',
      'Scaling is recomputed every generation, with the current population. It is a partial fix: it still uses the fitness values and cm or c have to be tuned. That is why rank-based and tournament selection, which do not depend on scale, are preferred today (Eiben and Smith, 2015).',
    ],
  };

  const narration = {
    es: {
      intro: 'Partimos de una población de {n} individuos con su aptitud. Antes de girar la ruleta se escala la aptitud.',
      statsLinear: 'Datos de la población: media f̄ = {mean}, máxima {max} y mínima {min}.',
      scaleLinear: 'Escalado lineal: f′ = a · f + b con a = {a} y b = {b}. La media sigue siendo {mean} y el mejor, {who}, pasa a valer cm · f̄ = {cm} · {mean} = {top}: esperará {cm} copias.',
      scaleLinearMin: 'Escalado lineal: con cm = {cm}, el peor quedaría con aptitud negativa. En su lugar, f′ = a · f + b con a = {a} y b = {b}: el peor vale 0 y la media sigue siendo {mean}. El mejor, {who}, vale {fsBest}.',
      statsSigma: 'Datos de la población: media f̄ = {mean} y desviación típica σ = {sd}.',
      scaleSigma: 'Truncamiento sigma: f′ = máx(0, f − (f̄ − c · σ)) = máx(0, f − {base}) con c = {c}. Se resta la misma base a todos; ninguno queda por debajo.',
      scaleSigmaZero: 'Truncamiento sigma: f′ = máx(0, f − (f̄ − c · σ)) = máx(0, f − {base}) con c = {c}. Se resta la misma base a todos; {zeros} queda por debajo y pasa a valer 0: no podrá ser padre.',
      scaleSigmaZeros: 'Truncamiento sigma: f′ = máx(0, f − (f̄ − c · σ)) = máx(0, f − {base}) con c = {c}. Se resta la misma base a todos; {zeros} quedan por debajo y pasan a valer 0: no podrán ser padres.',
      scaleFlat: 'Todas las aptitudes son iguales: no hay nada que escalar y todos tendrán la misma probabilidad.',
      sum: 'Se suman las aptitudes escaladas: Σf′ = {total}.',
      prob: 'Cada individuo recibe un sector proporcional a su aptitud escalada: p_i = f′_i / Σf′. El mejor, {who}, tiene p = {p} (sin escalar tendría {p0}).',
      cum: 'Las probabilidades acumuladas q reparten el intervalo [0, 1) en tramos consecutivos, uno por individuo; el último, el de {last}, acaba en 1.',
      spin: 'Giro {k}: r = {r}. Cae en el tramo de {who}, [{lo}, {hi}): es el primero con r < q. {who} pasa a la población de padres.',
      done: `${C.doneText.es} Sin escalar, el mejor esperaba {e0} copias; con el escalado, {e1}.`,
    },
    en: {
      intro: 'We start from a population of {n} individuals with their fitness. Fitness is scaled before spinning the wheel.',
      statsLinear: 'Population data: mean f̄ = {mean}, maximum {max} and minimum {min}.',
      scaleLinear: 'Linear scaling: f′ = a · f + b with a = {a} and b = {b}. The mean is still {mean} and the best, {who}, is now worth cm · f̄ = {cm} · {mean} = {top}: it will expect {cm} copies.',
      scaleLinearMin: 'Linear scaling: with cm = {cm}, the worst would get negative fitness. Instead, f′ = a · f + b with a = {a} and b = {b}: the worst is worth 0 and the mean is still {mean}. The best, {who}, is worth {fsBest}.',
      statsSigma: 'Population data: mean f̄ = {mean} and standard deviation σ = {sd}.',
      scaleSigma: 'Sigma truncation: f′ = max(0, f − (f̄ − c · σ)) = max(0, f − {base}) with c = {c}. The same baseline is subtracted from everyone; no one falls below it.',
      scaleSigmaZero: 'Sigma truncation: f′ = max(0, f − (f̄ − c · σ)) = max(0, f − {base}) with c = {c}. The same baseline is subtracted from everyone; {zeros} falls below it and becomes 0: it cannot become a parent.',
      scaleSigmaZeros: 'Sigma truncation: f′ = max(0, f − (f̄ − c · σ)) = max(0, f − {base}) with c = {c}. The same baseline is subtracted from everyone; {zeros} fall below it and become 0: they cannot become parents.',
      scaleFlat: 'All fitness values are equal: there is nothing to scale and everyone will have the same probability.',
      sum: 'The scaled fitness values are added up: Σf′ = {total}.',
      prob: 'Each individual gets a sector proportional to its scaled fitness: p_i = f′_i / Σf′. The best, {who}, has p = {p} (without scaling it would have {p0}).',
      cum: 'The cumulative probabilities q divide the interval [0, 1) into consecutive stretches, one per individual; the last one, {last}’s, ends at 1.',
      spin: 'Spin {k}: r = {r}. It falls in {who}’s stretch, [{lo}, {hi}): the first one with r < q. {who} joins the parents.',
      done: `${C.doneText.en} Without scaling, the best expected {e0} copies; with scaling, {e1}.`,
    },
  };

  const scaleLines = {
    linear: {
      es: [
        { id: 'stats', indent: 1, text: 'f̄ ← media de f; f_máx, f_mín ← máximo y mínimo de f' },
        { id: 'scale', indent: 1, text: 'si f_mín > (cm·f̄ − f_máx)/(cm − 1): a ← (cm − 1)·f̄/(f_máx − f̄); b ← f̄·(f_máx − cm·f̄)/(f_máx − f̄)' },
        { id: 'scale2', indent: 1, text: 'si no: a ← f̄/(f̄ − f_mín); b ← −f_mín·f̄/(f̄ − f_mín)' },
        { id: 'apply', indent: 1, text: 'para i ← 1 hasta N: f′_i ← a·f_i + b' },
      ],
      en: [
        { id: 'stats', indent: 1, text: 'f̄ ← mean of f; f_max, f_min ← maximum and minimum of f' },
        { id: 'scale', indent: 1, text: 'if f_min > (cm·f̄ − f_max)/(cm − 1): a ← (cm − 1)·f̄/(f_max − f̄); b ← f̄·(f_max − cm·f̄)/(f_max − f̄)' },
        { id: 'scale2', indent: 1, text: 'else: a ← f̄/(f̄ − f_min); b ← −f_min·f̄/(f̄ − f_min)' },
        { id: 'apply', indent: 1, text: 'for i ← 1 to N: f′_i ← a·f_i + b' },
      ],
    },
    sigma: {
      es: [
        { id: 'stats', indent: 1, text: 'f̄ ← media de f; σ ← desviación típica de f' },
        { id: 'scale', indent: 1, text: 'base ← f̄ − c·σ' },
        { id: 'apply', indent: 1, text: 'para i ← 1 hasta N: f′_i ← máx(0, f_i − base)' },
      ],
      en: [
        { id: 'stats', indent: 1, text: 'f̄ ← mean of f; σ ← standard deviation of f' },
        { id: 'scale', indent: 1, text: 'base ← f̄ − c·σ' },
        { id: 'apply', indent: 1, text: 'for i ← 1 to N: f′_i ← max(0, f_i − base)' },
      ],
    },
  };
  const tail = {
    es: [
      { id: 'sum', indent: 1, text: 'S ← f′_1 + … + f′_N' },
      { id: 'prob', indent: 1, text: 'para i ← 1 hasta N: p_i ← f′_i / S; q_i ← p_1 + … + p_i' },
      { id: 'loop', indent: 1, text: 'para k ← 1 hasta N' },
      { id: 'spin', indent: 2, text: 'r ← número aleatorio en [0, 1)' },
      { id: 'pick', indent: 2, text: 'padres_k ← primer individuo i con r < q_i' },
      { id: 'return', indent: 1, text: 'devolver padres' },
    ],
    en: [
      { id: 'sum', indent: 1, text: 'S ← f′_1 + … + f′_N' },
      { id: 'prob', indent: 1, text: 'for i ← 1 to N: p_i ← f′_i / S; q_i ← p_1 + … + p_i' },
      { id: 'loop', indent: 1, text: 'for k ← 1 to N' },
      { id: 'spin', indent: 2, text: 'r ← random number in [0, 1)' },
      { id: 'pick', indent: 2, text: 'parents_k ← first individual i with r < q_i' },
      { id: 'return', indent: 1, text: 'return parents' },
    ],
  };
  const pseudocode = (lang, variant) => {
    const l = tail[lang] ? lang : 'es';
    const v = variant === 'sigma' ? 'sigma' : 'linear';
    const sig = { id: 'sig', indent: 0, text: v === 'sigma' ? (l === 'es' ? 'RULETA_CON_TRUNCAMIENTO_SIGMA(f, c)' : 'ROULETTE_WITH_SIGMA_TRUNCATION(f, c)') : (l === 'es' ? 'RULETA_CON_ESCALADO_LINEAL(f, cm)' : 'ROULETTE_WITH_LINEAR_SCALING(f, cm)') };
    const n = { id: 'n', indent: 1, text: l === 'es' ? 'N ← número de individuos' : 'N ← number of individuals' };
    return [sig, n].concat(scaleLines[v][l], tail[l]);
  };
  const keywords = { es: ['para', 'hasta', 'si no', 'si', 'devolver'], en: ['for', 'to', 'if', 'else', 'return'] };
  const stepLines = {
    intro: ['sig', 'n'], stats: ['stats'], scale: ['scale', 'apply'], sum: ['sum'], prob: ['prob'], cum: ['prob'],
    spin: ['loop', 'spin', 'pick'], done: ['return'],
  };
  const fnName = { python: 'scaled_roulette', javascript: 'scaledRoulette' };

  const codeTemplates = {
    python: {
      label: 'Python',
      filename: 'scaled_roulette.py',
      template: `"""
{{title}}
{{ref}}
"""
import math
import random


def scale(fitness, scaling="linear", cm=2.0, c=2.0):
    """{{docScale}}"""
    n = len(fitness)
    if scaling == "linear":
        avg = sum(fitness) / n
        fmax, fmin = max(fitness), min(fitness)
        if fmax == fmin:
            return list(fitness)
        if fmin > (cm * avg - fmax) / (cm - 1):  # {{stretch}}
            delta = fmax - avg
            a = (cm - 1) * avg / delta
            b = avg * (fmax - cm * avg) / delta
        else:  # {{floor}}
            delta = avg - fmin
            a = avg / delta
            b = -fmin * avg / delta
        return [max(0, a * f + b) for f in fitness]
    mean = sum(fitness) / n
    sd = math.sqrt(sum((f - mean) * (f - mean) for f in fitness) / n)
    base = mean - c * sd  # {{base}}
    scaled = [max(0, f - base) for f in fitness]
    return scaled if sum(scaled) > 0 else list(fitness)


def scaled_roulette(fitness, scaling="linear", cm=2.0, c=2.0, rng=random):
    """{{doc1}}"""
    scaled = scale(fitness, scaling, cm, c)
    n = len(scaled)
    total = sum(scaled)
    probs = [g / total for g in scaled]
    parents = []
    for _ in range(n):
        r = rng.random()
        cumulative = 0.0
        for i, p in enumerate(probs):
            cumulative += p
            if r < round(cumulative, 9):  # {{round}}
                break
        parents.append(i)
    return parents


if __name__ == "__main__":
    # {{example}}
    print([round(g, 2) for g in scale([169, 576, 64, 361], "sigma", c=1)])  # [71.77, 478.77, 0, 263.77]
`,
    },
    javascript: {
      label: 'JavaScript',
      filename: 'scaled_roulette.js',
      template: `/**
 * {{title}}
 * {{ref}}
 */

/** {{docScale}} */
function scale(fitness, scaling = 'linear', cm = 2, c = 2) {
  const n = fitness.length;
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  if (scaling === 'linear') {
    const avg = sum(fitness) / n;
    const fmax = Math.max(...fitness);
    const fmin = Math.min(...fitness);
    if (fmax === fmin) return fitness.slice();
    let a;
    let b;
    if (fmin > (cm * avg - fmax) / (cm - 1)) { // {{stretch}}
      const delta = fmax - avg;
      a = ((cm - 1) * avg) / delta;
      b = (avg * (fmax - cm * avg)) / delta;
    } else { // {{floor}}
      const delta = avg - fmin;
      a = avg / delta;
      b = (-fmin * avg) / delta;
    }
    return fitness.map((f) => Math.max(0, a * f + b));
  }
  const mean = sum(fitness) / n;
  const sd = Math.sqrt(sum(fitness.map((f) => (f - mean) * (f - mean))) / n);
  const base = mean - c * sd; // {{base}}
  const scaled = fitness.map((f) => Math.max(0, f - base));
  return sum(scaled) > 0 ? scaled : fitness.slice();
}

/** {{doc1}} */
function scaledRoulette(fitness, scaling = 'linear', cm = 2, c = 2, random = Math.random) {
  const scaled = scale(fitness, scaling, cm, c);
  const n = scaled.length;
  const total = scaled.reduce((s, g) => s + g, 0);
  const probs = scaled.map((g) => g / total);
  const round9 = (x) => Math.round(x * 1e9) / 1e9; // {{round}}
  const parents = [];
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
  return parents;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scale, scaledRoulette };
  if (require.main === module) {
    // {{example}}
    console.log(scale([169, 576, 64, 361], 'sigma', 2, 1).map((g) => Math.round(g * 100) / 100)); // [71.77, 478.77, 0, 263.77]
  }
}
`,
    },
  };

  const codeComments = {
    es: {
      title: 'Selección por ruleta con escalado de la aptitud (lineal o truncamiento sigma).',
      ref: 'Goldberg (1989), cap. 3; truncamiento sigma de Forrest (1985). Herramienta docente «Selección en algoritmos genéticos».',
      docScale: 'Aptitud escalada f′: escalado lineal (media igual, el mejor en cm veces la media) o truncamiento sigma (máx(0, f − (media − c·σ))).',
      doc1: 'Elige N padres (índices, empezando en 0) con la ruleta sobre la aptitud escalada. rng da los números aleatorios en [0, 1).',
      stretch: 'el mejor pasa a valer cm veces la media',
      floor: 'si no, el peor quedaría negativo: se escala para que valga 0',
      base: 'base: los que quedan por debajo valen 0',
      round: 'se redondea para que los empates se resuelvan como a mano',
      example: 'Ejemplo de Goldberg (x²): truncamiento sigma con c = 1; C queda en 0',
    },
    en: {
      title: 'Roulette-wheel selection with fitness scaling (linear or sigma truncation).',
      ref: 'Goldberg (1989), ch. 3; Forrest’s (1985) sigma truncation. Teaching tool “Selection in genetic algorithms”.',
      docScale: 'Scaled fitness f′: linear scaling (same mean, best at cm times the mean) or sigma truncation (max(0, f − (mean − c·σ))).',
      doc1: 'Chooses N parents (indices, starting at 0) with the roulette wheel over the scaled fitness. rng provides the random numbers in [0, 1).',
      stretch: 'the best becomes worth cm times the mean',
      floor: 'otherwise the worst would be negative: it is scaled to 0',
      base: 'baseline: those below it are worth 0',
      round: 'rounded so that ties are resolved as by hand',
      example: 'Goldberg’s example (x²): sigma truncation with c = 1; C ends up at 0',
    },
  };

  const references = [
    C.ref('goldberg', {
      es: 'Fuente original del escalado lineal (cap. 3), con el procedimiento para que el peor no quede negativo, y del truncamiento sigma, que atribuye a Forrest (1985).',
      en: 'Original source of linear scaling (ch. 3), with the procedure to keep the worst from becoming negative, and of sigma truncation, which it attributes to Forrest (1985).',
    }, { original: true }),
    C.ref('talbi', {
      es: 'Referencia básica del curso: escalado de la aptitud y control de la presión de selección.',
      en: 'Core course reference: fitness scaling and control of selection pressure.',
    }),
    C.ref('bautista', {
      es: 'Referencia básica del curso: algoritmos genéticos aplicados a problemas de ingeniería de organización.',
      en: 'Core course reference: genetic algorithms applied to industrial engineering problems.',
    }),
    C.ref('eiben', {
      es: 'Apartado 5.2.1: ventanas, escalado sigma y otros remedios de la selección proporcional.',
      en: 'Section 5.2.1: windowing, sigma scaling and other remedies for proportional selection.',
    }),
    C.ref('selectionMechanisms', {
      es: 'App Shiny de los mismos autores: ruleta y SUS con escalado lineal en simulaciones de muchas generaciones.',
      en: 'Shiny app by the same authors: roulette wheel and SUS with linear scaling in many-generation simulations.',
    }),
  ];

  const api = Object.assign({
    id: 'scaled-roulette', variants, explanation, narration, pseudocode, keywords, stepLines, fnName, codeTemplates, codeComments, references,
  }, C.makeHelpers(codeTemplates, codeComments, pseudocode));
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).content = root.GAX.content || {})['scaled-roulette'] = api;
})(typeof self !== 'undefined' ? self : this);
