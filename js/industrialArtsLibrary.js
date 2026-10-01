const MOE = 'https://www.education.gov.fj/';

export const INDUSTRIAL_ARTS_LIBRARY = [
  { year: 9, subjects: ['Basic Technology', 'Basic Graphics Technology'] },
  { year: 10, subjects: ['Basic Technology', 'Basic Graphics Technology'] },
  { year: 11, subjects: ['Technical Drawing', 'Applied Technology'] },
  { year: 12, subjects: ['Technical Drawing', 'Applied Technology'] },
  { year: 13, subjects: ['Technical Drawing', 'Applied Technology'] },
];

const TOPIC_SETS = {
  'Basic Technology': ['Materials and Processes', 'Tools and Equipment', 'Workshop Safety', 'Measurement', 'Basic Manufacturing'],
  'Basic Graphics Technology': ['Technical Drawing Fundamentals', 'Geometric Construction', 'Orthographic Drawing', 'Dimensioning', 'Pictorial Drawing'],
  'Technical Drawing': ['Technical Drawing Fundamentals', 'Geometric Construction', 'Orthographic Projection', 'Isometric Projection', 'Sectional Views', 'Dimensioning'],
  'Applied Technology': ['Materials', 'Tools and Equipment', 'Workshop Practice', 'Design and Making', 'Safety and Maintenance'],
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderLibrary(root) {
  root.innerHTML = `
    <div class="ia-library-header">
      <div><span class="ia-library-kicker">🇫🇯 FIJI INDUSTRIAL ARTS</span><h2>Years 9–13 Learning Library</h2><p>Choose a year and subject to explore topics, practice and official Ministry resources.</p></div>
      <button type="button" class="secondary-button" id="ia-library-close">Close</button>
    </div>
    <div class="ia-library-controls">
      <input id="ia-library-search" type="search" placeholder="Search year, subject or topic..." aria-label="Search Industrial Arts library" />
    </div>
    <div id="ia-library-grid" class="ia-library-grid"></div>
    <div class="ia-library-source"><strong>Official source:</strong> <a href="${MOE}" target="_blank" rel="noopener noreferrer">Fiji Ministry of Education</a>. Official documents are linked where publicly available; materials are not copied into the app unless redistribution permission is established.</div>
  `;

  const grid = root.querySelector('#ia-library-grid');
  const search = root.querySelector('#ia-library-search');
  root.querySelector('#ia-library-close').addEventListener('click', () => root.classList.add('hidden'));

  function draw(filter = '') {
    const q = filter.trim().toLowerCase();
    const html = INDUSTRIAL_ARTS_LIBRARY.map(({ year, subjects }) => {
      const matching = subjects.filter((subject) => {
        const topics = TOPIC_SETS[subject] || [];
        return !q || String(year).includes(q) || subject.toLowerCase().includes(q) || topics.some((topic) => topic.toLowerCase().includes(q));
      });
      if (!matching.length) return '';
      return `<article class="ia-year-card"><h3>Year ${year}</h3>${matching.map((subject) => `
        <div class="ia-subject-card">
          <h4>${escapeHtml(subject)}</h4>
          <div class="ia-topic-list">${(TOPIC_SETS[subject] || []).map((topic) => `<button type="button" class="ia-topic" data-topic="${escapeHtml(topic)}" data-subject="${escapeHtml(subject)}" data-year="${year}">${escapeHtml(topic)}</button>`).join('')}</div>
          <div class="ia-resource-actions">
            <button type="button" class="ia-action" data-action="learn">📚 Learn</button>
            <button type="button" class="ia-action" data-action="practice">✏️ Practice</button>
            <button type="button" class="ia-action" data-action="exam">📝 Exam Preparation</button>
            <a class="ia-action" href="${MOE}" target="_blank" rel="noopener noreferrer">📄 Official MOE Resources</a>
          </div>
        </div>`).join('')}</article>`;
    }).join('');
    grid.innerHTML = html || '<p class="ia-empty">No matching Industrial Arts resources found.</p>';

    grid.querySelectorAll('.ia-topic').forEach((button) => button.addEventListener('click', () => {
      const { year, subject, topic } = button.dataset;
      window.dispatchEvent(new CustomEvent('ia-tutor-library-context', { detail: { year, subject, topic } }));
      button.classList.add('selected');
      button.textContent = `✓ ${topic}`;
    }));
  }

  search.addEventListener('input', () => draw(search.value));
  draw();
}

export function initIndustrialArtsLibrary() {
  const root = document.getElementById('industrial-arts-library');
  const openButton = document.getElementById('open-industrial-arts');
  if (!root || !openButton) return;
  openButton.addEventListener('click', () => {
    root.classList.remove('hidden');
    renderLibrary(root);
  });
}
