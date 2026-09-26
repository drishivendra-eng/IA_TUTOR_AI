import assert from 'node:assert/strict';
import { buildFeatureGeometry, buildGeometryProblem, buildConstructionSteps, normalizeDrawingDimensions, parseProblem } from './geometry.js';
import { insertRenderedViews, renderViews } from './render.js';

function makeProblem(overrides = {}) {
  return {
    units: 'mm',
    overall_dimensions: {
      width: { value: 60, unit: 'mm', confidence: 1 },
      height: { value: 40, unit: 'mm', confidence: 1 },
      depth: { value: 60, unit: 'mm', confidence: 1 },
    },
    dimensions: { width: 60, height: 40, depth: 60 },
    geometric_features: [],
    steps: [],
    slopes: [],
    construction_requirements: [],
    ...overrides,
  };
}

function assertViews(problem, expectsFeatureGeometry) {
  const views = renderViews(buildGeometryProblem(problem));
  for (const [name, svg] of Object.entries(views)) {
    assert.match(svg, /^\s*<svg/);
    assert.match(svg, /<\/svg>/);
    assert.match(svg, /60 mm/);
    if (name === 'frontView' || name === 'rightSideView') {
      assert.match(svg, /40 mm/);
    }
  }

  if (expectsFeatureGeometry) {
    assert.match(views.frontView, /<polygon/);
    assert.match(views.topView, /<polygon/);
    assert.match(views.rightSideView, /<polygon/);
  } else {
    assert.match(views.frontView, /<rect/);
  }
}

assertViews(makeProblem(), false);
assertViews(makeProblem({ geometric_features: ['step'], steps: [{ height: 20 }] }), true);
assertViews(makeProblem({ geometric_features: ['slope'] }), true);
assertViews(makeProblem({ geometric_features: ['step', 'slope'], steps: [{ height: 20 }] }), true);

const manual = parseProblem({ width: '120', height: '80', depth: '60' });
assert.deepEqual(
  { width: manual.width, height: manual.height, depth: manual.depth },
  { width: 120, height: 80, depth: 60 },
);
assert.equal(buildConstructionSteps(buildGeometryProblem(makeProblem({ geometric_features: ['step', 'slope'], steps: [{ height: 20 }] }))).length, 9);

const stackedProblem = buildGeometryProblem(makeProblem({ geometric_features: ['step', 'slope'], steps: [{ height: 20 }] }));
const featureGeometry = buildFeatureGeometry(stackedProblem);

// A. Three vertical levels: 20, 40, 60 mm.
assert.equal(featureGeometry.semanticDimensions.baseHeight, 20);
assert.equal(featureGeometry.semanticDimensions.intermediateHeight, 40);
assert.equal(featureGeometry.semanticDimensions.overallHeight, 60);
assert.equal(featureGeometry.dimensions.width, 60);
assert.equal(featureGeometry.dimensions.height, 60);
assert.equal(featureGeometry.dimensions.depth, 60);

// B. 20 x 20 upper feature.
assert.equal(featureGeometry.model.solids.upper.width, 20);
assert.equal(featureGeometry.model.solids.upper.depth, 20);
assert.equal(featureGeometry.model.solids.upper.height, 20);

// C. 40 mm intermediate/raised section (base 0..20, intermediate rises to 40).
assert.equal(featureGeometry.model.solids.base.height, 20);
assert.equal(featureGeometry.model.solids.intermediate.height, 20);
assert.equal(featureGeometry.model.solids.intermediate.z, 20);

// D. Genuine ramp connecting the upper feature (X20,Z60) to the intermediate boundary (X40,Z40).
assert.equal(featureGeometry.model.ramp.from.x, 20);
assert.equal(featureGeometry.model.ramp.from.z, 60);
assert.equal(featureGeometry.model.ramp.to.x, 40);
assert.equal(featureGeometry.model.ramp.to.z, 40);

// E. Front silhouette contains BOTH the 40 mm step and the inclined ramp, with exact vertex coordinates.
assert.deepEqual(featureGeometry.front.polygons[0], [
  [0, 60], [60, 60], [60, 40], [40, 40], [40, 20], [20, 0], [0, 0],
]);
assert.equal(featureGeometry.front.slopeEdges.length, 1);
assert.deepEqual(featureGeometry.front.slopeEdges[0], [[20, 0], [40, 20]]);

