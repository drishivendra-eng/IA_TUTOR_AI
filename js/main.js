import { DEFAULT_PROBLEM, buildConstructionSteps, buildGeometryProblem, parseProblem } from './geometry.js';
import { buildCompositeDownloadSvg, insertRenderedViews } from './render.js';
import { createVisionAIService } from './visionAIService.js';
import { initIndustrialArtsLibrary } from './industrialArtsLibrary.js';
import { initCadLiveSolver } from './cadLiveSolver.js';

const form = document.getElementById('drawing-form');
const resetButton = document.getElementById('reset-button');
const downloadButton = document.getElementById('download-button');
const statusMessage = document.getElementById('status-message');
const constructionSteps = document.getElementById('construction-steps');
const frontView = document.getElementById('front-view');
const topView = document.getElementById('top-view');
const rightSideView = document.getElementById('right-side-view');
const drawingType = document.getElementById('drawing-type');
const imageInput = document.getElementById('question-image-input');
const imagePreviewWrapper = document.getElementById('image-preview-wrapper');
const imagePreview = document.getElementById('image-preview');
const analyseButton = document.getElementById('analyse-button');
const confirmAnalysisButton = document.getElementById('confirm-analysis-button');
const generateDrawingButton = document.getElementById('generate-drawing-button');
const analysisDrawingType = document.getElementById('analysis-drawing-type');
const analysisProjectionType = document.getElementById('analysis-projection-type');
const analysisUnits = document.getElementById('analysis-units');
const analysisScale = document.getElementById('analysis-scale');
const analysisOverallWidth = document.getElementById('analysis-overall-width');
const analysisOverallHeight = document.getElementById('analysis-overall-height');
const analysisOverallDepth = document.getElementById('analysis-overall-depth');
const analysisWidth = document.getElementById('analysis-width');
const analysisHeight = document.getElementById('analysis-height');
const analysisDepth = document.getElementById('analysis-depth');
const analysisViews = document.getElementById('analysis-views');
const analysisFeatures = document.getElementById('analysis-features');
const analysisDifficulty = document.getElementById('analysis-difficulty');
const analysisConfidence = document.getElementById('analysis-confidence');
const analysisExplanation = document.getElementById('analysis-explanation');
const demoAnalysisBanner = document.getElementById('demo-analysis-banner');
const analysisModeBanner = document.getElementById('analysis-mode-banner');

let selectedImage = null;
let currentAnalysisProblem = null;
let analysisConfirmed = false;
let visionAIService = createVisionAIService('real');

function updateStatus(message, type = '') { statusMessage.textContent = message; statusMessage.className = `status-message ${type}`.trim(); }

function setFormValues(values) {
  document.getElementById('width').value = values.width ?? '';
  document.getElementById('height').value = values.height ?? '';
  document.getElementById('depth').value = values.depth ?? '';
}

function resetAnalysisState() { analysisConfirmed = false; currentAnalysisProblem = null; generateDrawingButton.disabled = true; confirmAnalysisButton.disabled = true; }

function populateAnalysisPanel(problem) {
  const getDimensionText = (dimension) => {
    if (!dimension || dimension.value === null || dimension.value === undefined) return 'Not visible';
    return `${dimension.value} ${dimension.unit || ''} (conf: ${dimension.confidence ?? 0})`.trim();
  };
  analysisDrawingType.textContent = problem.drawing_type;
  analysisProjectionType.textContent = problem.projection_type;
  analysisUnits.textContent = problem.units;
  analysisScale.textContent = problem.scale || 'Not visible';
  analysisOverallWidth.textContent = getDimensionText(problem.overall_dimensions?.width);
  analysisOverallHeight.textContent = getDimensionText(problem.overall_dimensions?.height);
  analysisOverallDepth.textContent = getDimensionText(problem.overall_dimensions?.depth);
  analysisWidth.textContent = problem.dimensions?.width == null ? 'Not visible' : `${problem.dimensions.width} ${problem.units || 'mm'}`;
  analysisHeight.textContent = problem.dimensions?.height == null ? 'Not visible' : `${problem.dimensions.height} ${problem.units || 'mm'}`;
  analysisDepth.textContent = problem.dimensions?.depth == null ? 'Not visible' : `${problem.dimensions.depth} ${problem.units || 'mm'}`;
  analysisViews.textContent = problem.views_required?.join(', ') || 'Not visible';
  analysisFeatures.textContent = problem.geometric_features?.join(', ') || 'None reported';
  analysisDifficulty.textContent = problem.difficulty || 'Not reported';
  analysisConfidence.textContent = `${problem.confidence?.overall ?? 0}`;
  analysisExplanation.textContent = problem.explanation || '';
  analysisModeBanner.textContent = visionAIService.label;
}

function publishCadSolve(problem) { window.dispatchEvent(new CustomEvent('ia-tutor-cad-solve', { detail: { problem } })); }

function renderSolution(problem) {
  insertRenderedViews(problem, { front: frontView, top: topView, right: rightSideView });
  constructionSteps.innerHTML = buildConstructionSteps(problem).map((step) => `<li>${step}</li>`).join('');
  if (drawingType) drawingType.textContent = 'Drawing Type: Orthographic Projection';
  publishCadSolve(problem);
  updateStatus('Drawing solved successfully.', 'success');
}

function handleSolve(event) {
  event.preventDefault();
  try {
    let problem;
    if (currentAnalysisProblem && !analysisConfirmed) throw new Error('Please confirm the AI analysis before solving the drawing.');
    if (currentAnalysisProblem) {
      problem = buildGeometryProblem(currentAnalysisProblem, { width: document.getElementById('width').value, height: document.getElementById('height').value, depth: document.getElementById('depth').value });
    } else {
      problem = parseProblem({ width: document.getElementById('width').value, height: document.getElementById('height').value, depth: document.getElementById('depth').value });
      resetAnalysisState();
    }
    setFormValues(problem); renderSolution(problem);
  } catch (error) { updateStatus(error.message, 'error'); }
}

