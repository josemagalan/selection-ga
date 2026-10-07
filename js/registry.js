/*
 * Catálogo de familias y mecanismos de selección.
 * Un mecanismo con `ready: true` necesita dos ficheros con su mismo id:
 *   js/operators/<id>.js  (lógica y traza)   y   js/content/<id>.js  (contenido docente)
 * Los demás aparecen en la pantalla inicial como «próximamente».
 *
 * Las familias ocupan el lugar de las «representaciones» de las herramientas hermanas
 * (cruces y mutación): agrupan los mecanismos según en qué se basan para elegir.
 */
(function (root) {
  'use strict';

  const families = [
    {
      id: 'proportional',
      name: { es: 'Proporcional a la aptitud', en: 'Fitness-proportionate' },
      desc: {
        es: 'Cada individuo tiene una probabilidad de ser elegido proporcional a su aptitud: quien tiene el doble de aptitud tiene el doble de probabilidad. Es la selección original de Holland y la que se explica con una ruleta.',
        en: 'Each individual is chosen with a probability proportional to its fitness: twice the fitness means twice the probability. It is Holland’s original selection and the one explained with a roulette wheel.',
      },
      sample: [12, 30, 5, 21, 9],
      operators: [
        {
          id: 'roulette',
          ready: true,
          name: { es: 'Ruleta', en: 'Roulette wheel' },
          summary: { es: 'Cada padre sale de un giro de una ruleta con sectores proporcionales a la aptitud.', en: 'Each parent comes from a spin of a wheel with sectors proportional to fitness.' },
          subtitle: {
            es: 'Selección por ruleta: N giros independientes de una ruleta cuyos sectores son proporcionales a la aptitud',
            en: 'Roulette-wheel selection: N independent spins of a wheel whose sectors are proportional to fitness',
          },
        },
        {
          id: 'sus',
          ready: true,
          name: { es: 'Muestreo estocástico universal (SUS)', en: 'Stochastic universal sampling (SUS)' },
          summary: { es: 'Un solo giro de una ruleta con N punteros equiespaciados.', en: 'A single spin of a wheel with N equally spaced pointers.' },
          subtitle: {
            es: 'Muestreo estocástico universal: un único número aleatorio coloca N punteros equiespaciados sobre la ruleta',
            en: 'Stochastic universal sampling: a single random number places N equally spaced pointers on the wheel',
          },
        },
        {
          id: 'offset',
          ready: true,
          name: { es: 'Contraejemplo: aptitud desplazada', en: 'Counterexample: shifted fitness' },
          summary: { es: 'Por qué la ruleta necesita escalado: con f + 1000 casi todos valen lo mismo.', en: 'Why the roulette wheel needs scaling: with f + 1000 almost everyone is worth the same.' },
          subtitle: {
            es: 'Qué le pasa a la ruleta si se suma una constante C a todas las aptitudes: el orden no cambia, pero la presión desaparece',
            en: 'What happens to the roulette wheel if a constant C is added to every fitness value: the order does not change, but the pressure vanishes',
          },
        },
        {
          id: 'scaled-roulette',
          ready: true,
          name: { es: 'Ruleta con escalado', en: 'Roulette wheel with scaling' },
          summary: { es: 'La aptitud se escala (lineal o truncamiento sigma) antes de girar la ruleta.', en: 'Fitness is scaled (linear or sigma truncation) before spinning the wheel.' },
          subtitle: {
            es: 'Ruleta con escalado de la aptitud: se transforma f en f′ para controlar la presión y después se gira la ruleta',
            en: 'Roulette wheel with fitness scaling: f is transformed into f′ to control the pressure and then the wheel is spun',
          },
        },
        {
          id: 'boltzmann',
          ready: true,
          name: { es: 'Selección de Boltzmann', en: 'Boltzmann selection' },
          summary: { es: 'La aptitud se transforma con exp(f/T); la temperatura T regula la presión.', en: 'Fitness is transformed with exp(f/T); the temperature T controls the pressure.' },
          subtitle: {
            es: 'Selección de Boltzmann: cada individuo pesa exp((f − f_max)/T) y la temperatura T regula la presión',
            en: 'Boltzmann selection: each individual weighs exp((f − f_max)/T) and the temperature T controls the pressure',
          },
        },
      ],
    },
    {
      id: 'rank',
      name: { es: 'Basada en el rango', en: 'Rank-based' },
      desc: {
        es: 'Solo importa el orden de los individuos, no cuánto mejor es uno que otro. La presión de selección deja de depender de la escala de la aptitud y se controla con un parámetro.',
        en: 'Only the order of the individuals matters, not how much better one is than another. Selection pressure no longer depends on the scale of fitness and is controlled by a parameter.',
      },
      sample: [5, 9, 12, 21, 30],
      operators: [
        {
          id: 'linear-ranking',
          ready: true,
          name: { es: 'Ranking lineal', en: 'Linear ranking' },
          summary: { es: 'La probabilidad crece en línea recta con el puesto; s fija cuánto más tiene el mejor.', en: 'Probability grows linearly with the rank; s sets how much more the best one gets.' },
          subtitle: {
            es: 'Ranking lineal: se ordena la población y la probabilidad de cada puesto crece en línea recta, con presión s',
            en: 'Linear ranking: the population is sorted and the probability of each rank grows linearly, with pressure s',
          },
        },
        {
          id: 'exponential-ranking',
          ready: true,
          name: { es: 'Ranking exponencial', en: 'Exponential ranking' },
          summary: { es: 'La probabilidad crece de forma geométrica con el puesto.', en: 'Probability grows geometrically with the rank.' },
          subtitle: {
            es: 'Ranking exponencial: se ordena la población y cada puesto tiene 1/c veces la probabilidad del anterior',
            en: 'Exponential ranking: the population is sorted and each rank gets 1/c times the probability of the previous one',
          },
        },
        {
          id: 'truncation',
          ready: true,
          name: { es: 'Selección por truncamiento', en: 'Truncation selection' },
          summary: { es: 'Solo los mejores (una proporción τ) pueden ser padres.', en: 'Only the best (a proportion τ) can become parents.' },
          subtitle: {
            es: 'Selección por truncamiento: se descarta a los peores y los padres salen solo de la proporción τ de mejores',
            en: 'Truncation selection: the worst are discarded and parents come only from the best proportion τ',
          },
        },
      ],
    },
    {
      id: 'tournament',
      name: { es: 'Torneo', en: 'Tournament' },
      desc: {
        es: 'Cada padre sale de un pequeño torneo entre k individuos tomados al azar: gana el mejor. No hace falta conocer la aptitud de toda la población ni ordenarla, y k regula la presión.',
        en: 'Each parent comes from a small tournament between k individuals drawn at random: the best one wins. There is no need to know the fitness of the whole population or to sort it, and k controls the pressure.',
      },
      sample: [21, 9, 30],
      operators: [
        {
          id: 'tournament',
          ready: true,
          name: { es: 'Selección por torneo', en: 'Tournament selection' },
          summary: { es: 'Se toman k individuos al azar y gana el mejor (con probabilidad p, si el torneo es estocástico).', en: 'k individuals are drawn at random and the best wins (with probability p, if the tournament is stochastic).' },
          subtitle: {
            es: 'Selección por torneo: en cada torneo compiten k individuos tomados al azar y gana el de mayor aptitud',
            en: 'Tournament selection: in each tournament k randomly drawn individuals compete and the fittest wins',
          },
        },
      ],
    },
    {
      id: 'replacement',
      name: { es: 'Reemplazo (supervivientes)', en: 'Replacement (survivors)' },
      desc: {
        es: 'La otra selección de un algoritmo genético: una vez creados los hijos, decide quién pasa a la generación siguiente, entre padres e hijos.',
        en: 'The other selection in a genetic algorithm: once the offspring are created, it decides who makes it into the next generation, among parents and offspring.',
      },
      sample: [30, 21, 12],
      operators: [
        {
          id: 'elitism',
          ready: false,
          name: { es: 'Generacional con elitismo', en: 'Generational with elitism' },
          summary: { es: 'Los hijos sustituyen a los padres, salvo los e mejores, que sobreviven.', en: 'Offspring replace the parents, except the e best, who survive.' },
        },
        {
          id: 'steady-state',
          ready: false,
          name: { es: 'Estado estacionario', en: 'Steady state' },
          summary: { es: 'Solo unos pocos hijos entran en cada paso, sustituyendo al peor, al más viejo o a uno al azar.', en: 'Only a few offspring enter at each step, replacing the worst, the oldest or a random one.' },
        },
        {
          id: 'mu-plus-lambda',
          ready: false,
          name: { es: 'Selección (μ + λ)', en: '(μ + λ) selection' },
          summary: { es: 'Sobreviven los μ mejores de padres e hijos juntos.', en: 'The μ best of parents and offspring together survive.' },
        },
        {
          id: 'mu-comma-lambda',
          ready: false,
          name: { es: 'Selección (μ, λ)', en: '(μ, λ) selection' },
          summary: { es: 'Sobreviven los μ mejores hijos; los padres desaparecen.', en: 'The μ best offspring survive; the parents disappear.' },
        },
      ],
    },
  ];

  const byId = {};
  families.forEach((fam) => fam.operators.forEach((op) => { byId[op.id] = Object.assign({ family: fam.id }, op); }));

  function getOperator(id) { return byId[id] || null; }
  function getFamily(id) { return families.find((f) => f.id === id) || null; }
  function isReady(id) { return !!(byId[id] && byId[id].ready); }

  const api = { families, getOperator, getFamily, isReady };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GAX = root.GAX || {}).registry = api;
})(typeof self !== 'undefined' ? self : this);
