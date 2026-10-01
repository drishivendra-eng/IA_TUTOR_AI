import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Same-origin architecture: the frontend must never hard-code the backend's own host/port.
const source = readFileSync(new URL('./visionAIService.js', import.meta.url), 'utf8');
assert.ok(!source.includes('127.0.0.1:8001'), 'frontend source must not reference 127.0.0.1:8001');
assert.ok(!source.includes('localhost:8001'), 'frontend source must not reference localhost:8001');

globalThis.window = { location: { hostname: 'example-8000.app.github.dev', protocol: 'https:' } };

const { createRealVisionAIService } = await import('./visionAIService.js');

let requestedUrl = null;
let requestInit = null;
globalThis.fetch = async (url, init) => {
  requestedUrl = url;
  requestInit = init;
  return {
    ok: true,
    text: async () => JSON.stringify({
      mode: 'real',
      message: 'REAL AI ANALYSIS',
      problem: {
        drawing_type: 'test',
        projection_type: 'orthographic',
        units: 'mm',
        confidence: { overall: 1, explanation: 'test' },
        explanation: 'test',
      },
    }),
  };
};

const file = new File(['image'], 'drawing.png', { type: 'image/png' });
await createRealVisionAIService().analyze(file);

assert.equal(requestedUrl, '/api/analyze-drawing', 'Solve/Analyse must call a same-origin relative URL');
assert.equal(requestInit.method, 'POST');
assert.ok(requestInit.body instanceof FormData);

console.log('visionAIService same-origin relative URL tests passed');
