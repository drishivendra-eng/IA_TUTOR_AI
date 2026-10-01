const IA_LIBRARY = {
  'Year 9': [
    ['Basic Technology','Workshop safety, tools, materials, measuring, marking-out, joining and basic practical skills'],
    ['Basic Graphics Technology','Lines, lettering, geometric construction, scales, dimensioning and introductory drawing'],
    ['Technical Drawing','Drawing instruments, conventions, simple orthographic and pictorial drawing'],
    ['Workshop Materials','Timber, metals, plastics, fasteners, adhesives and finishes'],
    ['Practice & Revision','Original topic questions, practical activities and revision quizzes']
  ],
  'Year 10': [
    ['Basic Technology','Materials, processes, tools, machines, workshop practice and safety'],
    ['Basic Graphics Technology','Advanced construction, dimensioning, scales, sections and graphical communication'],
    ['Technical Drawing','Orthographic, isometric, oblique and sectional drawing'],
    ['Materials & Processes','Properties, selection, preparation, forming, joining and finishing'],
    ['Examination Preparation','Original practice papers, worked examples and answer guidance']
  ],
  'Year 11': [
    ['Technical Drawing','Advanced technical drawing, projection, sections, dimensioning and conventions'],
    ['Applied Technology','Design, materials, processes, tools, workshop practice and project work'],
    ['Engineering Drawing','Mechanical components, assemblies and graphical communication'],
    ['CAD Studio','AutoCAD-style construction, dimensions and step-by-step drawing workflows'],
    ['Portfolio Projects','Project evidence, drawings, reflections and assessment preparation']
  ],
  'Year 12': [
    ['Technical Drawing','Advanced projection, sections, development, dimensioning and design drawing'],
    ['Applied Technology','Advanced materials, manufacturing processes, design and practical projects'],
    ['CAD & Digital Drawing','Automatic construction, editable CAD workspace and drawing analysis'],
    ['Exam Revision','Original exam-style questions with worked solutions and marking guidance'],
    ['e-Portfolio','Organise practical evidence, drawings, projects and teacher feedback']
  ],
  'Year 13': [
    ['Technical Drawing','Advanced technical drawing, design communication and project documentation'],
    ['Applied Technology','Advanced design, materials, processes and practical project work'],
    ['CAD Studio','Professional-style CAD practice and AI-assisted technical drawing'],
    ['Exam Preparation','Original practice papers, solutions and topic-by-topic revision'],
    ['Major Portfolio','Project evidence, drawings, design decisions, reflections and presentation']
  ]
};
const MATERIALS = {
  'Timber & Wood': ['Hardwood','Softwood','Plywood','MDF','Veneer','Timber joints','Wood finishes'],
  'Metals': ['Mild steel','Aluminium','Copper','Brass','Stainless steel','Sheet metal','Metal finishes'],
  'Plastics': ['Thermoplastics','Thermosetting plastics','Acrylic','PVC','ABS','Plastic forming'],
  'Joining & Fasteners': ['Nails','Screws','Bolts and nuts','Rivets','Adhesives','Welding concepts','Soldering concepts'],
  'Tools & Equipment': ['Measuring tools','Marking-out tools','Cutting tools','Hand tools','Machine tools','Workshop equipment'],
  'Safety & PPE': ['Eye protection','Hearing protection','Dust control','Safe machine operation','Workshop housekeeping','Emergency procedures'],
  'Processes': ['Marking out','Cutting','Drilling','Bending','Forming','Machining','Assembly','Finishing'],
  'Design & Assessment': ['Design brief','Specifications','Research','Development sketches','Working drawings','Testing','Evaluation','Portfolio evidence']
};

function openIALibrary(){
  let modal=document.getElementById('ia-library-modal');
  if(!modal){
    modal=document.createElement('div'); modal.id='ia-library-modal'; modal.className='ia-modal';
    modal.innerHTML=`<div class="ia-modal-card"><div class="ia-modal-head"><div><span class="ia-modal-kicker">🇫🇯 Fiji Industrial Arts</span><h2>Industrial Arts Learning Library</h2><p>Years 9–13 • Technical Drawing • Applied Technology • Materials • Workshop • CAD</p></div><button class="ia-close" aria-label="Close">×</button></div><div class="ia-tabs"><button class="ia-tab active" data-tab="years">📚 Years 9–13</button><button class="ia-tab" data-tab="materials">🛠️ Materials & Workshop</button><button class="ia-tab" data-tab="exams">📝 Exams & Solutions</button></div><div id="ia-library-content"></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.ia-close').onclick=()=>modal.remove(); modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
    modal.querySelectorAll('.ia-tab').forEach(b=>b.onclick=()=>{modal.querySelectorAll('.ia-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderIALibrary(b.dataset.tab)});
  }
  modal.classList.add('open'); renderIALibrary('years');
}
function renderIALibrary(tab){
  const host=document.getElementById('ia-library-content'); if(!host)return;
  if(tab==='years'){
    host.innerHTML='<div class="ia-year-grid">'+Object.entries(IA_LIBRARY).map(([year,items])=>`<section class="ia-year-card"><h3>${year}</h3><div class="ia-topic-list">${items.map(([t,d])=>`<button class="ia-topic" data-topic="${t}"><strong>${t}</strong><span>${d}</span></button>`).join('')}</div></section>`).join('')+'</div>';
    host.querySelectorAll('.ia-topic').forEach(b=>b.onclick=()=>{const q=`Teach me ${b.dataset.topic} for Fiji Industrial Arts. Give a simple explanation, examples, practice questions and practical tips.`;document.getElementById('question-text').value=q;document.getElementById('ia-library-modal')?.remove();document.getElementById('question-text')?.scrollIntoView({behavior:'smooth'});document.getElementById('question-text')?.focus();});
  } else if(tab==='materials'){
    host.innerHTML='<div class="ia-material-grid">'+Object.entries(MATERIALS).map(([cat,items])=>`<section class="ia-material-card"><h3>${cat}</h3><ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul></section>`).join('')+'</div>';
  } else {
    host.innerHTML=`<section class="ia-exam-card"><h3>📝 Examination Centre</h3><p>Use official Ministry resources where permission and access allow. IA-Tutor also provides original exam-style practice and worked solutions without presenting copied copyrighted papers as original content.</p><div class="ia-exam-grid">${Object.keys(IA_LIBRARY).map(y=>`<button class="ia-exam-year"><strong>${y}</strong><span>Practice questions • Revision • Worked solutions</span></button>`).join('')}</div></section>`;
  }
}

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('open-industrial-arts')?.addEventListener('click',openIALibrary);});
window.IA_LIBRARY=IA_LIBRARY; window.MATERIALS=MATERIALS; window.openIALibrary=openIALibrary;
