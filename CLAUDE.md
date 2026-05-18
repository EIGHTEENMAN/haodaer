# 好大儿项目 (Haodaer)

儿童益智乐园 & 亲子旅行攻略平台

## 项目说明

好大儿包含两大站点：
- **好大儿主站** (grandand.com)：儿童学习资源 + 益智挑战
- **好大儿走天下** (travel.grandand.com)：真实亲子旅行攻略

核心理念：孩子说好才是真的好。儿童体验第一、隐私保护、非商业化优先。

## 快速信息

- 服务器：121.196.230.54 (阿里云 ECS, root/Hdet@2026)
- GitHub 组织：github.com/EIGHTEENMAN (12个仓库)
- 完整方案：`项目建设方案/好大儿项目建设方案（v3.2 终极版）.txt`

## 当前进度

总进度约 65%（自主运营阶段 137h 已完成约 89h）

**已完成：**
- Phase 1 基础设施 ✅ (服务器/Nginx/DNS/GitHub/SSL)
- Phase 2 认证体系 ✅ (auth-service SQLite+JWT+OAuth)
- Phase 3A 走天下攻略核心 ✅ (Next.js+Prisma+PostgreSQL)
- Phase 3B 儿童互动玩法 ✅ (投票/挑战/足迹/画廊)
- Phase 3D AI 审核引擎 ✅ (DFA敏感词+自动处罚+举报申诉)
- Phase 3E 管理监控看板 ✅ (admin Express+AntD)
- Phase 3F PostHog 埋点 ✅
- Phase 3C 前端壳子 🟡 (学习应用已部署但缺内容数据)
- Phase 4 好大儿来挑战 ✅ (问答挑战+神兽方块, tiaozhan.grandand.com)
- Phase 5 论坛 ✅ (forum.grandand.com, 完整社区功能)
- Phase 5 商城 ✅ (store.grandand.com, 积分兑换系统)
- Phase 3G FAQ/法律页面 ✅ (grandand.com/faq, /legal)

**未完成：**
- Phase 4 学习内容数据 (2000诗词/20经典/500通识/5000单词)

## 权限系统

项目已有自动授权配置 (`settings.json` + `settings.local.json`)，覆盖 SSH、Git、npm、GitHub API、curl、dig 等常见操作。如遇到未授权的命令会提示，同意后告诉我即可。日常开发工作应无需手动逐一批准。

## 进度记忆

进度检查点存储在记忆系统中 (`memory/project-progress.md`)，每次完成任务后自动同步更新。会话启动时自动读取并恢复进度，无需手动汇报。

## 运行中服务

| 服务 | 端口 | 状态 |
|------|------|------|
| main-site | 3000 | ✅ |
| auth-service | 3007 | ✅ |
| travel-guide | 3010 | ✅ |
| admin | 3099 | ✅ |
| haodaer-shici | 3008 | ✅ (壳子) |
| xueguoxue | 3003 | ✅ (壳子) |
| xuetongshi | 3004 | ✅ (壳子) |
| ultraman-english | 3002 | ✅ (壳子) |
| haodaer-tiaozhan | 3001 | ✅ tiaozhan.grandand.com |
| haodaer-forum | 3005 | ✅ forum.grandand.com |
| haodaer-store | 3006 | ✅ store.grandand.com |
| haodaer-moderation | 3020 | ✅ 内部审核服务 |
