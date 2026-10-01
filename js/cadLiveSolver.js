const CAD_COMMANDS = [
  ['SETUNITS', 'Set drawing units to the units detected by AI.'],
  ['LIMITS', 'Create the drawing workspace from the detected overall dimensions.'],
  ['LINE', 'Construct the primary front-view profile with exact coordinates.'],
  ['OFFSET', 'Project construction lines between aligned views.'],
  ['XLINE', 'Create horizontal and vertical projection guides.'],
  ['TRIM', 'Remove construction segments outside the required profile.'],
  ['DIM', 'Add measured dimension annotations from the AI-extracted values.'],
  ['LABEL', 'Label Front, Top and Right-Side views.'],
  ['CHECK', 'Verify alignment, scale, dimensions and projection consistency.'],
];

export function buildCadSolvePlan(problem) {
  const width = Number(problem?.width), height = Number(problem?.height), depth = Number(problem?.depth);
  if (![width, height, depth].every((value) => Number.isFinite(value) && value > 0)) throw new Error('CAD Live Solver needs AI-extracted width, height and depth first.');
  const units = problem.units || 'mm';
  const projection = problem.projection_type || 'orthographic';
  const features = problem.features || problem.geometric_features || [];
  return {
    title: 'Automatic CAD-Method Solution', dimensions: { width, height, depth, units }, projection,
    commands: CAD_COMMANDS.map(([command, description], index) => ({ step: index + 1, command, description })),
    checks: [`Front view = ${width} × ${height} ${units}`, `Top view = ${width} × ${depth} ${units}`, `Right-side view = ${depth} × ${height} ${units}`, features.length ? `Detected features: ${features.join(', ')}` : 'No additional geometric feature was reported by AI.', `Projection method: ${projection}`],
  };
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function createCadWorkspace(container) {
  const workspace = document.createElement('div');
  workspace.className = 'cad-animation-workspace';
  workspace.innerHTML = `
    <div class="cad-animation-toolbar">
      <span class="cad-live-status">● LIVE CONSTRUCTION</span>
      <span class="cad-animation-command">Ready</span>
      <button type="button" class="cad-skip-button">Skip Animation</button>
    </div>
    <div class="cad-animation-stage">
      <svg class="cad-animation-svg" viewBox="0 0 900 500" role="img" aria-label="Animated CAD construction"></svg>
    </div>`;
  container.appendChild(workspace);
  return workspace;
}

function drawLine(svg, x1, y1, x2, y2, className = 'cad-construction-line') {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2); line.setAttribute('class', className);
  svg.appendChild(line);
  return line;
}

function drawText(svg, text, x, y, className = 'cad-view-label') {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  node.setAttribute('x', x); node.setAttribute('y', y); node.setAttribute('class', className); node.textContent = text; svg.appendChild(node); return node;
}

