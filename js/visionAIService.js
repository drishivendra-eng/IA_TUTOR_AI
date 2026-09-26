import { createDrawingProblem, validateDrawingProblem } from './drawingProblem.js';

// Same-origin architecture: the backend serves the frontend and the API from one origin,
// so requests always use relative paths and never need a separate host/port.
const API_BASE = '';

function getSafeErrorCategory(status, detail) {
  const normalizedDetail = String(detail || '').toUpperCase();
  const categories = [
    'AUTHENTICATION_ERROR',
    'MODEL_ACCESS_ERROR',
    'INVALID_REQUEST_ERROR',
    'IMAGE_INPUT_ERROR',
    'BILLING_ERROR',
    'RATE_LIMIT_ERROR',
    'PROVIDER_ERROR',
  ];

  return categories.find((category) => normalizedDetail.includes(category))
    || (status >= 400 && status < 500 ? 'FRONTEND_REQUEST_ERROR' : 'BACKEND_SERVER_ERROR');
}

function getAcceptedTypes() {
  return ['image/jpeg', 'image/jpg', 'image/png'];
}

function getDemoAnalysisProblem(fileName = 'uploaded-question.png') {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName.includes('cube') || normalizedName.includes('block')) {
    return createDrawingProblem({
      drawing_type: 'orthographic_projection',
      projection_type: 'orthographic',
      units: 'mm',
      scale: '1:1',
      dimensions: {
        width: 90,
        height: 90,
        depth: 90,
      },
      overall_dimensions: {
        width: { value: 90, unit: 'mm', confidence: 0.92 },
        height: { value: 90, unit: 'mm', confidence: 0.92 },
        depth: { value: 90, unit: 'mm', confidence: 0.92 },
      },
      views_required: ['front', 'top', 'right'],
      geometric_features: ['cube', 'equal dimensions', 'orthographic projection'],
      surfaces: ['front face', 'top face', 'right face'],
      steps: [
        'Identify the front face and draw it first.',
        'Project the width to the top view and depth to the right-side view.',
        'Label the dimensions clearly.'
      ],
      slopes: [],
      circles: [],
      arcs: [],
      construction_requirements: [
        'Show the front, top and right-side views.',
        'Use consistent width, height and depth alignment.',
        'Add dimension lines with arrowheads.'
      ],
      difficulty: 'Beginner',
      confidence: 0.92,
      explanation: 'Demo analysis detected a cube-shaped object using a simple mock vision pass. The dimensions are estimated for testing and should be confirmed by the student if needed.',
      confirmation_prompt: 'Please confirm this dimension.',
      uncertain_measurements: ['width', 'height', 'depth'],
    });
  }

  return createDrawingProblem({
    drawing_type: 'orthographic_projection',
    projection_type: 'orthographic',
    units: 'mm',
    scale: '1:1',
    dimensions: {
      width: 120,
      height: 80,
      depth: 60,
    },
    overall_dimensions: {
      width: { value: 120, unit: 'mm', confidence: 0.95 },
      height: { value: 80, unit: 'mm', confidence: 0.95 },
      depth: { value: 60, unit: 'mm', confidence: 0.95 },
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
    confidence: 0.95,
    explanation: 'Demo analysis detected a standard rectangular object with front, top and right-side orthographic views. This structured result is suitable for deterministic SVG drawing generation.',
    confirmation_prompt: 'No confirmation required for this demo problem.',
    uncertain_measurements: [],
  });
}

export function createMockVisionAIService() {
  return {
    mode: 'demo',
    connected: false,
    label: 'DEMO ANALYSIS',
    statusMessage: 'Demo Analysis — Vision AI not connected',
    analyze(file) {
      if (!file) {
        throw new Error('Please select an image file first.');
      }

      const acceptedTypes = getAcceptedTypes();
      if (!acceptedTypes.includes(file.type)) {
        throw new Error('Only JPG, JPEG, and PNG image files are supported.');
      }

      const problem = getDemoAnalysisProblem(file.name);
      const validation = validateDrawingProblem(problem);

      return {
        isDemo: true,
        mode: 'demo',
        message: this.statusMessage,
        problem: validation.problem,
        validationIssues: validation.issues,
        confirmationPrompt: validation.confirmation_prompt,
        requiresConfirmation: validation.issues.length > 0,
      };
    },
  };
}

export function createRealVisionAIService() {
  return {
    mode: 'real',
    connected: true,
    label: 'REAL AI ANALYSIS',
    statusMessage: 'Analysing image...',
    async analyze(file) {
      if (!file) {
        throw new Error('Please select an image file first.');
      }

      const acceptedTypes = getAcceptedTypes();
      if (!acceptedTypes.includes(file.type)) {
        throw new Error('Only JPG, JPEG, and PNG image files are supported.');
      }

      const formData = new FormData();
      formData.append('image', file);

      const url = `${API_BASE}/api/analyze-drawing`;
      // Temporary diagnostic (Version 5.11): trace the exact request the browser sends.
      console.log('IA-TUTOR API REQUEST', { url, method: 'POST', origin: window.location.origin });

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
      } catch (networkError) {
        const error = new Error(networkError.message || 'Failed to fetch');
        error.attemptedUrl = url;
        error.connectionFailure = true;
        error.safeCategory = 'NETWORK_ERROR';
        throw error;
      }

      const responseText = await response.text();
      let payload = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const detail = payload.detail || payload.error || responseText || 'The vision analysis request failed.';
        const error = new Error(detail);
        error.attemptedUrl = url;
        error.httpStatus = response.status;
        error.safeCategory = getSafeErrorCategory(response.status, detail);
        throw error;
      }

      const validation = validateDrawingProblem(payload.problem);

      return {
        isDemo: payload.mode === 'demo',
        mode: payload.mode || 'real',
        message: payload.message || 'REAL AI ANALYSIS',
        problem: validation.problem,
        validationIssues: validation.issues,
        confirmationPrompt: validation.confirmation_prompt,
        requiresConfirmation: Boolean(payload.requires_confirmation) || validation.issues.length > 0,
      };
    },
  };
}

export function createVisionAIService(mode = 'real') {
  return mode === 'demo' ? createMockVisionAIService() : createRealVisionAIService();
}