function handleReset() {
  setFormValues({ width: '', height: '', depth: '' });
  frontView.innerHTML = ''; topView.innerHTML = ''; rightSideView.innerHTML = ''; constructionSteps.innerHTML = '';
  selectedImage = null; imageInput.value = ''; imagePreviewWrapper.classList.add('hidden'); imagePreview.src = '';
  [analysisDrawingType, analysisProjectionType, analysisUnits, analysisScale, analysisOverallWidth, analysisOverallHeight, analysisOverallDepth, analysisWidth, analysisHeight, analysisDepth, analysisViews, analysisFeatures, analysisDifficulty, analysisConfidence, analysisExplanation].forEach((el) => { el.textContent = '-'; });
  analysisModeBanner.textContent = 'AI VISION ANALYSIS'; demoAnalysisBanner.textContent = 'Upload a drawing and let AI extract the dimensions.';
  resetAnalysisState(); window.dispatchEvent(new CustomEvent('ia-tutor-cad-reset')); updateStatus('Ready for a new technical drawing question.');
}

function handleDownload() {
  try {
    const problem = currentAnalysisProblem && analysisConfirmed
      ? buildGeometryProblem(currentAnalysisProblem, { width: document.getElementById('width').value, height: document.getElementById('height').value, depth: document.getElementById('depth').value })
      : parseProblem({ width: document.getElementById('width').value, height: document.getElementById('height').value, depth: document.getElementById('depth').value });
    const svgMarkup = buildCompositeDownloadSvg(problem); const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `ia-tutor-${problem.width}-${problem.height}-${problem.depth}.svg`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); updateStatus('Drawing SVG downloaded successfully.', 'success');
  } catch (error) { updateStatus(error.message, 'error'); }
}

function handleImageUpload(event) {
  const file = event.target.files[0]; if (!file) return; selectedImage = file; imagePreview.src = URL.createObjectURL(file); imagePreviewWrapper.classList.remove('hidden'); resetAnalysisState(); updateStatus('Image uploaded. You can now analyse the question.', 'success');
}

async function handleAnalyseQuestion() {
  try {
    if (!selectedImage) throw new Error('Please upload an image first.');
    updateStatus('Analysing image...', 'success');
    const analysis = await visionAIService.analyze(selectedImage); currentAnalysisProblem = analysis.problem; populateAnalysisPanel(analysis.problem);
    const hasDimensions = ['width', 'height', 'depth'].every((key) => Number.isFinite(Number(analysis.problem?.dimensions?.[key])));
    if (hasDimensions) setFormValues(buildGeometryProblem(analysis.problem)); else setFormValues({ width: '', height: '', depth: '' });
    analysisModeBanner.textContent = analysis.mode === 'demo' ? 'DEMO ANALYSIS' : 'REAL AI ANALYSIS'; demoAnalysisBanner.textContent = analysis.message;
    confirmAnalysisButton.disabled = false; generateDrawingButton.disabled = true; analysisConfirmed = false;
    updateStatus(hasDimensions ? 'AI extracted the dimensions. Review and confirm before generating.' : 'AI analysis completed, but one or more dimensions are missing. Please review the analysis.', hasDimensions ? 'success' : 'error');
  } catch (error) {
    analysisModeBanner.textContent = visionAIService.label; demoAnalysisBanner.textContent = 'Real Vision AI analysis failed. No demo result was used.';
    updateStatus(error.connectionFailure ? `NETWORK ERROR: ${error.message}` : `API ERROR: ${error.message || 'Real Vision AI analysis failed.'}`, 'error');
  }
}

function handleConfirmAnalysis() {
  if (!currentAnalysisProblem) { updateStatus('Please analyse a question before confirming.', 'error'); return; }
  const values = ['width', 'height', 'depth'].map((key) => Number(document.getElementById(key).value));
  if (!values.every((value) => Number.isFinite(value) && value > 0)) { updateStatus('All three AI-extracted dimensions must be available before confirmation.', 'error'); return; }
  analysisConfirmed = true; generateDrawingButton.disabled = false; updateStatus('Analysis confirmed. Generate the automatic CAD-method drawing.', 'success');
}

function handleGenerateDrawing() {
  try {
    if (!currentAnalysisProblem || !analysisConfirmed) throw new Error('Analyse and confirm the AI question first.');
    const problem = buildGeometryProblem(currentAnalysisProblem, { width: document.getElementById('width').value, height: document.getElementById('height').value, depth: document.getElementById('depth').value });
    setFormValues(problem); renderSolution(problem); updateStatus('Automatic CAD-method drawing generated.', 'success');
  } catch (error) { updateStatus(error.message, 'error'); }
}

form.addEventListener('submit', handleSolve); resetButton.addEventListener('click', handleReset); downloadButton.addEventListener('click', handleDownload); imageInput.addEventListener('change', handleImageUpload); analyseButton.addEventListener('click', handleAnalyseQuestion); confirmAnalysisButton.addEventListener('click', handleConfirmAnalysis); generateDrawingButton.addEventListener('click', handleGenerateDrawing);
window.addEventListener('ia-tutor-library-context', (event) => { const { year, subject, topic } = event.detail; updateStatus(`Selected: Year ${year} • ${subject} • ${topic}.`, 'success'); });

initIndustrialArtsLibrary();
initCadLiveSolver();
setFormValues({ width: '', height: '', depth: '' });
resetAnalysisState();
