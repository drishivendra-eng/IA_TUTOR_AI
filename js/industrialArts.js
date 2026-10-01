import { INDUSTRIAL_ARTS_TOPICS } from './industrialArtsTopics.js';

const OFFICIAL_SOURCES = [
  { title: 'MOE Annual Report 2018–2019', description: 'Official record of Industrial Arts curriculum review, Year 11 student workbook development, and examination preparation.', url: 'https://www.education.gov.fj/wp-content/uploads/2024/06/Ministry-of-Education-Heritage-and-Arts-Annual-Report-2018%E2%80%932019.pdf' },
  { title: 'MOE Annual Report 2019–2020', description: 'Official record of Industrial Arts examination papers and preparation of examiners reports and detailed solutions.', url: 'https://www.education.gov.fj/wp-content/uploads/2024/06/Ministry-of-Education-Heritage-and-Arts-Annual-Report-2019%E2%80%932020.pdf' },
  { title: 'MOE Annual Report 2020–2021', description: 'Official record covering Industrial Arts examination papers and resource development/review.', url: 'https://www.education.gov.fj/wp-content/uploads/2024/06/Ministry-of-Education-Heritage-and-Arts-Annual-Report-2020%E2%80%932021.pdf' }
];

const YEARS = [
  { year: 9, subjects: ['Basic Technology', 'Basic Graphics Technology'] },
  { year: 10, subjects: ['Basic Technology', 'Basic Graphics Technology'] },
  { year: 11, subjects: ['Technical Drawing', 'Applied Technology'] },
  { year: 12, subjects: ['Technical Drawing', 'Applied Technology'] },
  { year: 13, subjects: ['Technical Drawing', 'Applied Technology'] }
];

const SUBJECT_INFO = {
  'Basic Technology': 'Industrial Arts subject for Years 9–10. Use official MOE resources as the source of truth for curriculum-specific content.',
  'Basic Graphics Technology': 'Industrial Arts subject for Years 9–10. Use official MOE resources as the source of truth for curriculum-specific content.',
  'Technical Drawing': 'Industrial Arts subject for Years 11–13. IA-Tutor supports technical drawing practice and the existing Vision AI drawing solver.',
  'Applied Technology': 'Industrial Arts subject for Years 11–13. Use official MOE resources as the source of truth for curriculum-specific content.'
};

