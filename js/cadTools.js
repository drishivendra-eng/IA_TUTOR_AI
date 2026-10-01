const SVG_NS = 'http://www.w3.org/2000/svg';

function createEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function installCadTools(host) {
  if (!host || host.dataset.toolsReady === 'true') return;
  const svg = host.querySelector('#real-cad-svg');
  const toolbar = host.querySelector('.real-cad-toolbar');
  if (!svg || !toolbar) return;
  host.dataset.toolsReady = 'true';

  const tools = document.createElement('div');
  tools.className = 'cad-tool-group';
  tools.innerHTML = `
    <span class="cad-tool-label">TOOLS</span>
    <button type="button" data-cad-tool="select">↖ Select</button>
    <button type="button" data-cad-tool="line">╱ Line</button>
    <button type="button" data-cad-tool="rectangle">▭ Rectangle</button>
    <button type="button" data-cad-tool="circle">○ Circle</button>
    <button type="button" data-cad-tool="dimension">↔ Dimension</button>
    <button type="button" data-cad-tool="construction">⌁ Construction</button>
    <button type="button" data-cad-tool="grid">▦ Grid</button>
    <button type="button" data-cad-tool="zoom-in">＋ Zoom</button>
    <button type="button" data-cad-tool="zoom-out">− Zoom</button>
    <button type="button" data-cad-tool="export">⇩ Export SVG</button>`;
  toolbar.after(tools);

  let mode = 'select';
  let start = null;
  let draft = null;
  let gridOn = true;
  let gridSize = 25;
  let manualHistory = [];

  const snap = (value) => gridOn ? Math.round(value / gridSize) * gridSize : value;
  const point = (event) => {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return [snap((event.clientX - r.left) * vb.width / r.width + vb.x), snap((event.clientY - r.top) * vb.height / r.height + vb.y)];
  };
  const save = () => { manualHistory.push(svg.innerHTML); if (manualHistory.length > 30) manualHistory.shift(); };
  const status = (text) => { const node = host.querySelector('.cad-status'); if (node) node.textContent = text; };
  const clearDraft = () => { if (draft) { draft.remove(); draft = null; } };
  const style = (el, construction = false) => {
    el.classList.add('cad-entity');
    if (construction) el.classList.add('cad-construction');
  };

  function addLine(a, b, construction = false) {
    const el = createEl('line', {x1:a[0], y1:a[1], x2:b[0], y2:b[1]}); style(el, construction); svg.appendChild(el);
  }
  function addRect(a, b, construction = false) {
    const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
    const w = Math.abs(b[0]-a[0]), h = Math.abs(b[1]-a[1]);
    const el = createEl('rect', {x,y,width:w,height:h,fill:'none'}); style(el, construction); svg.appendChild(el);
  }
  function addCircle(a, b, construction = false) {
    const r = Math.hypot(b[0]-a[0], b[1]-a[1]);
    if (r < 2) return;
    const el = createEl('circle', {cx:a[0],cy:a[1],r,fill:'none'}); style(el, construction); svg.appendChild(el);
  }
  function addDimension(a, b) {
    const g = createEl('g');
    const line = createEl('line', {x1:a[0],y1:a[1],x2:b[0],y2:b[1]}); line.classList.add('cad-dim-line');
    const length = Math.hypot(b[0]-a[0], b[1]-a[1]).toFixed(1);
    const text = createEl('text', {x:(a[0]+b[0])/2,y:(a[1]+b[1])/2-7}); text.classList.add('cad-dim-text'); text.textContent = `${length} mm`;
    g.append(line,text); svg.appendChild(g);
  }
  function grid() {
    svg.querySelectorAll('.cad-grid').forEach((n) => n.remove());
    if (!gridOn) return;
    const vb = svg.viewBox.baseVal, g = createEl('g'); g.classList.add('cad-grid');
    for(let x=vb.x; x<=vb.x+vb.width; x+=gridSize) g.appendChild(createEl('line',{x1:x,y1:vb.y,x2:x,y2:vb.y+vb.height}));
    for(let y=vb.y; y<=vb.y+vb.height; y+=gridSize) g.appendChild(createEl('line',{x1:vb.x,y1:y,x2:vb.x+vb.width,y2:y}));
    svg.prepend(g);
  }

  tools.querySelectorAll('[data-cad-tool]').forEach((button) => button.addEventListener('click', () => {
    const next = button.dataset.cadTool;
    if (next === 'grid') { gridOn = !gridOn; grid(); status(`Grid Snap: ${gridOn ? 'ON' : 'OFF'}`); return; }
    if (next === 'zoom-in' || next === 'zoom-out') {
      const vb = svg.viewBox.baseVal; const factor = next === 'zoom-in' ? .8 : 1.25;
      const nw = vb.width*factor, nh = vb.height*factor; vb.x += (vb.width-nw)/2; vb.y += (vb.height-nh)/2; vb.width=nw; vb.height=nh; grid(); return;
    }
    if (next === 'export') {
      const clone = svg.cloneNode(true); clone.querySelectorAll('.cad-grid').forEach((n) => n.remove());
      const blob = new Blob([new XMLSerializer().serializeToString(clone)], {type:'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='ia-tutor-autocad-drawing.svg'; a.click(); URL.revokeObjectURL(url); return;
    }
    mode = next; start = null; clearDraft(); status(`${next.charAt(0).toUpperCase()+next.slice(1)} tool selected • click and drag on the drawing`);
  }));

  svg.addEventListener('pointerdown', (event) => {
    if (mode === 'select') return;
    start = point(event); svg.setPointerCapture(event.pointerId); clearDraft();
    draft = createEl(mode === 'circle' ? 'circle' : mode === 'rectangle' ? 'rect' : 'line'); draft.setAttribute('opacity','.45'); draft.classList.add('cad-entity'); svg.appendChild(draft);
  });
  svg.addEventListener('pointermove', (event) => {
    if (!start || !draft) return;
    const end = point(event);
    if (mode === 'line' || mode === 'construction' || mode === 'dimension') { draft.setAttribute('x1',start[0]); draft.setAttribute('y1',start[1]); draft.setAttribute('x2',end[0]); draft.setAttribute('y2',end[1]); }
    else if (mode === 'rectangle') { draft.setAttribute('x',Math.min(start[0],end[0])); draft.setAttribute('y',Math.min(start[1],end[1])); draft.setAttribute('width',Math.abs(end[0]-start[0])); draft.setAttribute('height',Math.abs(end[1]-start[1])); draft.setAttribute('fill','none'); }
    else if (mode === 'circle') { draft.setAttribute('cx',start[0]); draft.setAttribute('cy',start[1]); draft.setAttribute('r',Math.hypot(end[0]-start[0],end[1]-start[1])); draft.setAttribute('fill','none'); }
  });
  svg.addEventListener('pointerup', (event) => {
    if (!start) return; const end = point(event); save(); clearDraft();
    if (mode === 'line') addLine(start,end);
    else if (mode === 'construction') addLine(start,end,true);
    else if (mode === 'rectangle') addRect(start,end);
    else if (mode === 'circle') addCircle(start,end);
    else if (mode === 'dimension') addDimension(start,end);
    start = null; status(`Added ${mode} • Grid Snap ${gridOn ? 'ON' : 'OFF'}`);
  });
  grid();
}

const observer = new MutationObserver(() => document.querySelectorAll('#real-cad-workspace').forEach(installCadTools));
observer.observe(document.body, {childList:true, subtree:true});
document.querySelectorAll('#real-cad-workspace').forEach(installCadTools);
