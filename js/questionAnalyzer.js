import { createDrawingProblem } from './drawingProblem.js';

function getMockAnalysisFromImage(fileName = 'uploaded-question.png') {
  const normalizedName = fileName.toLowerCase();
  const width = 120;
  const height = 80;
  const depth = 60;

  if (normalizedName.includes('cube') || normalizedName.includes('block')) {
    return createDrawingProblem({
      drawing_type: 'orthographic_projection',
      units: 'mm',
      scale: '1:1',
      dimensions: {
        width: 90,
        height: 90,
        depth: 90,
      },
      views: ['front', 'top', 'right'],
      geometric_features: ['cube', 'equal dimensions'],
      difficulty: 'Beginner',
    });
  }

  return createDrawingProblem({
    drawing_type: 'orthographic_projection',
    units: 'mm',
    scale: '1:1',
    dimensions: {
      width,
      height,
      depth,
    },
    views: ['front', 'top', 'right'],
    geometric_features: ['rectangular prism', 'orthographic projection'],
    difficulty: 'Beginner',
  });
}

export function analyseQuestionImage(file) {
  if (!file) {
    throw new Error('Please select an image file first.');
  }

  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!acceptedTypes.includes(file.type)) {
    throw new Error('Only JPG, JPEG, and PNG image files are supported.');
  }

  return {
    isDemo: true,
    message: 'Demo Analysis — Vision AI not connected',
    problem: getMockAnalysisFromImage(file.name),
  };
}
