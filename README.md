# 创造性思维测评平台

腾讯云线上地址：<https://creativity-creativity-d6gaz98q82144e44e.webapps.tcloudbase.com/>

本仓库的 `index.html` 与 `dist/index.html` 对应当前四题施测版本。修改时请保持两份文件及 `assets/`、`dist/assets/` 同步。GitHub Pages 自动发布 `main` 分支；腾讯云静态网站需另行部署。

## 测评结构

1. 插图标题：5 分钟
2. 数字故事 2983：6 分钟
3. 纸杯的新用途：3 分钟
4. 改进毛绒兔玩具：20 分钟

四题限时合计 34 分钟。每道题的剩余时间显示在题目上方，滚动页面时保持可见，最后一分钟会变红。刷新或关闭网页不会重置截止时间；已在第二题的旧版暂存记录，恢复时会补足新增的一分钟。答题记录仍自动保存在本设备浏览器中，提交成功前不要清除暂存。

最后一题按学号和年级稳定分配完成方式，包括 AI 对话、提示反思和独立完成。AI 对话使用腾讯云 CloudBase 内置的 `hy4-preview` 模型。

## 数据与版本

学生端通过 CloudBase PostgreSQL 提交至 `public.creativity_submissions`。学生端只有插入权限，研究者通过腾讯云账号导出。`payload.instrument_version` 标记页面版本；`payload.anchor_2983_limit_seconds` 记录每份作答实际获得的第二题时限，便于比较修改前后的数据。

`db_export_view.sql` 是独立的数据导出视图；如需使用，应按当前 `payload` 字段检查和更新。
