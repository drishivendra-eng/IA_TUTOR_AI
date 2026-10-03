(function () {
  function init() {
    const input = document.getElementById('question-image-input');
    const dropzone = document.querySelector('.upload-dropzone');
    const analyse = document.getElementById('analyse-button');
    const previewWrap = document.getElementById('image-preview-wrapper');
    const preview = document.getElementById('image-preview');
    const banner = document.getElementById('demo-analysis-banner');
    const status = document.getElementById('status-message');
    if (!input || !analyse) return;

    let selected = null;
    analyse.disabled = true;
    analyse.textContent = 'Analyse Drawing';

    function setStatus(message, type) {
      if (status) {
        status.textContent = message;
        status.className = `status-message ${type || ''}`.trim();
      }
      if (banner && message) banner.textContent = message;
    }

    function selectFile(file) {
      if (!file) return;
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setStatus('Please choose a JPG, JPEG or PNG drawing.', 'error');
        input.value = '';
        selected = null;
        analyse.disabled = true;
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setStatus('The image is larger than 10 MB. Please choose a smaller image.', 'error');
        input.value = '';
        selected = null;
        analyse.disabled = true;
        return;
      }
      selected = file;
      if (preview) {
        if (preview.dataset.objectUrl) URL.revokeObjectURL(preview.dataset.objectUrl);
        const url = URL.createObjectURL(file);
        preview.src = url;
        preview.dataset.objectUrl = url;
      }
      previewWrap?.classList.remove('hidden');
      analyse.disabled = false;
      analyse.textContent = '🤖 Analyse Selected Drawing';
      setStatus(`Selected: ${file.name}. Click Analyse Selected Drawing.`, 'success');
    }

    input.addEventListener('change', function () { selectFile(this.files?.[0]); }, true);

    dropzone?.addEventListener('click', function (event) {
      if (event.target !== input) input.click();
    }, true);
    ['dragenter', 'dragover'].forEach(type => dropzone?.addEventListener(type, e => {
      e.preventDefault(); dropzone.classList.add('drag-active');
    }, true));
    ['dragleave', 'drop'].forEach(type => dropzone?.addEventListener(type, e => {
      e.preventDefault(); dropzone.classList.remove('drag-active');
    }, true));
    dropzone?.addEventListener('drop', function (event) {
      selectFile(event.dataTransfer?.files?.[0]);
    }, true);

    analyse.addEventListener('click', async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!selected) {
        setStatus('Please choose a drawing first.', 'error');
        input.click();
        return;
      }

      analyse.disabled = true;
      analyse.textContent = '🤖 Analysing...';
      setStatus('AI is analysing the uploaded technical drawing. Please wait...', 'success');

      try {
        const body = new FormData();
        body.append('image', selected, selected.name);
        const response = await fetch('/api/analyze-drawing', { method: 'POST', body });
        const text = await response.text();
        let payload = {};
        try { payload = text ? JSON.parse(text) : {}; } catch (_) {}
        if (!response.ok) throw new Error(payload.detail || `Analysis failed (${response.status}).`);
        const problem = payload.problem || {};
        const d = problem.dimensions || {};
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value ?? '-'; };
        set('analysis-drawing-type', problem.drawing_type || '-');
        set('analysis-projection-type', problem.projection_type || '-');
        set('analysis-units', problem.units || 'mm');
        set('analysis-scale', problem.scale || '-');
        set('analysis-overall-width', problem.overall_dimensions?.width?.value ? `${problem.overall_dimensions.width.value} ${problem.overall_dimensions.width.unit || 'mm'}` : 'Not visible');
        set('analysis-overall-height', problem.overall_dimensions?.height?.value ? `${problem.overall_dimensions.height.value} ${problem.overall_dimensions.height.unit || 'mm'}` : 'Not visible');
        set('analysis-overall-depth', problem.overall_dimensions?.depth?.value ? `${problem.overall_dimensions.depth.value} ${problem.overall_dimensions.depth.unit || 'mm'}` : 'Not visible');
        set('analysis-width', d.width != null ? `${d.width} ${problem.units || 'mm'}` : 'Not visible');
        set('analysis-height', d.height != null ? `${d.height} ${problem.units || 'mm'}` : 'Not visible');
        set('analysis-depth', d.depth != null ? `${d.depth} ${problem.units || 'mm'}` : 'Not visible');
        set('analysis-views', (problem.views_required || []).join(', ') || 'Not reported');
        set('analysis-features', (problem.geometric_features || []).join(', ') || 'None reported');
        set('analysis-difficulty', problem.difficulty || '-');
        set('analysis-confidence', problem.confidence?.overall ?? '-');
        set('analysis-explanation', problem.explanation || payload.message || '-');
        set('analysis-mode-banner', payload.mode === 'demo' ? 'DEMO ANALYSIS' : 'REAL AI ANALYSIS');

        const width = Number(d.width), height = Number(d.height), depth = Number(d.depth);
        if (![width, height, depth].every(v => Number.isFinite(v) && v > 0)) {
          throw new Error('AI could not safely identify all three dimensions. Please use a clearer drawing or enter the dimensions manually.');
        }
        document.getElementById('width').value = width;
        document.getElementById('height').value = height;
        document.getElementById('depth').value = depth;

        window.currentAITutorProblem = problem;
        const generate = document.getElementById('generate-drawing-button');
        const confirm = document.getElementById('confirm-analysis-button');
        if (confirm) confirm.disabled = false;
        if (generate) generate.disabled = false;

        // Generate the actual deterministic CAD views immediately after successful analysis.
        if (window.IA_TUTOR?.renderSolution) {
          window.IA_TUTOR.renderSolution({ width, height, depth, units: problem.units || 'mm', projection_type: problem.projection_type || 'orthographic', geometric_features: problem.geometric_features || [] });
        } else {
          window.dispatchEvent(new CustomEvent('ia-tutor-cad-solve', { detail: { problem: { width, height, depth, units: problem.units || 'mm', projection_type: problem.projection_type || 'orthographic', geometric_features: problem.geometric_features || [] } } }));
        }
        setStatus(payload.mode === 'demo' ? 'Analysis completed using the configured demo fallback. Review the dimensions before using the CAD result.' : 'AI analysis completed and CAD views generated.', 'success');
      } catch (error) {
        setStatus(error.message || 'Drawing analysis failed.', 'error');
      } finally {
        analyse.disabled = !selected;
        analyse.textContent = '🤖 Analyse Selected Drawing';
      }
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
