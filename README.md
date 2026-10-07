# Selection in genetic algorithms

[![Live demo](https://img.shields.io/badge/Live_demo-GitHub_Pages-2ea44f?logo=github)](https://josemagalan.github.io/selection-ga/)
[![Tests](https://github.com/josemagalan/selection-ga/actions/workflows/tests.yml/badge.svg)](https://github.com/josemagalan/selection-ga/actions/workflows/tests.yml)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-yellow.svg)](LICENSE)
[![Content: CC BY 4.0](https://img.shields.io/badge/Content-CC_BY_4.0-lightgrey.svg)](LICENSE-CONTENT.md)
[![D3.js v7 · no build](https://img.shields.io/badge/D3.js_v7-no_build-f9a03c?logo=d3dotjs&logoColor=white)](https://d3js.org/)
[![Languages: ES | EN](https://img.shields.io/badge/Languages-ES_%7C_EN-blue.svg)](#features)
[![Purpose: Teaching tool](https://img.shields.io/badge/Purpose-Teaching_tool-informational.svg)](#pedagogical-purpose)
[![Sister tool: crossover-ga](https://img.shields.io/badge/Sister_tool-crossover--ga-8a2be2?logo=github)](https://github.com/josemagalan/crossover-ga)
[![Sister tool: mutation-ga](https://img.shields.io/badge/Sister_tool-mutation--ga-8a2be2?logo=github)](https://github.com/josemagalan/mutation-ga)

**José Manuel Galán**¹ · **Silvia Díaz-de la Fuente**² · **Virginia Ahedo**¹ · **María Pereda**³ · **José Ignacio Santos**¹

¹ Universidad de Burgos · ² Universidad de Salamanca · ³ Universidad Politécnica de Madrid
All authors are members of the Los Goonies research group (Group of Organization and Industrial Engineering and Simulation).

---

## Overview

Selection decides which individuals of the population become the parents of the next generation. It has to favour the fittest without shutting the door on the rest: if it squeezes too hard, the population loses diversity and stagnates; if it squeezes too little, the search moves blindly. This interactive tool shows, step by step and in Spanish or English, how the classic selection mechanisms of genetic algorithms choose the parents from a population, and what each one does with the fittest and with the rest.

It completes a series with [Crossover in genetic algorithms](https://github.com/josemagalan/crossover-ga) and [Mutation in genetic algorithms](https://github.com/josemagalan/mutation-ga), with the same approach and interface. Some of its ideas come from [SelectionMechanisms](https://github.com/josemagalan/SelectionMechanisms), a Shiny app by the same authors. It runs entirely in the browser, with no build step and no server: open `index.html` or use the [live demo](https://josemagalan.github.io/selection-ga/).

## Implemented mechanisms

| Family | Mechanisms |
| --- | --- |
| Fitness-proportionate | Roulette wheel and stochastic universal sampling (SUS); Boltzmann selection and a counterexample on shifted fitness — coming soon |
| Rank-based | Linear ranking (selection pressure s; roulette or SUS sampling) and truncation selection (proportion τ; at random or in turns); exponential ranking — coming soon |
| Tournament | Tournament selection (size k, with or without replacement; stochastic with probability p) |
| Replacement (survivors) | Generational with elitism, steady state, (μ + λ) and (μ, λ) — coming soon |

## Features

- **Step-by-step animation** of every mechanism with a narration of each step, in Spanish and English: the fitness bars, the probabilities and their cumulative values, the roulette wheel and its unrolled version with the pointers, the tournaments, the cut of truncation and the pool of parents that fills slot by slot, with the copies obtained by each individual.
- **Your own populations:** random populations with a reproducible seed, fitness values entered by hand, Goldberg’s classic f(x) = x² example, parameters as sliders and “draw again” for the random numbers; the current example is saved in the URL, ready to project in class or share.
- **Learn more panel:** explanation of the mechanism, pseudocode that highlights the line of the current step, Python and JavaScript implementations to copy or download (tested to choose exactly the same parents as the tool with the same random numbers), and references, with the course’s core textbooks (Talbi, 2009; Bautista-Valhondo, 2020) always first after the original source.
- **Exact ties:** the random numbers have two decimals and the limits of the stretches are shown with as many decimals as needed, so that every step can be checked by hand; cumulative values are rounded to nine decimals in the tool and in the downloadable code, so that 0.1 + 0.2 is 0.3 and ties are resolved as by hand.

Practice mode, the comparison screen (with the selection-pressure and diversity simulations inherited from SelectionMechanisms) and question banks for Moodle are being developed.

## Pedagogical purpose

The tool is designed for undergraduate courses on metaheuristics, evolutionary computation and industrial engineering. It can be projected in lectures to walk through each mechanism, used by students on their own to check hand-worked exercises, or used in seminars to discuss selection pressure, the scaling problems of fitness-proportionate selection and why rank-based and tournament selection avoid them.

## Running locally

Open `index.html` in any modern browser. No server or internet connection is needed: D3 v7 is bundled in `vendor/`.

Keyboard: ← → step back/forward, Space play/pause, Home back to the start.

## Tests

Requires Node.js 22 or later; Python 3 is optional (it is used to test the downloadable Python code as well).

```
npm test
```

The tests check every mechanism (worked examples, thousands of random cases contrasted with an independent implementation in exact integer arithmetic, statistical properties such as the frequencies of the roulette wheel and the binary tournament, and SUS’s zero bias and minimum spread), that the downloadable code chooses the same parents as the tool with the same random numbers, and that the pseudocode and the narration cover every animation step. They run on every push with GitHub Actions.

## Project structure

| Path | Contents |
| --- | --- |
| `index.html`, `css/` | Page and styles |
| `js/registry.js`, `js/home.js` | Catalogue of families and mechanisms; home screen |
| `js/operators/` | Logic of each mechanism: a pure function returning the parents and the trace of steps |
| `js/viz/population-view.js` | D3 view that draws the trace: population, wheel, tournaments and parents |
| `js/content/` | Teaching content of each mechanism: explanation, narration, pseudocode, downloadable code and references |
| `js/learn.js`, `js/about.js`, `js/app.js` | “Learn more” panel, about page and footer, page controller |
| `js/i18n.js`, `js/rng.js` | Spanish and English texts; seeded random generator |
| `img/logos/`, `vendor/` | Institution logos; D3.js v7 |
| `tests/` | Tests with `node:test` |

## Related tools

- [Crossover in genetic algorithms](https://github.com/josemagalan/crossover-ga) ([live demo](https://josemagalan.github.io/crossover-ga/)) and [Mutation in genetic algorithms](https://github.com/josemagalan/mutation-ga) ([live demo](https://josemagalan.github.io/mutation-ga/)): the companion tools on the variation operators, by the same authors and with the same interface. Together, the three tools cover the operators of a genetic algorithm.
- [SelectionMechanisms](https://github.com/josemagalan/SelectionMechanisms) ([live app](https://josemagalan.shinyapps.io/SelectionMechanisms/)): Shiny app to simulate many generations of selection and compare convergence and loss of diversity.

## How to cite

If you would like to cite this tool, please contact the authors.

## License

- Code, including the downloadable Python and JavaScript implementations: MIT (see [LICENSE](LICENSE)).
- Teaching texts (explanations, step narration and pseudocode): CC BY 4.0 (see [LICENSE-CONTENT.md](LICENSE-CONTENT.md)).
- D3.js: ISC licence (see [vendor/d3-LICENSE](vendor/d3-LICENSE)).

## Acknowledgements

We thank Anthropic’s Claude for Science programme for supporting the development of this tool, which was built with the help of Claude.

<p>
  <img src="img/logos/ubu.png" alt="Universidad de Burgos" height="56">&nbsp;&nbsp;
  <img src="img/logos/usal.png" alt="Universidad de Salamanca" height="44">&nbsp;&nbsp;
  <img src="img/logos/upm.png" alt="Universidad Politécnica de Madrid" height="44">&nbsp;&nbsp;
  <img src="img/logos/goonies.png" alt="Los Goonies research group" height="44">
</p>