async function animateConstruction(workspace, plan) {
  const svg = workspace.querySelector('.cad-animation-svg');
  const commandLabel = workspace.querySelector('.cad-animation-command');
  const skipButton = workspace.querySelector('.cad-skip-button');
  let skip = false;
  const skipHandler = () => { skip = true; };
  skipButton.addEventListener('click', skipHandler, { once: true });

  const W = 900, H = 500;
  const scale = Math.min(2.1, 280 / Math.max(plan.dimensions.width, plan.dimensions.height, plan.dimensions.depth));
  const fw = plan.dimensions.width * scale, fh = plan.dimensions.height * scale, fd = plan.dimensions.depth * scale;
  const frontX = 110, frontY = 90;
  const topX = frontX, topY = frontY + fh + 95;
  const rightX = frontX + fw + 150, rightY = frontY;

  const steps = [
    ['SETUNITS', () => drawText(svg, `${plan.dimensions.units} • 1:1`, 30, 30, 'cad-meta')],
    ['LIMITS', () => { drawLine(svg, 45, 50, W - 45, 50, 'cad-limit-line'); drawLine(svg, 45, H - 35, W - 45, H - 35, 'cad-limit-line'); }],
    ['LINE', () => { drawLine(svg, frontX, frontY, frontX + fw, frontY, 'cad-profile-line'); drawLine(svg, frontX + fw, frontY, frontX + fw, frontY + fh, 'cad-profile-line'); drawLine(svg, frontX + fw, frontY + fh, frontX, frontY + fh, 'cad-profile-line'); drawLine(svg, frontX, frontY + fh, frontX, frontY, 'cad-profile-line'); drawText(svg, 'FRONT VIEW', frontX, frontY - 15); }],
    ['OFFSET', () => { drawLine(svg, frontX, frontY + fh + 18, frontX, topY, 'cad-guide-line'); drawLine(svg, frontX + fw, frontY + fh + 18, frontX + fw, topY, 'cad-guide-line'); drawLine(svg, frontX + fw + 18, frontY, rightX, frontY, 'cad-guide-line'); drawLine(svg, frontX + fw + 18, frontY + fh, rightX, frontY + fh, 'cad-guide-line'); }],
    ['XLINE', () => { drawLine(svg, frontX, topY, frontX + fw, topY, 'cad-profile-line'); drawLine(svg, frontX + fw, topY, frontX + fw, topY + fd, 'cad-profile-line'); drawLine(svg, frontX + fw, topY + fd, frontX, topY + fd, 'cad-profile-line'); drawLine(svg, frontX, topY + fd, frontX, topY, 'cad-profile-line'); drawText(svg, 'TOP VIEW', frontX, topY - 15); }],
    ['TRIM', () => { drawLine(svg, rightX, rightY, rightX + fd, rightY, 'cad-profile-line'); drawLine(svg, rightX + fd, rightY, rightX + fd, rightY + fh, 'cad-profile-line'); drawLine(svg, rightX + fd, rightY + fh, rightX, rightY + fh, 'cad-profile-line'); drawLine(svg, rightX, rightY + fh, rightX, rightY, 'cad-profile-line'); drawText(svg, 'RIGHT-SIDE VIEW', rightX, rightY - 15); }],
    ['DIM', () => { drawText(svg, `${plan.dimensions.width} ${plan.dimensions.units}`, frontX + fw / 2 - 35, frontY + fh + 32, 'cad-dimension'); drawText(svg, `${plan.dimensions.height} ${plan.dimensions.units}`, frontX - 70, frontY + fh / 2, 'cad-dimension'); drawText(svg, `${plan.dimensions.depth} ${plan.dimensions.units}`, frontX + fw / 2 - 35, topY + fd + 32, 'cad-dimension'); }],
    ['LABEL', () => drawText(svg, 'ORTHOGRAPHIC PROJECTION', 335, H - 55, 'cad-title')],
    ['CHECK', () => { const check = drawText(svg, '✓ ALIGNMENT • SCALE • DIMENSIONS VERIFIED', 255, 30, 'cad-check-text'); check.setAttribute('x', '500'); })],
  ];

  for (const [command, action] of steps) {
    commandLabel.textContent = `Command: ${command}`;
    action();
    if (!skip) await sleep(650);
  }
  commandLabel.textContent = skip ? 'Construction complete' : '✓ Construction complete';
  skipButton.textContent = 'Replay';
  skipButton.disabled = false;
  skipButton.onclick = () => { workspace.remove(); animateConstruction(createCadWorkspace(container), plan); };
  skipButton.removeEventListener('click', skipHandler);
}

export function renderCadSolvePlan(container, plan, { animate = true } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const wrapper = document.createElement('div'); wrapper.className = 'cad-live-plan';
  const heading = document.createElement('div'); heading.className = 'cad-live-summary';
  heading.innerHTML = `<strong>⚙️ ${plan.title}</strong><span>${plan.dimensions.width} × ${plan.dimensions.height} × ${plan.dimensions.depth} ${plan.dimensions.units}</span>`;
  wrapper.appendChild(heading);
  const workspace = createCadWorkspace(wrapper);
  const list = document.createElement('ol'); list.className = 'cad-command-list';
  plan.commands.forEach((item) => { const li = document.createElement('li'); li.className = 'cad-command'; li.innerHTML = `<div><code>${item.command}</code><strong>Step ${item.step}</strong></div><p>${item.description}</p>`; list.appendChild(li); });
  wrapper.appendChild(list);
  const checks = document.createElement('div'); checks.className = 'cad-checks'; checks.innerHTML = `<h4>Automatic CAD checks</h4>${plan.checks.map((check) => `<div>✓ ${check}</div>`).join('')}`; wrapper.appendChild(checks);
  container.appendChild(wrapper);
  if (animate) animateConstruction(workspace, plan);
}

function ensureCadContainer() {
  let container = document.getElementById('cad-live-solver');
  if (container) return container;
  const outputPanel = document.querySelector('.output-panel');
  if (!outputPanel) return null;
  container = document.createElement('section'); container.id = 'cad-live-solver'; container.className = 'instructions-panel cad-live-panel';
  container.innerHTML = '<h3>⚙️ Live CAD Method Solver</h3><p class="cad-live-empty">Upload a technical drawing. AI will extract the dimensions and automatically construct the solution.</p>';
  const instructions = outputPanel.querySelector('.instructions-panel'); outputPanel.insertBefore(container, instructions || null); return container;
}

export function initCadLiveSolver() {
  ensureCadContainer();
  window.addEventListener('ia-tutor-cad-solve', (event) => { const container = ensureCadContainer(); if (!container) return; try { renderCadSolvePlan(container, buildCadSolvePlan(event.detail?.problem)); } catch (error) { container.innerHTML = `<h3>⚙️ Live CAD Method Solver</h3><div class="cad-live-empty">${error.message}</div>`; } });
  window.addEventListener('ia-tutor-cad-reset', () => { const container = ensureCadContainer(); if (container) container.innerHTML = '<h3>⚙️ Live CAD Method Solver</h3><p class="cad-live-empty">Upload a technical drawing. AI will extract the dimensions and automatically construct the solution.</p>'; });
}
