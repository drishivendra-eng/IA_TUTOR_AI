import './agent-widget.js';
import { buildConstructionSteps, buildGeometryProblem, parseProblem } from './geometry.js';
import { buildCompositeDownloadSvg } from './render.js';
import { createVisionAIService } from './visionAIService.js';
import { initIndustrialArtsLibrary } from './industrialArtsLibrary.js';
import { initCadLiveSolver } from './cadLiveSolver.js';
import { RealCadEngine, buildAutomaticOrthographicCad } from './realCadEngine.js';

const $ = (id) => document.getElementById(id);
const form = $('drawing-form'), resetButton = $('reset-button'), downloadButton = $('download-button');
const statusMessage = $('status-message'), constructionSteps = $('construction-steps');
const drawingType = $('drawing-type');
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
  host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ AutoCAD-style Solution Workspace</strong><span class="cad-command">COMMAND: READY</span><span class="cad-status">Ready for a new question</span></div><div class="cad-screen"><aside class="cad-side-tools"><b>LAYERS</b><span>● Object</span><span>● Construction</span><span>● Dimensions</span><b>AI METHOD</b><span>Line</span><span>Polyline</span><span>Circle</span><span>Dimension</span><span>Projection</span></aside><div class="cad-canvas-wrap"><svg id="real-cad-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" aria-label="Open AutoCAD-style technical drawing workspace"></svg></div></div><div class="cad-command-line">IA-Tutor CAD: Ready. The AI will draw the solution here when you submit a question.</div>';
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
    } catch (_) { /* keep rendering valid geometry */ }
  }
}
function renderRealCad(problem = {}) {
  const host = ensureRealCadHost(); if (!host) return;
  host.innerHTML = '<div class="real-cad-toolbar"><strong>🖥️ AutoCAD-style Solution Workspace</strong><button id="cad-undo" type="button">Undo</button><button id="cad-redo" type="button">Redo</button><button id="cad-reset" type="button">Clear</button><span class="cad-command">COMMAND: AI-DRAW</span><span class="cad-status">AI geometry loaded</span></div><div class="cad-screen"><aside class="cad-side-tools"><b>LAYERS</b><span>● Object</span><span>● Construction</span><span>● Dimensions</span><b>AI METHOD</b><span>Line</span><span>Polyline</span><span>Circle</span><span>Dimension</span><span>Projection</span></aside><div class="cad-canvas-wrap"><svg id="real-cad-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet" aria-label="AutoCAD-style AI drawing solution"></svg></div></div><div class="cad-command-line">AI Tutor: drawing the detected solution geometry. You can edit it with the CAD tools below.</div>';
  const svg = $('real-cad-svg'), engine = new RealCadEngine(svg);
  const geometry = Array.isArray(problem.cad_geometry) ? problem.cad_geometry : [];
  if (geometry.length) renderCadGeometry(engine, geometry);
  else if ([problem.width ?? problem.dimensions?.width, problem.height ?? problem.dimensions?.height, problem.depth ?? problem.dimensions?.depth].every((v) => Number.isFinite(Number(v)) && Number(v) > 0)) {
    buildAutomaticOrthographicCad(engine, { width: problem.width ?? problem.dimensions.width, height: problem.height ?? problem.dimensions.height, depth: problem.depth ?? problem.dimensions.depth, units: problem.units || 'mm' });
  }
  $('cad-undo').onclick = () => engine.undo(); $('cad-redo').onclick = () => engine.redo(); $('cad-reset').onclick = () => engine.clear();
  const status = host.querySelector('.cad-status'); if (status) status.textContent = geometry.length ? `AI geometry: ${geometry.length} entities` : 'Open CAD workspace';
}
function renderSolution(problem) {
  if (constructionSteps) constructionSteps.innerHTML = buildConstructionSteps(problem).map((step) => `<li>${step}</li>`).join('');
  if (drawingType) drawingType.textContent = `AI Solution • ${problem.drawing_type || 'Technical Drawing'}`;
  publishCadSolve(problem); renderRealCad(problem); updateStatus('AI CAD solution generated successfully.', 'success');
}
function solveFromDimensions() {
  const problem = currentAnalysisProblem && analysisConfirmed ? buildGeometryProblem(currentAnalysisProblem, { width: $('width').value, height: $('height').value, depth: $('depth').value }) : parseProblem({ width: $('width').value, height: $('height').value, depth: $('depth').value });
  setFormValues(problem); renderSolution(problem); return problem;
}
function handleSolve(event) { event.preventDefault(); try { if (currentAnalysisProblem && !analysisConfirmed) throw new Error('Please confirm the AI analysis before solving the drawing.'); solveFromDimensions(); } catch (error) { updateStatus(error.message, 'error'); } }
function handleReset() {
  setFormValues({}); constructionSteps && (constructionSteps.innerHTML = ''); selectedImage = null; if (imageInput) imageInput.value = ''; imagePreviewWrapper?.classList.add('hidden'); if (imagePreview) imagePreview.src = '';
  [analysisDrawingType, analysisProjectionType, analysisUnits, analysisScale, analysisOverallWidth, analysisOverallHeight, analysisOverallDepth, analysisWidth, analysisHeight, analysisDepth, analysisViews, analysisFeatures, analysisDifficulty, analysisConfidence, analysisExplanation].forEach((el) => { if (el) el.textContent = '-'; });
  analysisModeBanner.textContent = 'AI VISION ANALYSIS'; demoAnalysisBanner.textContent = 'Enter a question or upload a drawing and let AI extract the requirements.'; resetAnalysisState();
  renderRealCad({}); updateStatus('Open CAD workspace is ready for a new technical drawing question.');
}
function handleDownload() { try { const problem = solveFromDimensions(); const markup = buildCompositeDownloadSvg(problem); const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ia-tutor-${problem.drawing_type || 'drawing'}.svg`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); } catch (error) { updateStatus(error.message, 'error'); } }
function handleImageUpload(event) { const file = event.target.files[0]; if (!file) return; selectedImage = file; if (file.type.startsWith('image/')) { imagePreview.src = URL.createObjectURL(file); imagePreviewWrapper.classList.remove('hidden'); } resetAnalysisState(); updateStatus('Question file uploaded. Select Analyse Selected Question.', 'success'); if (analyseButton) analyseButton.disabled = false; }
async function handleAnalyseQuestion() {
  try {
    if (!selectedImage) throw new Error('Please upload a question file first.'); updateStatus('Analysing question with Vision AI...', 'success');
    const analysis = await visionAIService.analyze(selectedImage); currentAnalysisProblem = analysis.problem; populateAnalysisPanel(analysis.problem);
    const hasDimensions = ['width', 'height', 'depth'].every((key) => Number.isFinite(Number(analysis.problem?.dimensions?.[key])));
    if (hasDimensions) setFormValues(buildGeometryProblem(analysis.problem)); else setFormValues({});
    analysisModeBanner.textContent = analysis.mode === 'demo' ? 'DEMO ANALYSIS' : 'REAL AI ANALYSIS — CONFIRM REQUIRED'; demoAnalysisBanner.textContent = analysis.message || 'Review the extracted drawing and construction requirements before generating the CAD solution.';
    confirmAnalysisButton.disabled = false; generateDrawingButton.disabled = true; analysisConfirmed = false;
    renderRealCad({});
    updateStatus('Analysis ready. Review the detected requirements, then click Confirm Analysis and Generate Drawing.', 'success');
  } catch (error) { demoAnalysisBanner.textContent = 'Real Vision AI analysis failed. No demo result was used.'; updateStatus(error.connectionFailure ? `NETWORK ERROR: ${error.message}` : `API ERROR: ${error.message || 'Vision AI analysis failed.'}`, 'error'); }
}
function handleConfirmAnalysis() { if (!currentAnalysisProblem) { updateStatus('Analyse a question first.', 'error'); return; } analysisConfirmed = true; generateDrawingButton.disabled = false; updateStatus('Analysis confirmed. Click Generate Drawing to place the solution in the CAD workspace.', 'success'); }
function handleGenerateDrawing() { try { if (!currentAnalysisProblem || !analysisConfirmed) throw new Error('Analyse and confirm the question first.'); renderSolution(currentAnalysisProblem); updateStatus('Automatic CAD-method drawing generated.', 'success'); } catch (error) { updateStatus(error.message, 'error'); } }
function extractQuestionDimensions(text) {
  const source = String(text || '').replace(/[,;]/g, ' '); const number = '(\\d+(?:\\.\\d+)?)';
  const find = (patterns) => { for (const pattern of patterns) { const match = source.match(pattern); if (match) return Number(match[1]); } return null; };
  return { width: find([new RegExp(`(?:width|wide)\\s*(?:of|=|is|measuring)?\\s*${number}\\s*(?:mm|millimet(?:er|re)s?)?`, 'i'), new RegExp(`${number}\\s*(?:mm|millimet(?:er|re)s?)?\\s*(?:wide|width)`, 'i')]), height: find([new RegExp(`(?:height|high|tall)\\s*(?:of|=|is|measuring)?\\s*${number}\\s*(?:mm|millimet(?:er|re)s?)?`, 'i'), new RegExp(`${number}\\s*(?:mm|millimet(?:er|re)s?)?\\s*(?:high|tall|height)`, 'i')]), depth: find([new RegExp(`(?:depth|deep)\\s*(?:of|=|is|measuring)?\\s*${number}\\s*(?:mm|millimet(?:er|re)s?)(?!\\s*[:/]\\s*1)`, 'i'), new RegExp(`${number}\\s*(?:mm|millimet(?:er|re)s?)?\\s*(?:deep|depth)`, 'i')]) };
}
async function handleTextQuestion(event) {
  event.preventDefault(); event.stopImmediatePropagation();
  const box = $('question-text'), text = box?.value.trim() || '';
  const qStatus = $('question-text-status');
  if (!text) { updateStatus('Please type or paste a Technical Drawing question first.', 'error'); return; }
  if (qStatus) qStatus.textContent = 'Sending question to IA-Tutor AI for drawing analysis…';
  updateStatus('AI is interpreting the question and preparing structured CAD geometry…', 'success');
  if (analyseButton) analyseButton.disabled = true;
  if (confirmAnalysisButton) confirmAnalysisButton.disabled = true;
  if (generateDrawingButton) generateDrawingButton.disabled = true;
  analysisConfirmed = false;
  currentAnalysisProblem = null;
  try {
    const response = await fetch('/api/solve-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text, year: '9', subject: 'Technical Drawing' })
    });
    let payload = {};
    try { payload = await response.json(); } catch (_) { payload = {}; }
    if (!response.ok) {
      const detail = payload.detail || 'AI drawing service is unavailable.';
      if (response.status === 503 || String(detail).includes('CONFIGURATION')) throw new Error('AI_CONFIGURATION_ERROR: check OPENAI_API_KEY in the backend deployment settings.');
      if (response.status === 429) throw new Error('AI_RATE_OR_BILLING_ERROR: the AI provider rejected the request due to usage limits.');
      throw new Error(detail);
    }
    if (!payload.problem || typeof payload.problem !== 'object') throw new Error('The AI returned no structured drawing problem.');
    currentAnalysisProblem = payload.problem;
    populateAnalysisPanel(payload.problem);
    analysisModeBanner.textContent = 'REAL AI TEXT ANALYSIS — CONFIRM REQUIRED';
    demoAnalysisBanner.textContent = payload.message || 'Review the AI interpretation before drawing.';
    const dims = payload.problem.dimensions || {};
    if (['width', 'height', 'depth'].every(key => Number.isFinite(Number(dims[key])) && Number(dims[key]) > 0)) setFormValues(dims);
    else setFormValues({});
    confirmAnalysisButton.disabled = false;
    generateDrawingButton.disabled = true;
    renderRealCad({});
    if (qStatus) qStatus.textContent = 'AI analysis ready. Review it, then click Confirm Analysis → Generate Drawing.';
    updateStatus('Text question analysed. No drawing has been generated before your confirmation.', 'success');
    $('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    const message = error.message || 'AI drawing analysis failed.';
    if (qStatus) qStatus.textContent = message;
    updateStatus(message.includes('Failed to fetch') ? 'NETWORK ERROR: IA-Tutor could not reach the AI backend.' : message, 'error');
  } finally {
    if (analyseButton) analyseButton.disabled = !selectedImage;
  }
}
$('solve-text-question')?.addEventListener('click', handleTextQuestion, true);
$('clear-question-text')?.addEventListener('click', () => { if ($('question-text')) $('question-text').value = ''; if ($('question-text-status')) $('question-text-status').textContent = ''; });
form?.addEventListener('submit', handleSolve); resetButton?.addEventListener('click', handleReset); downloadButton?.addEventListener('click', handleDownload); imageInput?.addEventListener('change', handleImageUpload); analyseButton?.addEventListener('click', handleAnalyseQuestion); confirmAnalysisButton?.addEventListener('click', handleConfirmAnalysis); generateDrawingButton?.addEventListener('click', handleGenerateDrawing);
window.addEventListener('ia-tutor-library-context', (event) => { const { year, subject, topic } = event.detail; updateStatus(`Selected: Year ${year} • ${subject} • ${topic}.`, 'success'); });
initIndustrialArtsLibrary(); initCadLiveSolver(); ensureRealCadHost(); setFormValues({}); resetAnalysisState();
window.IA_TUTOR = { solveFromDimensions, renderSolution, parseProblem, extractQuestionDimensions };
