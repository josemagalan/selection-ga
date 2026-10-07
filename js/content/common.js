/*
 * Utilidades y referencias compartidas por los ficheros de contenido docente de los mecanismos.
 */
(function (root) {
  'use strict';

  const refs = {
    holland: {
      id: 'holland-1992',
      type: 'book',
      authors: 'Holland, J. H.',
      year: '1992',
      title: 'Adaptation in natural and artificial systems: An introductory analysis with applications to biology, control, and artificial intelligence',
      details: { es: '(1.ª ed. en MIT Press; 1.ª ed., 1975, University of Michigan Press). MIT Press', en: '(1st MIT Press ed.; 1st ed., 1975, University of Michigan Press). MIT Press' },
      url: null,
    },
    goldberg: {
      id: 'goldberg-1989',
      type: 'book',
      authors: 'Goldberg, D. E.',
      year: '1989',
      title: 'Genetic algorithms in search, optimization, and machine learning',
      details: { es: 'Addison-Wesley', en: 'Addison-Wesley' },
      url: null,
    },
    eiben: {
      id: 'eiben-smith-2015',
      type: 'book',
      authors: 'Eiben, A. E., & Smith, J. E.',
      year: '2015',
      title: 'Introduction to evolutionary computing',
      details: { es: '(2.ª ed.). Springer, Natural Computing Series', en: '(2nd ed.). Springer, Natural Computing Series' },
      url: 'https://doi.org/10.1007/978-3-662-44874-8',
    },
    talbi: {
      id: 'talbi-2009',
      type: 'book',
      authors: 'Talbi, E.-G.',
      year: '2009',
      title: 'Metaheuristics: From design to implementation',
      details: { es: 'Wiley', en: 'Wiley' },
      url: 'https://doi.org/10.1002/9780470496916',
      core: true,   // referencia básica del curso
    },
    bautista: {
      id: 'bautista-valhondo-2020',
      type: 'book',
      authors: 'Bautista-Valhondo, J.',
      year: '2020',
      title: 'Metaheurísticas en ingeniería',
      details: { es: 'Dextra, colección Investigación operativa', en: 'Dextra, Investigación operativa series' },
      url: null,
      core: true,   // referencia básica del curso
    },
    baker1985: {
      id: 'baker-1985',
      type: 'inproceedings',
      authors: 'Baker, J. E.',
      year: '1985',
      title: 'Adaptive selection methods for genetic algorithms',
      container: 'Proceedings of the First International Conference on Genetic Algorithms and their Applications',
      details: { es: '(J. J. Grefenstette, ed., pp. 101–111). Lawrence Erlbaum', en: '(J. J. Grefenstette, Ed., pp. 101–111). Lawrence Erlbaum' },
      url: null,
    },
    baker1987: {
      id: 'baker-1987',
      type: 'inproceedings',
      authors: 'Baker, J. E.',
      year: '1987',
      title: 'Reducing bias and inefficiency in the selection algorithm',
      container: 'Genetic Algorithms and their Applications: Proceedings of the Second International Conference on Genetic Algorithms',
      details: { es: '(J. J. Grefenstette, ed., pp. 14–21). Lawrence Erlbaum', en: '(J. J. Grefenstette, Ed., pp. 14–21). Lawrence Erlbaum' },
      url: null,
    },
    goldbergDeb: {
      id: 'goldberg-deb-1991',
      type: 'inproceedings',
      authors: 'Goldberg, D. E., & Deb, K.',
      year: '1991',
      title: 'A comparative analysis of selection schemes used in genetic algorithms',
      container: 'Foundations of Genetic Algorithms',
      details: { es: '(G. J. E. Rawlins, ed., vol. 1, pp. 69–93). Morgan Kaufmann', en: '(G. J. E. Rawlins, Ed., Vol. 1, pp. 69–93). Morgan Kaufmann' },
      url: 'https://doi.org/10.1016/B978-0-08-050684-5.50008-2',
    },
    blickle: {
      id: 'blickle-thiele-1996',
      type: 'article',
      authors: 'Blickle, T., & Thiele, L.',
      year: '1996',
      title: 'A comparison of selection schemes used in evolutionary algorithms',
      container: 'Evolutionary Computation',
      details: { es: '4(4), 361–394', en: '4(4), 361–394' },
      url: 'https://doi.org/10.1162/evco.1996.4.4.361',
    },
    whitley: {
      id: 'whitley-1989',
      type: 'inproceedings',
      authors: 'Whitley, D.',
      year: '1989',
      title: 'The GENITOR algorithm and selection pressure: Why rank-based allocation of reproductive trials is best',
      container: 'Proceedings of the Third International Conference on Genetic Algorithms',
      details: { es: '(J. D. Schaffer, ed., pp. 116–121). Morgan Kaufmann', en: '(J. D. Schaffer, Ed., pp. 116–121). Morgan Kaufmann' },
      url: null,
    },
    muhlenbein: {
      id: 'muhlenbein-schlierkamp-voosen-1993',
      type: 'article',
      authors: 'Mühlenbein, H., & Schlierkamp-Voosen, D.',
      year: '1993',
      title: 'Predictive models for the breeder genetic algorithm I. Continuous parameter optimization',
      container: 'Evolutionary Computation',
      details: { es: '1(1), 25–49', en: '1(1), 25–49' },
      url: 'https://doi.org/10.1162/evco.1993.1.1.25',
    },
    brindle: {
      id: 'brindle-1981',
      type: 'book',
      authors: 'Brindle, A.',
      year: '1981',
      title: 'Genetic algorithms for function optimization',
      details: { es: '(tesis doctoral). University of Alberta, Department of Computing Science', en: '(Doctoral dissertation). University of Alberta, Department of Computing Science' },
      url: null,
    },
    millerGoldberg: {
      id: 'miller-goldberg-1995',
      type: 'article',
      authors: 'Miller, B. L., & Goldberg, D. E.',
      year: '1995',
      title: 'Genetic algorithms, tournament selection, and the effects of noise',
      container: 'Complex Systems',
      details: { es: '9(3), 193–212', en: '9(3), 193–212' },
      url: null,
    },
    hancock: {
      id: 'hancock-1994',
      type: 'inproceedings',
      authors: 'Hancock, P. J. B.',
      year: '1994',
      title: 'An empirical comparison of selection methods in evolutionary algorithms',
      container: 'Evolutionary Computing (AISB Workshop 1994), Lecture Notes in Computer Science, vol. 865',
      details: { es: '(T. C. Fogarty, ed., pp. 80–94). Springer', en: '(T. C. Fogarty, Ed., pp. 80–94). Springer' },
      url: 'https://doi.org/10.1007/3-540-58483-8_7',
    },
    delaMaza: {
      id: 'de-la-maza-tidor-1993',
      type: 'inproceedings',
      authors: 'de la Maza, M., & Tidor, B.',
      year: '1993',
      title: 'An analysis of selection procedures with particular attention paid to proportional and Boltzmann selection',
      container: 'Proceedings of the Fifth International Conference on Genetic Algorithms',
      details: { es: '(S. Forrest, ed., pp. 124–131). Morgan Kaufmann', en: '(S. Forrest, Ed., pp. 124–131). Morgan Kaufmann' },
      url: null,
    },
    deJong: {
      id: 'de-jong-1975',
      type: 'book',
      authors: 'De Jong, K. A.',
      year: '1975',
      title: 'An analysis of the behavior of a class of genetic adaptive systems',
      details: { es: '(tesis doctoral). University of Michigan', en: '(Doctoral dissertation). University of Michigan' },
      url: null,
    },
    syswerda1991: {
      id: 'syswerda-1991',
      type: 'inproceedings',
      authors: 'Syswerda, G.',
      year: '1991',
      title: 'A study of reproduction in generational and steady-state genetic algorithms',
      container: 'Foundations of Genetic Algorithms',
      details: { es: '(G. J. E. Rawlins, ed., vol. 1, pp. 94–101). Morgan Kaufmann', en: '(G. J. E. Rawlins, Ed., Vol. 1, pp. 94–101). Morgan Kaufmann' },
      url: 'https://doi.org/10.1016/B978-0-08-050684-5.50009-4',
    },
    schwefel: {
      id: 'schwefel-1981',
      type: 'book',
      authors: 'Schwefel, H.-P.',
      year: '1981',
      title: 'Numerical optimization of computer models',
      details: { es: 'Wiley', en: 'Wiley' },
      url: null,
    },
    beyer: {
      id: 'beyer-schwefel-2002',
      type: 'article',
      authors: 'Beyer, H.-G., & Schwefel, H.-P.',
      year: '2002',
      title: 'Evolution strategies – A comprehensive introduction',
      container: 'Natural Computing',
      details: { es: '1(1), 3–52', en: '1(1), 3–52' },
      url: 'https://doi.org/10.1023/A:1015059928466',
    },
    axelrod1986: {
      id: 'axelrod-1986',
      type: 'article',
      authors: 'Axelrod, R.',
      year: '1986',
      title: 'An evolutionary approach to norms',
      container: 'American Political Science Review',
      details: { es: '80(4), 1095–1111', en: '80(4), 1095–1111' },
      url: 'https://doi.org/10.2307/1960858',
    },
    galanIzquierdo2005: {
      id: 'galan-izquierdo-2005',
      type: 'article',
      authors: 'Galán, J. M., & Izquierdo, L. R.',
      year: '2005',
      title: 'Appearances can be deceiving: Lessons learned re-implementing Axelrod’s “Evolutionary approach to norms”',
      container: 'Journal of Artificial Societies and Social Simulation',
      details: { es: '8(3), 2', en: '8(3), 2' },
      url: 'https://www.jasss.org/8/3/2.html',
    },
    selectionMechanisms: {
      id: 'galan-selectionmechanisms',
      type: 'software',
      authors: 'Galán, J. M., Díaz-de la Fuente, S., Ahedo, V., Pereda, M., & Santos, J. I.',
      year: '2026',
      title: 'SelectionMechanisms: Interactive Shiny app for exploring selection mechanisms in genetic algorithms',
      details: { es: '[Aplicación Shiny]. GitHub', en: '[Shiny app]. GitHub' },
      url: 'https://github.com/josemagalan/SelectionMechanisms',
    },
  };

  /** Referencia compartida con una nota propia del mecanismo. */
  function ref(key, note, extra) {
    return Object.assign({}, refs[key], { note }, extra || {});
  }

  /**
   * getCode y getPseudocodeText a partir de las plantillas del mecanismo.
   * pseudocode puede ser { es: [...], en: [...] } o una función (lang, variant) => [...].
   */
  function makeHelpers(codeTemplates, codeComments, pseudocode) {
    const lines = (lang, variant) => (typeof pseudocode === 'function' ? pseudocode(lang, variant) : (pseudocode[lang] || pseudocode.es));
    return {
      getCode(kind, lang) {
        const tpl = codeTemplates[kind];
        const comments = codeComments[lang] || codeComments.es;
        return tpl.template.replace(/\{\{(\w+)\}\}/g, (m, k) => (comments[k] != null ? comments[k] : m));
      },
      getPseudocodeText(lang, variant) {
        return lines(lang, variant).map((l) => '    '.repeat(l.indent) + l.text).join('\n') + '\n';
      },
      pseudocodeFor: lines,
    };
  }

  /** Referencias básicas del curso: aparecen en todos los mecanismos, tras la fuente original. */
  const CORE = ['talbi', 'bautista'];

  /** Narración final, común: los padres elegidos y lo que ha hecho la selección con la población. */
  const doneText = {
    es: 'Resultado: los padres son {pool}. La aptitud media pasa de {m0} en la población a {m1} en los padres; {distinct} de los {n} individuos tienen al menos una copia (sin copia: {lost}) y el mejor, {best}, tiene {bestCopies}.',
    en: 'Result: the parents are {pool}. Mean fitness goes from {m0} in the population to {m1} among the parents; {distinct} of the {n} individuals have at least one copy (no copy: {lost}) and the best, {best}, has {bestCopies}.',
  };

  /** Narración final de los mecanismos de reemplazo. */
  const replDone = {
    es: 'Siguiente generación: {next}. Sobreviven {parents} padres y {children} hijos; la aptitud media pasa de {m0} a {m1} y la mejor, de {b0} a {b1}.',
    en: 'Next generation: {next}. {parents} parents and {children} offspring survive; mean fitness goes from {m0} to {m1} and the best, from {b0} to {b1}.',
  };
  const replLost = {
    es: ' El mejor padre se ha perdido: este reemplazo no es elitista.',
    en: ' The best parent has been lost: this replacement is not elitist.',
  };

  const api = { refs, ref, makeHelpers, CORE, doneText, replDone, replLost };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.GAX = root.GAX || {}).contentCommon = api;
})(typeof self !== 'undefined' ? self : this);
