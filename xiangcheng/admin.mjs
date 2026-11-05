import {GRADE_NAMES,QUESTION_OPTIONS,makeConfigurationSQL} from './admin-config.mjs';
if(new URLSearchParams(location.search).get('embedded')==='1')document.body.classList.add('embedded');
const grades=document.querySelector('#grades'),questions=document.querySelector('#questions'),sql=document.querySelector('#sql'),status=document.querySelector('#status');
GRADE_NAMES.forEach((name,i)=>{
  const label=document.createElement('label');label.className='grade';
  const input=document.createElement('input');input.type='checkbox';input.value=String(i+1);input.name='grade';
  const text=document.createElement('span');text.textContent=name;label.append(input,text);grades.append(label);
});
QUESTION_OPTIONS.forEach(q=>{
  const row=document.createElement('div');row.className='question';
  const label=document.createElement('label');label.className='question-name';
  const input=document.createElement('input');input.type='checkbox';input.checked=true;input.name='question';input.value=q.id;
  const text=document.createElement('span');text.textContent=q.name;label.append(input,text);
  const minutes=document.createElement('label');minutes.className='minutes';minutes.append(document.createTextNode('倒计时'));
  const number=document.createElement('input');number.type='number';number.min='1';number.max='180';number.step='1';number.value=String(q.minutes);number.name='minutes';number.setAttribute('aria-label',q.name+'倒计时分钟数');
  minutes.append(number,document.createTextNode('分钟'));row.append(label,minutes);questions.append(row);
});
const previewSelect=document.querySelector('#preview-target'),previewFrame=document.querySelector('#student-preview');
function selectedTasks(){
  return [...questions.querySelectorAll('.question')].filter(row=>row.querySelector('input[name=question]').checked).map(row=>({id:row.querySelector('input[name=question]').value,minutes:Number(row.querySelector('input[name=minutes]').value)}));
}
function syncPreview(){
  const tasks=selectedTasks(),old=previewSelect.value;
  const options=[];
  for(const t of tasks){
    const q=QUESTION_OPTIONS.find(x=>x.id===t.id);
    if(t.id==='human_ai_bunny'){
      options.push({id:t.id,phase:1,condition:'ai',label:q.name+' · 初稿'},
        {id:t.id,phase:2,condition:'ai',label:q.name+' · AI 对话'},
        {id:t.id,phase:2,condition:'reflection',label:q.name+' · 引导反思'},
        {id:t.id,phase:3,condition:'ai',label:q.name+' · AI / 反思组终稿'},
        {id:t.id,phase:3,condition:'control',label:q.name+' · 控制组终稿'},
        {id:t.id,phase:4,condition:'ai',label:q.name+' · 自我评价'});
    } else options.push({id:t.id,phase:1,condition:'ai',label:q.name});
  }
  previewSelect.replaceChildren();
  for(const o of options){const option=document.createElement('option');option.value=`${o.id}|${o.phase}|${o.condition}`;option.textContent=o.label;previewSelect.append(option);}
  if(options.some(o=>`${o.id}|${o.phase}|${o.condition}`===old))previewSelect.value=old;
  if(!options.length){const option=document.createElement('option');option.textContent='请先选择题目';option.value='';previewSelect.append(option);}
  const [id,phase,condition]=previewSelect.value.split('|');
  const index=tasks.findIndex(t=>t.id===id);
  previewFrame.contentWindow?.postMessage({type:'xc-preview-plan',tasks,index,phase:Number(phase),condition},window.location.origin);
  if(window.parent!==window)window.parent.postMessage({type:'xiangcheng:question-plan',tasks},'https://rabbit-review-yincheng-20261030.shia.chatgpt.site');
}
window.addEventListener('message',event=>{
  if(event.origin===window.location.origin&&event.source===previewFrame.contentWindow&&event.data?.type==='xc-preview-ready')syncPreview();
  if(event.origin==='https://rabbit-review-yincheng-20261030.shia.chatgpt.site'&&event.source===window.parent&&event.data?.type==='xiangcheng:request-plan')syncPreview();
});
previewSelect.addEventListener('change',syncPreview);
function dirty(){sql.value='';status.textContent='设置已更改，请重新生成 SQL。';syncPreview();}
previewFrame.addEventListener('load',syncPreview);
if(window.parent!==window){
  const reportHeight=()=>window.parent.postMessage({type:'xiangcheng:frame-height',height:Math.ceil(document.querySelector('.shell').getBoundingClientRect().height)+32},'https://rabbit-review-yincheng-20261030.shia.chatgpt.site');
  new ResizeObserver(reportHeight).observe(document.querySelector('.shell'));
  window.addEventListener('load',reportHeight);
}
syncPreview();
grades.addEventListener('change',dirty);questions.addEventListener('input',dirty);questions.addEventListener('change',dirty);
document.querySelector('#generate').addEventListener('click',()=>{
  try {
    const selectedGrades=[...grades.querySelectorAll('input:checked')].map(e=>Number(e.value));
    const selectedPlan=selectedTasks();
    const version='xc_'+crypto.randomUUID().replaceAll('-','');
    sql.value=makeConfigurationSQL(selectedGrades,selectedPlan,version);
    status.textContent=`已生成：${selectedGrades.length} 个年级、${selectedPlan.length} 道题，总限时 ${selectedPlan.reduce((n,t)=>n+t.minutes,0)} 分钟。请复制到腾讯云执行后生效。`;
  } catch(e) {sql.value='';status.textContent=e.message;}
});
document.querySelector('#copy').addEventListener('click',async()=>{
  if(!sql.value){status.textContent='请先选择年级和题目，再生成 SQL。';return;}
  try{await navigator.clipboard.writeText(sql.value);status.textContent='已复制。请到腾讯云 SQL 编辑器粘贴并执行，执行成功后设置才生效。';}
  catch{sql.focus();sql.select();status.textContent='请手动复制选中的 SQL，然后到腾讯云 SQL 编辑器执行。';}
});
