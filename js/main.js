import { buildConstructionSteps, buildGeometryProblem, parseProblem } from './geometry.js';
import { buildCompositeDownloadSvg, insertRenderedViews } from './render.js';
import { createVisionAIService } from './visionAIService.js';
import { initIndustrialArtsLibrary } from './industrialArtsLibrary.js';
import { initCadLiveSolver } from './cadLiveSolver.js';
import { RealCadEngine, buildAutomaticOrthographicCad } from './realCadEngine.js';

const $ = (id) => document.getElementById(id);
const form = $('drawing-form');
const resetButton = $('reset-button');
const downloadButton = $('download-button');
const statusMessage = $('status-message');
const constructionSteps = $('construction-steps');
const frontView = $('front-view');
const topView = $('top-view');
const rightSideView = $('right-side-view');
const drawingType = $('drawing-type');
const imageInput = $('question-image-input');
const imagePreviewWrapper = $('image-preview-wrapper');
const imagePreview = $('image-preview');
const analyseButton = $('analyse-button');
const confirmAnalysisButton = $('confirm-analysis-button');
const generateDrawingButton = $('generate-drawing-button');
const analysisDrawingType = $('analysis-drawing-type');
const analysisProjectionType = $('analysis-projection-type');
const analysisUnits = $('analysis-units');
const analysisScale = $('analysis-scale');
const analysisOverallWidth = $('analysis-overall-width');
const analysisOverallHeight = $('analysis-overall-height');
const analysisOverallDepth = $('analysis-overall-depth');
const analysisWidth = $('analysis-width');
const analysisHeight = $('analysis-height');
const analysisDepth = $('analysis-depth');
const analysisViews = $('analysis-views');
const analysisFeatures = $('analysis-features');
const analysisDifficulty = $('analysis-difficulty');
const analysisConfidence = $('analysis-confidence');
const analysisExplanation = $('analysis-explanation');
const demoAnalysisBanner = $('demo-analysis-banner');
const analysisModeBanner = $('analysis-mode-banner');

let selectedImage = null;
let currentAnalysisProblem = null;
let analysisConfirmed = false;
const visionAIService = createVisionAIService('real');

