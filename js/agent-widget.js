(() => {
  const style = document.createElement('style');
  style.textContent = `
    .agent-fab{position:fixed;right:22px;bottom:22px;z-index:1000;border:0;border-radius:999px;padding:14px 20px;background:linear-gradient(135deg,#0867d8,#5428d8);color:#fff;font-weight:800;box-shadow:0 14px 32px rgba(30,64,175,.3);cursor:pointer}.agent-fab:hover{transform:translateY(-2px)}
    .agent-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(7,25,52,.34);backdrop-filter:blur(2px);display:none;align-items:flex-start;justify-content:flex-end;padding:12px}.agent-backdrop.open{display:flex}
    .agent-window{width:min(510px,calc(100vw - 20px));height:min(760px,calc(100vh - 24px));margin-top:0;background:#fff;border:1px solid #d9e5f3;border-radius:8px;box-shadow:0 20px 60px rgba(15,46,88,.34);overflow:hidden;display:flex;flex-direction:column}
    .agent-head{padding:16px 18px;background:#050505;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px}.agent-head h2{margin:0;font-size:1.08rem}.agent-head p{margin:4px 0 0;font-size:.76rem;color:#cbd5e1}.agent-close{background:transparent;color:#fff;border:0;font-size:1.25rem;padding:4px 8px;cursor:pointer}
    .agent-body{padding:0;overflow:auto;display:flex;flex-direction:column;flex:1;background:#fff}.agent-context{margin:16px 16px 8px;padding:12px 14px;border:1px solid #e1e7ef;border-radius:14px;color:#334155;font-size:.82rem;line-height:1.45;background:#fbfdff}.agent-context b{color:#0f4f91}
    .agent-messages{min-height:160px;max-height:330px;overflow:auto;display:flex;flex-direction:column;gap:10px;padding:8px 16px 12px}.agent-msg{max-width:91%;padding:11px 13px;border-radius:14px;line-height:1.45;font-size:.9rem}.agent-msg.bot{align-self:flex-start;background:#f3f5f8;color:#27364a;border:1px solid #e3e8ef}.agent-msg.user{align-self:flex-end;background:#1267d9;color:#fff}
    .agent-question-card{margin:4px 16px 12px;border:1px solid #dfe5ed;border-radius:18px;padding:14px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.06)}.agent-question-label{font-weight:800;color:#1f2937;margin-bottom:8px}.agent-compose{display:flex;gap:8px;align-items:flex-end}.agent-compose textarea{width:100%;min-height:56px;max-height:150px;border:1px solid #cbd5e1;border-radius:12px;padding:11px;font:inherit;resize:vertical;outline:none}.agent-compose textarea:focus{border-color:#2878dc;box-shadow:0 0 0 3px rgba(40,120,220,.1)}.agent-send{background:#1267d9;color:#fff;border:0;border-radius:11px;padding:13px 16px;font-weight:800;cursor:pointer}.agent-send:disabled{opacity:.55}
    .agent-examples{margin:0 16px 14px}.agent-examples summary{cursor:pointer;font-weight:700;color:#334155;padding:6px 0}.agent-example-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:7px}.agent-example-list button{border:1px solid #d5e2ef;background:#fff;color:#1f466f;border-radius:999px;padding:7px 10px;font-size:.77rem;cursor:pointer}.agent-example-list button:hover{background:#f1f7ff}
    .agent-tabs{display:grid;grid-template-columns:1fr 1fr;padding:10px 16px;border-top:1px solid #e6ebf1;border-bottom:1px solid #e6ebf1;gap:8px}.agent-tab{background:#f4f7fb;color:#29415e;border:1px solid #dce6f1;border-radius:10px;padding:9px;font-weight:800;cursor:pointer}.agent-tab.active{background:#e8f2ff;color:#0756b5;border-color:#a9c9ee}.agent-panel{display:none}.agent-panel.active{display:block}
    .agent-attach{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:.78rem;color:#5b6b7f}.agent-attach input{max-width:100%;font-size:.75rem}.agent-status{font-size:.8rem;font-weight:700;color:#166534;min-height:18px;margin:6px 0}.agent-live{padding:14px 16px;display:flex;flex-direction:column;gap:10px}.agent-live label{font-weight:700;color:#17385e;font-size:.82rem}.agent-live input,.agent-live textarea{width:100%;box-sizing:border-box;border:1px solid #cbd8e7;border-radius:11px;padding:11px;font:inherit}.agent-live textarea{min-height:110px;resize:vertical}.agent-live button{background:#dc2626;color:#fff;border:0;border-radius:11px;padding:12px;font-weight:800;cursor:pointer}
    .human-escalation{display:none;margin:0 16px 12px;padding:13px;border-radius:14px;border:1px solid #fecaca;background:linear-gradient(135deg,#fff7f7,#fff1f2);color:#7f1d1d}.human-escalation.open{display:block}.human-escalation strong{display:block;margin-bottom:5px}.human-escalation p{margin:0 0 10px;font-size:.82rem;line-height:1.4}.human-escalation button{width:100%;background:#dc2626;color:#fff;border:0;border-radius:10px;padding:11px;font-weight:800;cursor:pointer}
    .agent-privacy{margin-top:auto;padding:11px 16px;background:#f8fafc;border-top:1px solid #e5e7eb;color:#64748b;font-size:.72rem;line-height:1.35;display:flex;gap:9px;align-items:flex-start}.agent-privacy .info{width:20px;height:20px;border-radius:50%;background:#e8eef7;color:#31547d;display:grid;place-items:center;font-weight:800;flex:0 0 auto}.agent-privacy a{color:#31547d;text-decoration:underline}
    @media(max-width:600px){.agent-backdrop{padding:6px}.agent-window{width:100%;height:calc(100vh - 12px);border-radius:12px}.agent-fab{right:12px;bottom:12px}}
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'agent-backdrop';
  backdrop.innerHTML = `
    <section class="agent-window" role="dialog" aria-modal="true" aria-label="IA-Tutor AI Assistant">
      <header class="agent-head"><div><h2>IA-Tutor Assistant</h2><p>AI help for Fiji Industrial Arts, Technical Drawing and CAD</p></div><button class="agent-close" type="button" aria-label="Close">✕</button></header>
      <div class="agent-body">
        <div class="agent-context"><b>Context-aware assistant</b><br>Ask about the current drawing, Year 9–13 Industrial Arts topics, textbook/workbook lessons, AutoCAD-style construction, or your worksheet. When opened from a lesson, the assistant uses that lesson as context.</div>
        <div class="agent-messages" id="agent-messages"><div class="agent-msg bot">Hello! I’m your IA-Tutor Assistant. Tell me what you are working on and I’ll guide you step by step.</div></div>
        <div class="human-escalation" id="human-escalation"><strong>🚨 AI could not confidently solve this.</strong><p>Your question needs human attention. I’ll prepare an urgent message for <b>Rohil Dass</b>.</p><button id="message-rohil" type="button">🚨 Message Rohil Dass — Urgent</button></div>
        <div class="agent-question-card">
          <div class="agent-question-label">Ask your question</div>
          <div class="agent-compose"><textarea id="agent-input" placeholder="Describe your question or paste the task here..."></textarea><button class="agent-send" id="agent-send" type="button">Send</button></div>
          <label class="agent-attach">📎 Attach a drawing/worksheet <input id="agent-attachment" type="file" accept="image/png,image/jpeg,image/jpg"></label>
        </div>
        <details class="agent-examples"><summary>Show examples</summary><div class="agent-example-list"><button type="button" data-q="Teach me this Year 9 Technical Drawing topic step by step.">Year 9 lesson</button><button type="button" data-q="Solve my technical drawing worksheet and explain the construction method.">Worksheet</button><button type="button" data-q="Explain how to construct this shape using CAD methods.">CAD construction</button><button type="button" data-q="Explain the difference between orthographic and isometric drawing.">Drawing theory</button></div></details>
        <div class="agent-tabs"><button class="agent-tab active" data-tab="ai" type="button">🤖 AI Agent</button><button class="agent-tab" data-tab="live" type="button">👨‍🏫 Human Help</button></div>
        <div class="agent-panel active" data-panel="ai"></div>
        <div class="agent-panel" data-panel="live"><div class="agent-live"><div class="agent-context">If AI cannot solve your question, use this form to send an urgent request to <b>Rohil Dass</b>. A connected support endpoint is required for actual delivery.</div><label>Name<input id="live-name" placeholder="Your name"></label><label>Question / Request<textarea id="live-message" placeholder="Describe what you need help with..."></textarea></label><button id="live-submit" type="button">🚨 Message Rohil Dass</button><p class="agent-status" id="live-status"></p></div></div>
        <div class="agent-privacy"><span class="info">i</span><span>Use this assistant for learning support. Do not enter passwords or other sensitive information. By continuing, you acknowledge the IA-Tutor privacy and support terms.</span></div>
      </div>
    </section>`;
  document.body.appendChild(backdrop);

  const existingFab = document.getElementById('floating-ai-button') || document.getElementById('hero-ai-button');
  if (existingFab) { existingFab.classList.add('agent-fab'); existingFab.textContent='🤖 AI Assistant'; existingFab.setAttribute('aria-label','Open IA-Tutor AI Assistant'); }
  else { const newFab=document.createElement('button'); newFab.className='agent-fab'; newFab.type='button'; newFab.textContent='🤖 AI Assistant'; document.body.appendChild(newFab); }
  const launcher = existingFab || document.querySelector('.agent-fab');
  const close = () => backdrop.classList.remove('open');
  launcher.addEventListener('click', () => backdrop.classList.add('open'));
  backdrop.querySelector('.agent-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  document.addEventListener('keydown', e => { if(e.key==='Escape') close(); });

  const switchTab = name => { backdrop.querySelectorAll('.agent-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name)); backdrop.querySelectorAll('.agent-panel').forEach(x=>x.classList.toggle('active',x.dataset.panel===name)); };
  backdrop.querySelectorAll('.agent-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  const messages=document.getElementById('agent-messages'), input=document.getElementById('agent-input'), sendButton=document.getElementById('agent-send'), escalation=document.getElementById('human-escalation');
  const liveName=document.getElementById('live-name'), liveMessage=document.getElementById('live-message'), liveStatus=document.getElementById('live-status'), attachment=document.getElementById('agent-attachment');
  let selectedFile=null;
  attachment.addEventListener('change',e=>{selectedFile=e.target.files?.[0]||null;if(selectedFile){input.placeholder=`Describe what you want me to analyse in ${selectedFile.name}...`;}});
  const looksUnresolved=reply=>/cannot|can't|unable|not able|not sure|don't know|no answer|could not|couldn't|need human|insufficient information/i.test(String(reply||''));
  const prepareHumanEscalation=question=>{escalation.classList.add('open');liveMessage.value=`URGENT — AI could not confidently solve this question.\n\nStudent question:\n${question}`;switchTab('live');};
  const send=async()=>{
    const q=input.value.trim(); if(!q&&!selectedFile)return;
    const display=q||(selectedFile?`Please analyse this drawing: ${selectedFile.name}`:''); const user=document.createElement('div');user.className='agent-msg user';user.textContent=display;messages.appendChild(user);input.value='';messages.scrollTop=messages.scrollHeight;sendButton.disabled=true;escalation.classList.remove('open');
    const bot=document.createElement('div');bot.className='agent-msg bot';bot.textContent='Thinking…';messages.appendChild(bot);messages.scrollTop=messages.scrollHeight;
    try{
      let response;
      if(selectedFile){const fd=new FormData();fd.append('image',selectedFile);fd.append('message',q||'Analyse this Industrial Arts drawing and explain the solution step by step.');fd.append('context','Fiji Industrial Arts Technical Drawing');response=await fetch('/api/analyze-drawing',{method:'POST',body:fd});}
      else response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,context:'Fiji Industrial Arts Technical Drawing'})});
      if(!response.ok)throw new Error('AI endpoint unavailable');const data=await response.json();const reply=data.reply||data.message||data.analysis||'';bot.textContent=reply||'I could not return a reliable answer.';
      if(data.escalate_to_human===true||data.needs_human===true||looksUnresolved(reply)||!reply)prepareHumanEscalation(display);
      selectedFile=null;attachment.value='';input.placeholder='Describe your question or paste the task here...';
    }catch(e){bot.textContent='I could not reliably solve this question right now.';prepareHumanEscalation(display);}finally{sendButton.disabled=false;messages.scrollTop=messages.scrollHeight;}
  };
  sendButton.addEventListener('click',send);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  backdrop.querySelectorAll('.agent-example-list button').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q;input.focus();}));
  document.getElementById('message-rohil').addEventListener('click',()=>{switchTab('live');liveMessage.focus();liveStatus.style.color='#991b1b';liveStatus.textContent='Urgent message prepared for Rohil Dass. Press “Message Rohil Dass” to send.';});
  document.getElementById('live-submit').addEventListener('click',async()=>{const name=liveName.value.trim(),message=liveMessage.value.trim();if(!name||!message){liveStatus.style.color='#b91c1c';liveStatus.textContent='Please enter your name and question.';return;}const payload={name,message,recipient:'Rohil Dass',priority:'URGENT',source:'IA-Tutor human escalation',timestamp:new Date().toISOString()};liveStatus.textContent='Sending urgent message…';try{const response=await fetch('/api/human-support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!response.ok)throw new Error('support endpoint unavailable');liveStatus.textContent='✅ Urgent message sent to Rohil Dass.';}catch(e){liveStatus.style.color='#9a3412';liveStatus.textContent='⚠️ Message prepared, but the human-support endpoint is not connected yet.';window.dispatchEvent(new CustomEvent('iaTutorLiveAgentRequest',{detail:payload}));}});
})();