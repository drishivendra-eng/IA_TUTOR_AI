export const DEFAULT_PROBLEM = {
  width: 60,
  height: 40,
  depth: 60,
};

export function parseProblem(formValues) {
  const width = Number(formValues.width);
  const height = Number(formValues.height);
  const depth = Number(formValues.depth);

  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('Width must be a positive number.');
  }

  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('Height must be a positive number.');
  }

  if (!Number.isFinite(depth) || depth <= 0) {
    throw new Error('Depth must be a positive number.');
  }

  return {
    width,
    height,
    depth,
    features: [],
    featureHeight: null,
  };
}

function getDimensionValue(dimension) {
  if (typeof dimension === 'number' && Number.isFinite(dimension)) {
    return dimension;
  }

  if (typeof dimension === 'string' && dimension.trim() !== '' && Number.isFinite(Number(dimension))) {
    return Number(dimension);
  }

  if (dimension && typeof dimension === 'object' && Number.isFinite(Number(dimension.value))) {
    return Number(dimension.value);
  }

  return null;
}

export function normalizeDrawingDimensions(problem, fallbackDimensions = {}) {
  const overallDimensions = problem.overall_dimensions || {};
  const directDimensions = problem.dimensions || {};
  const units = problem.units || 'mm';
  const names = ['width', 'height', 'depth'];
  const values = {};
  const metadata = {};

  names.forEach((name) => {
    const overall = overallDimensions[name];
    const direct = directDimensions[name];
    const fallback = fallbackDimensions[name];
    const value = getDimensionValue(overall) ?? getDimensionValue(direct) ?? getDimensionValue(fallback);
    const source = overall !== undefined && getDimensionValue(overall) !== null
      ? overall
      : direct !== undefined && getDimensionValue(direct) !== null
        ? direct
        : fallback;

    values[name] = value;
    metadata[name] = {
      value,
      unit: source && typeof source === 'object' ? source.unit || units : units,
      confidence: source && typeof source === 'object' && Number.isFinite(Number(source.confidence))
        ? Number(source.confidence)
        : fallback !== undefined && getDimensionValue(fallback) !== null ? 1 : 0,
      source: source && typeof source === 'object' && source.source
        ? source.source
        : fallback !== undefined && getDimensionValue(fallback) !== null ? 'manual_input' : 'unknown',
    };
  });

  return { values, metadata };
}

