export const GRADE_NAMES = ['一年级','二年级','三年级','四年级','五年级','六年级','初一','初二','初三','高一','高二','高三'];
export const QUESTION_OPTIONS = [
  {id:'anchor_illustration_titles',name:'插图标题',minutes:5},
  {id:'anchor_2983',name:'数字故事：2983',minutes:6},
  {id:'aut_cup',name:'纸杯的新用途',minutes:3},
  {id:'human_ai_bunny',name:'改进毛绒兔玩具',minutes:20},
];

export function makeConfigurationSQL(grades, tasks, version) {
  if (!Array.isArray(grades) || !grades.length || grades.some(n=>!Number.isInteger(n)||n<1||n>12) || new Set(grades).size!==grades.length) throw new Error('请至少选择一个年级。');
  if (!Array.isArray(tasks) || !tasks.length || tasks.length>QUESTION_OPTIONS.length) throw new Error('请至少选择一道题目。');
  const known=new Set(QUESTION_OPTIONS.map(q=>q.id)), seen=new Set();
  for (const t of tasks) {
    if (!t || !known.has(t.id) || seen.has(t.id) || !Number.isInteger(t.minutes) || t.minutes<1 || t.minutes>180) throw new Error('题目与限时设置无效，每题须为 1—180 分钟的整数。');
    seen.add(t.id);
  }
  if (typeof version!=='string' || !/^xc_[a-f0-9]{32}$/.test(version)) throw new Error('配置版本生成失败，请刷新重试。');
  const json=JSON.stringify(tasks.map(t=>({id:t.id,minutes:t.minutes})));
  return `-- 苏州相城小学施测设置：仅修改该校配置，不修改学生作答。\n-- 执行前请确认本批次尚未开始；修改设置会阻止旧配置下的未完成作答继续提交。\nBEGIN;\nALTER TABLE public.creativity_config_xiangcheng_202611\n  ADD COLUMN IF NOT EXISTS assessment_tasks jsonb;\nINSERT INTO public.creativity_config_xiangcheng_202611\n  (config_key, version, allowed_grades, assessment_tasks, is_open, updated_at)\nVALUES\n  ('xiangcheng_202611', '${version}', ARRAY[${grades.join(',')}]::smallint[], '${json}'::jsonb, true, now())\nON CONFLICT (config_key) DO UPDATE SET\n  version = EXCLUDED.version,\n  allowed_grades = EXCLUDED.allowed_grades,\n  assessment_tasks = EXCLUDED.assessment_tasks,\n  is_open = EXCLUDED.is_open,\n  updated_at = now();\nCOMMIT;`;
}