const RESOURCE_TYPES = ['All', 'Official MOE', 'Practice', 'Exam Preparation', 'AI Tutor'];

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .ia-library { margin-top:24px; padding:24px; background:var(--panel); border:1px solid rgba(148,163,184,.25); border-radius:20px; box-shadow:0 18px 42px var(--shadow); }
    .ia-library.hidden { display:none; }
    .ia-library-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; flex-wrap:wrap; }
    .ia-library-header h2 { margin:0; color:var(--primary-dark); }
    .ia-library-header p { color:var(--muted); margin:6px 0 0; }
    .ia-library-toolbar { display:grid; grid-template-columns:minmax(180px,1fr) 180px; gap:12px; margin:18px 0; }
    .ia-library-toolbar input,.ia-library-toolbar select { width:100%; padding:12px 14px; border:1px solid var(--light-line); border-radius:10px; background:#fff; }
    .ia-years { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px; margin-bottom:18px; }
    .ia-year-button { border:1px solid var(--light-line); background:#fff; border-radius:12px; padding:12px; cursor:pointer; font-weight:700; color:var(--primary-dark); }
    .ia-year-button.active { background:var(--primary); color:#fff; border-color:var(--primary); }
    .ia-subjects { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; }
    .ia-subject-card { border:1px solid var(--light-line); border-radius:14px; padding:16px; background:#fff; }
    .ia-subject-card h3 { margin:0 0 8px; color:var(--primary-dark); }
    .ia-subject-card p { color:var(--muted); font-size:.92rem; min-height:54px; }
    .ia-card-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .ia-card-actions button,.ia-card-actions a { border:0; border-radius:9px; padding:9px 11px; text-decoration:none; cursor:pointer; background:var(--panel-alt); color:var(--primary-dark); font-weight:700; }
    .ia-card-actions .primary { background:var(--primary); color:#fff; }
    .ia-resource-panel { margin-top:20px; border-top:1px solid var(--light-line); padding-top:20px; }
    .ia-resource-panel h3 { margin-top:0; }
    .ia-resource-list { display:grid; gap:10px; }
    .ia-resource { border:1px solid var(--light-line); border-radius:12px; padding:14px; background:#fff; }
    .ia-resource strong { color:var(--primary-dark); }
    .ia-badge { display:inline-block; font-size:.75rem; padding:3px 7px; border-radius:999px; background:#edf4ff; margin-left:6px; }
    .ia-notice { padding:12px 14px; background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; color:#7c2d12; margin-bottom:14px; }
    .ia-topic-panel { margin:16px 0; padding:14px; border:1px solid var(--light-line); border-radius:12px; background:#f8fafc; }
    .ia-topic-list { display:flex; flex-wrap:wrap; gap:7px; }
    .ia-topic { border:1px solid var(--light-line); background:#fff; border-radius:999px; padding:7px 10px; cursor:pointer; }
    .ia-topic.active { background:var(--primary); color:#fff; border-color:var(--primary); }
    @media (max-width:800px){ .ia-years{grid-template-columns:repeat(2,1fr)} .ia-library-toolbar{grid-template-columns:1fr} }
  `;
  document.head.appendChild(style);
}

function buildLibrary() {
  if (document.getElementById('industrial-arts-library')) return;
  injectStyles();
  const section = document.createElement('section');
  section.id = 'industrial-arts-library';
  section.className = 'ia-library hidden';
  section.innerHTML = `
    <div class="ia-library-header"><div><h2>🇫🇯 Fiji Industrial Arts Library</h2><p>Years 9–13 • Industrial Arts learning, practice and official resource directory</p></div><button type="button" id="ia-close" class="secondary-button">Close Library</button></div>
    <div class="ia-notice">Official Ministry resources are linked to their Ministry source. The public availability of a document does not by itself grant permission to republish the complete document inside the app.</div>
    <div class="ia-library-toolbar"><input id="ia-search" type="search" placeholder="Search Year, subject or topic..." aria-label="Search Industrial Arts library"><select id="ia-type-filter" aria-label="Filter resources">${RESOURCE_TYPES.map((x) => `<option>${x}</option>`).join('')}</select></div>
    <div id="ia-years" class="ia-years"></div>
    <div id="ia-subjects" class="ia-subjects"></div>
    <div id="ia-resources" class="ia-resource-panel"></div>
  `;
  document.querySelector('.app-shell').appendChild(section);

  let selectedYear = 9;
  let selectedSubject = null;
  let selectedTopic = null;
  const yearsEl = section.querySelector('#ia-years');
  const subjectsEl = section.querySelector('#ia-subjects');
  const resourcesEl = section.querySelector('#ia-resources');
  const searchEl = section.querySelector('#ia-search');
  const typeEl = section.querySelector('#ia-type-filter');

  function renderYears() {
    yearsEl.innerHTML = YEARS.map(({ year }) => `<button class="ia-year-button ${year === selectedYear ? 'active' : ''}" data-year="${year}">Year ${year}</button>`).join('');
    yearsEl.querySelectorAll('[data-year]').forEach((button) => button.addEventListener('click', () => { selectedYear = Number(button.dataset.year); selectedSubject = null; selectedTopic = null; renderYears(); renderSubjects(); renderResources(); }));
  }

  function matchesSearch(text) {
    const query = searchEl.value.trim().toLowerCase();
    return !query || text.toLowerCase().includes(query);
  }

  function renderSubjects() {
    const row = YEARS.find((item) => item.year === selectedYear);
    const subjects = row ? row.subjects : [];
    const filtered = subjects.filter((subject) => matchesSearch(`Year ${selectedYear} ${subject} ${(INDUSTRIAL_ARTS_TOPICS[selectedYear]?.[subject] || []).join(' ')}`));
    subjectsEl.innerHTML = filtered.map((subject) => `
      <article class="ia-subject-card"><h3>${esc(subject)}</h3><p>${esc(SUBJECT_INFO[subject])}</p>
      <div class="ia-card-actions"><button class="primary" data-subject="${esc(subject)}">Open Subject</button><button data-ask="${esc(subject)}">Ask IA-Tutor</button></div></article>
    `).join('') || '<p>No matching Industrial Arts subject found.</p>';
    subjectsEl.querySelectorAll('[data-subject]').forEach((button) => button.addEventListener('click', () => { selectedSubject = button.dataset.subject; selectedTopic = null; renderSubjects(); renderResources(); }));
    subjectsEl.querySelectorAll('[data-ask]').forEach((button) => button.addEventListener('click', () => { const subject = button.dataset.ask; document.querySelector('#status-message').textContent = `IA-Tutor context: Year ${selectedYear} • ${subject}. Select or upload a question to continue.`; document.querySelector('#question-image-input')?.focus(); }));
  }

  function renderResources() {
    const subject = selectedSubject || YEARS.find((x) => x.year === selectedYear)?.subjects[0];
    if (!subject) return;
    const topics = INDUSTRIAL_ARTS_TOPICS[selectedYear]?.[subject] || [];
    const search = searchEl.value.trim().toLowerCase();
    const type = typeEl.value;
    const filteredTopics = topics.filter((topic) => !search || `${selectedYear} ${subject} ${topic}`.toLowerCase().includes(search));
    const official = OFFICIAL_SOURCES.filter((source) => !search || `${subject} year ${selectedYear} ${source.title} ${source.description}`.toLowerCase().includes(search));
    const showOfficial = type === 'All' || type === 'Official MOE';
    const cards = [];
    if (showOfficial) official.forEach((source) => cards.push(`<article class="ia-resource"><strong>${esc(source.title)}</strong><span class="ia-badge">Official MOE source</span><p>${esc(source.description)}</p><a href="${source.url}" target="_blank" rel="noopener noreferrer">Open Ministry source</a></article>`));
    if (type === 'All' || type === 'Practice') cards.push(`<article class="ia-resource"><strong>IA-Tutor Practice</strong><span class="ia-badge">Original content</span><p>Practice activities for Year ${selectedYear} ${esc(subject)} can be added here without presenting them as official Ministry material.</p></article>`);
    if (type === 'All' || type === 'Exam Preparation') cards.push(`<article class="ia-resource"><strong>Exam Preparation</strong><span class="ia-badge">Resource directory</span><p>The Ministry records examination papers and detailed solutions for Industrial Arts subjects. Individual papers will be linked only when an official public source is verified.</p></article>`);
    if (type === 'All' || type === 'AI Tutor') cards.push(`<article class="ia-resource"><strong>Ask IA-Tutor</strong><span class="ia-badge">AI</span><p>Use the existing AI drawing solver or upload a question. Your selected context is Year ${selectedYear} • ${esc(subject)}${selectedTopic ? ` • ${esc(selectedTopic)}` : ''}.</p></article>`);
    resourcesEl.innerHTML = `<h3>Year ${selectedYear} • ${esc(subject)}</h3><div class="ia-topic-panel"><strong>Topics</strong><div class="ia-topic-list">${filteredTopics.map((topic) => `<button class="ia-topic ${topic === selectedTopic ? 'active' : ''}" data-topic="${esc(topic)}">${esc(topic)}</button>`).join('') || '<span>No matching topic.</span>'}</div></div><div class="ia-resource-list">${cards.join('')}</div>`;
    resourcesEl.querySelectorAll('[data-topic]').forEach((button) => button.addEventListener('click', () => { selectedTopic = button.dataset.topic; renderResources(); }));
  }

  searchEl.addEventListener('input', () => { renderSubjects(); renderResources(); });
  typeEl.addEventListener('change', renderResources);
  section.querySelector('#ia-close').addEventListener('click', () => section.classList.add('hidden'));
  renderYears(); renderSubjects(); renderResources();
}

export function initIndustrialArtsLibrary() {
  buildLibrary();
  const library = document.getElementById('industrial-arts-library');
  library?.classList.remove('hidden');
  library?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
