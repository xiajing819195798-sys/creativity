const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {pathToFileURL}=require('node:url');

test('设置顺序在配置、学生端任务与导出代码中保持一致',async()=>{
  const config=await import(pathToFileURL(path.join(__dirname,'../xiangcheng/admin-config.mjs')));
  const plan=[{id:'human_ai_bunny',minutes:20},{id:'aut_cup',minutes:8},{id:'anchor_illustration_titles',minutes:5}];
  assert.deepEqual(config.validateSelection([4],plan).tasks,plan);
  const sql=config.makeConfigurationSQL([4],plan,'xc_0123456789abcdef0123456789abcdef');
  assert.ok(sql.includes(JSON.stringify(plan)));

  const html=fs.readFileSync(path.join(__dirname,'../xiangcheng/index.html'),'utf8');
  let script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function applyTaskPlan'));
  assert.ok(script);
  script=script.replace('  // 教师预览复用真实题目和渲染函数',`window.orderTest={applyTaskPlan,getTasks:()=>tasks};return;\n  // 教师预览复用真实题目和渲染函数`);
  const context={window:{location:{search:''}},document:{getElementById:()=>null},Set,Date,Math,JSON,Number,String,Array,Object,console,clearTimeout:()=>{},setTimeout:()=>0};
  vm.runInNewContext(script,context);
  context.window.orderTest.applyTaskPlan(plan);
  const studentPlan=Array.from(context.window.orderTest.getTasks(),t=>({id:t.id,minutes:t.mins}));
  assert.deepEqual(studentPlan,plan);
});
