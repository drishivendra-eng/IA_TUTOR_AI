const MOE = 'https://www.education.gov.fj/';

export const INDUSTRIAL_ARTS_LIBRARY = [
  { year: 9, subjects: ['Basic Technology', 'Basic Graphics Technology'] },
  { year: 10, subjects: ['Basic Technology', 'Basic Graphics Technology'] },
  { year: 11, subjects: ['Technical Drawing', 'Applied Technology'] },
  { year: 12, subjects: ['Technical Drawing', 'Applied Technology'] },
  { year: 13, subjects: ['Technical Drawing', 'Applied Technology'] },
];

const TOPIC_SETS = {
  'Basic Technology': ['Materials and Processes', 'Tools and Equipment', 'Workshop Safety', 'Measurement', 'Basic Manufacturing', 'Joining and Finishing', 'Design and Making'],
  'Basic Graphics Technology': ['Technical Drawing Fundamentals', 'Geometric Construction', 'Orthographic Drawing', 'Dimensioning', 'Pictorial Drawing', 'Scales and Conventions', 'Sectional Drawing'],
  'Technical Drawing': ['Technical Drawing Fundamentals', 'Geometric Construction', 'Orthographic Projection', 'Isometric Projection', 'Oblique Drawing', 'Sectional Views', 'Dimensioning', 'Development and Design Drawing', 'CAD / AutoCAD Practice'],
  'Applied Technology': ['Materials', 'Tools and Equipment', 'Workshop Practice', 'Design and Making', 'Manufacturing Processes', 'Safety and Maintenance', 'Project Work', 'Portfolio and Assessment'],
};

