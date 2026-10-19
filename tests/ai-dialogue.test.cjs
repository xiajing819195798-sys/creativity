const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const deployedCopy = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
assert.equal(source, deployedCopy, 'root and dist HTML must stay in sync');

const inlineScript = source.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
assert.ok(inlineScript, 'assessment script exists');
new vm.Script(inlineScript[1], { filename: 'index.html' });

const helper = source.match(/  function constrainAiReply\(text,allowQuestion\)\{[\s\S]*?\n  \}/);
assert.ok(helper, 'reply guard exists');
const constrainAiReply = vm.runInNewContext(`${helper[0]}\nconstrainAiReply`);

const first = constrainAiReply('你的想法很新颖。你考虑过安全性吗？怎样使用？', true);
assert.equal((first.match(/[？?]/g) || []).length, 1, 'first reply may contain at most one question');
assert.match(first, /你的想法很新颖/);
assert.doesNotMatch(first, /怎样使用/);

const later = constrainAiReply('你考虑过安全性吗？可以用柔软材料，避免尖锐部件。还想改哪里？', false);
assert.equal(later, '可以用柔软材料，避免尖锐部件。', 'later reply keeps direct feedback but removes questions');
assert.doesNotMatch(later, /[？?]/);

const fallback = constrainAiReply('还有什么想法？', false);
assert.match(fallback, /安全/);
assert.doesNotMatch(fallback, /[？?]/);

assert.match(source, /promptVersion:AI_PROMPT_VERSION/);
assert.match(source, /o\.ai_prompt_version=AI_PROMPT_VERSION/);
assert.match(source, /creativity_assessment_v21_bunny_dialogue_v2/);
console.log('AI dialogue checks passed');
