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
    title: 'Automatic CAD-Method Solution',
    dimensions: { width, height, depth, units }, projection,
    commands: CAD_COMMANDS.map(([command, description], index) => ({ step: index + 1, command, description })),
    checks: [`Front view = ${width} × ${height} ${units}`, `Top view = ${width} × ${depth} ${units}`, `Right-side view = ${depth} × ${height} ${units}`, features.length ? `Detected features: ${features.join(', ')}` : 'No additional geometric feature was reported by AI.', `Projection method: ${projection}`],
  };
}

export function renderCadSolvePlan(container, plan, { animate = true } = {}) {
  if (!container) return;
  container.innerHTML = '';
  const wrapper = document.createElement('div'); wrapper.className = 'cad-live-plan';
  const heading = document.createElement('div'); heading.className = 'cad-live-summary';
  heading.innerHTML = `<strong>⚙️ ${plan.title}</strong><span>${plan.dimensions.width} × ${plan.dimensions.height} × ${plan.dimensions.depth} ${plan.dimensions.units}</span>`; wrapper.appendChild(heading);
  const list = document.createElement('ol'); list.className = 'cad-command-list';
  plan.commands.forEach((item, index) => { const li = document.createElement('li'); li.className = 'cad-command'; li.innerHTML = `<div><code>${item.command}</code><strong>Step ${item.step}</strong></div><p>${item.description}</p>`; if (animate) li.style.animationDelay = `${index * 70}ms`; list.appendChild(li); });
  wrapper.appendChild(list);
  const checks = document.createElement('div'); checks.className = 'cad-checks'; checks.innerHTML = `<h4>Automatic CAD checks</h4>${plan.checks.map((check) => `<div>✓ ${check}</div>`).join('')}`; wrapper.appendChild(checks);
  container.appendChild(wrapper);
}

function ensureCadContainer() {
  let container = document.getElementById('cad-live-solver');
  if (container) return container;
  const outputPanel = document.querySelector('.output-panel');
  if (!outputPanel) return null;
  container = document.createElement('section');
  container.id = 'cad-live-solver';
  container.className = 'instructions-panel cad-live-panel';
  container.innerHTML = '<h3>⚙️ Live CAD Method Solver</h3><p class="cad-live-empty">Upload a technical drawing. AI will extract the dimensions and generate the automatic CAD construction sequence here.</p>';
  const instructions = outputPanel.querySelector('.instructions-panel');
  outputPanel.insertBefore(container, instructions || null);
  return container;
}

export function initCadLiveSolver() {
  ensureCadContainer();
  window.addEventListener('ia-tutor-cad-solve', (event) => {
    const container = ensureCadContainer();
    if (!container) return;
    try { renderCadSolvePlan(container, buildCadSolvePlan(event.detail?.problem)); }
    catch (error) { container.innerHTML = `<h3>⚙️ Live CAD Method Solver</h3><div class="cad-live-empty">${error.message}</div>`; }
  });
  window.addEventListener('ia-tutor-cad-reset', () => {
    const container = ensureCadContainer();
    if (container) container.innerHTML = '<h3>⚙️ Live CAD Method Solver</h3><p class="cad-live-empty">Upload a technical drawing. AI will extract the dimensions and generate the automatic CAD construction sequence here.</p>';
  });
}
