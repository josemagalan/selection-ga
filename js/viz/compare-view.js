/*
 * Pantalla «Comparar mecanismos»: la población, los padres que elige cada mecanismo, la tabla de
 * presión y diversidad (1000 repeticiones) y la simulación de varias generaciones solo con
 * selección, con dos gráficas de líneas (individuos distintos y aptitud media).
 */
(function (root) {
  'use strict';
  const d3 = root.d3;

  function node(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function createCompareView(els, opts) {
    const t = opts.t;                 // (key, params) => texto
    const fmt = opts.format;          // { two, pct, int }

    // ---------- Población (barras pequeñas) ----------
    function renderPopulation(fitness, labels) {
      const svg = d3.select(els.pop);
      const n = fitness.length;
      const cell = 56;
      const W = Math.max(320, n * cell + 20);
      const H = 132;
      const max = Math.max(1, Math.max.apply(null, fitness));
      svg.attr('viewBox', `0 0 ${W} ${H}`).style('max-width', `${W}px`);
      const x0 = (W - n * cell) / 2;
      const g = svg.selectAll('g.pcol').data(fitness.map((f, i) => ({ f, i }))).join((enter) => {
        const e = enter.append('g').attr('class', 'pcol');
        e.append('rect').attr('class', 'fbar');
        e.append('text').attr('class', 'bar-num');
        e.append('rect').attr('class', 'chip-rect');
        e.append('text').attr('class', 'chip-text');
        return e;
      });
      g.attr('transform', (d) => `translate(${x0 + d.i * cell + cell / 2},0)`);
      const bh = (f) => Math.max(f > 0 ? 2 : 0, (f / max) * 70);
      g.select('.fbar').attr('x', -18).attr('width', 36).attr('y', (d) => 92 - bh(d.f)).attr('height', (d) => bh(d.f)).attr('rx', 3);
      g.select('.bar-num').attr('x', 0).attr('y', (d) => 92 - bh(d.f) - 6).style('font-size', '13px').text((d) => d.f);
      g.select('.chip-rect').attr('x', -18).attr('y', 98).attr('width', 36).attr('height', 26).attr('rx', 6);
      g.select('.chip-text').attr('x', 0).attr('y', 111).attr('dy', '0.36em').text((d) => labels[d.i]);
    }

    // ---------- Padres de cada mecanismo ----------
    function renderPools(rows) {
      els.pools.replaceChildren(...rows.map((row) => {
        const box = node('div', `cmp-op${row.from ? ' from' : ''}`);
        const head = node('div', 'cmp-op-head');
        const a = node('a', 'cmp-op-name', row.name);
        a.href = row.href;
        head.append(a);
        if (row.meta) head.append(node('span', 'cmp-op-meta', row.meta));
        head.append(node('span', 'cmp-op-meta', t('cmpDistinct', { d: row.distinct, n: row.pool.length })));
        const chips = node('div', 'pool-chips');
        row.pool.forEach((i) => {
          const c = node('span', 'cmp-gene p1', row.labels[i]);
          chips.append(c);
        });
        box.append(head, chips);
        return box;
      }));
    }

    // ---------- Tabla de métricas ----------
    function renderTable(metrics, rows) {
      const thead = node('thead');
      const hr = node('tr');
      hr.append(node('th', null, t('compareOperatorCol')));
      metrics.forEach((m) => hr.append(node('th', null, t(`metric_${m.id}`))));
      thead.append(hr);
      const tbody = node('tbody');
      rows.forEach((row) => {
        const tr = node('tr', row.from ? 'from' : null);
        const th = node('th');
        th.scope = 'row';
        const a = node('a', null, row.name);
        a.href = row.href;
        th.append(a);
        tr.append(th);
        metrics.forEach((m) => {
          const td = node('td');
          const v = row.metrics ? row.metrics[m.id] : undefined;
          const cell = node('div', 'cmp-cell');
          const nums = node('div', 'cmp-nums');
          nums.append(node('span', 'cmp-val', v === undefined ? t('comparePending') : v === null ? '—' : fmt[m.kind](v)));
          const bar = node('div', 'cmp-bar');
          const fill = node('div', 'cmp-fill');
          fill.style.width = v == null ? '0%' : `${Math.max(0, Math.min(100, (100 * v) / m.max))}%`;
          bar.append(fill);
          cell.append(nums, bar);
          td.append(cell);
          tr.append(td);
        });
        tbody.append(tr);
      });
      els.table.replaceChildren(thead, tbody);
      els.defs.replaceChildren(...metrics.flatMap((m) => [node('dt', null, t(`metric_${m.id}`)), node('dd', null, t(`metricDesc_${m.id}`))]));
    }

    // ---------- Simulación ----------

    function renderChips(all, selected, onToggle) {
      const label = els.chips.querySelector('#simChipsLabel');
      els.chips.replaceChildren(label, ...all.map((m) => {
        const b = node('button', 'sim-chip');
        b.type = 'button';
        const on = selected.indexOf(m.id) !== -1;
        b.setAttribute('aria-pressed', String(on));
        b.style.setProperty('--c', `var(--series-${m.slot})`);
        b.append(node('span', 'sim-sw'), document.createTextNode(m.name));
        b.disabled = !on && selected.length >= 4;
        b.addEventListener('click', () => onToggle(m.id));
        return b;
      }));
    }

    // Gráfica de líneas: una por mecanismo seleccionado; puntero en cruz con la lectura de todas.
    function lineChart(container, series, o) {
      const box = d3.select(container);
      box.selectAll('*').remove();
      // En pantallas estrechas, el ancho real (para que el texto no encoja)
      const W = Math.max(300, Math.min(520, container.clientWidth || 520));
      const H = W < 420 ? 240 : 300;
      const m = { top: 14, right: W < 420 ? 74 : 92, bottom: 40, left: 40 };
      const svg = box.append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', o.title);
      const gens = series.length ? series[0].values.length - 1 : 40;
      const x = d3.scaleLinear().domain([0, gens]).range([m.left, W - m.right]);
      const y = d3.scaleLinear().domain([o.yMin, o.yMax]).nice().range([H - m.bottom, m.top]);
      const grid = svg.append('g').attr('class', 'sim-grid');
      y.ticks(5).forEach((v) => {
        grid.append('line').attr('x1', m.left).attr('x2', W - m.right).attr('y1', y(v)).attr('y2', y(v));
        grid.append('text').attr('class', 'sim-tick').attr('x', m.left - 8).attr('y', y(v)).attr('dy', '0.32em').attr('text-anchor', 'end').text(o.tickFormat(v));
      });
      x.ticks(8).forEach((v) => {
        grid.append('text').attr('class', 'sim-tick').attr('x', x(v)).attr('y', H - m.bottom + 16).attr('text-anchor', 'middle').text(v);
      });
      grid.append('line').attr('class', 'sim-axis').attr('x1', m.left).attr('x2', W - m.right).attr('y1', y(o.yMin)).attr('y2', y(o.yMin));
      svg.append('text').attr('class', 'sim-axis-label').attr('x', (m.left + W - m.right) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text(t('simGen'));
      const line = d3.line().x((v, g) => x(g)).y((v) => y(v));
      series.forEach((s) => {
        svg.append('path').attr('class', 'sim-line').attr('d', line(s.values)).style('stroke', `var(--series-${s.slot})`);
      });
      // Etiquetas al final de cada línea, separadas para que no se pisen
      const ends = series.map((s) => ({ s, y: y(s.values[gens]) })).sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
      ends.forEach((e) => {
        svg.append('circle').attr('class', 'sim-end').attr('cx', x(gens)).attr('cy', y(e.s.values[gens])).attr('r', 4).style('fill', `var(--series-${e.s.slot})`);
        svg.append('text').attr('class', 'sim-label').attr('x', x(gens) + 8).attr('y', e.y).attr('dy', '0.32em').text(e.s.short);
      });
      // Puntero en cruz y lectura
      const tip = box.append('div').attr('class', 'sim-tip').attr('hidden', true);
      const hair = svg.append('line').attr('class', 'sim-hair').attr('y1', m.top).attr('y2', H - m.bottom).style('opacity', 0);
      const dots = svg.append('g');
      const zone = svg.append('rect').attr('class', 'sim-zone').attr('x', m.left).attr('y', m.top)
        .attr('width', W - m.right - m.left).attr('height', H - m.bottom - m.top).attr('tabindex', 0)
        .attr('aria-label', o.title);
      let cur = null;
      function show(g) {
        cur = Math.max(0, Math.min(gens, g));
        hair.attr('x1', x(cur)).attr('x2', x(cur)).style('opacity', 1);
        dots.selectAll('circle').data(series).join('circle').attr('r', 4.5).attr('class', 'sim-dot')
          .attr('cx', x(cur)).attr('cy', (s) => y(s.values[cur])).style('fill', (s) => `var(--series-${s.slot})`);
        tip.attr('hidden', null).selectAll('*').remove();
        tip.append('div').attr('class', 'sim-tip-title').text(t('simTipGen', { g: cur }));
        series.slice().sort((a, b) => b.values[cur] - a.values[cur]).forEach((s) => {
          const r = tip.append('div').attr('class', 'sim-tip-row');
          r.append('span').attr('class', 'sim-sw').style('background', `var(--series-${s.slot})`);
          r.append('span').text(s.name);
          r.append('span').attr('class', 'sim-tip-val').text(o.valueFormat(s.values[cur]));
        });
        const left = (x(cur) / W) * 100;
        tip.style('left', left > 55 ? null : `${left + 3}%`).style('right', left > 55 ? `${100 - left + 3}%` : null);
      }
      function hide() { hair.style('opacity', 0); dots.selectAll('*').remove(); tip.attr('hidden', true); cur = null; }
      zone.on('pointermove', (ev) => show(Math.round(x.invert(d3.pointer(ev)[0]))))
        .on('pointerleave', hide)
        .on('focus', () => show(gens))
        .on('blur', hide)
        .on('keydown', (ev) => {
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
            ev.preventDefault();
            show((cur == null ? gens : cur) + (ev.key === 'ArrowRight' ? 1 : -1));
          }
        });
    }

    function renderSim(model) {
      lineChart(els.distinct, model.series.map((s) => ({ name: s.name, short: s.short, slot: s.slot, values: s.sim.distinct })), {
        title: t('simDistinctTitle'), yMin: 0, yMax: model.size, tickFormat: (v) => v, valueFormat: (v) => fmt.one(v),
      });
      lineChart(els.fit, model.series.map((s) => ({ name: s.name, short: s.short, slot: s.slot, values: s.sim.meanFit })), {
        title: t('simFitTitle'), yMin: Math.floor(Math.min.apply(null, model.series.map((s) => s.sim.meanFit[0]).concat([40]))), yMax: 100,
        tickFormat: (v) => v, valueFormat: (v) => fmt.one(v),
      });
    }

    function renderSimTable(rows) {
      const thead = node('thead');
      const hr = node('tr');
      ['compareOperatorCol', 'simColDistinct5', 'simColDistinct20', 'simColTakeover', 'simColLost'].forEach((k) => hr.append(node('th', null, t(k))));
      thead.append(hr);
      const tbody = node('tbody');
      rows.forEach((row) => {
        const tr = node('tr', row.from ? 'from' : null);
        const th = node('th');
        th.scope = 'row';
        if (row.slot) {
          const sw = node('span', 'sim-sw');
          sw.style.background = `var(--series-${row.slot})`;
          th.append(sw, document.createTextNode(' '));
        }
        th.append(document.createTextNode(row.name));
        tr.append(th);
        const s = row.sim;
        const cells = s ? [fmt.one(s.distinct[5]), fmt.one(s.distinct[20]),
          s.takeover == null ? t('simNoTakeover', { p: fmt.pct(s.takeoverShare) }) : t('simTakeoverGen', { g: s.takeover, p: fmt.pct(s.takeoverShare) }),
          fmt.pct(s.bestLost)] : [t('comparePending'), '', '', ''];
        cells.forEach((c) => tr.append(node('td', null, c)));
        tbody.append(tr);
      });
      els.simTable.replaceChildren(thead, tbody);
    }

    return { renderPopulation, renderPools, renderTable, renderChips, renderSim, renderSimTable };
  }

  (root.GAX = root.GAX || {}).createCompareView = createCompareView;
})(typeof self !== 'undefined' ? self : this);