// F. Top View contains the 60x60 footprint, the 20x20 upper feature, and the intermediate boundary at X=40.
assert.deepEqual(featureGeometry.top.polygons[0], [[0, 0], [60, 0], [60, 60], [0, 60]]);
assert.deepEqual(featureGeometry.top.polygons[1], [[0, 0], [20, 0], [20, 20], [0, 20]]);
assert.ok(featureGeometry.top.polylines.some(([start, end]) => start[0] === 40 && end[0] === 40));

// G. Right View is independently generated: it is a step (no diagonal), not identical to Front.
assert.equal(featureGeometry.right.slopeEdges.length, 0);
assert.deepEqual(featureGeometry.right.polygons[0], [
  [0, 60], [60, 60], [60, 20], [20, 20], [20, 0], [0, 0],
]);
assert.notDeepEqual(featureGeometry.right.polygons[0], featureGeometry.front.polygons[0]);

// Hidden line: the base-top surface occluded behind the taller intermediate block in the Right View.
assert.equal(featureGeometry.right.hiddenLines.length, 1);
assert.deepEqual(featureGeometry.right.hiddenLines[0], [[20, 40], [60, 40]]);
assert.equal(featureGeometry.top.hiddenLines.length, 0);

const normalized = normalizeDrawingDimensions({
  units: 'mm',
  overall_dimensions: {},
  dimensions: { width: 60, height: 40, depth: 60 },
}, {});
assert.deepEqual(normalized.values, { width: 60, height: 40, depth: 60 });
assert.equal(normalized.metadata.width.source, 'unknown');

const fallbackGeometry = buildGeometryProblem({
  units: 'mm',
  overall_dimensions: {},
  dimensions: {},
  geometric_features: ['step', 'slope'],
  steps: [{ height: 20 }],
}, { width: '60', height: '40', depth: '60' });
assert.deepEqual(
  { width: fallbackGeometry.width, height: fallbackGeometry.height, depth: fallbackGeometry.depth },
  { width: 60, height: 60, depth: 60 },
);
assert.equal(fallbackGeometry.dimensionMetadata.width.source, 'manual_input');

assert.throws(
  () => buildGeometryProblem({ dimensions: { width: 60, height: null, depth: 60 }, geometric_features: [] }),
  /does not contain all required dimensions/,
);

const versionFivePointEightViews = renderViews(stackedProblem);
assert.match(versionFivePointEightViews.frontView, /20 mm base/);
assert.match(versionFivePointEightViews.frontView, /40 mm intermediate/);
assert.match(versionFivePointEightViews.frontView, /<line/);
assert.match(versionFivePointEightViews.frontView, /<polygon/);
assert.match(versionFivePointEightViews.topView, /<polygon/);
assert.ok((versionFivePointEightViews.topView.match(/<polygon/g) || []).length >= 2);
assert.match(versionFivePointEightViews.rightSideView, /<polygon/);
assert.match(versionFivePointEightViews.rightSideView, /stroke-dasharray="5 4"/);
assert.notEqual(versionFivePointEightViews.frontView, versionFivePointEightViews.rightSideView);
// No duplicate dimension text: each numeric mm label should appear exactly once per view.
assert.equal((versionFivePointEightViews.frontView.match(/40 mm intermediate/g) || []).length, 1);
assert.equal((versionFivePointEightViews.rightSideView.match(/40 mm intermediate/g) || []).length, 1);

const domContainers = { front: { innerHTML: '' }, top: { innerHTML: '' }, right: { innerHTML: '' } };
insertRenderedViews(stackedProblem, domContainers);
assert.match(domContainers.front.innerHTML, /<polygon/);
assert.match(domContainers.front.innerHTML, /<line/);
assert.match(domContainers.top.innerHTML, /<polygon/);
assert.match(domContainers.right.innerHTML, /<polygon/);
assert.notEqual(domContainers.front.innerHTML, domContainers.right.innerHTML);

console.log('geometry feature tests passed');
