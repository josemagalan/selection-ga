/*
 * Vista D3 de un mecanismo de selección. De arriba abajo:
 *   - la población: una barra por individuo, con su aptitud, y su letra (A, B, C…); en el
 *     ejemplo de Goldberg, también su cadena binaria y x;
 *   - las filas de números de cada individuo (p, q, e, E, rango…) y las copias que lleva;
 *   - la ruleta (a la derecha, en pantallas anchas) y su versión desenrollada, la tira, con los
 *     punteros; o, en el torneo, la «arena» con los contendientes;
 *   - la población de padres, que se llena hueco a hueco.
 * Anima cada paso de la traza: las barras se reordenan al ordenar por aptitud, el puntero gira y
 * el individuo elegido «vuela» a su hueco en la población de padres.
 */
(function (root) {
  'use strict';
  const d3 = root.d3;
  const W_WIDE = 1000;
  const CELL_MAX = 76;
  const ROW_H = 26;

  function createPopulationView(svgEl, opts) {
    const svg = d3.select(svgEl);
    const label = opts.label;           // (key, params) => texto traducido
    const fmt = opts.format;            // { fit, prob, exp, int, draw } => texto
    const duration = opts.duration;     // () => ms de animación

    let geo = null;
    let problem = null;   // { fitness, labels, chrom, x, aux }
    let current = null;
    let lastAngle = -90;

    const gLabels = svg.append('g').attr('class', 'labels');
    const gCut = svg.append('g').attr('class', 'cut-layer');
    const gCols = svg.append('g').attr('class', 'cols');
    const gWheel = svg.append('g').attr('class', 'wheel');
    const gStrip = svg.append('g').attr('class', 'strip');
    const gArena = svg.append('g').attr('class', 'arena');
    const gPool = svg.append('g').attr('class', 'pool');
    const gFly = svg.append('g').attr('class', 'flyers');

    function layout() {
      const n = problem.fitness.length;
      const aux = problem.aux;
      const hasWheel = !!aux.wheel;
      const compact = svgEl.clientWidth > 0 && svgEl.clientWidth < 640;
      const left = compact ? 62 : 140;
      const right = compact ? 8 : 16;
      const W = compact ? Math.max(360, left + right + n * 46) : W_WIDE;
      const showPie = hasWheel && !compact;
      const popRight = showPie ? 650 : W - right;
      const avail = popRight - left;
      const cell = Math.min(CELL_MAX, avail / n);
      const s = Math.round(cell * 0.78);
      const x0 = left + (avail - cell * n) / 2;
      const yBarTop = 28;
      const barH = compact ? 84 : 112;
      const yBase = yBarTop + barH;
      const yChip = yBase + 8;
      const chipH = 30;
      const hasChrom = !!problem.chrom;
      const yRows = yChip + chipH + (hasChrom ? 52 : 12) + 16;
      const rowIds = aux.rows.map((r) => r.id).concat(['copies']);
      const rowKeys = aux.rows.map((r) => r.labelKey || `row_${r.id}`).concat([aux.copiesLabelKey || 'row_copies']);
      const yRowsEnd = yRows + rowIds.length * ROW_H;
      const pieR = showPie ? 128 : 0;
      const pieCy = yBarTop + 10 + pieR;
      const pieCx = (popRight + W) / 2 + 4;
      let y = Math.max(yRowsEnd, showPie ? pieCy + pieR + 18 : 0) + 30;
      const yStrip = hasWheel ? y : null;
      const stripH = 30;
      if (hasWheel) y += stripH + 44;
      const yArena = aux.arena ? y : null;
      const arenaH = compact ? 56 : 66;
      if (aux.arena) y += arenaH + 30;
      const yPool = y + 6;
      const H = yPool + chipH + 26;
      return {
        n, W, H, compact, left, right, cell, s, x0, yBarTop, barH, yBase, yChip, chipH, hasChrom,
        yRows, rowIds, rowKeys, showPie, pieR, pieCx, pieCy, yStrip, stripH, yArena, arenaH, yPool,
        stripX0: left, stripW: W - right - left,
      };
    }

    // Posición x (centro de la columna) del individuo que ocupa el lugar j del orden dibujado
    const colX = (j) => geo.x0 + j * geo.cell + geo.cell / 2;
    const slotX = (k) => geo.x0 + k * geo.cell + geo.cell / 2;

    function setProblem(p) {
      problem = p;
      lastAngle = -90;
      geo = layout();
      svg.attr('viewBox', `0 0 ${geo.W} ${geo.H}`).classed('compact', geo.compact);
      gCols.selectAll('*').remove();
      gWheel.selectAll('*').remove();
      gStrip.selectAll('*').remove();
      gArena.selectAll('*').remove();
      gPool.selectAll('*').remove();
      gFly.selectAll('*').remove();
      gCut.selectAll('*').remove();
      drawStatic();
      current = null;
    }

    // Etiqueta de fila; «\n» la parte en dos líneas centradas en su altura
    function setLabel(node, text) {
      const lines = String(text).split('\n');
      const sel = d3.select(node).text(null);
      sel.selectAll('tspan').data(lines).join('tspan')
        .attr('x', sel.attr('x'))
        .attr('dy', (d, k) => (k ? '1.15em' : `${0.36 - (lines.length - 1) * 0.575}em`))
        .text((d) => d);
    }

    function drawStatic() {
      const g = geo;
      const lab = [
        { y: g.yBarTop + g.barH / 2, key: 'rowFitness', cls: 'row-label' },
        { y: g.yChip + g.chipH / 2, key: 'rowIndividual', cls: 'row-label' },
      ];
      if (g.hasChrom) lab.push({ y: g.yChip + g.chipH + 22, key: 'rowChrom', cls: 'row-label small' });
      g.rowIds.forEach((id, k) => lab.push({ y: g.yRows + k * ROW_H + ROW_H / 2, key: g.rowKeys[k], cls: 'row-label small', row: id }));
      lab.push({ y: g.yPool + g.chipH / 2, key: problem.aux.poolLabelKey || 'rowPool', cls: 'row-label' });
      if (g.yArena != null) lab.push({ y: g.yArena + g.arenaH / 2, key: 'rowArena', cls: 'row-label', arena: true });
      if (g.yStrip != null) lab.push({ y: g.yStrip + g.stripH / 2, key: 'rowStrip', cls: 'row-label' });
      gLabels.selectAll('text.row-label').data(lab, (d) => d.key).join('text')
        .attr('class', (d) => d.cls)
        .attr('x', g.left - 12).attr('y', (d) => d.y)
        .classed('row-hidden', (d) => !!d.row)
        .each(function (d) { setLabel(this, g.compact ? label(`${d.key}Short`) : label(d.key)); });
      // Suma de aptitudes (aparece en el paso «suma»)
      const aux = problem.aux;
      const sumValue = aux.sumValue != null ? aux.sumValue : problem.fitness.reduce((a, b) => a + b, 0);
      gLabels.selectAll('text.sum-label').data([0]).join('text').attr('class', 'sum-label')
        .attr('x', g.left - 12).attr('y', g.yBarTop + g.barH / 2 + 34).attr('dy', '0.36em')
        .text(`Σ${aux.sumSymbol || 'f'} = ${fmt[aux.barsKind || 'fit'](sumValue)}`);
      // Números de los huecos de la población de padres
      gPool.selectAll('g.slot').data(d3.range(problem.aux.poolSize || g.n)).join((enter) => {
        const e = enter.append('g').attr('class', 'slot');
        e.append('rect').attr('class', 'slot-rect');
        e.append('text').attr('class', 'slot-num');
        return e;
      }).attr('transform', (k) => `translate(${slotX(k) - g.s / 2},${g.yPool})`)
        .call((sel) => {
          sel.select('.slot-rect').attr('width', g.s).attr('height', g.chipH).attr('rx', 6);
          sel.select('.slot-num').attr('x', g.s / 2).attr('y', -7).text((k) => k + 1);
        });
    }

    function refreshLabels() {
      if (!geo) return;
      gLabels.selectAll('text.row-label').each(function (d) { setLabel(this, geo.compact ? label(`${d.key}Short`) : label(d.key)); });
    }

    // ---------- Columnas de la población ----------

    function renderCols(step, animate) {
      const g = geo;
      const F = step.bars || problem.fitness;
      const barFmt = step.bars ? fmt[problem.aux.barsKind || 'fit'] : fmt.fit;
      const maxF = Math.max(step.bars ? 1e-9 : 1, Math.max.apply(null, F));
      const pos = Array(g.n);
      step.order.forEach((idx, j) => { pos[idx] = j; });
      const hl = new Set(step.hl || []);
      const dim = new Set(step.dim || []);
      const cont = new Set((step.contestants || []).map((c) => c.idx));
      const copies = Array(g.n).fill(0);
      step.pool.forEach((i) => { copies[i]++; });
      const rowsShown = new Set(step.rows);
      const showCopies = step.pool.length > 0;

      gLabels.selectAll('text.row-label').classed('row-hidden', (d) => {
        if (!d.row) return false;
        return d.row === 'copies' ? !showCopies : !rowsShown.has(d.row);
      });
      gLabels.select('text.sum-label').classed('visible', !!step.sum && !g.compact);
      // La fila de las barras dice qué miden: la aptitud o su transformación (f + C, f′, w)
      const barsKey = step.bars && problem.aux.barsLabelKey ? problem.aux.barsLabelKey : 'rowFitness';
      gLabels.selectAll('text.row-label').filter((d) => d.key === 'rowFitness')
        .each(function () { setLabel(this, g.compact ? label(`${barsKey}Short`) : label(barsKey)); });

      const cols = gCols.selectAll('g.col').data(d3.range(g.n), (i) => i).join((enter) => {
        const c = enter.append('g').attr('class', 'col');
        c.append('rect').attr('class', 'fbar');
        c.append('text').attr('class', 'bar-num');
        c.append('rect').attr('class', 'chip-rect');
        c.append('text').attr('class', 'chip-text');
        c.append('text').attr('class', 'chrom-text');
        c.append('g').attr('class', 'vals');
        c.attr('transform', (i) => `translate(${colX(i)},0)`);
        return c;
      });
      const tr = (sel) => (animate ? sel.transition().duration(duration()) : sel);
      tr(cols).attr('transform', (i) => `translate(${colX(pos[i])},0)`);
      const groups = problem.aux.groups || null;
      cols.classed('off', (i) => !!groups && groups[i] === 'o');
      cols.classed('hl', (i) => hl.has(i))
        .classed('dim', (i) => dim.has(i))
        .classed('contestant', (i) => cont.has(i));

      const bh = (i) => Math.max(F[i] > 0 ? 2 : 0, (F[i] / maxF) * (g.barH - 18));
      tr(cols.select('.fbar'))
        .attr('x', -g.s / 2).attr('width', g.s)
        .attr('y', (i) => g.yBase - bh(i)).attr('height', (i) => bh(i)).attr('rx', 3);
      tr(cols.select('.bar-num'))
        .attr('x', 0).attr('y', (i) => g.yBase - bh(i) - 6);
      cols.select('.bar-num')
        .classed('scaled', !!step.bars)
        .style('font-size', `${Math.round(Math.min(15, g.s * (step.bars ? 0.3 : 0.36)))}px`)
        .text((i) => barFmt(F[i]));
      cols.select('.chip-rect')
        .attr('x', -g.s / 2).attr('y', g.yChip).attr('width', g.s).attr('height', g.chipH).attr('rx', 6);
      cols.select('.chip-text')
        .attr('x', 0).attr('y', g.yChip + g.chipH / 2).attr('dy', '0.36em')
        .text((i) => problem.labels[i]);
      cols.select('.chrom-text')
        .attr('x', 0).attr('y', g.yChip + g.chipH + 16)
        .style('font-size', `${Math.round(Math.min(13, g.s * 0.24))}px`)
        .each(function (i) {
          const lines = problem.chrom ? String(problem.chrom[i]).split('\n') : [];
          d3.select(this).selectAll('tspan').data(lines).join('tspan')
            .attr('x', 0).attr('dy', (d, k) => (k ? '1.25em' : '0.36em')).text((d) => d);
        });

      // Filas de números
      const rowsData = problem.aux.rows.map((r) => r).concat([{ id: 'copies', kind: 'int', values: copies }]);
      // En el reemplazo, las filas que no tienen valor para un individuo (la edad de los hijos) van vacías
      cols.select('.vals').each(function (i) {
        const vg = d3.select(this);
        const items = rowsData.map((r, k) => ({
          id: r.id, k, show: r.id === 'copies' ? showCopies : rowsShown.has(r.id),
          text: r.id === 'copies' ? String(copies[i]) : (r.values[i] == null ? '' : fmt[r.kind](r.values[i])),
          exp: r.id === 'copies' && problem.aux.expected ? problem.aux.expected[i] : null,
        }));
        vg.selectAll('text.val').data(items, (d) => d.id).join('text')
          .attr('class', (d) => `val val-${d.id}`)
          .attr('x', 0).attr('y', (d) => g.yRows + d.k * ROW_H + ROW_H / 2).attr('dy', '0.36em')
          .style('font-size', `${Math.round(Math.min(14, g.cell * 0.24))}px`)
          .classed('visible', (d) => d.show)
          .text((d) => d.text);
      });
    }

    // ---------- Corte del truncamiento ----------

    function renderCut(step) {
      const g = geo;
      const data = step.cut != null && step.cut < g.n ? [step.cut] : [];
      const x = (c) => g.x0 + (g.n - c) * g.cell;
      const cut = gCut.selectAll('g.cutline').data(data).join((enter) => {
        const e = enter.append('g').attr('class', 'cutline');
        e.append('line');
        e.append('text');
        return e;
      });
      cut.select('line').attr('x1', x).attr('x2', x).attr('y1', g.yBarTop - 14).attr('y2', g.yChip + g.chipH + 6);
      cut.select('text').attr('x', (c) => x(c) + 6).attr('y', g.yBarTop - 6)
        .text((c) => label('cutLabel', { cut: c }));
    }

    // ---------- Ruleta y tira ----------

    // Tramos de la ruleta en el orden dibujado: [{ idx, a, b }] con a, b ∈ [0, 1]
    function segments(step) {
      const w = problem.aux.wheel;
      let acc = 0;
      return step.order.map((idx) => {
        const a = acc / w.total;
        acc += w.weights[idx];
        return { idx, a, b: Math.min(1, acc / w.total), bound: w.bounds[idx] };
      });
    }

    function renderWheel(step, animate) {
      const g = geo;
      const vis = !!(problem.aux.wheel && step.wheel);
      gWheel.classed('visible', vis && g.showPie);
      gStrip.classed('visible', vis);
      if (!problem.aux.wheel) return;
      const segs = segments(step).filter((sg) => sg.b - sg.a > 1e-12);
      const hl = new Set(step.hl || []);
      const ang = (t) => t * 2 * Math.PI;
      const prev = new Map((current && current.order ? current.order : step.order).map((idx, j) => [idx, j]));
      const seq = new Map(step.order.map((idx, j) => [idx, j]));

      if (g.showPie) {
        const arc = d3.arc().innerRadius(0).outerRadius(g.pieR);
        const pg = gWheel.selectAll('g.pie').data([0]).join('g').attr('class', 'pie')
          .attr('transform', `translate(${g.pieCx},${g.pieCy})`);
        pg.selectAll('path.sector').data(segs, (d) => d.idx).join('path')
          .attr('class', (d) => `sector ${seq.get(d.idx) % 2 ? 'odd' : 'even'}`)
          .classed('hit', (d) => hl.has(d.idx))
          .attr('d', (d) => arc({ startAngle: ang(d.a), endAngle: ang(d.b) }));
        pg.selectAll('text.sector-label').data(segs.filter((d) => d.b - d.a > 0.035), (d) => d.idx).join('text')
          .attr('class', 'sector-label')
          .classed('hit', (d) => hl.has(d.idx))
          .attr('transform', (d) => {
            const m = ang((d.a + d.b) / 2) - Math.PI / 2;
            const rr = g.pieR * (d.b - d.a > 0.12 ? 0.62 : 0.8);
            return `translate(${Math.cos(m) * rr},${Math.sin(m) * rr})`;
          })
          .attr('dy', '0.36em')
          .text((d) => problem.labels[d.idx]);
        pg.selectAll('circle.hub').data([0]).join('circle').attr('class', 'hub').attr('r', 5);

        // Punteros: agujas desde el centro
        const ptrs = step.pointers || [];
        const needle = pg.selectAll('g.needle').data(ptrs, (d, k) => k).join((enter) => {
          const e = enter.append('g').attr('class', 'needle');
          e.append('line').attr('x1', 0).attr('y1', 0).attr('x2', g.pieR + 12).attr('y2', 0);
          e.append('path').attr('d', `M ${g.pieR + 14} 0 L ${g.pieR + 2} -7 L ${g.pieR + 2} 7 Z`);
          e.attr('transform', `rotate(${lastAngle})`);
          return e;
        });
        needle.attr('class', (d) => `needle ${d.state}`);
        const target = (d) => d.pos * 360 - 90;
        const active = ptrs.filter((d) => d.state === 'active');
        if (animate && active.length) {
          needle.filter((d) => d.state === 'active').transition().duration(duration() * 1.3).ease(d3.easeCubicOut)
            .attrTween('transform', (d) => {
              const from = lastAngle;
              const to = target(d) + 360;
              return (t) => `rotate(${from + (to - from) * t})`;
            });
          needle.filter((d) => d.state !== 'active').attr('transform', (d) => `rotate(${target(d)})`);
        } else if (animate && ptrs.length && ptrs.every((d) => d.state === 'pending')) {
          // SUS: los N punteros aparecen juntos, girando como una sola pieza
          needle.transition().duration(duration() * 1.3).ease(d3.easeCubicOut)
            .attrTween('transform', (d) => {
              const to = target(d) + 360;
              const from = to - 360 - (ptrs[0].pos * 360);
              return (t) => `rotate(${from + (to - from) * t})`;
            });
        } else {
          needle.attr('transform', (d) => `rotate(${target(d)})`);
        }
        if (active.length) lastAngle = target(active[0]);
      }

      // Tira: la ruleta desenrollada, de 0 a 1 (o de 0 a N en la escala de copias esperadas)
      const X = (t) => g.stripX0 + t * g.stripW;
      const sg = gStrip.selectAll('g.seg').data(segs, (d) => d.idx).join((enter) => {
        const e = enter.append('g').attr('class', 'seg');
        e.append('rect');
        e.append('text');
        return e;
      });
      const tr = (sel) => (animate ? sel.transition().duration(duration()) : sel);
      sg.attr('class', (d) => `seg ${seq.get(d.idx) % 2 ? 'odd' : 'even'}`).classed('hit', (d) => hl.has(d.idx));
      tr(sg.select('rect')).attr('x', (d) => X(d.a)).attr('width', (d) => Math.max(0.5, X(d.b) - X(d.a)))
        .attr('y', g.yStrip).attr('height', g.stripH);
      tr(sg.select('text')).attr('x', (d) => (X(d.a) + X(d.b)) / 2).attr('y', g.yStrip + g.stripH / 2);
      sg.select('text').attr('dy', '0.36em')
        .text((d) => (X(d.b) - X(d.a) > 16 ? problem.labels[d.idx] : ''));
      void prev;

      // Marcas de los límites acumulados (sin que se pisen)
      const w = problem.aux.wheel;
      const ticks = [{ t: 0, v: 0, key: 'zero' }].concat(segs.map((d) => ({ t: d.b, v: d.bound, key: d.idx })));
      let lastX = -1e9;
      ticks.forEach((tk) => {
        const x = X(tk.t);
        tk.show = x - lastX >= (g.compact ? 40 : 44) || tk.t >= 1 - 1e-9;
        if (tk.show) lastX = x;
      });
      // Si el último se pisa con el anterior, se oculta el anterior
      for (let k = ticks.length - 2; k >= 0; k--) {
        if (ticks[k].show && X(ticks[ticks.length - 1].t) - X(ticks[k].t) < (g.compact ? 40 : 44) && k !== ticks.length - 1) ticks[k].show = false;
        else if (ticks[k].show) break;
      }
      const kind = w.scale === 'exp' ? 'exp' : 'prob';
      gStrip.selectAll('g.tick').data(ticks, (d) => d.key).join((enter) => {
        const e = enter.append('g').attr('class', 'tick');
        e.append('line');
        e.append('text');
        return e;
      }).call((sel) => {
        tr(sel.select('line')).attr('x1', (d) => X(d.t)).attr('x2', (d) => X(d.t)).attr('y1', g.yStrip).attr('y2', g.yStrip + g.stripH + 5);
        tr(sel.select('text')).attr('x', (d) => X(d.t)).attr('y', g.yStrip + g.stripH + 18);
        sel.select('text').style('opacity', (d) => (d.show ? 1 : 0))
          .text((d) => (d.key === 'zero' ? fmt[kind](0) : fmt[kind](d.v)));
      });

      // Punteros sobre la tira
      const ptrs = step.pointers || [];
      const pt = gStrip.selectAll('g.sptr').data(ptrs, (d, k) => k).join((enter) => {
        const e = enter.append('g').attr('class', 'sptr');
        e.append('path').attr('d', 'M 0 0 L -7 -11 L 7 -11 Z');
        e.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', g.stripH);
        e.append('text').attr('y', -16);
        e.attr('transform', `translate(${X(0)},${g.yStrip})`);
        return e;
      });
      pt.attr('class', (d) => `sptr ${d.state}`);
      pt.select('line').attr('y2', g.stripH);
      pt.select('text').text((d) => (d.state === 'active' || (d.state === 'pending' && ptrs.length <= 6) ? fmt.draw(d.value) : ''));
      const move = animate ? pt.filter((d) => d.state === 'active' || d.state === 'pending').transition().duration(duration() * 1.3).ease(d3.easeCubicOut) : pt;
      move.attr('transform', (d) => `translate(${X(d.pos)},${g.yStrip})`);
      if (animate) pt.filter((d) => d.state === 'done').attr('transform', (d) => `translate(${X(d.pos)},${g.yStrip})`);
    }

    // ---------- Arena del torneo ----------

    function renderArena(step) {
      const g = geo;
      if (g.yArena == null) return;
      const cont = step.contestants || [];
      const F = problem.fitness;
      const w = Math.min(g.s * 1.3, 70);
      const gap = 18;
      const total = cont.length * w + (cont.length - 1) * gap;
      const cx = g.left + (g.W - g.right - g.left) / 2;
      const x = (m) => cx - total / 2 + m * (w + gap);
      gArena.selectAll('rect.arena-bg').data([0]).join('rect').attr('class', 'arena-bg')
        .attr('x', g.left).attr('y', g.yArena).attr('width', g.W - g.right - g.left).attr('height', g.arenaH).attr('rx', 10);
      const ch = gArena.selectAll('g.fighter').data(cont, (d, m) => m).join((enter) => {
        const e = enter.append('g').attr('class', 'fighter');
        e.append('rect');
        e.append('text').attr('class', 'f-label');
        e.append('text').attr('class', 'f-fit');
        return e;
      });
      ch.attr('class', (d) => `fighter${d.win ? ' win' : ''}`)
        .attr('transform', (d, m) => `translate(${x(m)},${g.yArena + 8})`);
      ch.select('rect').attr('width', w).attr('height', g.arenaH - 16).attr('rx', 8);
      ch.select('.f-label').attr('x', w / 2).attr('y', (g.arenaH - 16) * 0.38).attr('dy', '0.36em').text((d) => problem.labels[d.idx]);
      ch.select('.f-fit').attr('x', w / 2).attr('y', (g.arenaH - 16) * 0.74).attr('dy', '0.36em').text((d) => `f = ${fmt.fit(F[d.idx])}`);
      gArena.selectAll('text.arena-vs').data(cont.length > 1 ? d3.range(cont.length - 1) : []).join('text')
        .attr('class', 'arena-vs')
        .attr('x', (m) => x(m) + w + gap / 2).attr('y', g.yArena + g.arenaH / 2).attr('dy', '0.36em').text('·');
      gArena.selectAll('text.arena-empty').data(cont.length ? [] : [0]).join('text').attr('class', 'arena-empty')
        .attr('x', cx).attr('y', g.yArena + g.arenaH / 2).attr('dy', '0.36em').text(label('arenaEmpty'));
    }

    // ---------- Población de padres ----------

    function renderPool(step, animate) {
      const g = geo;
      const F = problem.fitness;
      const items = step.pool.map((idx, k) => ({ idx, k }));
      const chips = gPool.selectAll('g.pchip').data(items, (d) => d.k).join((enter) => {
        const e = enter.append('g').attr('class', 'pchip');
        e.append('rect');
        e.append('text').attr('class', 'p-label');
        e.append('text').attr('class', 'p-fit');
        return e;
      });
      const groups = problem.aux.groups || null;
      chips.classed('off', (d) => !!groups && groups[d.idx] === 'o');
      chips.classed('new', (d) => d.k === step.newSlot)
        .attr('transform', (d) => `translate(${slotX(d.k) - g.s / 2},${g.yPool})`);
      chips.select('rect').attr('width', g.s).attr('height', g.chipH).attr('rx', 6);
      chips.select('.p-label').attr('x', g.s / 2).attr('y', g.chipH / 2).attr('dy', '0.36em').text((d) => problem.labels[d.idx]);
      chips.select('.p-fit').attr('x', g.s / 2).attr('y', g.chipH + 14)
        .style('font-size', `${Math.round(Math.min(12, g.s * 0.24))}px`)
        .text((d) => fmt.fit(F[d.idx]));

      gFly.selectAll('*').interrupt().remove();
      if (animate && step.newSlot != null) {
        const d = items[step.newSlot];
        const pos = step.order.indexOf(d.idx);
        const fromY = g.yArena != null ? g.yArena + 8 : g.yChip;
        const fromX = g.yArena != null && step.contestants && step.contestants.length ? null : colX(pos);
        const target = chips.filter((c) => c.k === step.newSlot);
        target.style('opacity', 0);
        const fly = gFly.append('g').attr('class', 'pchip flying');
        fly.append('rect').attr('width', g.s).attr('height', g.chipH).attr('rx', 6);
        fly.append('text').attr('class', 'p-label').attr('x', g.s / 2).attr('y', g.chipH / 2).attr('dy', '0.36em').text(problem.labels[d.idx]);
        let sx = fromX;
        if (sx == null) {
          const node = gArena.selectAll('g.fighter.win').node();
          const m = node ? node.transform.baseVal.consolidate() : null;
          sx = m ? m.matrix.e + Math.min(g.s * 1.3, 70) / 2 : colX(pos);
        }
        fly.attr('transform', `translate(${sx - g.s / 2},${fromY})`)
          .transition().delay(duration() * 0.6).duration(duration())
          .attr('transform', `translate(${slotX(d.k) - g.s / 2},${g.yPool})`)
          .on('end', () => { target.style('opacity', null); fly.remove(); });
      }
    }

    function show(step, o) {
      if (!geo) return;
      const animate = !!(o && o.animate) && !!current;
      renderCols(step, animate);
      renderCut(step);
      renderWheel(step, animate);
      renderArena(step);
      renderPool(step, animate);
      current = step;
    }

    return {
      setProblem,
      show,
      refreshLabels,
      get step() { return current; },
    };
  }

  (root.GAX = root.GAX || {}).createPopulationView = createPopulationView;
})(typeof self !== 'undefined' ? self : this);
