// Browser CAD engine used by IA-Tutor. It creates editable SVG entities from dimensions.
let nextEntityId = 1;
const SVG_NS = 'http://www.w3.org/2000/svg';

export class RealCadEngine {
  constructor(svg) { this.svg = svg; this.entities = []; this.history = []; this.future = []; this.grid = 10; this.snap = true; }
  point(x, y) { const nx = Number(x), ny = Number(y); if (!Number.isFinite(nx) || !Number.isFinite(ny)) throw new Error('Invalid CAD point.'); return this.snap ? [Math.round(nx / this.grid) * this.grid, Math.round(ny / this.grid) * this.grid] : [nx, ny]; }
  snapshot() { return JSON.stringify(this.entities); }
  restore(value) { this.entities = JSON.parse(value || '[]'); this.render(); }
  add(entity) { this.history.push(this.snapshot()); this.future = []; const item = { id: `cad-${nextEntityId++}`, ...entity }; this.entities.push(item); this.render(); return item; }
  line(x1, y1, x2, y2, props = {}) { const a = this.point(x1, y1), b = this.point(x2, y2); return this.add({ type: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], layer: props.layer || 'Object', construction: Boolean(props.construction) }); }
  rectangle(x, y, width, height, props = {}) { const a = this.point(x, y), w = Number(width), h = Number(height); if (!(w > 0 && h > 0)) throw new Error('CAD rectangle dimensions must be positive.'); return this.add({ type: 'polyline', points: [[a[0], a[1]], [a[0] + w, a[1]], [a[0] + w, a[1] + h], [a[0], a[1] + h], [a[0], a[1]]], layer: props.layer || 'Object' }); }
  circle(cx, cy, r, props = {}) { const a = this.point(cx, cy), radius = Number(r); if (!(radius > 0)) throw new Error('CAD circle radius must be positive.'); return this.add({ type: 'circle', cx: a[0], cy: a[1], r: radius, layer: props.layer || 'Object' }); }
  dimension(x1, y1, x2, y2, label, props = {}) { return this.add({ type: 'dimension', x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2), label: String(label), layer: props.layer || 'Dimensions' }); }
  clear() { if (this.entities.length) this.history.push(this.snapshot()); this.entities = []; this.future = []; this.render(); }
  undo() { if (!this.history.length) return; this.future.push(this.snapshot()); this.restore(this.history.pop()); }
  redo() { if (!this.future.length) return; this.history.push(this.snapshot()); this.restore(this.future.pop()); }
  render() {
    if (!this.svg) return;
    this.svg.replaceChildren();
    for (const e of this.entities) { if (e.type === 'dimension') this.renderDimension(e); else if (e.type === 'line') this.renderLine(e); else if (e.type === 'polyline') this.renderPolyline(e); else if (e.type === 'circle') this.renderCircle(e); }
  }
  renderLine(e) { const n = document.createElementNS(SVG_NS, 'line'); n.classList.add('cad-entity'); n.setAttribute('x1', e.x1); n.setAttribute('y1', e.y1); n.setAttribute('x2', e.x2); n.setAttribute('y2', e.y2); if (e.construction) n.classList.add('cad-construction'); this.svg.appendChild(n); }
  renderPolyline(e) { const n = document.createElementNS(SVG_NS, 'polyline'); n.classList.add('cad-entity'); n.setAttribute('points', e.points.map((p) => p.join(',')).join(' ')); this.svg.appendChild(n); }
  renderCircle(e) { const n = document.createElementNS(SVG_NS, 'circle'); n.classList.add('cad-entity'); n.setAttribute('cx', e.cx); n.setAttribute('cy', e.cy); n.setAttribute('r', e.r); this.svg.appendChild(n); }
  renderDimension(e) { const group = document.createElementNS(SVG_NS, 'g'); const line = document.createElementNS(SVG_NS, 'line'); line.classList.add('cad-dim-line'); line.setAttribute('x1', e.x1); line.setAttribute('y1', e.y1); line.setAttribute('x2', e.x2); line.setAttribute('y2', e.y2); const text = document.createElementNS(SVG_NS, 'text'); text.classList.add('cad-dim-text'); text.setAttribute('x', (e.x1 + e.x2) / 2); text.setAttribute('y', (e.y1 + e.y2) / 2 - 6); text.textContent = e.label; group.append(line, text); this.svg.appendChild(group); }
}

export function buildAutomaticOrthographicCad(engine, { width, height, depth, units = 'mm' }) {
  const W = Number(width), H = Number(height), D = Number(depth);
  if (![W, H, D].every((v) => Number.isFinite(v) && v > 0)) throw new Error('AI must provide width, height and depth before CAD generation.');
  // Front = width × height; Top = width × depth; Right = depth × height.
  // Scale automatically so common school/exam dimensions fit the browser canvas.
  const gap = 70, margin = 55, canvasW = 900, canvasH = 600;
  const scale = Math.min((canvasW - 2 * margin - D - gap) / (W + D), (canvasH - 2 * margin - H - D - gap) / (H + D), 2);
  const s = Math.max(0.45, scale), w = W * s, h = H * s, d = D * s, ox = margin, oy = margin;
  engine.clear();
  engine.rectangle(ox, oy, w, h); // Front
  engine.rectangle(ox, oy + h + gap, w, d); // Top
  engine.rectangle(ox + w + gap, oy, d, h); // Right
  engine.line(ox, oy + h, ox, oy + h + gap, { construction: true });
  engine.line(ox + w, oy + h, ox + w, oy + h + gap, { construction: true });
  engine.line(ox + w, oy, ox + w + gap, oy, { construction: true });
  engine.line(ox + w, oy + h, ox + w + gap, oy + h, { construction: true });
  engine.dimension(ox, oy - 20, ox + w, oy - 20, `${W} ${units}`);
  engine.dimension(ox - 20, oy, ox - 20, oy + h, `${H} ${units}`);
  engine.dimension(ox, oy + h + d + 20, ox + w, oy + h + d + 20, `${W} ${units}`);
  engine.dimension(ox + w + gap, oy - 20, ox + w + gap + d, oy - 20, `${D} ${units}`);
  engine.dimension(ox + w + d + gap + 18, oy, ox + w + d + gap + 18, oy + h, `${H} ${units}`);
  return engine.entities;
}
