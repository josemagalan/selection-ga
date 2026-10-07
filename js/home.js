/*
 * Pantalla inicial: las familias de selección y sus mecanismos, a partir del registro.
 * Los mecanismos disponibles son enlaces (#op=<id>); el resto aparecen como «próximamente».
 */
(function (root) {
  'use strict';

  function createHome(container, opts) {
    const registry = opts.registry;
    const t = opts.t;          // (key, params) => texto en el idioma actual
    const lang = opts.lang;    // () => 'es' | 'en'

    function node(tag, cls, text) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    }

    function opItem(op, l) {
      const li = node('li');
      const item = op.ready ? node('a', 'op-item') : node('div', 'op-item disabled');
      if (op.ready) item.href = `#op=${op.id}&lang=${l}`;
      else item.setAttribute('aria-disabled', 'true');
      const text = node('span', 'op-text');
      text.append(node('span', 'op-name', op.name[l]), node('span', 'op-summary', op.summary[l]));
      item.append(text);
      item.append(op.ready ? node('span', 'op-go', '→') : node('span', 'badge-soon', t('comingSoon')));
      if (op.ready) item.querySelector('.op-go').setAttribute('aria-hidden', 'true');
      li.append(item);
      return li;
    }

    // Miniatura: una población en barras (la altura es la aptitud)
    function miniBars(sample) {
      const box = node('div', 'mini-bars');
      box.setAttribute('aria-hidden', 'true');
      const max = Math.max.apply(null, sample);
      sample.forEach((v) => {
        const b = node('span', 'mini-bar');
        b.style.height = `${Math.round(8 + (v / max) * 30)}px`;
        box.append(b);
      });
      return box;
    }

    function render() {
      const l = lang();
      container.replaceChildren(...registry.families.map((fam) => {
        const card = node('section', 'rep-card');
        card.dataset.family = fam.id;
        card.setAttribute('aria-labelledby', `fam-${fam.id}`);

        const head = node('div', 'rep-head');
        const h2 = node('h2', null, fam.name[l]);
        h2.id = `fam-${fam.id}`;
        const count = fam.operators.length;
        head.append(h2, node('span', 'rep-count', count === 1 ? t('opsCount1') : t('opsCount', { n: count })));

        const list = node('ul', 'op-list');
        fam.operators.forEach((op) => list.append(opItem(op, l)));

        card.append(head, miniBars(fam.sample), node('p', 'rep-desc', fam.desc[l]), list);
        return card;
      }));
    }

    return { render };
  }

  (root.GAX = root.GAX || {}).createHome = createHome;
})(typeof self !== 'undefined' ? self : this);
