# 小学五、六年级创造性思维测评平台

在线地址：<https://xiajing819195798-sys.github.io/creativity/>

## 测评结构

- 插图标题：产生多样想法，5 分钟
- 数字故事 2983：产生创造性想法，5 分钟
- 无障碍图书馆：评价和改进想法，5 分钟
- 纸杯替代用途 AUT：发散思维，3 分钟
- 毛绒兔玩具改进：人机创造任务，12 分钟
- 共 5 题，总上限约 30 分钟

最后一题根据匿名学生编号和班级代码进行稳定的约 1:1 分组：

- `reflection`：学生先提出两个想法，再独立反思不足、改进并形成最终方案。
- `ai`：学生先提出两个想法，再与 CloudBase AI 对话并形成最终方案。

同一学生在同一版本中刷新或恢复作答时不会改变组别。提交数据包含分组、初步想法、独立反思或 AI 对话记录，以及最终方案。

## AI 配置

网页通过现有 CloudBase Publishable Key 调用 `cloudbase` 模型组中的 `hy3`。正式施测前，需要在腾讯云 CloudBase 控制台的“AI → 生文模型”中启用该模型，并进行一次完整对话测试。若环境中使用其他模型，可修改 `index.html` 中的 `AI_MODEL_GROUP` 和 `AI_MODEL_NAME`。

AI 只用于最后一题的协作讨论。系统提示要求 AI 不直接代写最终答案，而是提出问题、指出不足并提供少量改进方向。页面明确提醒学生不要输入姓名、手机号等个人信息。

## 修改题目文案与图片

- 首页标题、总体说明、限时规则和知情说明位于根目录 `index.html` 的 `<section id="start">` 区域。
- 五道题的标题、维度标签、限时、题干和提示语位于 `index.html` 中带有“题目文案编辑区”注释的 `tasks` 数组。
- 题目图片路径位于紧随 `tasks` 数组之后的“题目图片编辑区”。
- 图片文件放在 `assets/images/`；当前漫画标题题使用 `comic-title.png`，2983 题使用 `story-2983.png`。
- 每次修改根目录 `index.html` 或 `assets/` 后，还需要把相同内容同步到 `dist/index.html` 和 `dist/assets/`，CloudBase 部署使用的是 `dist/` 目录。

不要修改 CloudBase 环境编号、Publishable Key、数据库集合名称、随机分组函数或 AI 模型配置，除非同时重新测试数据提交和 AI 对话。

## 数据回收

学生完成后通过网页统一提交至腾讯云 CloudBase PostgreSQL 表 `public.creativity_submissions`。学生端只被授予 `INSERT` 权限，并且没有 `SELECT`、`UPDATE` 或 `DELETE` 权限，因此不能查看、修改或下载汇总结果。研究者通过自己的腾讯云账号查看并导出数据。

前端使用权限受限的 Publishable Key（`anon` 角色），不得使用服务端 API Key 或 `service_role` 密钥。Web 安全域名应包含 `xiajing819195798-sys.github.io`。

正式施测前请完成知情同意、预测试、评分员培训、AI 模型启用检查和提交演练。班级代码建议代表学生归属班级，教师轮转信息另建教师—班级—时段对应表，不要在学生答题或 AI 对话中存储姓名。

## 使用说明

本工具不是正式 PISA 或 OECD 测验。部分任务依据 PISA 2022 创造性思维公开题的构念与情境进行中文简化或改编，改编内容由研究者负责，OECD 不对本工具背书。
