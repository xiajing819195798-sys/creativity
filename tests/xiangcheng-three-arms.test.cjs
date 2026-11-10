const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function harness(randomValues=[0]) {
  const html=fs.readFileSync(path.join(__dirname,'../xiangcheng/index.html'),'utf8');
  let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function assignmentInfo'));
  assert.ok(script);
  script=script.replace('  // 教师预览复用真实题目和渲染函数', `
    window.testApi={setState:s=>{state=s},getState:()=>state,setTasks:t=>{tasks=t},newAssignment,advanceCollaborationPhase,hasResponse,rowData,
      setCloud:fn=>{getCloudApp=fn},sendAiMessage,quiet:()=>{save=()=>{};render=()=>{};finish=()=>{};capture=()=>{}}};
    return;
  // 教师预览复用真实题目和渲染函数`);
  const elements={chatInput:{value:'你觉得我的设计怎么样？'}};
  const context={window:{location:{search:''},crypto:{getRandomValues:a=>{a[0]=randomValues.shift()??0;return a}}},document:{getElementById:id=>elements[id]||null,querySelectorAll:()=>[]},Uint32Array,Set,Date,Math,JSON,Number,String,Array,Object,console,clearTimeout:()=>{},setTimeout:()=>0};
  vm.runInNewContext(script,context);
  context.window.testApi.quiet();
  return context.window.testApi;
}
const bunny={id:'human_ai_bunny',type:'collaboration',mins:20};
test('纸盒题不再是学生端可选任务',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../xiangcheng/index.html'),'utf8');
  const config=fs.readFileSync(path.join(__dirname,'../xiangcheng/admin-config.mjs'),'utf8');
  assert.doesNotMatch(html,/id:"aut_box_transfer"/);
  assert.doesNotMatch(config,/aut_box_transfer/);
});
function state(condition) {return {meta:{studentId:'T1',grade:'5',classCode:'1',instrumentVersion:'creativity_assessment_xiangcheng_three_arm_v2',gradeConfigVersion:'v1',assessmentTasks:[bunny]},answers:{human_ai_bunny:{initialIdeas:['软软的兔子','会唱歌的兔子'],selectedIdea:'软软的兔子',chat:[],phase:1,phaseStartElapsed:0}},taskStarted:{},taskDeadline:{},taskSeconds:{human_ai_bunny:10},current:0,condition,startedAt:'2026-01-01T00:00:00Z'};}

test('随机分配可进入三组，初稿组无伪造终稿',()=>{
  const h=harness([0,1,2]);
  assert.deepEqual([h.newAssignment(5).condition,h.newAssignment(5).condition,h.newAssignment(5).condition],['initial_only','ai_socratic','ai_feedback']);
  h.setTasks([bunny,{id:'anchor_2983',type:'text',mins:3}]);h.setState(state('initial_only'));
  h.advanceCollaborationPhase(bunny);
  const s=h.getState(),a=s.answers.human_ai_bunny;
  assert.equal(s.current,1);assert.equal(a.initialSnapshot.selectedIdea,'软软的兔子');
  assert.equal(a.finalStatus,'not_applicable');assert.equal(a.finalAnswer,'');
  assert.equal(h.hasResponse(bunny,a),true);
  const row=h.rowData();assert.equal(row.human_ai_bunny_final_status,'not_applicable');
  assert.equal(row.human_ai_bunny_response,'');assert.equal(row.ai_prompt_version,'');
});

test('两种 AI 提示词与回复版本分别保存',async()=>{
  for(const [group,expected] of [['ai_socratic','bunny_socratic_v1_20261110'],['ai_feedback','bunny_feedback_v3_20261110']]) {
    const h=harness();h.setTasks([bunny]);const s=state(group);s.answers.human_ai_bunny.phase=2;h.setState(s);
    let prompt='';h.setCloud(()=>({ai:()=>({createModel:()=>({generateText:async({messages})=>{prompt=messages[0].content;return {text:'你可以考虑安全。你觉得呢？'}}})})}));
    await h.sendAiMessage();
    const chat=h.getState().answers.human_ai_bunny.chat;
    assert.equal(chat.length,2);assert.equal(chat[1].promptVersion,expected);
    if(group==='ai_socratic'){assert.match(prompt,/问题/);assert.match(chat[1].content,/？/)}
    else {assert.match(prompt,/具体的反馈/);assert.doesNotMatch(chat[1].content,/？/)}
  }
});
