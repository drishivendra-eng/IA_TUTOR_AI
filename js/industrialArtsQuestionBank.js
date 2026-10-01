const QUESTION_BANK = {
  'Basic Technology': {
    'Workshop Safety': [
      { q: 'Why should personal protective equipment be used in a workshop?', a: 'PPE reduces the risk of injury from common workshop hazards such as flying particles, sharp edges, heat and noise.' },
      { q: 'State two workshop safety practices.', a: 'Keep the work area clean and use the correct tool and PPE for the task.' }
    ],
    'Hand Tools': [
      { q: 'Why should the correct hand tool be selected for a job?', a: 'The correct tool improves safety, accuracy and efficiency and reduces damage to the tool or workpiece.' }
    ]
  },
  'Basic Graphics Technology': {
    'Drawing Instruments': [
      { q: 'What is the purpose of a drawing board?', a: 'It provides a firm, flat surface on which technical drawings can be produced accurately.' },
      { q: 'What is a T-square commonly used for?', a: 'It is commonly used to draw accurate horizontal lines and to guide set squares.' }
    ],
    'Geometric Construction': [
      { q: 'Why are construction lines kept light?', a: 'Light construction lines can be adjusted or erased without damaging the final drawing.' }
    ]
  },
  'Technical Drawing': {
    'Orthographic Projection': [
      { q: 'What does orthographic projection represent?', a: 'It represents an object using separate views such as front, top and side views, with dimensions and features shown accurately.' },
      { q: 'If an object is 60 mm wide and 40 mm high, what are the front-view dimensions?', a: 'The front view is 60 mm wide by 40 mm high.' }
    ],
    'Isometric Drawing': [
      { q: 'What is an isometric drawing?', a: 'It is a pictorial drawing in which the principal axes are represented at equal angular spacing, commonly using 30-degree directions from the horizontal.' }
    ]
  },
  'Applied Technology': {
    'Materials and Processes': [
      { q: 'Why is material selection important in a manufactured product?', a: 'The material must suit the required strength, durability, function, manufacturing process and working conditions.' },
      { q: 'What is a manufacturing process?', a: 'It is a planned method used to transform materials into a finished product.' }
    ],
    'Workshop Practice': [
      { q: 'Why should a workpiece be securely held before machining?', a: 'Secure holding improves accuracy and reduces the risk of movement, tool damage and injury.' }
    ]
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

function getContext() {
  const yearButton = document.querySelector('.ia-year-button.active');
  const heading = document.querySelector('#ia-resources h3');
  const topicButton = document.querySelector('.ia-topic.active');
  const headingText = heading?.textContent || '';
  const match = headingText.match(/Year\s+(\d+)\s+•\s+(.+)/);
  return {
    year: match ? Number(match[1]) : Number(yearButton?.textContent?.replace(/\D/g, '') || 9),
    subject: match ? match[2].trim() : '',
    topic: topicButton?.textContent?.trim() || ''
  };
}

function renderQuestionBank() {
  const library = document.getElementById('industrial-arts-library');
  if (!library) return;
  let panel = document.getElementById('ia-question-bank');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ia-question-bank';
    panel.className = 'ia-question-bank';
    library.appendChild(panel);
  }
  const { year, subject, topic } = getContext();
  const questions = QUESTION_BANK[subject]?.[topic] || [];
  if (!topic) {
    panel.innerHTML = '<h3>📝 Practice Question Bank</h3><p>Select a topic above to view IA-Tutor practice questions.</p>';
    return;
  }
  panel.innerHTML = `<h3>📝 Year ${year} ${escapeHtml(subject)} — ${escapeHtml(topic)}</h3><p class="ia-bank-note">Original IA-Tutor practice material. It is not presented as official Ministry examination content.</p>${questions.length ? questions.map((item, i) => `<article class="ia-question-card"><strong>Question ${i + 1}</strong><p>${escapeHtml(item.q)}</p><button type="button" class="ia-show-answer" data-index="${i}">Show Answer</button><div class="ia-answer" hidden>${escapeHtml(item.a)}</div></article>`).join('') : '<p>No starter questions are available for this topic yet.</p>'}`;
  panel.querySelectorAll('.ia-show-answer').forEach((button) => button.addEventListener('click', () => {
    const answer = button.nextElementSibling;
    const showing = !answer.hidden;
    answer.hidden = showing;
    button.textContent = showing ? 'Show Answer' : 'Hide Answer';
  }));
}

function injectQuestionBankStyles() {
  if (document.getElementById('ia-question-bank-styles')) return;
  const style = document.createElement('style');
  style.id = 'ia-question-bank-styles';
  style.textContent = `.ia-question-bank{margin-top:20px;padding:18px;border:1px solid var(--light-line,#dbe2ea);border-radius:14px;background:#fff}.ia-question-bank h3{margin-top:0}.ia-bank-note{font-size:.88rem;color:var(--muted,#64748b)}.ia-question-card{margin-top:12px;padding:14px;border:1px solid var(--light-line,#dbe2ea);border-radius:11px;background:#f8fafc}.ia-question-card p{line-height:1.5}.ia-show-answer{border:0;border-radius:8px;padding:8px 11px;cursor:pointer;background:var(--primary,#2563eb);color:#fff}.ia-answer{margin-top:10px;padding:10px;border-left:3px solid var(--primary,#2563eb);background:#fff;line-height:1.5}`;
  document.head.appendChild(style);
}

export function initIndustrialArtsQuestionBank() {
  injectQuestionBankStyles();
  const observer = new MutationObserver(() => {
    if (document.getElementById('industrial-arts-library')) renderQuestionBank();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('click', (event) => {
    if (event.target.closest('.ia-topic, .ia-year-button, [data-subject]')) setTimeout(renderQuestionBank, 0);
  });
}
