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
  const h=harness([0,1,0,2,1]);
  assert.deepEqual([h.newAssignment(5).condition,h.newAssignment(5).condition,h.newAssignment(5).condition],['initial_only','ai_socratic','ai_feedback']);
  const x=harness([1,1]).newAssignment(5);assert.equal(x.first_stage,'ai');assert.equal(x.second_stage,'ai_feedback');assert.equal(x.method,'browser_two_stage_random_v1');
  const y=harness([0]).newAssignment(5);assert.equal(y.first_stage,'control');assert.equal(y.second_stage,'not_applicable');
  h.setTasks([bunny,{id:'anchor_2983',type:'text',mins:3}]);h.setState(state('initial_only'));
  h.advanceCollaborationPhase(bunny);
  const s=h.getState(),a=s.answers.human_ai_bunny;
  assert.equal(s.current,1);assert.equal(a.initialSnapshot.selectedIdea,'软软的兔子');
  assert.equal(a.finalStatus,'not_applicable');assert.equal(a.finalAnswer,'');
  assert.equal(h.hasResponse(bunny,a),true);
  const row=h.rowData();assert.equal(row.human_ai_bunny_final_status,'not_applicable');
  assert.equal(row.human_ai_bunny_response,'');assert.equal(row.ai_prompt_version,'');
});

test('新版提示词严格匹配确认文本，旧会话保持各自版本',async()=>{
  const approved={"ai_socratic": "你是面向【学生实际年级】学生的苏格拉底式创造性思维伙伴，帮助学生改进毛绒兔玩具。你的主要任务是持续追问，而不是给出评价或替学生设计。每次先理解学生刚说的内容，必要时用一句简短的话回应，然后紧扣该内容提出一个具体、开放的问题；学生继续回答后，再根据新回答提出下一个问题，直到学生自行结束讨论。每轮只问一个问题，不重复已问过的问题，也不要一次列出多个问题。可根据对话需要追问：想法的用途和使用者、与常见玩具的不同、其他可能、选择的理由；每次只选一个方面，不必按固定顺序。学生说不知道时，将问题换成更简单、更容易回答的问题。学生直接询问事实或安全问题时，先简短回答，再用一个问题引导其思考；如果要求你直接生成方案或替他选择，应通过问题引导他自己决定。尊重学生结束对话的意愿。不要代写最终方案，不索要个人信息；语言友好、适合该年级，每次不超过140个汉字。", "ai_feedback": "你是面向【学生实际年级】学生的创造性思维伙伴，帮助学生改进毛绒兔玩具。你的主要任务是针对学生刚说的具体内容给出反馈，而不是持续提问。每次指出学生方案中一个可以辨认的功能、用途、实现方式或细节，说明它的特点、可能的不足或需要注意的地方，并给出一条与该内容直接相关的改进建议。反馈可以关注新颖性、使用价值、实现方式、安全或细节，每轮只聚焦一两个相关方面，不必每次面面俱到。说明判断的原因，不只说“很好”或“更有创意”，也不要编造学生没有说过的内容；无法确认的技术和安全问题不要说得过于肯定。学生提问时直接回答，并结合其方案给出反馈。不主动提出追问，不要求学生逐一回答问题；不代写可以直接提交的完整方案，最终决定由学生自己作出。不要索要个人信息；语言友好、适合该年级，每次不超过140个汉字。"};
  const cases=[
    ['ai_socratic',null,'bunny_socratic_v1_20261110','不机械连续追问'],
    ['ai_feedback',null,'bunny_feedback_v3_20261110','给出简短、具体的反馈'],
    ['ai_socratic','bunny_socratic_v2_20261110','bunny_socratic_v2_20261110','实现方式、使用安全'],
    ['ai_feedback','bunny_feedback_v4_20261110','bunny_feedback_v4_20261110','你的主要任务是针对学生'],
    ['ai_socratic','bunny_socratic_v3_20261110','bunny_socratic_v3_20261110',null],
    ['ai_feedback','bunny_feedback_v5_20261110','bunny_feedback_v5_20261110',null]
  ];
  for(const [group,version,expectedVersion,fragment] of cases) {
    const h=harness();h.setTasks([bunny]);const s=state(group);s.meta.aiPromptVersion=version;s.answers.human_ai_bunny.phase=2;h.setState(s);
    let prompt='';h.setCloud(()=>({ai:()=>({createModel:()=>({generateText:async({messages})=>{prompt=messages[0].content;return {text:'你可以考虑安全。你觉得呢？你还能怎么做？'}}})})}));
    await h.sendAiMessage();
    const chat=h.getState().answers.human_ai_bunny.chat;
    assert.equal(chat.length,2);assert.equal(chat[1].promptVersion,expectedVersion);
    assert.equal(h.rowData().ai_prompt_version,expectedVersion);
    if(fragment) assert.ok(prompt.includes(fragment));
    else assert.equal(prompt,approved[group].replace('【学生实际年级】','五年级'));
    if(group==='ai_socratic')assert.equal((chat[1].content.match(/？/g)||[]).length,1);
    else assert.doesNotMatch(chat[1].content,/？/);
  }
});