function findFeatureDimension(problem) {
  for (const step of problem.steps || []) {
    if (step && typeof step === 'object') {
      for (const key of ['height', 'dimension', 'feature']) {
        const value = Number(step[key]);
        if (Number.isFinite(value) && value > 0) {
          return value;
        }
      }
    }
  }

  const text = [
    ...(problem.steps || []),
    ...(problem.construction_requirements || []),
    ...(problem.geometric_features || []),
  ].join(' ');
  const matches = [...text.matchAll(/(?:height|dimension|feature)[^\d]{0,20}(\d+(?:\.\d+)?)/gi)];
  const value = matches.length > 0 ? Number(matches[0][1]) : null;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function hasFeature(features, pattern) {
  return features.some((feature) => pattern.test(feature));
}

export function buildGeometryProblem(problem, fallbackDimensions = {}) {
  const normalizedDimensions = normalizeDrawingDimensions(problem, fallbackDimensions);
  const { values, metadata } = normalizedDimensions;
  const width = values.width;
  const height = values.height;
  const depth = values.depth;

  if (![width, height, depth].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('The confirmed AI analysis does not contain all required dimensions.');
  }

  const features = (problem.geometric_features || []).map((feature) => String(feature).toLowerCase());
  const hasSlope = hasFeature(features, /slope|inclined|ramp/);
  const hasStep = hasFeature(features, /step|stepped/)
    || (problem.steps || []).some((step) => /step|upper section/i.test(String(step)));
  const featureHeight = findFeatureDimension(problem);
  const semanticDimensions = deriveSemanticDimensions({
    problem,
    width,
    height,
    depth,
    featureHeight,
    hasStep,
    hasSlope,
    metadata,
  });

  return {
    width: semanticDimensions.footprintWidth,
    height: semanticDimensions.overallHeight,
    depth: semanticDimensions.footprintDepth,
    semanticDimensions,
    dimensionMetadata: metadata,
    features,
    featureHeight: featureHeight && featureHeight < height ? featureHeight : null,
    hasSlope,
    hasStep,
    source: 'real-ai',
    uncertainFeaturePlacement: Boolean(hasStep || hasSlope) && !featureHeight,
  };
}

function deriveSemanticDimensions({ problem, width, height, depth, featureHeight, hasStep, hasSlope, metadata }) {
  const hasStackedLevels = hasStep && hasSlope && featureHeight && height > featureHeight;
  const baseHeight = hasStackedLevels ? featureHeight : null;
  const intermediateHeight = hasStackedLevels ? height : height;
  const overallHeight = hasStackedLevels ? height + featureHeight : height;
  const derivedConfidence = Math.min(
    Number(metadata.height?.confidence || 0),
    Number(metadata.width?.confidence || 0),
    Number(metadata.depth?.confidence || 0),
  );
  const derived = (value) => ({ value, unit: problem.units || 'mm', confidence: derivedConfidence, source: 'derived' });

  return {
    footprintWidth: width,
    footprintDepth: depth,
    baseHeight,
    intermediateHeight,
    upperFeatureHeight: hasStackedLevels ? featureHeight : null,
    overallHeight,
    upperFeatureWidth: hasStackedLevels ? featureHeight : null,
    upperFeatureDepth: hasStackedLevels ? featureHeight : null,
    metadata: {
      base_height: baseHeight === null ? null : derived(baseHeight),
      intermediate_height: derived(intermediateHeight),
      upper_feature_height: hasStackedLevels ? derived(featureHeight) : null,
      overall_height: hasStackedLevels ? derived(overallHeight) : metadata.height,
      upper_feature_width: hasStackedLevels ? derived(featureHeight) : null,
      upper_feature_depth: hasStackedLevels ? derived(featureHeight) : null,
    },
  };
}

export function buildObjectModel(problem) {
  const geometry = problem.source === 'real-ai' && Number.isFinite(problem.width)
    ? problem
    : buildGeometryProblem(problem);
  const semantic = geometry.semanticDimensions || {};
  const { width, height, depth } = geometry;
  const baseHeight = semantic.baseHeight || height;
  const intermediateHeight = semantic.intermediateHeight || height;
  const upperFeatureHeight = semantic.upperFeatureHeight || null;
  const upperFeatureWidth = semantic.upperFeatureWidth || null;
  const upperFeatureDepth = semantic.upperFeatureDepth || null;
  // Stacked model requires the base, an intermediate block, an upper feature, and a ramp between them.
  const hasStackedLevels = Boolean(geometry.hasStep && geometry.hasSlope && upperFeatureWidth && upperFeatureDepth);
  const rampEndX = hasStackedLevels ? width - upperFeatureWidth : null;

  const solids = {
    base: { x: 0, y: 0, z: 0, width, depth, height: baseHeight },
    intermediate: hasStackedLevels ? { x: 0, y: 0, z: baseHeight, width: rampEndX, depth, height: intermediateHeight - baseHeight } : null,
    upper: hasStackedLevels ? { x: 0, y: 0, z: intermediateHeight, width: upperFeatureWidth, depth: upperFeatureDepth, height: upperFeatureHeight } : null,
  };

  const ramp = hasStackedLevels ? {
    // Ramp runs only across the upper feature's depth (Y 0..upperFeatureDepth).
    xStart: upperFeatureWidth,
    xEnd: rampEndX,
    yStart: 0,
    yEnd: upperFeatureDepth,
    from: { x: upperFeatureWidth, y: 0, z: height },
    to: { x: rampEndX, y: 0, z: intermediateHeight },
  } : null;

  const vertices = hasStackedLevels
    ? [
        { x: 0, y: 0, z: 0 }, { x: width, y: 0, z: 0 }, { x: width, y: depth, z: 0 }, { x: 0, y: depth, z: 0 },
        { x: 0, y: 0, z: baseHeight }, { x: width, y: 0, z: baseHeight },
        { x: rampEndX, y: 0, z: baseHeight }, { x: rampEndX, y: 0, z: intermediateHeight },
        { x: upperFeatureWidth, y: 0, z: height }, { x: 0, y: 0, z: height },
        { x: upperFeatureWidth, y: upperFeatureDepth, z: height }, { x: 0, y: upperFeatureDepth, z: height },
      ]
    : [
        { x: 0, y: 0, z: 0 }, { x: width, y: 0, z: 0 }, { x: width, y: depth, z: 0 }, { x: 0, y: depth, z: 0 },
        { x: 0, y: 0, z: height }, { x: width, y: 0, z: height }, { x: width, y: depth, z: height }, { x: 0, y: depth, z: height },
      ];

  return {
    dimensions: { width, depth, height },
    semanticDimensions: semantic,
    uncertainFeaturePlacement: geometry.uncertainFeaturePlacement || false,
    hasStackedLevels,
    vertices,
    solids,
    ramp,
  };
}

function buildStackedProfiles({ width, depth, height, baseHeight, intermediateHeight, upperFeatureWidth, upperFeatureDepth }) {
  const rampEndX = width - upperFeatureWidth;

  // Front (X-Z): plot y = height - Z, so higher Z is drawn nearer the top of the SVG.
  const frontProfile = [
    [0, height],
    [width, height],
    [width, height - baseHeight],
    [rampEndX, height - baseHeight],
    [rampEndX, height - intermediateHeight],
    [upperFeatureWidth, 0],
    [0, 0],
  ];

  // Right (Y-Z): independently derived — the ramp varies with X, so it never appears here.
  const rightProfile = [
    [0, height],
    [depth, height],
    [depth, height - intermediateHeight],
    [upperFeatureDepth, height - intermediateHeight],
    [upperFeatureDepth, 0],
    [0, 0],
  ];

  const topFootprint = [[0, 0], [width, 0], [width, depth], [0, depth]];
  const upperFeature = [[0, 0], [upperFeatureWidth, 0], [upperFeatureWidth, upperFeatureDepth], [0, upperFeatureDepth]];
  const topVisibleEdges = [
    [[rampEndX, 0], [rampEndX, depth]],
    [[upperFeatureWidth, 0], [upperFeatureWidth, upperFeatureDepth]],
    [[0, upperFeatureDepth], [upperFeatureWidth, upperFeatureDepth]],
  ];

  return {
    front: {
      polygons: [frontProfile],
      polylines: [],
      hiddenLines: [],
      slopeEdges: [[[upperFeatureWidth, 0], [rampEndX, height - intermediateHeight]]],
    },
    top: {
      polygons: [topFootprint, upperFeature],
      polylines: topVisibleEdges,
      hiddenLines: [],
    },
    right: {
      polygons: [rightProfile],
      polylines: [],
      // The base-top (Z = baseHeight) is occluded behind the taller intermediate block beyond the feature depth.
      hiddenLines: [[[upperFeatureDepth, height - baseHeight], [depth, height - baseHeight]]],
      slopeEdges: [],
    },
  };
}

function buildSimpleFeatureProfiles({ width, depth, height, featureHeight, hasStep, hasSlope }) {
  const level = featureHeight || height / 2;
  const shelf = Math.min(level, width / 2, depth / 2);
  const frontProfile = hasSlope
    ? [[0, height], [width, height], [width, 0], [shelf, 0], [0, height - level]]
    : [[0, height], [width, height], [width, height - level], [shelf, height - level], [shelf, 0], [0, 0]];
  const rightProfile = hasSlope
    ? [[0, height], [depth, height], [depth, 0], [shelf, 0], [0, height - level]]
    : [[0, height], [depth, height], [depth, height - level], [shelf, height - level], [shelf, 0], [0, 0]];
  const topFootprint = [[0, 0], [width, 0], [width, depth], [0, depth]];

  return {
    front: { polygons: [frontProfile], polylines: [], hiddenLines: [], slopeEdges: hasStep ? [] : [] },
    top: { polygons: [topFootprint], polylines: [[[shelf, 0], [shelf, depth]]], hiddenLines: [] },
    right: { polygons: [rightProfile], polylines: [], hiddenLines: [], slopeEdges: [] },
  };
}

export function buildFeatureGeometry(problem) {
  const geometry = problem.source === 'real-ai' && Number.isFinite(problem.width)
    ? problem
    : buildGeometryProblem(problem);
  const model = buildObjectModel(geometry);
  const { width, height, depth } = model.dimensions;
  const semantic = model.semanticDimensions;
  const hasFeature = geometry.hasStep || geometry.hasSlope;
  const empty = { polygons: [], polylines: [], hiddenLines: [], slopeEdges: [] };

  if (!hasFeature) {
    return {
      model,
      dimensions: { width, height, depth },
      semanticDimensions: semantic,
      features: { hasStep: false, hasSlope: false },
      uncertainFeaturePlacement: model.uncertainFeaturePlacement,
      front: empty,
      top: empty,
      right: empty,
    };
  }

  const profiles = model.hasStackedLevels
    ? buildStackedProfiles({
        width,
        depth,
        height,
        baseHeight: semantic.baseHeight,
        intermediateHeight: semantic.intermediateHeight,
        upperFeatureWidth: semantic.upperFeatureWidth,
        upperFeatureDepth: semantic.upperFeatureDepth,
      })
    : buildSimpleFeatureProfiles({
        width,
        depth,
        height,
        featureHeight: geometry.featureHeight,
        hasStep: geometry.hasStep,
        hasSlope: geometry.hasSlope,
      });

  return {
    model,
    dimensions: { width, height, depth },
    semanticDimensions: semantic,
    features: { hasStep: Boolean(geometry.hasStep), hasSlope: Boolean(geometry.hasSlope) },
    uncertainFeaturePlacement: model.uncertainFeaturePlacement,
    ...profiles,
  };
}

function formatDimension(value) {
  return Number(value).toFixed(0);
}

export function buildConstructionSteps(problem) {
  if (problem.semanticDimensions?.baseHeight) {
    const semantic = problem.semanticDimensions;
    return [
      `1. Draw the ${formatDimension(problem.width)} mm x ${formatDimension(problem.depth)} mm base footprint.`,
      `2. Establish the ${formatDimension(semantic.baseHeight)} mm base thickness.`,
      `3. Project the ${formatDimension(semantic.intermediateHeight)} mm intermediate level.`,
      `4. Locate the ${formatDimension(semantic.upperFeatureWidth)} mm x ${formatDimension(semantic.upperFeatureDepth)} mm upper feature.`,
      `5. Establish the ${formatDimension(semantic.overallHeight)} mm overall height.`,
      `6. Construct the inclined surface from the ${formatDimension(semantic.overallHeight)} mm upper point to the ${formatDimension(semantic.intermediateHeight)} mm intermediate boundary.`,
      '7. Project the geometry into the Front, Top, and Right-Side views.',
      '8. Add visible and hidden lines.',
      `9. Add final dimensions for the ${formatDimension(problem.width)} mm x ${formatDimension(problem.depth)} mm footprint and ${formatDimension(semantic.overallHeight)} mm overall height.`,
    ];
  }

  const featureDescription = problem.hasSlope || problem.hasStep
    ? [
        problem.featureHeight ? `Draw the ${formatDimension(problem.width)} mm x ${formatDimension(problem.featureHeight)} mm base profile.` : 'Draw the known base profile without assuming an unreported feature dimension.',
        problem.hasStep ? `Construct the ${problem.featureHeight ? formatDimension(problem.featureHeight) : 'known'} mm upper step and project its edges vertically.` : null,
        problem.hasSlope ? 'Draw the inclined surface between the specified feature points.' : null,
        'Project the corresponding feature edges into the Top and Right-Side views.',
      ].filter(Boolean)
    : [];

  const steps = [
    `1. Draw the Front View as a rectangle measuring ${formatDimension(problem.width)} mm by ${formatDimension(problem.height)} mm.`,
    `2. Use the same width for the Top View, and draw a rectangle measuring ${formatDimension(problem.width)} mm by ${formatDimension(problem.depth)} mm.`,
    `3. Use the same height for the Right-Side View, and draw a rectangle measuring ${formatDimension(problem.depth)} mm by ${formatDimension(problem.height)} mm.`,
    `4. Align the three views so that the width is consistent across the Front and Top views, while the height is consistent across the Front and Right-Side views.`,
    `5. Label each view clearly with the correct dimensions: Front View (${formatDimension(problem.width)} x ${formatDimension(problem.height)}), Top View (${formatDimension(problem.width)} x ${formatDimension(problem.depth)}), and Right-Side View (${formatDimension(problem.depth)} x ${formatDimension(problem.height)}).`,
  ];

  steps.push(...featureDescription.map((step, index) => `${steps.length + index + 1}. ${step}`));

  return steps;
}
