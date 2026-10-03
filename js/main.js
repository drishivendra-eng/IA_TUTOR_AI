import './agent-widget.js';
import { buildConstructionSteps, buildGeometryProblem, parseProblem } from './geometry.js';
import { buildCompositeDownloadSvg, insertRenderedViews } from './render.js';
import { createVisionAIService } from './visionAIService.js';
import { initIndustrialArtsLibrary } from './industrialArtsLibrary.js';
import { initCadLiveSolver } from './cadLiveSolver.js';
import { RealCadEngine, buildAutomaticOrthographicCad } from './realCadEngine.js';

const $ = (id) => document.getElementById(id);
const form = $('drawing-form'), resetButton = $('reset-button'), downloadButton = $('download-button');
const statusMessage = $('status-message'), constructionSteps = $('construction-steps');
const frontView = $('front-view'), topView = $('top-view'), rightSideView = $('right-side-view'), drawingType = $('drawing-type');
const imageInput = $('question-image-input'), imagePreviewWrapper = $('image-preview-wrapper'), imagePreview = $('image-preview'), analyseButton = $('analyse-button');
const confirmAnalysisButton = $('confirm-analysis-button'), generateDrawingButton = $('generate-drawing-button');
const analysisDrawingType = $('analysis-drawing-type'), analysisProjectionType = $('analysis-projection-type'), analysisUnits = $('analysis-units'), analysisScale = $('analysis-scale');
const analysisOverallWidth = $('analysis-overall-width'), analysisOverallHeight = $('analysis-overall-height'), analysisOverallDepth = $('analysis-overall-depth');
const analysisWidth = $('analysis-width'), analysisHeight = $('analysis-height'), analysisDepth = $('analysis-depth');
const analysisViews = $('analysis-views'), analysisFeatures = $('analysis-features'), analysisDifficulty = $('analysis-difficulty'), analysisConfidence = $('analysis-confidence'), analysisExplanation = $('analysis-explanation');
const demoAnalysisBanner = $('demo-analysis-banner'), analysisModeBanner = $('analysis-mode-banner');
let selectedImage = null, currentAnalysisProblem = null, analysisConfirmed = false;
const visionAIService = createVisionAIService('real');
function updateStatus(message, type = '') { if (statusMessage) { statusMessage.textContent = message; statusMessage.className = `status-message ${type}`.trim(); } }
function setFormValues(values = {}) { $('width').value = values.width ?? ''; $('height').value = values.height ?? ''; $('depth').value = values.depth ?? ''; }
function resetAnalysisState() { analysisConfirmed = false; currentAnalysisProblem = null; if (generateDrawingButton) generateDrawingButton.disabled = true; if (confirmAnalysisButton) confirmAnalysisButton.disabled = true; }
function populateAnalysisPanel(problem) {
  const text = (d) => !d || d.value == null ? 'Not visible' : `${d.value} ${d.unit || ''} (conf: ${d.confidence ?? 0})`.trim();
  analysisDrawingType.textContent = problem.drawing_type || '-'; analysisProjectionType.textContent = problem.projection_type || '-'; analysisUnits.textContent = problem.units || 'mm'; analysisScale.textContent = problem.scale || 'Not visible';
  analysisOverallWidth.textContent = text(problem.overall_dimensions?.width); analysisOverallHeight.textContent = text(problem.overall_dimensions?.height); analysisOverallDepth.textContent = text(problem.overall_dimensions?.depth);
  analysisWidth.textContent = problem.dimensions?.width == null ? 'Not visible' : `${problem.dimensions.width} ${problem.units || 'mm'}`; analysisHeight.textContent = problem.dimensions?.height == null ? 'Not visible' : `${problem.dimensions.height} ${problem.units || 'mm'}`; analysisDepth.textContent = problem.dimensions?.depth == null ? 'Not visible' : `${problem.dimensions.depth} ${problem.units || 'mm'}`;
  analysisViews.textContent = problem.views_required?.join(', ') || 'Detected from drawing'; analysisFeatures.textContent = problem.geometric_features?.join(', ') || 'None reported'; analysisDifficulty.textContent = problem.difficulty || 'Not reported'; analysisConfidence.textContent = `${problem.confidence?.overall ?? 0}`; analysisExplanation.textContent = problem.explanation || ''; analysisModeBanner.textContent = visionAIService.label;
}
function publishCadSolve(problem) { window.dispatchEvent(new CustomEvent('ia-tutor-cad-solve', { detail: { problem } })); }
function ensureRealCadHost() {
  let host = $('real-cad-workspace'); if (host) return host;
  const output = document.querySelector('.output-panel'); if (!output) return null;
  host = document.createElement('section'); host.id = 'real-cad-workspace'; host.className = 'real-cad-panel';
  host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ AutoCAD-style Solution Workspace</strong><span class="cad-status">Ready</span></div><svg id="real-cad-svg" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet" aria-label="AI-generated technical drawing CAD workspace"></svg>';
  output.insertBefore(host, output.querySelector('.instructions-panel') || null); return host;
}
function renderCadGeometry(engine, geometry = []) {
  for (const g of geometry) {
    try {
      const type = String(g.type || '').toLowerCase();
      if (type === 'line') engine.line(g.x1, g.y1, g.x2, g.y2, { layer: g.layer, construction: g.construction });
      else if (type === 'circle') engine.circle(g.cx, g.cy, g.r, { layer: g.layer });
      else if (type === 'polyline' && Array.isArray(g.points) && g.points.length >= 2) engine.add({ type: 'polyline', points: g.points.map((p) => [Number(p[0]), Number(p[1])]), layer: g.layer || 'Object' });
      else if (type === 'dimension') engine.dimension(g.x1, g.y1, g.x2, g.y2, g.label || '', { layer: 'Dimensions' });
    } catch (_) { /* ignore one malformed primitive and keep rendering the rest */ }
  }
}
function renderRealCad(problem) {
  const host = ensureRealCadHost(); if (!host) return;
  host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ AutoCAD-style Solution Workspace</strong><button id="cad-undo" type="button">Undo</button><button id="cad-redo" type="button">Redo</button><button id="cad-reset" type="button">Clear</button><span class="cad-command">COMMAND: AI-DRAW</span><span class="cad-status">AI geometry loaded</span></div><div class="cad-screen"><aside class="cad-side-tools"><b>LAYERS</b><span>● Object</span><span>● Construction</span><span>● Dimensions</span><b>AI METHOD</b><span>Line</span><span>Polyline</span><span>Circle</span><span>Dimension</span><span>Projection</span></aside><div class="cad-canvas-wrap"><svg id="real-cad-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" aria-label="AutoCAD-style AI drawing solution"></svg></div></div><div class="cad-command-line">AI Tutor: drawing the detected solution geometry. You can edit it with the CAD tools below.</div>';
  const svg = $('real-cad-svg'), engine = new RealCadEngine(svg);
  const geometry = Array.isArray(problem.cad_geometry) ? problem.cad_geometry : [];
  if (geometry.length) renderCadGeometry(engine, geometry);
  else if ([problem.width ?? problem.dimensions?.width, problem.height ?? problem.dimensions?.height, problem.depth ?? problem.dimensions?.depth].every((v) => Number.isFinite(Number(v)) && Number(v) > 0)) {
    buildAutomaticOrthographicCad(engine, { width: problem.width ?? problem.dimensions.width, height: problem.height ?? problem.dimensions.height, depth: problem.depth ?? problem.dimensions.depth, units: problem.units || 'mm' });
  }
  $('cad-undo').onclick = () => engine.undo(); $('cad-redo').onclick = () => engine.redo(); $('cad-reset').onclick = () => engine.clear();
  const status = host.querySelector('.cad-status'); if (status) status.textContent = geometry.length ? `AI geometry: ${geometry.length} entities` : 'Parametric 3-view CAD';
}
function renderSolution(problem) {
  insertRenderedViews(problem, { front: frontView, top: topView, rightSide: rightSideView });
  constructionSteps.innerHTML = buildConstructionSteps(problem).map((step) => `<li>${step}</li>`).join('');
  if (drawingType) drawingType.textContent = `AI Solution • ${problem.drawing_type || 'Technical Drawing'}`;
  publishCadSolve(problem); renderRealCad(problem); updateStatus('AI CAD solution generated successfully.', 'success');
}
function solveFromDimensions() {
  const problem = currentAnalysisProblem && analysisConfirmed ? buildGeometryProblem(currentAnalysisProblem, { width: $('width').value, height: $('height').value, depth: $('depth').value }) : parseProblem({ width: $('width').value, height: $('height').value, depth: $('depth').value });
  setFormValues(problem); renderSolution(problem); return problem;
}
function handleSolve(event) { event.preventDefault(); try { if (currentAnalysisProblem && !analysisConfirmed) throw new Error('Please confirm the AI analysis before solving the drawing.'); solveFromDimensions(); } catch (error) { updateStatus(error.message, 'error'); } }
function handleReset() {
  setFormValues({}); frontView.innerHTML = ''; topView.innerHTML = ''; rightSideView.innerHTML = ''; constructionSteps.innerHTML = ''; selectedImage = null; if (imageInput) imageInput.value = ''; imagePreviewWrapper?.classList.add('hidden'); if (imagePreview) imagePreview.src = '';
  [analysisDrawingType, analysisProjectionType, analysisUnits, analysisScale, analysisOverallWidth, analysisOverallHeight, analysisOverallDepth, analysisWidth, analysisHeight, analysisDepth, analysisViews, analysisFeatures, analysisDifficulty, analysisConfidence, analysisExplanation].forEach((el) => { if (el) el.textContent = '-'; });
  analysisModeBanner.textContent = 'AI VISION ANALYSIS'; demoAnalysisBanner.textContent = 'Enter a question or upload a drawing and let AI extract the requirements.'; resetAnalysisState();
  const host = $('real-cad-workspace'); if (host) host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ AutoCAD-style Solution Workspace</strong><span class="cad-status">Ready for a new drawing</span></div><svg id="real-cad-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet"></svg>'; updateStatus('Ready for a new technical drawing question.');
}
function handleDownload() { try { const problem = solveFromDimensions(); const markup = buildCompositeDownloadSvg(problem); const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ia-tutor-${problem.drawing_type || 'drawing'}.svg`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); } catch (error) { updateStatus(error.message, 'error'); } }
function handleImageUpload(event) { const file = event.target.files[0]; if (!file) return; selectedImage = file; imagePreview.src = URL.createObjectURL(file); imagePreviewWrapper.classList.remove('hidden'); resetAnalysisState(); updateStatus('Drawing uploaded. Select Analyse Drawing.', 'success'); }
async function handleAnalyseQuestion() {
  try {
    if (!selectedImage) throw new Error('Please upload an image first.'); updateStatus('Analysing drawing with Vision AI...', 'success');
    const analysis = await visionAIService.analyze(selectedImage); currentAnalysisProblem = analysis.problem; populateAnalysisPanel(analysis.problem);
    const hasDimensions = ['width', 'height', 'depth'].every((key) => Number.isFinite(Number(analysis.problem?.dimensions?.[key])));
    if (hasDimensions) setFormValues(buildGeometryProblem(analysis.problem)); else setFormValues({});
    analysisModeBanner.textContent = analysis.mode === 'demo' ? 'DEMO ANALYSIS' : 'REAL AI ANALYSIS + CAD'; demoAnalysisBanner.textContent = analysis.message || 'Review the extracted drawing and CAD solution.';
    confirmAnalysisButton.disabled = false; generateDrawingButton.disabled = false; analysisConfirmed = true;
    renderRealCad(analysis.problem);
    updateStatus(Array.isArray(analysis.problem?.cad_geometry) && analysis.problem.cad_geometry.length ? 'AI reconstructed the drawing and loaded it into the AutoCAD-style screen.' : hasDimensions ? 'AI found 3D dimensions and loaded a parametric CAD view.' : 'AI analysed the drawing; CAD geometry may need a clearer image.', hasDimensions || (analysis.problem?.cad_geometry?.length) ? 'success' : 'error');
  } catch (error) { demoAnalysisBanner.textContent = 'Real Vision AI analysis failed. No demo result was used.'; updateStatus(error.connectionFailure ? `NETWORK ERROR: ${error.message}` : `API ERROR: ${error.message || 'Vision AI analysis failed.'}`, 'error'); }
}
function handleConfirmAnalysis() { if (!currentAnalysisProblem) { updateStatus('Analyse a drawing first.', 'error'); return; } analysisConfirmed = true; generateDrawingButton.disabled = false; updateStatus('Analysis confirmed. The AutoCAD-style solution is ready.', 'success'); }
function handleGenerateDrawing() { try { if (!currentAnalysisProblem || !analysisConfirmed) throw new Error('Analyse and confirm the drawing first.'); renderSolution(currentAnalysisProblem); updateStatus('Automatic CAD-method drawing generated.', 'success'); } catch (error) { updateStatus(error.message, 'error'); } }
function extractQuestionDimensions(text) {
  const source = String(text || '').replace(/[,;]/g, ' '); const number = '(\\d+(?:\\.\\d+)?)';
  const find = (patterns) => { for (const pattern of patterns) { const match = source.match(pattern); if (match) return Number(match[1]); } return null; };
  return { width: find([new RegExp(`(?:width|wide)\\s*(?:of|=|is|measuring)?\\s*${number}\\s*(?:mm|millimet(?:er|re)s?)?`, 'i'), new RegExp(`${number}\\s*(?:mm|millimet(?:er|re)s?)?\\s*(?:wide|width)`, 'i')]), height: find([new RegExp(`(?:height|high|tall)\\s*(?:of|=|is|measuring)?\\s*${number}\\s*(?:mm|millimet(?:er|re)s?)?`, 'i'), new RegExp(`${number}\\s*(?:mm|millimet(?:er|re)s?)?\\s*(?:high|tall|height)`, 'i')]), depth: find([new RegExp(`(?:depth|deep)\\s*(?:of|=|is|measuring)?\\s*${number}\\s*(?:mm|millimet(?:er|re)s?)(?!\\s*[:/]\\s*1)`, 'i'), new RegExp(`${number}\\s*(?:mm|millimet(?:er|re)s?)?\\s*(?:deep|depth)`, 'i')]) };
}
function handleTextQuestion(event) {
  event.preventDefault(); event.stopImmediatePropagation(); const box = $('question-text'), text = box?.value.trim() || '';
  if (!text) { updateStatus('Please type or paste a Technical Drawing question first.', 'error'); return; }
  const { width, height, depth } = extractQuestionDimensions(text);
  if (![width, height, depth].every((value) => Number.isFinite(value) && value > 0)) { const missing = [!width && 'width', !height && 'height', !depth && 'depth'].filter(Boolean).join(', '); const message = `Could not safely detect ${missing}. Please state the ${missing} explicitly; scale (for example 1:1) is not a dimension.`; if (demoAnalysisBanner) demoAnalysisBanner.textContent = message; const qStatus = $('question-text-status'); if (qStatus) qStatus.textContent = message; updateStatus(message, 'error'); return; }
  setFormValues({ width, height, depth }); currentAnalysisProblem = null; analysisConfirmed = false; const qStatus = $('question-text-status'); if (qStatus) qStatus.textContent = `Dimensions detected: ${width} × ${height} × ${depth} mm. Generating CAD...`; if (demoAnalysisBanner) demoAnalysisBanner.textContent = `Question parsed: Front ${width} × ${height} mm • Top ${width} × ${depth} mm • Right-Side ${depth} × ${height} mm.`; renderSolution(parseProblem({ width, height, depth })); $('real-cad-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
$('solve-text-question')?.addEventListener('click', handleTextQuestion, true);
form?.addEventListener('submit', handleSolve); resetButton?.addEventListener('click', handleReset); downloadButton?.addEventListener('click', handleDownload); imageInput?.addEventListener('change', handleImageUpload); analyseButton?.addEventListener('click', handleAnalyseQuestion); confirmAnalysisButton?.addEventListener('click', handleConfirmAnalysis); generateDrawingButton?.addEventListener('click', handleGenerateDrawing);
window.addEventListener('ia-tutor-library-context', (event) => { const { year, subject, topic } = event.detail; updateStatus(`Selected: Year ${year} • ${subject} • ${topic}.`, 'success'); });
initIndustrialArtsLibrary(); initCadLiveSolver(); ensureRealCadHost(); setFormValues({}); resetAnalysisState();
window.IA_TUTOR = { solveFromDimensions, renderSolution, parseProblem, extractQuestionDimensions };
