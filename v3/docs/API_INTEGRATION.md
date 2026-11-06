# 同路 V6：未来 AI 与数据库对接约定（开发草案）

本版本为**本地 H5 演示**。没有登录后端、真实模型、数据购买、案例检索、支付或资质核验。`assets/integration-adapters.js` 只定义未来可替换的函数；其方法均返回 `not_connected`，不会发送请求。

## 数据边界与建议分层

- 前端：角色交互、用户手动确认、状态展示；禁止在前端写模型密钥。
- FastAPI 后端：权限、用户确认记录、审核流、日志与服务编排。
- PostgreSQL：学生档案、服务者档案、经授权的案例、收藏、投递、任务、订单与审核记录。按账号隔离。
- 文档解析：TXT/MD、PDF/Word 独立解析器；必要时 OCR。不得仅凭文件名生成 BG。
- 大模型：只能生成**待确认**的结构化提取、追问、解释和计划建议；禁止自行认证资质或生成录取概率。
- RAG：先进行授权、访问权限、来源/时间有效性检索，再生成带引用的经验回答，需区分当事人陈述、官方信息与模型归纳。

## 建议 API （非已部署接口）

| 方法 | 建议路径 | 目的 |
|---|---|---|
| GET | `/api/v1/auth/me` | 当前账号与角色 |
| GET/PUT/DELETE | `/api/v1/profiles/me` | 当前用户个人 BG 与版本记录 |
| POST | `/api/v1/documents/parse` | 授权上传材料并异步解析，返回来源片段 |
| DELETE | `/api/v1/documents/{document_id}` | 撤回 / 删除文件 |
| POST | `/api/v1/speech/transcribe` | 语音转写（需明确告知服务方） |
| POST | `/api/v1/ai/extract` | 以学生/服务者 Schema 提取待确认字段 |
| POST | `/api/v1/ai/follow-up` | 根据缺失/冲突项生成追问 |
| POST | `/api/v1/ai/plan-suggestions` | 根据已确认资料提出待采纳任务 |
| GET | `/api/v1/experience/search` | 只返回授权范围内真实经历及来源 |
| POST | `/api/v1/experience/answer` | 筛选来源并生成引用回答 |
| GET | `/api/v1/mentors/{id}/verification` | 独立资质核验状态 |
| GET | `/api/v1/orders/stats` | 按真实完成订单统计服务次数 |
| GET/PUT | `/api/v1/records/...` | 收藏、投递与时间轴（每账号鉴权） |

### 结构化提取返回示意

```json
{
  "draft_id": "server-generated-id",
  "role": "student",
  "model_version": "model-name-and-version",
  "fields": {
    "undergraduate_school": {"value": "某大学", "confidence": "needs_confirmation", "evidence": [{"document_id": "doc-1", "page": 1, "quote": "..."}]},
    "grade": {"value": "大二", "confidence": "needs_confirmation", "evidence": []}
  },
  "conflicts": [],
  "missing": ["target_program"],
  "requires_user_confirmation": true
}
```

服务者 Schema 须增加：本科专业、升学去向、科研竞赛、服务范围、服务对象类型、帮助内容、交付成果、申请结果、个人方法、案例授权状态。三种状态必须独立存储：`self_reported`、`verification_pending/verified`、`platform_order_record`。`verified` 只能由后台审核产生。

## 必须遵守的安全约束

1. 所有服务端接口使用登录鉴权与按用户行级授权，不允许前端传入他人 ID 后直接读记录。
2. 简历上传、模型处理与服务者案例展示需要独立用途告知和有效同意，并提供撤回/删除机制。
3. 文件与日志要脱敏、限期留存、控制访问范围；避免把全部履历送入第三方模型。
4. 录取概率、排名等统计推断须经过数据质量验证，当前 UI 刻意不展示。
5. 来自历史保研经验的数据须记录采集时间、原始申请年份、授权用途、核验状态与来源，不得把个别经验推断为当年招生条件。
6. 时间轴由 AI 推荐任务，截止日期以院校官方公告或用户自行设置为准；由用户采纳才保存。
7. 第三方模型、短信/支付、招生信息抓取上线前需完成隐私、许可和支付流程检查。
8. 本地 JSON 导出可能包含用户输入，需明确告知其保管风险。

## 本轮测试覆盖

- JS/CSS 语法、学生/服务者/游客页面和四种手机宽度；
- 对话 BG 只在用户主动点击并确认时转为正式档案；
- 经验内容是虚构样例，不用真实学生资料；
- 本机成长建议须用户采纳，保留原时间轴状态；
- 原服务者和订单流程仅作演示，无实际联网。
