(() => {
  const state = { file: null, year: '9', subject: 'Basic Technology' };

  const styles = `
  .ia-assistant{position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 28px));max-height:min(720px,calc(100vh - 44px));z-index:9999;background:#fff;border:1px solid #dbe5f4;border-radius:22px;box-shadow:0 20px 55px rgba(15,45,90,.22);display:none;overflow:hidden;font-family:Arial,sans-serif}
  .ia-assistant.open{display:flex;flex-direction:column}
  .ia-assistant-head{background:#07152d;color:#fff;padding:16px 18px;display:flex;align-items:center;justify-content:space-between}
  .ia-assistant-title{font-size:19px;font-weight:800}.ia-assistant-sub{font-size:12px;opacity:.75;margin-top:3px}
  .ia-assistant-close{border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}
  .ia-assistant-body{padding:16px;overflow:auto;background:#f8fbff}
  .ia-assistant-context{display:flex;gap:8px;margin-bottom:12px}.ia-assistant-context select{flex:1;border:1px solid #ccd9ec;border-radius:10px;padding:9px;background:#fff}
  .ia-assistant-drop{border:2px dashed #a9c8ec;border-radius:15px;padding:16px;text-align:center;background:#fff;cursor:pointer}.ia-assistant-drop.drag{background:#eef6ff}
  .ia-assistant-drop input{display:none}.ia-assistant-file{font-size:12px;color:#46627f;margin-top:7px}
  .ia-assistant-chat{min-height:180px;max-height:320px;overflow:auto;margin:12px 0}.ia-msg{padding:11px 13px;border-radius:14px;margin:8px 0;line-height:1.45;font-size:14px}.ia-msg.bot{background:#fff;border:1px solid #e0e8f3}.ia-msg.user{background:#e9f2ff;margin-left:32px}
  .ia-assistant-input{display:flex;gap:8px}.ia-assistant-input textarea{flex:1;min-height:62px;resize:vertical;border:1px solid #cbd9ea;border-radius:12px;padding:11px}.ia-assistant-send{border:0;border-radius:12px;padding:0 15px;background:#2167e8;color:#fff;font-weight:800;cursor:pointer}
  .ia-assistant-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.ia-assistant-actions button{border:1px solid #ccd9ec;background:#fff;border-radius:10px;padding:9px 11px;cursor:pointer;font-weight:700}.ia-human{border-color:#efb34d!important;background:#fff8e9!important}
  .ia-assistant-fab{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:30px;padding:15px 20px;background:linear-gradient(135deg,#245ee8,#4930d7);color:#fff;font-weight:800;font-size:15px;box-shadow:0 12px 28px rgba(39,74,190,.3);cursor:pointer}
  `;

  const root = document.createElement('div');
  root.innerHTML = `<style>${styles}</style>
  <button class="ia-assistant-fab" id="ia-assistant-fab">🤖 AI Tutor</button>
  <aside class="ia-assistant" id="ia-assistant" aria-label="IA-Tutor Assistant">
    <header class="ia-assistant-head"><div><div class="ia-assistant-title">IA-Tutor Assistant</div><div class="ia-assistant-sub">Fiji Industrial Arts • Textbook & Workbook Tutor</div></div><button class="ia-assistant-close" id="ia-assistant-close" aria-label="Close">×</button></header>
    <div class="ia-assistant-body">
      <div class="ia-assistant-context"><select id="ia-year"><option>9</option><option>10</option><option>11</option><option>12</option><option>13</option></select><select id="ia-subject"><option>Basic Technology</option><option>Basic Graphics Technology</option><option>Technical Drawing</option><option>Applied Technology</option></select></div>
      <label class="ia-assistant-drop" id="ia-drop"><input id="ia-file" type="file" accept="image/png,image/jpeg,image/jpg,application/pdf">📎 <strong>Attach worksheet, textbook page or drawing</strong><div class="ia-assistant-file" id="ia-file-name">Click or drag a file here</div></label>
      <div class="ia-assistant-chat" id="ia-chat"><div class="ia-msg bot">Ask me to explain a topic, solve a worksheet, or analyse a photo. I will use the selected Year and subject source context first.</div></div>
      <div class="ia-assistant-input"><textarea id="ia-question" placeholder="Ask your question… e.g. Solve this Year 9 geometric construction."></textarea><button class="ia-assistant-send" id="ia-send">Send</button></div>
      <div class="ia-assistant-actions"><button id="ia-example">Show examples</button><button id="ia-solve-photo">Analyse uploaded drawing</button><button class="ia-human" id="ia-human">👨‍🏫 Ask Rohil Dass</button></div>
    </div>
  </aside>`;
  document.body.appendChild(root);

  const $ = id => document.getElementById(id);
  function add(text, type='bot'){ const d=document.createElement('div'); d.className=`ia-msg ${type}`; d.textContent=text; $('ia-chat').appendChild(d); $('ia-chat').scrollTop=$('ia-chat').scrollHeight; }
  function open(){ $('ia-assistant').classList.add('open'); }
  $('ia-assistant-fab').onclick=open;
  $('ia-assistant-close').onclick=()=> $('ia-assistant').classList.remove('open');
  $('ia-year').onchange=e=>state.year=e.target.value;
  $('ia-subject').onchange=e=>state.subject=e.target.value;

  const drop=$('ia-drop'), input=$('ia-file');
  drop.onclick=()=>input.click();
  input.onchange=()=>{ state.file=input.files?.[0]||null; $('ia-file-name').textContent=state.file?`${state.file.name} • ${(state.file.size/1024/1024).toFixed(2)} MB`:'Click or drag a file here'; };
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));
  drop.addEventListener('drop',e=>{state.file=e.dataTransfer.files?.[0]||null; if(state.file){ $('ia-file-name').textContent=state.file.name; }});

  async function ask(text, withFile=false){
    if(!text && !state.file) return;
    if(text) add(text,'user');
    add('Analysing your question using the selected Industrial Arts source…');
    try{
      const fd=new FormData(); fd.append('question',text||'Analyse the uploaded worksheet/drawing and solve it.'); fd.append('year',state.year); fd.append('subject',state.subject); fd.append('sourcePriority','Year textbook and workbook first'); if(state.file) fd.append('file',state.file);
      const r=await fetch('/api/ai-tutor',{method:'POST',body:fd});
      if(!r.ok) throw new Error(`AI Tutor endpoint unavailable (${r.status})`);
      const data=await r.json();
      document.querySelectorAll('.ia-msg').item(document.querySelectorAll('.ia-msg').length-1)?.remove();
      add(data.answer||data.message||'The AI Tutor returned no answer. Please try again with a clearer question or image.');
      if(data.source_reference) add(`Source: ${data.source_reference}`);
      if(data.needs_retake) add(`📷 Please retake the image: ${data.retake_reason||'some required information is not readable.'}`);
    }catch(err){
      document.querySelectorAll('.ia-msg').item(document.querySelectorAll('.ia-msg').length-1)?.remove();
      add('I cannot complete the AI analysis from this request yet. Please use a clearer image or enter the question as text. The uploaded file has not been discarded.');
    }
  }
  $('ia-send').onclick=()=>{const t=$('ia-question').value.trim();$('ia-question').value='';ask(t)};
  $('ia-solve-photo').onclick=()=>ask('Analyse the uploaded drawing/worksheet. Identify the Year '+state.year+' topic, read all visible dimensions and instructions, then give the source-based step-by-step solution and CAD construction instructions.',true);
  $('ia-example').onclick=()=>add(`Example: “Teach me ${state.subject} from Year ${state.year} and then give me a practice question.”`,'user');
  $('ia-human').onclick=()=>{ add('Human support requested. Preparing an urgent message to Rohil Dass with the student question and available attachment.','bot'); window.dispatchEvent(new CustomEvent('iaTutorHumanEscalation',{detail:{year:state.year,subject:state.subject,question:$('ia-question').value,file:state.file}})); };
})();
