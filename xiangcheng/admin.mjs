import {GRADE_NAMES,QUESTION_OPTIONS,makeConfigurationSQL} from './admin-config.mjs';
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
function dirty(){sql.value='';status.textContent='设置已更改，请重新生成 SQL。';}
grades.addEventListener('change',dirty);questions.addEventListener('input',dirty);questions.addEventListener('change',dirty);
document.querySelector('#generate').addEventListener('click',()=>{
  try {
    const selectedGrades=[...grades.querySelectorAll('input:checked')].map(e=>Number(e.value));
    const selectedTasks=[...questions.querySelectorAll('.question')].filter(row=>row.querySelector('input[name=question]').checked).map(row=>({id:row.querySelector('input[name=question]').value,minutes:Number(row.querySelector('input[name=minutes]').value)}));
    const version='xc_'+crypto.randomUUID().replaceAll('-','');
    sql.value=makeConfigurationSQL(selectedGrades,selectedTasks,version);
    status.textContent=`已生成：${selectedGrades.length} 个年级、${selectedTasks.length} 道题，总限时 ${selectedTasks.reduce((n,t)=>n+t.minutes,0)} 分钟。请复制到腾讯云执行后生效。`;
  } catch(e) {sql.value='';status.textContent=e.message;}
});
document.querySelector('#copy').addEventListener('click',async()=>{
  if(!sql.value){status.textContent='请先选择年级和题目，再生成 SQL。';return;}
  try{await navigator.clipboard.writeText(sql.value);status.textContent='已复制。请到腾讯云 SQL 编辑器粘贴并执行，执行成功后设置才生效。';}
  catch{sql.focus();sql.select();status.textContent='请手动复制选中的 SQL，然后到腾讯云 SQL 编辑器执行。';}
});
