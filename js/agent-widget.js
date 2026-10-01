(() => {
  const style = document.createElement('style');
  style.textContent = `
    .agent-fab{position:fixed;right:22px;bottom:22px;z-index:1000;border:0;border-radius:999px;padding:14px 20px;background:linear-gradient(135deg,#0867d8,#5428d8);color:#fff;font-weight:800;box-shadow:0 14px 32px rgba(30,64,175,.3);cursor:pointer}
    .agent-fab:hover{transform:translateY(-2px)}
    .agent-backdrop{position:fixed;inset:0;z-index:1100;background:rgba(7,25,52,.42);backdrop-filter:blur(4px);display:none;align-items:flex-end;justify-content:flex-end;padding:22px}
    .agent-backdrop.open{display:flex}
    .agent-window{width:min(430px,calc(100vw - 24px));max-height:min(720px,calc(100vh - 44px));background:#fff;border:1px solid #d9e5f3;border-radius:24px;box-shadow:0 24px 70px rgba(15,46,88,.28);overflow:hidden;display:flex;flex-direction:column}
    .agent-head{padding:18px 20px;background:linear-gradient(110deg,#0874dc,#4c22c8);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:12px}.agent-head h2{margin:0;font-size:1.1rem}.agent-head p{margin:4px 0 0;font-size:.78rem;opacity:.9}.agent-close{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:10px;padding:7px 10px;cursor:pointer}
    .agent-tabs{display:grid;grid-template-columns:1fr 1fr;padding:10px;border-bottom:1px solid #e2e8f0;gap:8px}.agent-tab{background:#f4f7fb;color:#29415e;border:1px solid #dce6f1;border-radius:10px;padding:10px;font-weight:800;cursor:pointer}.agent-tab.active{background:#e8f2ff;color:#0756b5;border-color:#a9c9ee}
    .agent-body{padding:16px;overflow:auto}.agent-panel{display:none}.agent-panel.active{display:block}.agent-messages{min-height:240px;max-height:350px;overflow:auto;display:flex;flex-direction:column;gap:10px;margin-bottom:12px}.agent-msg{max-width:88%;padding:10px 12px;border-radius:14px;line-height:1.45;font-size:.9rem}.agent-msg.bot{align-self:flex-start;background:#edf5ff;color:#17385e}.agent-msg.user{align-self:flex-end;background:#0b67d8;color:#fff}.agent-compose{display:flex;gap:8px}.agent-compose textarea,.agent-live input,.agent-live textarea{width:100%;border:1px solid #cbd8e7;border-radius:11px;padding:11px;font:inherit;resize:vertical}.agent-compose textarea{min-height:48px}.agent-send{background:#0b67d8;color:#fff;border:0;border-radius:11px;padding:0 15px;font-weight:800;cursor:pointer}.agent-quick{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.agent-quick button{border:1px solid #d5e2ef;background:#fff;color:#1f466f;border-radius:999px;padding:7px 10px;font-size:.78rem;cursor:pointer}.agent-live{display:flex;flex-direction:column;gap:10px}.agent-live label{font-weight:700;color:#17385e;font-size:.82rem}.agent-live textarea{min-height:110px}.agent-live button{background:#0b67d8;color:#fff;border:0;border-radius:11px;padding:12px;font-weight:800;cursor:pointer}.agent-note{font-size:.76rem;color:#6b7d91;margin:0}.agent-status{font-size:.8rem;font-weight:700;color:#166534;min-height:18px}.agent-context{padding:9px 11px;border-radius:10px;background:#f7fbff;border:1px solid #dce9f5;color:#536a83;font-size:.78rem;margin-bottom:10px}
    @media(max-width:600px){.agent-backdrop{padding:10px}.agent-window{width:100%;max-height:calc(100vh - 20px)}}
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'agent-backdrop';
  backdrop.innerHTML = `
    <section class="agent-window" role="dialog" aria-modal="true" aria-label="IA-Tutor support">
      <header class="agent-head"><div><h2>🤖 IA-Tutor Support</h2><p>Technical Drawing & Industrial Arts help</p></div><button class="agent-close" type="button" aria-label="Close">✕</button></header>
      <nav class="agent-tabs"><button class="agent-tab active" data-tab="ai" type="button">🤖 Ask AI Agent</button><button class="agent-tab" data-tab="live" type="button">👨‍🏫 Ask a Live Agent</button></nav>
      <div class="agent-body">
        <div class="agent-panel active" data-panel="ai">
          <div class="agent-context">Ask about Technical Drawing, AutoCAD-style construction, orthographic views, dimensions, Industrial Arts topics, or your current question.</div>
          <div class="agent-messages" id="agent-messages"><div class="agent-msg bot">Hello! I’m your IA-Tutor AI Agent. What Industrial Arts question can I help you solve?</div></div>
          <div class="agent-quick"><button type="button" data-q="How do I start an orthographic drawing?">Orthographic</button><button type="button" data-q="Explain the AutoCAD construction steps.">AutoCAD steps</button><button type="button" data-q="Help me with my Technical Drawing question.">My question</button></div>
          <div class="agent-compose"><textarea id="agent-input" placeholder="Type your question..."></textarea><button class="agent-send" id="agent-send" type="button">Send</button></div>
        </div>
        <div class="agent-panel" data-panel="live">
          <div class="agent-context">Send a request to a teacher/support person. Your request stays in this app until a live-support channel is connected.</div>
          <div class="agent-live"><label>Name<input id="live-name" placeholder="Your name" /></label><label>Question / Request<textarea id="live-message" placeholder="Describe what you need help with..."></textarea></label><button id="live-submit" type="button">📨 Request Live Agent</button><p class="agent-status" id="live-status"></p><p class="agent-note">For a real-time live chat, connect this form to your preferred support service or your app's backend endpoint.</p></div>
        </div>
      </div>
    </section>`;
  document.body.appendChild(backdrop);

  const fab = document.getElementById('floating-ai-button') || document.getElementById('hero-ai-button');
  if (fab) { fab.classList.add('agent-fab'); fab.textContent='🤖 AI Agent'; fab.setAttribute('aria-label','Open AI Agent and live agent support'); }
  else { const newFab=document.createElement('button'); newFab.className='agent-fab'; newFab.type='button'; newFab.textContent='🤖 AI Agent'; document.body.appendChild(newFab); }
  const launcher = fab || document.querySelector('.agent-fab');
  const close = () => backdrop.classList.remove('open');
  launcher.addEventListener('click', () => backdrop.classList.add('open'));
  backdrop.querySelector('.agent-close').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });

  backdrop.querySelectorAll('.agent-tab').forEach(tab => tab.addEventListener('click', () => {
    backdrop.querySelectorAll('.agent-tab').forEach(x=>x.classList.toggle('active',x===tab));
    backdrop.querySelectorAll('.agent-panel').forEach(x=>x.classList.toggle('active',x.dataset.panel===tab.dataset.tab));
  }));

  const messages = document.getElementById('agent-messages');
  const input = document.getElementById('agent-input');
  const send = () => {
    const q = input.value.trim(); if(!q) return;
    const user = document.createElement('div'); user.className='agent-msg user'; user.textContent=q; messages.appendChild(user); input.value=''; messages.scrollTop=messages.scrollHeight;
    const bot = document.createElement('div'); bot.className='agent-msg bot'; bot.textContent='Thinking…'; messages.appendChild(bot); messages.scrollTop=messages.scrollHeight;
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q,context:'Fiji Industrial Arts Technical Drawing'})})
      .then(r=>r.ok?r.json():Promise.reject(new Error('AI endpoint unavailable')))
      .then(data=>{bot.textContent=data.reply||data.message||'I received your question, but no answer was returned.';})
      .catch(()=>{bot.textContent='I can help with Technical Drawing, orthographic projection, dimensions and AutoCAD-style construction. If you need a specific answer, enter the full question and I’ll use the drawing solver when possible.';});
  };
  send.addEventListener('click',send); input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
  backdrop.querySelectorAll('.agent-quick button').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q;input.focus();}));

  document.getElementById('live-submit').addEventListener('click',()=>{
    const name=document.getElementById('live-name').value.trim(); const message=document.getElementById('live-message').value.trim(); const status=document.getElementById('live-status');
    if(!name||!message){status.style.color='#b91c1c';status.textContent='Please enter your name and question.';return;}
    status.style.color='#166534'; status.textContent='Live-agent request prepared. Connect your support endpoint to send it automatically.';
    const payload={name,message,source:'IA-Tutor live agent request',timestamp:new Date().toISOString()};
    window.dispatchEvent(new CustomEvent('iaTutorLiveAgentRequest',{detail:payload}));
  });
})();
