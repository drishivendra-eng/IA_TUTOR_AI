import { buildFeatureGeometry } from './geometry.js';

const VIEW_MARGIN = {
  left: 88,
  right: 52,
  top: 40,
  bottom: 78,
};

function getScale(width, height, depth) {
  const maxDimension = Math.max(width, height, depth);
  return 170 / maxDimension;
}

function buildMarkerDefs(id) {
  return `
    <defs>
      <marker id="${id}" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L7,3 L0,6 Z" fill="#1f2937" />
      </marker>
    </defs>
  `;
}

function buildStandaloneSvg({
  label,
  width,
  height,
  id,
  problem,
  isFrontView = false,
  x = 0,
  y = 0,
  viewWidth = 320,
  viewHeight = 240,
  featureGeometry,
  viewKey,
}) {
  const scale = getScale(width, height, 1);
  const plotWidth = width * scale;
  const plotHeight = height * scale;
  const left = VIEW_MARGIN.left;
  const top = VIEW_MARGIN.top;
  const right = VIEW_MARGIN.right;
  const bottom = VIEW_MARGIN.bottom;
  const x0 = left;
  const y0 = top;
  const x1 = x0 + plotWidth;
  const y1 = y0 + plotHeight;
  const viewBoxWidth = left + plotWidth + right;
  const viewBoxHeight = top + plotHeight + bottom;
  const markerId = `arrow-${id}`;
  const polygons = featureGeometry?.polygons || [];
  const polylines = featureGeometry?.polylines || [];
  const hiddenLines = featureGeometry?.hiddenLines || [];
  const slopeEdges = featureGeometry?.slopeEdges || [];
  const objectGeometry = polygons.map((points) => points.map(([pointX, pointY]) => `${x0 + pointX * scale},${y0 + pointY * scale}`).join(' '));
  const lineGeometry = polylines.map(([start, end]) => `<line x1="${x0 + start[0] * scale}" y1="${y0 + start[1] * scale}" x2="${x0 + end[0] * scale}" y2="${y0 + end[1] * scale}" stroke="#64748b" stroke-width="1.2" stroke-dasharray="6 5" />`).join('');
  const hiddenGeometry = hiddenLines.map(([start, end]) => `<line x1="${x0 + start[0] * scale}" y1="${y0 + start[1] * scale}" x2="${x0 + end[0] * scale}" y2="${y0 + end[1] * scale}" stroke="#64748b" stroke-width="1.1" stroke-dasharray="5 4" />`).join('');
  const slopeGeometry = slopeEdges.map(([start, end]) => `<line x1="${x0 + start[0] * scale}" y1="${y0 + start[1] * scale}" x2="${x0 + end[0] * scale}" y2="${y0 + end[1] * scale}" stroke="#1f2937" stroke-width="2.4" />`).join('');
  // Each level is annotated exactly once here; the overall height is already shown by the primary height label below.
  const semantic = problem?.semanticDimensions || {};
  const levelLabels = isFrontView && semantic.baseHeight
    ? [
        `<text x="${x1 + 34}" y="${y1 - semantic.baseHeight * scale}" fill="#475569" font-size="10">${semantic.baseHeight} mm base</text>`,
        `<text x="${x1 + 34}" y="${y1 - semantic.intermediateHeight * scale}" fill="#475569" font-size="10">${semantic.intermediateHeight} mm intermediate</text>`,
      ].join('')
    : viewKey === 'right' && semantic.intermediateHeight
      ? `<text x="${x1 + 34}" y="${y1 - semantic.intermediateHeight * scale}" fill="#475569" font-size="10">${semantic.intermediateHeight} mm intermediate</text>`
      : '';
  const objectMarkup = objectGeometry.length
    ? objectGeometry.map((points) => `<polygon points="${points}" fill="#ffffff" stroke="#1f2937" stroke-width="2.4" stroke-linejoin="round" />`).join('')
    : `<rect x="${x0}" y="${y0}" width="${plotWidth}" height="${plotHeight}" fill="#ffffff" stroke="#1f2937" stroke-width="2.4" />`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}" width="${viewWidth}" height="${viewHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}">
      ${buildMarkerDefs(markerId)}
      <text x="${x0 + plotWidth / 2}" y="${top - 12}" fill="#0b2d4f" font-size="13" font-weight="700" text-anchor="middle">${label}</text>
      ${objectMarkup}
      ${lineGeometry}
      ${hiddenGeometry}
      ${slopeGeometry}
      <line x1="${x0}" y1="${y1 + 18}" x2="${x1}" y2="${y1 + 18}" stroke="#1f2937" stroke-width="1.3" marker-start="url(#${markerId})" marker-end="url(#${markerId})" />
      <line x1="${x0 - 18}" y1="${y0}" x2="${x0 - 18}" y2="${y1}" stroke="#1f2937" stroke-width="1.3" marker-start="url(#${markerId})" marker-end="url(#${markerId})" />
      <line x1="${x0}" y1="${y0 + plotHeight}" x2="${x1}" y2="${y0 + plotHeight}" stroke="#64748b" stroke-width="1" stroke-dasharray="6 5" opacity="0.7" />
      <line x1="${x0 + plotWidth}" y1="${y0}" x2="${x0 + plotWidth}" y2="${y1}" stroke="#64748b" stroke-width="1" stroke-dasharray="6 5" opacity="0.7" />
      <text x="${x0 + plotWidth / 2}" y="${y1 + 38}" fill="#1f2937" font-size="12" font-weight="700" text-anchor="middle">${width} mm</text>
      <text x="${x0 - 34}" y="${y0 + plotHeight / 2}" fill="#1f2937" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle">${height} mm</text>
      ${levelLabels}
    </svg>
  `;
}

export function renderViews(problem) {
  if (problem.hasStep || problem.hasSlope) {
    console.info('VERSION 5.8 \u2014 3D PARAMETRIC ORTHOGRAPHIC RENDERER');
    console.info('Front: X-Z');
    console.info('Top: X-Y');
    console.info('Right: Y-Z');
  }

  const frontView = buildStandaloneSvg({
    label: 'Front View',
    width: problem.width,
    height: problem.height,
    id: 'front',
    problem,
    isFrontView: true,
    featureGeometry: buildFeatureGeometry(problem).front,
    viewKey: 'front',
    viewWidth: 360,
    viewHeight: 260,
  });

  const topView = buildStandaloneSvg({
    label: 'Top View',
    width: problem.width,
    height: problem.depth,
    id: 'top',
    problem,
    featureGeometry: buildFeatureGeometry(problem).top,
    viewKey: 'top',
    viewWidth: 360,
    viewHeight: 260,
  });

  const rightSideView = buildStandaloneSvg({
    label: 'Right-Side View',
    width: problem.depth,
    height: problem.height,
    id: 'right-side',
    problem,
    featureGeometry: buildFeatureGeometry(problem).right,
    viewKey: 'right',
    viewWidth: 360,
    viewHeight: 260,
  });

  return {
    frontView,
    topView,
    rightSideView,
  };
}

export function insertRenderedViews(problem, containers) {
  const views = renderViews(problem);
  containers.front.innerHTML = views.frontView;
  containers.top.innerHTML = views.topView;
  containers.right.innerHTML = views.rightSideView;
  return views;
}

export function buildCompositeDownloadSvg(problem) {
  const frontView = buildStandaloneSvg({
    label: 'Front View',
    width: problem.width,
    height: problem.height,
    id: 'front-download',
    problem,
    isFrontView: true,
    featureGeometry: buildFeatureGeometry(problem).front,
    viewKey: 'front',
    x: 40,
    y: 90,
    viewWidth: 340,
    viewHeight: 260,
  });

  const topView = buildStandaloneSvg({
    label: 'Top View',
    width: problem.width,
    height: problem.depth,
    id: 'top-download',
    problem,
    featureGeometry: buildFeatureGeometry(problem).top,
    viewKey: 'top',
    x: 420,
    y: 90,
    viewWidth: 340,
    viewHeight: 260,
  });

  const rightSideView = buildStandaloneSvg({
    label: 'Right-Side View',
    width: problem.depth,
    height: problem.height,
    id: 'right-side-download',
    problem,
    featureGeometry: buildFeatureGeometry(problem).right,
    viewKey: 'right',
    x: 800,
    y: 90,
    viewWidth: 340,
    viewHeight: 260,
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1180 420" role="img" aria-label="IA-Tutor AI Orthographic Projection Drawing">
      <rect x="0" y="0" width="1180" height="420" fill="#ffffff" />
      <text x="590" y="36" fill="#0b2d4f" font-size="18" font-weight="700" text-anchor="middle">IA-Tutor AI</text>
      <text x="590" y="58" fill="#475569" font-size="12" font-weight="600" text-anchor="middle">Orthographic Projection</text>
      ${frontView}
      ${topView}
      ${rightSideView}
    </svg>
  `;
}