const MATERIAL_GROUPS = {
  'Timber & Wood': ['Hardwood', 'Softwood', 'Plywood', 'MDF', 'Veneer', 'Timber joints', 'Wood finishes'],
  'Metals': ['Mild steel', 'Aluminium', 'Copper', 'Brass', 'Stainless steel', 'Sheet metal', 'Metal finishes'],
  'Plastics': ['Thermoplastics', 'Thermosetting plastics', 'Acrylic', 'PVC', 'ABS', 'Plastic forming'],
  'Joining & Fasteners': ['Nails', 'Screws', 'Bolts and nuts', 'Rivets', 'Adhesives', 'Welding concepts', 'Soldering concepts'],
  'Tools & Equipment': ['Measuring tools', 'Marking-out tools', 'Cutting tools', 'Hand tools', 'Machine tools', 'Workshop equipment'],
  'Safety & PPE': ['Eye protection', 'Hearing protection', 'Dust control', 'Safe machine operation', 'Housekeeping', 'Emergency procedures'],
  'Processes': ['Marking out', 'Cutting', 'Drilling', 'Bending', 'Forming', 'Machining', 'Assembly', 'Finishing'],
  'Design & Assessment': ['Design brief', 'Specifications', 'Research', 'Development sketches', 'Working drawings', 'Testing', 'Evaluation', 'Portfolio evidence'],
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function ensureLibraryRoot() {
  let root = document.getElementById('industrial-arts-library');
  if (!root) {
    root = document.createElement('section');
    root.id = 'industrial-arts-library';
    root.className = 'ia-library-modal hidden';
    document.body.appendChild(root);
  }
  return root;
}

function renderLibrary(root) {
  root.innerHTML = `
    <div class="ia-library-card">
      <div class="ia-library-header">
        <div><span class="ia-library-kicker">🇫🇯 FIJI INDUSTRIAL ARTS</span><h2>Industrial Arts Learning Hub</h2><p>Years 9–13 • Technical Drawing • Applied Technology • Materials • Workshop • CAD • Revision</p></div>
        <button type="button" class="secondary-button" id="ia-library-close">Close</button>
      </div>
      <div class="ia-library-tabs"><button class="ia-library-tab active" data-tab="years">📚 Years 9–13</button><button class="ia-library-tab" data-tab="materials">🛠️ Materials & Workshop</button><button class="ia-library-tab" data-tab="exams">📝 Exams & Solutions</button></div>
      <div id="ia-library-body"></div>
      <div class="ia-library-source"><strong>Official source:</strong> <a href="${MOE}" target="_blank" rel="noopener noreferrer">Fiji Ministry of Education</a>. Official documents are linked where publicly available. Copyrighted materials are not copied into the app unless redistribution permission is established.</div>
    </div>`;
  root.querySelector('#ia-library-close').addEventListener('click', () => root.classList.add('hidden'));
  root.addEventListener('click', (event) => { if (event.target === root) root.classList.add('hidden'); });
  root.querySelectorAll('.ia-library-tab').forEach((button) => button.addEventListener('click', () => {
    root.querySelectorAll('.ia-library-tab').forEach((x) => x.classList.remove('active')); button.classList.add('active'); drawTab(root, button.dataset.tab);
  }));
  drawTab(root, 'years');
}

function drawTab(root, tab) {
  const body = root.querySelector('#ia-library-body');
  if (!body) return;
  if (tab === 'materials') {
    body.innerHTML = `<div class="ia-material-grid">${Object.entries(MATERIAL_GROUPS).map(([name, items]) => `<article class="ia-material-card"><h3>${name}</h3><ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul></article>`).join('')}</div>`;
    return;
  }
  if (tab === 'exams') {
    body.innerHTML = `<article class="ia-exam-card"><h3>📝 Industrial Arts Examination Centre</h3><p>Practice by year and subject. The app can generate original exam-style questions, marking guidance and worked solutions. Official papers are linked only where publicly available and permitted.</p><div class="ia-exam-grid">${INDUSTRIAL_ARTS_LIBRARY.map(({year,subjects}) => `<button class="ia-exam-year" data-year="${year}"><strong>Year ${year}</strong><span>${subjects.join(' • ')}</span></button>`).join('')}</div></article>`;
    body.querySelectorAll('.ia-exam-year').forEach((button) => button.addEventListener('click', () => startAIPractice(button.dataset.year, 'exam')));
    return;
  }
  body.innerHTML = `<div class="ia-library-controls"><input id="ia-library-search" type="search" placeholder="Search year, subject or topic..." aria-label="Search Industrial Arts library" /></div><div id="ia-library-grid" class="ia-library-grid"></div>`;
  const grid = body.querySelector('#ia-library-grid'); const search = body.querySelector('#ia-library-search');
  function draw(filter = '') {
    const q = filter.trim().toLowerCase();
    grid.innerHTML = INDUSTRIAL_ARTS_LIBRARY.map(({ year, subjects }) => {
      const matching = subjects.filter((subject) => { const topics = TOPIC_SETS[subject] || []; return !q || String(year).includes(q) || subject.toLowerCase().includes(q) || topics.some((topic) => topic.toLowerCase().includes(q)); });
      if (!matching.length) return '';
      return `<article class="ia-year-card"><h3>Year ${year}</h3>${matching.map((subject) => `<div class="ia-subject-card"><h4>${escapeHtml(subject)}</h4><div class="ia-topic-list">${(TOPIC_SETS[subject] || []).map((topic) => `<button type="button" class="ia-topic" data-topic="${escapeHtml(topic)}" data-subject="${escapeHtml(subject)}" data-year="${year}">${escapeHtml(topic)}</button>`).join('')}</div><div class="ia-resource-actions"><button type="button" class="ia-action" data-action="learn">📚 Learn</button><button type="button" class="ia-action" data-action="practice">✏️ Practice</button><button type="button" class="ia-action" data-action="exam">📝 Exam Preparation</button><a class="ia-action" href="${MOE}" target="_blank" rel="noopener noreferrer">📄 Official MOE Resources</a></div></div>`).join('')}</article>`;
    }).join('') || '<p class="ia-empty">No matching Industrial Arts resources found.</p>';
    grid.querySelectorAll('.ia-topic').forEach((button) => button.addEventListener('click', () => { const { year, subject, topic } = button.dataset; startAIPractice(year, button.dataset.subject || subject, 'learn', topic); }));
    grid.querySelectorAll('.ia-action').forEach((button) => button.addEventListener('click', () => { const card = button.closest('.ia-subject-card'); const subject = card?.querySelector('h4')?.textContent || 'Industrial Arts'; const year = card?.closest('.ia-year-card')?.querySelector('h3')?.textContent.replace(/\D/g, '') || ''; startAIPractice(year, subject, button.dataset.action); }));
  }
  search.addEventListener('input', () => draw(search.value)); draw();
}

function startAIPractice(year, subject, mode, topic = '') {
  const question = mode === 'exam' ? `Create an original ${subject} examination practice set for Year ${year}, with questions and worked solutions.` : mode === 'practice' ? `Give me a ${subject} practice activity for Year ${year}${topic ? ` on ${topic}` : ''}, with answers and practical guidance.` : `Teach me ${subject}${topic ? ` — ${topic}` : ''} for Fiji Industrial Arts Year ${year}. Give a simple explanation, examples and practice questions.`;
  const box = document.getElementById('question-text'); if (box) { box.value = question; box.scrollIntoView({behavior:'smooth',block:'center'}); box.focus(); }
  document.getElementById('industrial-arts-library')?.classList.add('hidden');
  window.dispatchEvent(new CustomEvent('ia-tutor-library-context', { detail: { year, subject, topic, mode } }));
}

export function initIndustrialArtsLibrary() {
  const root = ensureLibraryRoot();
  const openButton = document.getElementById('open-industrial-arts');
  if (openButton) openButton.addEventListener('click', () => { root.classList.remove('hidden'); renderLibrary(root); });
}

export { MATERIAL_GROUPS, TOPIC_SETS };
