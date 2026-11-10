const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function harness(){
  const html=fs.readFileSync(path.join(__dirname,'../xiangcheng/index.html'),'utf8');
  let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function fiveArmAssignment'));
  assert.ok(script);
  script=script.replace('  // 教师预览复用真实题目和渲染函数',`window.testApi={fiveArmAssignment,begin,setState:s=>{state=s},getState:()=>state,setTasks:t=>{tasks=t},setGradeConfig:c=>{gradeConfig=c},advanceCollaborationPhase,renderCollaboration,rowData,sendAiMessage,setCloud:fn=>{getCloudApp=fn},quiet:()=>{save=()=>{};render=()=>{};finish=()=>{};toast=()=>{};show=()=>{};startTimer=()=>{}}};return;\n  // 教师预览复用真实题目和渲染函数`);
  const elements={chatInput:{value:'我不知道怎么开始'}};
  const stored=new Map(),localStorage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
  const context={window:{location:{search:''},crypto:{randomUUID:()=>'a1111111-1111-4111-8111-111111111111'}},localStorage,document:{getElementById:id=>elements[id]||null,querySelectorAll:()=>[]},Uint32Array,Set,Date,Math,JSON,Number,String,Array,Object,console,clearTimeout,setTimeout};
  vm.runInNewContext(script,context);
  context.window.testApi.quiet();
  context.window.testApi.setInput=(id,value)=>{elements[id]={value}};
  context.window.testApi.setElement=(id,value)=>{elements[id]=value};
  return context.window.testApi;
}
const bunny={id:'human_ai_bunny',type:'collaboration',mins:20};
function state(code){
  const assignment=harness().fiveArmAssignment({group_code:code,block_number:0,block_slot:1});
  return {meta:{studentId:'T',grade:'5',classCode:'1',instrumentVersion:'creativity_assessment_xiangcheng_five_arm_v1',aiPromptVersion:assignment.condition==='ai_socratic'?'bunny_socratic_focused_v1_20261110':assignment.condition==='ai_feedback'?'bunny_feedback_focused_v1_20261110':'',gradeConfigVersion:'v1',assessmentTasks:[bunny]},answers:{human_ai_bunny:{initialIdeas:[''],selectedIdea:'',chat:[],phase:1}},taskStarted:{},taskDeadline:{},taskSeconds:{human_ai_bunny:10},current:0,condition:assignment.condition,assignment,startedAt:'2026-01-01T00:00:00Z'};
}
test('五个组正确映射AI时机和回应方式，异常分配结果被拒绝',()=>{
  const h=harness(),expected=[['control','initial_only','none'],['early_socratic','ai_socratic','before_draft'],['early_feedback','ai_feedback','before_draft'],['late_socratic','ai_socratic','after_draft'],['late_feedback','ai_feedback','after_draft']];
  for(const [code,condition,timing] of expected){const a=h.fiveArmAssignment({group_code:code,block_number:0,block_slot:1});assert.equal(a.condition,condition);assert.equal(a.ai_timing,timing);assert.equal(a.group_code,code)}
  assert.throws(()=>h.fiveArmAssignment({group_code:'unknown',block_number:0,block_slot:0}),/随机分组结果无效/);
});
test('学生开始时通过云端分组，同一学生的重试复用令牌',async()=>{
  const h=harness(),calls=[];h.setGradeConfig({version:'xc_v1',allowed_grades:[5],assessment_tasks:[bunny]});
  h.setInput('studentId','T1');h.setInput('grade','5');h.setInput('classCode','1');h.setElement('consent',{checked:true});h.setElement('begin',{disabled:false});
  h.setCloud(()=>({rdb:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{group_code:'early_socratic',block_number:1,block_slot:0},error:null}}})}));
  await h.begin();await h.begin();
  assert.equal(calls.length,2);assert.equal(calls[0].name,'creativity_xc_allocate_five_arm_20261110');assert.equal(calls[0].args.p_client_token,calls[1].args.p_client_token);
  assert.equal(h.getState().assignment.group_code,'early_socratic');assert.equal(h.getState().assignment.ai_timing,'before_draft');
});
test('第一轮AI组从对话构思进入最终方案，初稿明确标为AI可用阶段',()=>{
  for(const code of ['early_socratic','early_feedback']){
    const h=harness(),s=state(code);s.answers.human_ai_bunny.selectedIdea='能讲故事';s.answers.human_ai_bunny.chat=[{role:'user',content:'我想让兔子讲故事'}];
    h.setTasks([bunny,{id:'anchor_2983',type:'text',mins:3}]);h.setState(s);
    const area={innerHTML:'',querySelectorAll:()=>[]};h.renderCollaboration(area,bunny);assert.match(area.innerHTML,/讨论与构思/);assert.match(area.innerHTML,/chatInput/);
    h.advanceCollaborationPhase(bunny);assert.equal(s.answers.human_ai_bunny.phase,3);assert.equal(s.answers.human_ai_bunny.initialSnapshot.initialType,'ai_available');
    s.answers.human_ai_bunny.finalAnswer='会讲故事的兔子';const row=h.rowData();assert.equal(row.assignment_five_arm_group,code);assert.equal(row.assignment_ai_timing,'before_draft');assert.equal(row.human_ai_bunny_initial_type,'ai_available');assert.equal(row.human_ai_bunny_analysis_outcome,'会讲故事的兔子');
  }
});
test('新版第一轮AI两组不设初稿，对话后填写最终方案并进入自我评价',()=>{
  for(const code of ['early_socratic','early_feedback']){
    const h=harness(),s=state(code);s.meta.instrumentVersion='creativity_assessment_xiangcheng_five_arm_v2';h.setTasks([bunny]);h.setState(s);
    const area={innerHTML:'',querySelectorAll:()=>[]};h.renderCollaboration(area,bunny);assert.match(area.innerHTML,/结束讨论，进入最终方案/);assert.doesNotMatch(area.innerHTML,/我的初步方案|id="selectedIdea"/);
    h.advanceCollaborationPhase(bunny);assert.equal(s.answers.human_ai_bunny.phase,1);
    s.answers.human_ai_bunny.chat=[{role:'user',content:'我想让兔子讲故事'}];h.advanceCollaborationPhase(bunny);assert.equal(s.answers.human_ai_bunny.phase,3);assert.equal(s.answers.human_ai_bunny.initialSnapshot,null);
    h.renderCollaboration(area,bunny);assert.match(area.innerHTML,/形成最终方案/);assert.doesNotMatch(area.innerHTML,/本页不会显示初步构思/);
    s.answers.human_ai_bunny.finalAnswer='会讲故事的兔子';h.advanceCollaborationPhase(bunny);assert.equal(s.answers.human_ai_bunny.phase,4);
    const row=h.rowData();assert.equal(row.human_ai_bunny_initial_status,'not_applicable');assert.equal(row.human_ai_bunny_initial_type,'not_applicable');assert.equal(row.human_ai_bunny_selected_idea,'');assert.equal(row.human_ai_bunny_response,'会讲故事的兔子');
  }
});
test('新版独立初稿组流程保持独立构思',()=>{
  for(const code of ['late_socratic','late_feedback','control']){
    const h=harness(),s=state(code);s.meta.instrumentVersion='creativity_assessment_xiangcheng_five_arm_v2';s.answers.human_ai_bunny.selectedIdea='更柔软';h.setTasks([bunny,{id:'anchor_2983',type:'text',mins:3}]);h.setState(s);h.advanceCollaborationPhase(bunny);
    assert.equal(s.answers.human_ai_bunny.initialSnapshot.initialType,'independent');assert.equal(h.rowData().human_ai_bunny_initial_status,'answered');
    assert.equal(s.answers.human_ai_bunny.phase,code==='control'?1:2);
  }
});
test('独立初稿后AI组先锁定独立初稿再对话，控制组只保留一个答案',()=>{
  for(const code of ['late_socratic','late_feedback','control']){
    const h=harness(),s=state(code);s.answers.human_ai_bunny.selectedIdea='更柔软';h.setTasks([bunny,{id:'anchor_2983',type:'text',mins:3}]);h.setState(s);h.advanceCollaborationPhase(bunny);
    assert.equal(s.answers.human_ai_bunny.initialSnapshot.initialType,'independent');
    if(code==='control'){const row=h.rowData();assert.equal(row.human_ai_bunny_final_status,'not_applicable');assert.equal(row.human_ai_bunny_response,'');assert.equal(row.human_ai_bunny_analysis_outcome,'更柔软');assert.equal(row.human_ai_bunny_analysis_outcome_source,'independent_only')}
    else assert.equal(s.answers.human_ai_bunny.phase,2);
  }
});
test('第一轮可以先向AI发消息，提示词和审查均聚焦玩具；偏题回复被替换',async()=>{
  for(const code of ['early_socratic','early_feedback']){
    const h=harness(),s=state(code),calls=[];h.setTasks([bunny]);h.setState(s);
    h.setCloud(()=>({ai:()=>({createModel:()=>({generateText:async arg=>{calls.push(arg.messages);return {text:calls.length===1?'我们来谈谈今天的天气。':'REJECT'}}})})}));
    await h.sendAiMessage();assert.equal(s.answers.human_ai_bunny.chat.length,2);
    assert.match(calls[0][0].content,/始终围绕本题的毛绒玩具改造展开对话/);assert.match(calls[0][1].content,/尚未提交初稿/);
    assert.match(calls[1][0].content,/候选回复必须与本题毛绒玩具的改造有关/);
    const reply=s.answers.human_ai_bunny.chat[1];assert.match(reply.content,/毛绒玩具/);assert.equal(reply.used_safe_fallback,true);assert.equal(reply.phase,1);assert.equal(reply.ai_timing,'before_draft');
  }
});
test('反馈组笼统夸奖未通过审查时重试，保留针对想法的反馈',async()=>{
  const h=harness(),s=state('early_feedback'),calls=[];h.setTasks([bunny]);h.setState(s);h.setInput('chatInput','我想让兔子讲故事');
  const results=['讲故事很有趣，很有创意。','REJECT','讲故事能让兔子在陪伴时多一种交流方式，想法中的故事内容还需要明确。','ALLOW'];
  h.setCloud(()=>({ai:()=>({createModel:()=>({generateText:async arg=>{calls.push(arg.messages);return {text:results.shift()}}})})}));
  await h.sendAiMessage();assert.equal(calls.length,4);assert.match(calls[1][0].content,/没有解释具体原因/);
  const reply=s.answers.human_ai_bunny.chat[1];assert.match(reply.content,/交流方式/);assert.equal(reply.used_safe_fallback,false);assert.equal(reply.rejected_response_count,1);
});