function updateStatus(message, type = '') { if (statusMessage) { statusMessage.textContent = message; statusMessage.className = `status-message ${type}`.trim(); } }
function setFormValues(values = {}) { $('width').value = values.width ?? ''; $('height').value = values.height ?? ''; $('depth').value = values.depth ?? ''; }
function resetAnalysisState() { analysisConfirmed = false; currentAnalysisProblem = null; if (generateDrawingButton) generateDrawingButton.disabled = true; if (confirmAnalysisButton) confirmAnalysisButton.disabled = true; }
function populateAnalysisPanel(problem) {
  const text = (d) => !d || d.value == null ? 'Not visible' : `${d.value} ${d.unit || ''} (conf: ${d.confidence ?? 0})`.trim();
  analysisDrawingType.textContent = problem.drawing_type || '-'; analysisProjectionType.textContent = problem.projection_type || '-'; analysisUnits.textContent = problem.units || 'mm'; analysisScale.textContent = problem.scale || 'Not visible';
  analysisOverallWidth.textContent = text(problem.overall_dimensions?.width); analysisOverallHeight.textContent = text(problem.overall_dimensions?.height); analysisOverallDepth.textContent = text(problem.overall_dimensions?.depth);
  analysisWidth.textContent = problem.dimensions?.width == null ? 'Not visible' : `${problem.dimensions.width} ${problem.units || 'mm'}`; analysisHeight.textContent = problem.dimensions?.height == null ? 'Not visible' : `${problem.dimensions.height} ${problem.units || 'mm'}`; analysisDepth.textContent = problem.dimensions?.depth == null ? 'Not visible' : `${problem.dimensions.depth} ${problem.units || 'mm'}`;
  analysisViews.textContent = problem.views_required?.join(', ') || 'Front, Top, Right-Side'; analysisFeatures.textContent = problem.geometric_features?.join(', ') || 'None reported'; analysisDifficulty.textContent = problem.difficulty || 'Not reported'; analysisConfidence.textContent = `${problem.confidence?.overall ?? 0}`; analysisExplanation.textContent = problem.explanation || ''; analysisModeBanner.textContent = visionAIService.label;
}
function publishCadSolve(problem) { window.dispatchEvent(new CustomEvent('ia-tutor-cad-solve', { detail: { problem } })); }
function ensureRealCadHost() {
  let host = $('real-cad-workspace'); if (host) return host;
  const output = document.querySelector('.output-panel'); if (!output) return null;
  host = document.createElement('section'); host.id = 'real-cad-workspace'; host.className = 'real-cad-panel';
  host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ Editable CAD Workspace</strong><span class="cad-status">Ready</span></div><svg id="real-cad-svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet" aria-label="Editable technical drawing CAD workspace"></svg>';
  output.insertBefore(host, output.querySelector('.instructions-panel') || null); return host;
}
function renderRealCad(problem) {
  const host = ensureRealCadHost(); if (!host) return;
  host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ Editable CAD Workspace</strong><button id="cad-undo" type="button">Undo</button><button id="cad-redo" type="button">Redo</button><button id="cad-reset" type="button">Clear</button><span class="cad-status">Grid Snap: ON • AI geometry loaded</span></div><svg id="real-cad-svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet" aria-label="Editable technical drawing CAD workspace"></svg>';
  const svg = $('real-cad-svg'); const engine = new RealCadEngine(svg);
  buildAutomaticOrthographicCad(engine, { width: problem.width ?? problem.dimensions?.width, height: problem.height ?? problem.dimensions?.height, depth: problem.depth ?? problem.dimensions?.depth, units: problem.units || 'mm' });
  $('cad-undo').onclick = () => engine.undo(); $('cad-redo').onclick = () => engine.redo(); $('cad-reset').onclick = () => engine.clear();
}
function renderSolution(problem) {
  insertRenderedViews(problem, { front: frontView, top: topView, right: rightSideView });
  constructionSteps.innerHTML = buildConstructionSteps(problem).map((step) => `<li>${step}</li>`).join('');
  if (drawingType) drawingType.textContent = 'Drawing Type: Orthographic Projection';
  publishCadSolve(problem); renderRealCad(problem); updateStatus('CAD drawing generated successfully.', 'success');
}
function solveFromDimensions() {
  const problem = currentAnalysisProblem && analysisConfirmed
    ? buildGeometryProblem(currentAnalysisProblem, { width: $('width').value, height: $('height').value, depth: $('depth').value })
    : parseProblem({ width: $('width').value, height: $('height').value, depth: $('depth').value });
  setFormValues(problem); renderSolution(problem); return problem;
}
function handleSolve(event) { event.preventDefault(); try { if (currentAnalysisProblem && !analysisConfirmed) throw new Error('Please confirm the AI analysis before solving the drawing.'); solveFromDimensions(); } catch (error) { updateStatus(error.message, 'error'); } }
function handleReset() {
  setFormValues({}); frontView.innerHTML = ''; topView.innerHTML = ''; rightSideView.innerHTML = ''; constructionSteps.innerHTML = ''; selectedImage = null; if (imageInput) imageInput.value = ''; imagePreviewWrapper?.classList.add('hidden'); if (imagePreview) imagePreview.src = '';
  [analysisDrawingType, analysisProjectionType, analysisUnits, analysisScale, analysisOverallWidth, analysisOverallHeight, analysisOverallDepth, analysisWidth, analysisHeight, analysisDepth, analysisViews, analysisFeatures, analysisDifficulty, analysisConfidence, analysisExplanation].forEach((el) => { if (el) el.textContent = '-'; });
  analysisModeBanner.textContent = 'AI VISION ANALYSIS'; demoAnalysisBanner.textContent = 'Enter a question or upload a drawing and let AI extract the requirements.'; resetAnalysisState();
  const host = $('real-cad-workspace'); if (host) host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ Editable CAD Workspace</strong><span class="cad-status">Ready for a new drawing</span></div><svg id="real-cad-svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet"></svg>'; updateStatus('Ready for a new technical drawing question.');
}
function handleDownload() { try { const problem = solveFromDimensions(); const markup = buildCompositeDownloadSvg(problem); const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ia-tutor-${problem.width}-${problem.height}-${problem.depth}.svg`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); } catch (error) { updateStatus(error.message, 'error'); } }
function handleImageUpload(event) { const file = event.target.files[0]; if (!file) return; selectedImage = file; imagePreview.src = URL.createObjectURL(file); imagePreviewWrapper.classList.remove('hidden'); resetAnalysisState(); updateStatus('Drawing uploaded. Select Analyse Drawing.', 'success'); }
async function handleAnalyseQuestion() {
  try {
    if (!selectedImage) throw new Error('Please upload an image first.'); updateStatus('Analysing drawing with Vision AI...', 'success');
    const analysis = await visionAIService.analyze(selectedImage); currentAnalysisProblem = analysis.problem; populateAnalysisPanel(analysis.problem);
    const hasDimensions = ['width', 'height', 'depth'].every((key) => Number.isFinite(Number(analysis.problem?.dimensions?.[key])));
    if (hasDimensions) setFormValues(buildGeometryProblem(analysis.problem)); else setFormValues({});
    analysisModeBanner.textContent = analysis.mode === 'demo' ? 'DEMO ANALYSIS' : 'REAL AI ANALYSIS'; demoAnalysisBanner.textContent = analysis.message || 'Review the extracted dimensions.';
    confirmAnalysisButton.disabled = false; generateDrawingButton.disabled = true; analysisConfirmed = false;
    updateStatus(hasDimensions ? 'AI extracted the dimensions. Confirm them, then generate CAD.' : 'Analysis completed but dimensions are incomplete.', hasDimensions ? 'success' : 'error');
  } catch (error) { demoAnalysisBanner.textContent = 'Real Vision AI analysis failed. No demo result was used.'; updateStatus(error.connectionFailure ? `NETWORK ERROR: ${error.message}` : `API ERROR: ${error.message || 'Vision AI analysis failed.'}`, 'error'); }
}
function handleConfirmAnalysis() {
  if (!currentAnalysisProblem) { updateStatus('Analyse a drawing first.', 'error'); return; }
  const values = ['width', 'height', 'depth'].map((key) => Number($(key).value));
  if (!values.every((value) => Number.isFinite(value) && value > 0)) { updateStatus('Width, height and depth are required before CAD generation.', 'error'); return; }
  analysisConfirmed = true; generateDrawingButton.disabled = false; updateStatus('Analysis confirmed. Click Generate Drawing.', 'success');
}
function handleGenerateDrawing() { try { if (!currentAnalysisProblem || !analysisConfirmed) throw new Error('Analyse and confirm the drawing first.'); solveFromDimensions(); updateStatus('Automatic CAD-method drawing generated.', 'success'); } catch (error) { updateStatus(error.message, 'error'); } }

form?.addEventListener('submit', handleSolve); resetButton?.addEventListener('click', handleReset); downloadButton?.addEventListener('click', handleDownload); imageInput?.addEventListener('change', handleImageUpload); analyseButton?.addEventListener('click', handleAnalyseQuestion); confirmAnalysisButton?.addEventListener('click', handleConfirmAnalysis); generateDrawingButton?.addEventListener('click', handleGenerateDrawing);
window.addEventListener('ia-tutor-library-context', (event) => { const { year, subject, topic } = event.detail; updateStatus(`Selected: Year ${year} • ${subject} • ${topic}.`, 'success'); });
initIndustrialArtsLibrary(); initCadLiveSolver(); ensureRealCadHost(); setFormValues({}); resetAnalysisState();
window.IA_TUTOR = { solveFromDimensions, renderSolution, parseProblem };
