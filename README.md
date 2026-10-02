# 景区设施运维中枢（Vue 3 管理端）

该目录是独立的新管理端，用于替换旧 `ruoyi-ui` 的 Vue 2 + Element UI 技术栈。旧管理端暂时保留，便于迁移期回退。

## 技术栈

- Vue 3
- Vite
- TypeScript
- Element Plus
- Pinia
- Vue Router 4
- Axios
- ECharts

## 启动

```bash
npm install
npm run dev
```

开发环境默认访问 `http://localhost:8090`，`/dev-api` 代理到 `http://localhost:8081`。

## 构建

```bash
npm run build
```

构建产物输出到 `dist`。

## 当前页面

- 运行总览：任务、工单、设施聚合指标和图表
- 巡检任务：任务创建、编辑、设施快照和关闭
- 工单看板：按待派发、待接单、维修中、已完成分栏，支持派单、详情和关闭
- 设施档案：设施信息、坐标和二维码生成
- 巡检路线：路线基础信息维护
- 周期计划：Cron 周期计划维护
- 业务审计：关键状态迁移日志查询
