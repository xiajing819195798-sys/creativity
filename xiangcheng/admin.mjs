import {GRADE_NAMES,QUESTION_OPTIONS,makeConfigurationSQL,validateSelection,parseSavedConfiguration} from './admin-config.mjs';
const PARENT_ORIGIN='https://rabbit-review-yincheng-20261030.shia.chatgpt.site';
const embedded=new URLSearchParams(location.search).get('embedded')==='1' && window.parent!==window;
if(embedded)document.body.classList.add('embedded');
const grades=document.querySelector('#grades'),questions=document.querySelector('#questions'),sql=document.querySelector('#sql'),status=document.querySelector('#status');
GRADE_NAMES.forEach((name,i)=>{
  const label=document.createElement('label');label.className='grade';
  const input=document.createElement('input');input.type='checkbox';input.value=String(i+1);input.name='grade';
  const text=document.createElement('span');text.textContent=name;label.append(input,text);grades.append(label);
});
QUESTION_OPTIONS.forEach(q=>{
  const row=document.createElement('div');row.className='question';
  const label=document.createElement('label');label.className='question-name';
  const input=document.createElement('input');input.type='checkbox';input.checked=q.id!=='ice_cream_melting';input.name='question';input.value=q.id;
  const position=document.createElement('span');position.className='question-position';
  const text=document.createElement('span');text.textContent=q.name;label.append(input,position,text);
  const minutes=document.createElement('label');minutes.className='minutes';minutes.append(document.createTextNode('倒计时'));
  const number=document.createElement('input');number.type='number';number.min='1';number.max='180';number.step='1';number.value=String(q.minutes);number.name='minutes';number.setAttribute('aria-label',q.name+'倒计时分钟数');
  const controls=document.createElement('div');controls.className='order-controls';
  for(const [direction,labelText] of [['up','上移'],['down','下移']]){
    const button=document.createElement('button');button.type='button';button.className='order-button';button.dataset.direction=direction;button.textContent=labelText;button.setAttribute('aria-label',labelText+q.name);
    button.addEventListener('click',()=>{
      const selected=[...questions.querySelectorAll('.question')].filter(r=>r.querySelector('input[name=question]').checked);
      const index=selected.indexOf(row),other=selected[index+(direction==='up'?-1:1)];
      if(!other)return;
      questions.insertBefore(row,direction==='up'?other:other.nextSibling);
      dirty();
      (button.disabled?row.querySelector(`[data-direction=${direction==='up'?'down':'up'}]`):button).focus();
    });
    controls.append(button);
  }
  minutes.append(number,document.createTextNode('分钟'));row.append(label,minutes,controls);questions.append(row);
});
const previewSelect=document.querySelector('#preview-target'),previewFrame=document.querySelector('#student-preview');
const saveButton=document.querySelector('#save-config'),embeddedStatus=document.querySelector('#embedded-status');
let edited=false,editRevision=0,pending=null;
function selectedGrades(){return [...grades.querySelectorAll('input:checked')].map(e=>Number(e.value));}
function applySavedPlan(plan){
  const gradeSet=new Set(plan.grades);
  for(const checkbox of grades.querySelectorAll('input[name=grade]'))checkbox.checked=gradeSet.has(Number(checkbox.value));
  const rows=[...questions.querySelectorAll('.question')],byId=new Map(rows.map(row=>[row.querySelector('input[name=question]').value,row]));
  const ids=new Set(plan.tasks.map(t=>t.id));
  for(const row of rows)row.querySelector('input[name=question]').checked=ids.has(row.querySelector('input[name=question]').value);
  for(const task of plan.tasks){const row=byId.get(task.id);row.querySelector('input[name=minutes]').value=String(task.minutes);questions.append(row);}
  for(const row of rows)if(!ids.has(row.querySelector('input[name=question]').value))questions.append(row);
  syncPreview();
}
function selectedTasks(){
  return [...questions.querySelectorAll('.question')].filter(row=>row.querySelector('input[name=question]').checked).map(row=>({id:row.querySelector('input[name=question]').value,minutes:Number(row.querySelector('input[name=minutes]').value)}));
}
function updateOrderControls(){
  const rows=[...questions.querySelectorAll('.question')],selected=rows.filter(row=>row.querySelector('input[name=question]').checked);
  for(const row of rows){
    const index=selected.indexOf(row),chosen=index!==-1;
    row.querySelector('.question-position').textContent=chosen?`${index+1}.`:'';
    row.querySelector('[data-direction=up]').disabled=!chosen||index===0;
    row.querySelector('[data-direction=down]').disabled=!chosen||index===selected.length-1;
  }
}
function syncPreview(){
  updateOrderControls();
  const tasks=selectedTasks(),old=previewSelect.value;
  const options=[];
  for(const t of tasks){
    const q=QUESTION_OPTIONS.find(x=>x.id===t.id);
    if(t.id==='human_ai_bunny'){
      options.push({id:t.id,phase:1,condition:'initial_only',label:q.name+' · 控制组独立构思'},
        {id:t.id,phase:1,condition:'ai_socratic',timing:'before_draft',label:q.name+' · 第一轮苏格拉底对话'},
        {id:t.id,phase:1,condition:'ai_feedback',timing:'before_draft',label:q.name+' · 第一轮反馈对话'},
        {id:t.id,phase:1,condition:'ai_socratic',timing:'after_draft',label:q.name+' · AI组独立初稿'},
        {id:t.id,phase:2,condition:'ai_socratic',timing:'after_draft',label:q.name+' · 独立构思后苏格拉底对话'},
        {id:t.id,phase:2,condition:'ai_feedback',timing:'after_draft',label:q.name+' · 独立构思后反馈对话'},
        {id:t.id,phase:3,condition:'ai_feedback',timing:'before_draft',label:q.name+' · 第一轮 AI 组最终方案'},
        {id:t.id,phase:3,condition:'ai_feedback',timing:'after_draft',label:q.name+' · 初稿后 AI 组最终方案'},
        {id:t.id,phase:4,condition:'ai_feedback',label:q.name+' · 自我评价'});
    } else if(t.id==='ice_cream_melting'){
      for(const [phase,label] of [[1,'提出想法'],[2,'选择与完善方案'],[3,'条件变化与调整'],[4,'重新理解问题']])options.push({id:t.id,phase,condition:'initial_only',label:q.name+' · '+label});
    } else options.push({id:t.id,phase:1,condition:'initial_only',label:q.name});
  }
  previewSelect.replaceChildren();
  for(const o of options){const option=document.createElement('option');option.value=`${o.id}|${o.phase}|${o.condition}|${o.timing||'after_draft'}`;option.textContent=o.label;previewSelect.append(option);}
  if(options.some(o=>`${o.id}|${o.phase}|${o.condition}|${o.timing||'after_draft'}`===old))previewSelect.value=old;
  if(!options.length){const option=document.createElement('option');option.textContent='请先选择题目';option.value='';previewSelect.append(option);}
  const [id,phase,condition,timing]=previewSelect.value.split('|');
  const index=tasks.findIndex(t=>t.id===id);
  previewFrame.contentWindow?.postMessage({type:'xc-preview-plan',tasks,index,phase:Number(phase),condition,timing},window.location.origin);
  if(window.parent!==window)window.parent.postMessage({type:'xiangcheng:question-plan',tasks},'https://rabbit-review-yincheng-20261030.shia.chatgpt.site');
}
window.addEventListener('message',event=>{
  if(event.origin===window.location.origin&&event.source===previewFrame.contentWindow&&event.data?.type==='xc-preview-ready')syncPreview();
  if(!embedded || event.origin!==PARENT_ORIGIN || event.source!==window.parent || !event.data || typeof event.data!=='object')return;
  if(event.data.type==='xiangcheng:request-plan'){syncPreview();return;}
  if(event.data.type==='xiangcheng:load-config'){
    if(edited || pending){embeddedStatus.textContent='已保留当前未保存的修改，未覆盖为后台设置。';return;}
    try{const plan=parseSavedConfiguration(event.data.config);if(plan){applySavedPlan(plan);embeddedStatus.textContent=plan.isOpen?'已载入当前施测设置。':'已载入当前设置，施测尚未开放。';}else embeddedStatus.textContent='尚无已保存的施测设置，请先选择并应用。';}
    catch{embeddedStatus.textContent='后台施测设置格式无效，请联系管理员核查。';}
    return;
  }
  if(event.data.type!=='xiangcheng:config-result' || !pending || event.data.requestId!==pending.id || typeof event.data.ok!=='boolean')return;
  clearTimeout(pending.timer);saveButton.disabled=false;
  const snapshot=pending;pending=null;
  if(!event.data.ok){embeddedStatus.textContent=typeof event.data.message==='string'?event.data.message.slice(0,500):'保存未完成，请检查连接后重试。';return;}
  try{
    const plan=parseSavedConfiguration(event.data.config);
    if(!plan || JSON.stringify(plan.grades)!==JSON.stringify(snapshot.plan.grades) || JSON.stringify(plan.tasks)!==JSON.stringify(snapshot.plan.tasks))throw new Error('保存结果不一致');
    if(editRevision===snapshot.revision){edited=false;embeddedStatus.textContent='设置已保存并应用。';}
    else embeddedStatus.textContent='先前的设置已保存；你之后的修改尚未保存。';
  }catch{embeddedStatus.textContent='后台返回的设置与提交内容不一致，请核查后再施测。';}
});
previewSelect.addEventListener('change',syncPreview);
function dirty(){edited=true;editRevision++;sql.value='';status.textContent='设置已更改，请重新生成 SQL。';if(embedded)embeddedStatus.textContent='设置已更改，尚未保存。';syncPreview();}
previewFrame.addEventListener('load',syncPreview);
if(window.parent!==window){
  const reportHeight=()=>window.parent.postMessage({type:'xiangcheng:frame-height',height:Math.ceil(document.querySelector('.shell').getBoundingClientRect().height)+32},'https://rabbit-review-yincheng-20261030.shia.chatgpt.site');
  new ResizeObserver(reportHeight).observe(document.querySelector('.shell'));
  window.addEventListener('load',reportHeight);
}
syncPreview();
if(embedded)window.parent.postMessage({type:'xiangcheng:request-config'},PARENT_ORIGIN);
saveButton.addEventListener('click',()=>{
  if(!embedded || pending)return;
  try{
    const plan=validateSelection(selectedGrades(),selectedTasks());
    const requestId=crypto.randomUUID();
    const timer=setTimeout(()=>{if(pending?.id===requestId){pending=null;saveButton.disabled=false;embeddedStatus.textContent='保存状态未确认，请检查后台状态后再试。';}},30000);
    pending={id:requestId,revision:editRevision,plan,timer};
    saveButton.disabled=true;embeddedStatus.textContent='正在保存施测设置……';
    window.parent.postMessage({type:'xiangcheng:save-config',requestId,grades:plan.grades,tasks:plan.tasks},PARENT_ORIGIN);
  }catch(e){embeddedStatus.textContent=e.message;}
});
grades.addEventListener('change',dirty);questions.addEventListener('input',dirty);questions.addEventListener('change',event=>{
  if(event.target.name==='question'){
    const row=event.target.closest('.question');
    const firstUnchecked=[...questions.querySelectorAll('.question')].find(r=>!r.querySelector('input[name=question]').checked);
    if(event.target.checked&&firstUnchecked)questions.insertBefore(row,firstUnchecked);
    else questions.append(row);
  }
  dirty();
});
document.querySelector('#generate').addEventListener('click',()=>{
  try {
    const gradeValues=selectedGrades();
    const selectedPlan=selectedTasks();
    const version='xc_'+crypto.randomUUID().replaceAll('-','');
    sql.value=makeConfigurationSQL(gradeValues,selectedPlan,version);
    status.textContent=`已生成：${gradeValues.length} 个年级、${selectedPlan.length} 道题，总限时 ${selectedPlan.reduce((n,t)=>n+t.minutes,0)} 分钟。请复制到腾讯云执行后生效。`;
  } catch(e) {sql.value='';status.textContent=e.message;}
});
document.querySelector('#copy').addEventListener('click',async()=>{
  if(!sql.value){status.textContent='请先选择年级和题目，再生成 SQL。';return;}
  try{await navigator.clipboard.writeText(sql.value);status.textContent='已复制。请到腾讯云 SQL 编辑器粘贴并执行，执行成功后设置才生效。';}
  catch{sql.focus();sql.select();status.textContent='请手动复制选中的 SQL，然后到腾讯云 SQL 编辑器执行。';}
});
