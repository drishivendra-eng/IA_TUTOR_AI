(() => {
  const state = { year: '9', subject: 'Basic Technology' };

  const styles = `
  .ia-assistant{position:fixed;right:22px;bottom:22px;width:min(430px,calc(100vw - 28px));max-height:min(720px,calc(100vh - 44px));z-index:9999;background:#fff;border:1px solid #dbe5f4;border-radius:22px;box-shadow:0 20px 55px rgba(15,45,90,.22);display:none;overflow:hidden;font-family:Arial,sans-serif}
  .ia-assistant.open{display:flex;flex-direction:column}
  .ia-assistant-head{background:#07152d;color:#fff;padding:16px 18px;display:flex;align-items:center;justify-content:space-between}
  .ia-assistant-title{font-size:19px;font-weight:800}.ia-assistant-sub{font-size:12px;opacity:.75;margin-top:3px}.ia-assistant-close{border:0;background:transparent;color:#fff;font-size:25px;cursor:pointer}
  .ia-assistant-body{padding:16px;overflow:auto;background:#f8fbff}.ia-assistant-context{display:flex;gap:8px;margin-bottom:12px}.ia-assistant-context select{flex:1;border:1px solid #ccd9ec;border-radius:10px;padding:9px;background:#fff}
  .ia-assistant-chat{min-height:250px;max-height:470px;overflow:auto;margin:12px 0}.ia-msg{padding:11px 13px;border-radius:14px;margin:8px 0;line-height:1.45;font-size:14px}.ia-msg.bot{background:#fff;border:1px solid #e0e8f3}.ia-msg.user{background:#e9f2ff;margin-left:32px}
  .ia-assistant-input{display:flex;gap:8px}.ia-assistant-input textarea{flex:1;min-height:62px;resize:vertical;border:1px solid #cbd9ea;border-radius:12px;padding:11px}.ia-assistant-send{border:0;border-radius:12px;padding:0 15px;background:#2167e8;color:#fff;font-weight:800;cursor:pointer}
  .ia-assistant-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.ia-assistant-actions button{border:1px solid #ccd9ec;background:#fff;border-radius:10px;padding:9px 11px;cursor:pointer;font-weight:700}.ia-human{border-color:#efb34d!important;background:#fff8e9!important}
  .ia-assistant-fab{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:30px;padding:15px 20px;background:linear-gradient(135deg,#245ee8,#4930d7);color:#fff;font-weight:800;font-size:15px;box-shadow:0 12px 28px rgba(39,74,190,.3);cursor:pointer}
  .ia-solution-panel{margin-top:14px;padding:16px;border:1px solid #d7e3f1;border-radius:18px;background:linear-gradient(180deg,#f8fbff,#fff);box-shadow:0 8px 24px rgba(20,55,95,.07)}
  .ia-solution-panel h3{margin:0 0 5px;color:#0b3768}.ia-solution-panel p{margin:0 0 12px;color:#52677e;font-size:13px;line-height:1.4}
  .ia-solution-drop{display:block;border:2px dashed #72a9e8;border-radius:14px;padding:17px;text-align:center;background:#fff;cursor:pointer}.ia-solution-drop:hover{background:#f1f7ff}.ia-solution-drop input{display:none}.ia-solution-file{font-size:12px;color:#46627f;margin-top:7px;word-break:break-word}
  .ia-solution-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ia-solution-actions button{border:0;border-radius:11px;padding:11px 14px;font-weight:800;cursor:pointer}.ia-solution-primary{background:#2167e8;color:#fff}.ia-solution-clear{background:#edf2f7;color:#243b53}.ia-solution-status{min-height:20px;margin-top:9px;font-size:13px;font-weight:700;color:#315a83}.ia-solution-result{display:none;margin-top:12px;padding:12px;border-radius:12px;background:#f5f9ff;border:1px solid #d8e6f6;white-space:pre-wrap;line-height:1.45;font-size:13px}.ia-solution-result.open{display:block}
  @media(max-width:600px){.ia-assistant{right:8px;bottom:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.ia-assistant-fab{right:12px;bottom:12px}}
  `;

  const root = document.createElement('div');
  root.innerHTML = `<style>${styles}</style>
  <button class="ia-assistant-fab" id="ia-assistant-fab">🤖 AI Tutor</button>
  <aside class="ia-assistant" id="ia-assistant" aria-label="IA-Tutor Assistant">
    <header class="ia-assistant-head"><div><div class="ia-assistant-title">IA-Tutor Assistant</div><div class="ia-assistant-sub">Fiji Industrial Arts • Textbook & Workbook Tutor</div></div><button class="ia-assistant-close" id="ia-assistant-close" aria-label="Close">×</button></header>
    <div class="ia-assistant-body">
      <div class="ia-assistant-context"><select id="ia-year"><option>9</option><option>10</option><option>11</option><option>12</option><option>13</option></select><select id="ia-subject"><option>Basic Technology</option><option>Basic Graphics Technology</option><option>Technical Drawing</option><option>Applied Technology</option></select></div>
      <div class="ia-assistant-chat" id="ia-chat"><div class="ia-msg bot">Hello! I’m your IA-Tutor Assistant. Ask me a question about your Industrial Arts lesson, textbook or workbook. Uploads for solving are kept in the separate Solution Workspace on the main page.</div></div>
      <div class="ia-assistant-input"><textarea id="ia-question" placeholder="Ask your question… e.g. Teach me Year 9 geometric construction."></textarea><button class="ia-assistant-send" id="ia-send">Send</button></div>
      <div class="ia-assistant-actions"><button id="ia-example">Show examples</button><button class="ia-human" id="ia-human">👨‍🏫 Ask Rohil Dass</button></div>
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

  async function ask(text){
    if(!text) return;
    add(text,'user'); add('Thinking…');
    try{
      const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,year:state.year,subject:state.subject,sourcePriority:'Year textbook and workbook first'})});
      if(!r.ok) throw new Error('chat endpoint unavailable');
      const data=await r.json();
      const msgs=document.querySelectorAll('#ia-chat .ia-msg'); if(msgs.length) msgs[msgs.length-1].remove();
      add(data.answer||data.reply||data.message||'I could not return a reliable answer.');
      if(data.source_reference) add(`Source: ${data.source_reference}`);
      if(data.needs_human) add('👨‍🏫 This question may need human support. Use “Ask Rohil Dass”.');
    }catch(err){
      const msgs=document.querySelectorAll('#ia-chat .ia-msg'); if(msgs.length) msgs[msgs.length-1].remove();
      add('The AI chat service is not available right now. Please try again.');
    }
  }
  $('ia-send').onclick=()=>{const t=$('ia-question').value.trim();$('ia-question').value='';ask(t)};
  $('ia-question').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('ia-send').click();}});
  $('ia-example').onclick=()=>{ $('ia-question').value=`Teach me ${state.subject} from Year ${state.year} using the textbook/workbook and give me a practice question.`; $('ia-question').focus(); };
  $('ia-human').onclick=()=>{ const q=$('ia-question').value.trim()||'Student requests help from Rohil Dass.'; add('👨‍🏫 Human support requested for Rohil Dass.','bot'); window.dispatchEvent(new CustomEvent('iaTutorHumanEscalation',{detail:{year:state.year,subject:state.subject,question:q}})); };

  // Separate Solution Workspace on the main page. The chat popup intentionally has no file uploader.
  function addSolutionWorkspace(){
    if(document.getElementById('ia-solution-panel')) return;
    const anchor=document.querySelector('.upload-card');
    if(!anchor) return;
    const panel=document.createElement('section');
    panel.className='ia-solution-panel'; panel.id='ia-solution-panel';
    panel.innerHTML=`<h3>🖥️ Solution Workspace</h3><p>Upload a student question here for AI analysis and AutoCAD-style solution generation. Supported: image, PDF, Word document, DWG and DXF.</p><label class="ia-solution-drop" for="ia-solution-file"><input id="ia-solution-file" type="file" accept="image/png,image/jpeg,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.dwg,.dxf">📁 <strong>Choose question / drawing / document</strong><div class="ia-solution-file" id="ia-solution-file-name">JPG • PNG • PDF • DOC • DOCX • DWG • DXF</div></label><div class="ia-solution-actions"><button class="ia-solution-primary" id="ia-solution-analyse" disabled>🤖 Analyse & Solve</button><button class="ia-solution-clear" id="ia-solution-clear">Clear</button></div><div class="ia-solution-status" id="ia-solution-status"></div><div class="ia-solution-result" id="ia-solution-result"></div>`;
    anchor.insertAdjacentElement('afterend',panel);
    const fileInput=$('ia-solution-file'), analyse=$('ia-solution-analyse'), clear=$('ia-solution-clear'), status=$('ia-solution-status'), result=$('ia-solution-result'), fileName=$('ia-solution-file-name');
    let file=null;
    fileInput.onchange=()=>{file=fileInput.files?.[0]||null; analyse.disabled=!file; fileName.textContent=file?`${file.name} • ${(file.size/1024/1024).toFixed(2)} MB`:'JPG • PNG • PDF • DOC • DOCX • DWG • DXF';status.textContent=file?'Ready to analyse.':'';};
    clear.onclick=()=>{file=null;fileInput.value='';analyse.disabled=true;fileName.textContent='JPG • PNG • PDF • DOC • DOCX • DWG • DXF';status.textContent='';result.classList.remove('open');result.textContent='';};
    analyse.onclick=async()=>{
      if(!file)return;
      analyse.disabled=true;status.textContent='Analysing file…';result.classList.remove('open');
      try{
        const fd=new FormData();
        fd.append('year',state.year);fd.append('subject',state.subject);fd.append('sourcePriority','Year textbook and workbook first');fd.append('question','Analyse this student submission. Identify the question, read all visible information, use the selected Industrial Arts source context, give the step-by-step solution, and generate CAD construction instructions where applicable. Do not invent unreadable dimensions.');
        const isImage=/^image\//i.test(file.type);
        fd.append(isImage?'image':'file',file);
        const endpoint=isImage?'/api/analyze-drawing':'/api/ai-tutor';
        const r=await fetch(endpoint,{method:'POST',body:fd});
        if(!r.ok)throw new Error(`Endpoint unavailable (${r.status})`);
        const data=await r.json();
        const answer=data.answer||data.reply||data.message||data.analysis||'No solution was returned.';
        result.textContent=answer+(data.source_reference?`\n\nSource: ${data.source_reference}`:'')+(data.cad_instruction?`\n\nCAD: ${data.cad_instruction}`:'');result.classList.add('open');status.textContent='✅ Analysis completed. The CAD solution area can now use the returned construction data.';
        window.dispatchEvent(new CustomEvent('iaTutorSolutionReady',{detail:{data,file,year:state.year,subject:state.subject}}));
      }catch(err){status.textContent='⚠️ The file was selected, but the required analysis service is not connected or could not read this file yet. The file has not been discarded.';result.textContent='For images use the drawing-analysis service; PDF/Word/CAD files require the document-analysis service to parse their contents.';result.classList.add('open');}
      finally{analyse.disabled=false;}
    };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addSolutionWorkspace); else setTimeout(addSolutionWorkspace,0);
})();