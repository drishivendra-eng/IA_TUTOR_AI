export const DEFAULT_DRAWING_PROBLEM = {
  drawing_type: 'orthographic_projection',
  projection_type: 'orthographic',
  units: 'mm',
  scale: '1:1',
  overall_dimensions: {
    width: { value: 120, unit: 'mm', confidence: 0.95 },
    height: { value: 80, unit: 'mm', confidence: 0.95 },
    depth: { value: 60, unit: 'mm', confidence: 0.95 },
  },
  dimensions: {
    width: 120,
    height: 80,
    depth: 60,
  },
  views_required: ['front', 'top', 'right'],
  geometric_features: ['rectangular prism', 'orthographic projection'],
  surfaces: ['front face', 'top face', 'right face'],
  steps: [
    'Draw the front elevation using width and height.',
    'Extend the width into the top view and the depth into the side view.',
    'Add dimension lines and final labels.'
  ],
  slopes: [],
  circles: [],
  arcs: [],
  construction_requirements: [
    'Maintain alignment between all three views.',
    'Use standard line conventions for outlines and projection lines.',
    'Label the front, top and right-side views clearly.'
  ],
  difficulty: 'Beginner',
  confidence: {
    overall: 0.95,
    explanation: 'The dimensions and projection are clearly visible in the demo drawing.',
  },
  explanation: 'A standard orthographic projection problem with front, top and right-side views.',
  confirmation_prompt: 'No confirmation required for this demo problem.',
  uncertain_measurements: [],
};

export function createDrawingProblem(overrides = {}) {
  const dimensions = {
    ...DEFAULT_DRAWING_PROBLEM.dimensions,
    ...(overrides.dimensions || {}),
  };

  const overallDimensions = {
    ...DEFAULT_DRAWING_PROBLEM.overall_dimensions,
    ...(overrides.overall_dimensions || {}),
  };

  return {
    ...DEFAULT_DRAWING_PROBLEM,
    ...overrides,
    dimensions,
    overall_dimensions: overallDimensions,
    views_required: Array.isArray(overrides.views_required)
      ? [...overrides.views_required]
      : [...DEFAULT_DRAWING_PROBLEM.views_required],
    geometric_features: Array.isArray(overrides.geometric_features)
      ? [...overrides.geometric_features]
      : [...DEFAULT_DRAWING_PROBLEM.geometric_features],
    surfaces: Array.isArray(overrides.surfaces)
      ? [...overrides.surfaces]
      : [...DEFAULT_DRAWING_PROBLEM.surfaces],
    steps: Array.isArray(overrides.steps)
      ? [...overrides.steps]
      : [...DEFAULT_DRAWING_PROBLEM.steps],
    slopes: Array.isArray(overrides.slopes)
      ? [...overrides.slopes]
      : [...DEFAULT_DRAWING_PROBLEM.slopes],
    circles: Array.isArray(overrides.circles)
      ? [...overrides.circles]
      : [...DEFAULT_DRAWING_PROBLEM.circles],
    arcs: Array.isArray(overrides.arcs)
      ? [...overrides.arcs]
      : [...DEFAULT_DRAWING_PROBLEM.arcs],
    construction_requirements: Array.isArray(overrides.construction_requirements)
      ? [...overrides.construction_requirements]
      : [...DEFAULT_DRAWING_PROBLEM.construction_requirements],
    uncertain_measurements: Array.isArray(overrides.uncertain_measurements)
      ? [...overrides.uncertain_measurements]
      : [...DEFAULT_DRAWING_PROBLEM.uncertain_measurements],
  };
}

export function validateDrawingProblem(problem) {
  const issues = [];

  if (!problem || typeof problem !== 'object') {
    return {
      isValid: false,
      issues: ['Invalid drawing problem object.'],
      problem: createDrawingProblem(),
    };
  }

  if (!problem.dimensions || !problem.dimensions.width || !problem.dimensions.height || !problem.dimensions.depth) {
    issues.push('Missing required dimensions for width, height, or depth.');
  }

  if (problem.overall_dimensions) {
    Object.entries(problem.overall_dimensions).forEach(([key, value]) => {
      if (value && typeof value.confidence === 'number' && value.confidence < 0.5) {
        issues.push(`Low confidence detected for ${key}. Please confirm this dimension.`);
      }
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
    problem,
    confirmation_prompt: problem.confirmation_prompt || 'Please confirm this dimension.',
  };
}
