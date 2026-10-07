'use strict';
// Coherencia del catálogo de mecanismos: cada mecanismo disponible tiene su lógica, su contenido
// docente y sus textos; los demás, al menos nombre y resumen en ES/EN. Y los textos de la
// interfaz existen en los dos idiomas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = require('../js/registry.js');
const i18n = require('../js/i18n.js');

const LEGEND_KEYS = ['individual', 'chosen', 'pointer', 'pool', 'contestant', 'cut', 'parentInd', 'childInd', 'survivor', 'cutSurv'];
const ops = registry.families.flatMap((fam) => fam.operators.map((op) => Object.assign({ fam }, op)));

test('ids únicos y textos en español e inglés', () => {
  const ids = ops.map((o) => o.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const fam of registry.families) {
    for (const k of ['name', 'desc']) assert.ok(fam[k].es && fam[k].en, `${fam.id}.${k}`);
    assert.ok(fam.sample.length > 0);
    const key = `familyOf${fam.id.charAt(0).toUpperCase()}${fam.id.slice(1)}`;
    assert.ok(i18n.dict.es[key] && i18n.dict.en[key], `falta ${key}`);
  }
  for (const op of ops) {
    assert.ok(op.name.es && op.name.en && op.summary.es && op.summary.en, op.id);
    assert.equal(registry.getOperator(op.id).family, op.fam.id);
  }
});

test('la interfaz tiene las mismas claves en español e inglés', () => {
  assert.deepEqual(Object.keys(i18n.dict.es).sort(), Object.keys(i18n.dict.en).sort());
});

for (const op of ops.filter((o) => o.ready)) {
  test(`mecanismo disponible «${op.id}»: lógica, contenido, leyenda y referencias`, () => {
    const impl = require(path.join('..', 'js', 'operators', `${op.id}.js`));
    const content = require(path.join('..', 'js', 'content', `${op.id}.js`));
    const { spec } = impl;
    assert.equal(spec.id, op.id);
    assert.equal(spec.family, op.fam.id);
    assert.equal(content.id, op.id);
    assert.ok(op.subtitle && op.subtitle.es && op.subtitle.en);
    assert.ok(Array.isArray(spec.legend) && spec.legend.every((k) => LEGEND_KEYS.includes(k)));
    for (const lang of ['es', 'en']) {
      assert.ok(content.explanation[lang].length > 0);
      assert.deepEqual(Object.keys(content.narration[lang]).sort(), Object.keys(content.narration.es).sort());
      (spec.params || []).forEach((pr) => assert.ok(i18n.dict[lang][`param${pr.id.toUpperCase()}`], `${op.id}: falta la etiqueta de ${pr.id}`));
    }
    if (spec.variants) {
      assert.ok(spec.variants.includes(spec.defaultVariant));
      spec.variants.forEach((v) => assert.ok(content.variants[v].name.es && content.variants[v].desc.en));
    }
    assert.ok(content.references.length > 0);
    // Talbi (2009) y Bautista-Valhondo (2020), referencias básicas del curso, en todos los mecanismos,
    // justo después de la fuente original (si la hay) y con su distintivo
    const ids = content.references.map((r) => r.id);
    const first = content.references[0].original ? 1 : 0;
    assert.deepEqual(ids.slice(first, first + 2), ['talbi-2009', 'bautista-valhondo-2020'], op.id);
    content.references.slice(first, first + 2).forEach((r) => assert.equal(r.core, true));
    content.references.forEach((r) => assert.ok(r.note.es && r.note.en && r.authors && r.year && r.title));
    // el mecanismo y su contenido se cargan en la página
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(html.includes(`js/operators/${op.id}.js`) && html.includes(`js/content/${op.id}.js`));
  });
}
