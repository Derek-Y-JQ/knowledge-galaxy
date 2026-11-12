# 知识银河（knowledge-galaxy）

> 当前版本：**v1.0.0**

把对话里聊到的知识、读到的论文、日常的研究与方案，随手收录成可筛选、可连线、可在星图里漫游的知识看板 —— **知识银河**是 DeepSeek Harness 的一个插件。

- 宿主侧：`lib/**`（Node ESM，只依赖 `node:` 内置模块）
- 浏览器侧：`client/client.js`（单文件 bundle，由 `client/src/*.js` 经 `node client/build.mjs` 拼接生成）
- 插件声明：`package.json`、`cordis.patch.yml`、`icon.svg`

## 安装

```bash
git clone https://github.com/Derek-Y-JQ/knowledge-galaxy.git
dsh plugin --profile web add /绝对路径/knowledge-galaxy     # 必须是绝对路径
dsh plugin --profile web list                               # 确认已出现 knowledge-galaxy
```

也可以在 DSH Desktop 的「插件管理器 → 从本地路径安装」里填入该目录的绝对路径。安装后重启 DSH 或刷新页面：侧栏出现「知识银河」入口，助手回答下方出现「🌌 收录到知识银河」，Agent 获得 `knowledge_galaxy` 工具。无需 `npm install`，插件没有第三方依赖。或直接将本链接发送给 Deepseek Harness 使其自动安装。

## 模式

| 模式 | 适用场景 | 分类体系 | 卡片形态 | 状态标签 |
| --- | --- | --- | --- | --- |
| 学习 `study` | 学科知识、定理推导、编程技能、课程笔记 | 内置数学模板（4 大类 27 子类），可关闭、可增补 | 概念解析 + KaTeX / Markdown | 待理解 / 复习中 / 已掌握 |
| 学术 `academic` | 论文阅读、文献追踪、开题调研 | 全自定义 | 文献元数据（原名、年份、期刊/会议、作者、DOI/链接、摘要） | 待读 / 精读中 / 已读完 |
| 日常 `daily` | 金融研究、健身、生活与职场 | 全自定义 | 问答快照、要点、待办清单 | 备忘 / 进行中 / 已归档 |
| 全部 `all` | 跨领域检索与连线 | 聚合已开启模式 | 卡片带模式徽章 | — |

- 开启 ≥ 2 个模式时主页左上显示模式 Tab（含「全部」）；只开 1 个时 Tab 隐藏。
- 关闭模式不删除数据，只是在主页、「全部」视图与收录下拉中隐藏。
- 某个模式下没有任何可匹配的分类时，卡片进入自动创建的「未分类」大类，之后可在详情页一键移动。

## 功能

- **对话收录**：助手回答下的「🌌 收录到知识银河」。弹窗首行是所属模式，按内容自动预选（公式/定理 → 学习，论文标题/DOI/Abstract → 学术，其余 → 日常或当前模式）；学术模式展开论文信息栏。会记录会话 ID 用于「回到原对话」。
- **定时收录**：新建任务必须指定投递模式，可选目标大类/子类；Agent 调用 `knowledge_galaxy` 时自动归类只在该模式的分类树内匹配。
- **看板**：分组视图（按大类 / 子类 / 来源 / 状态，「全部」下还可按模式）与时间轴视图（按日 / 周 / 月，节点可折叠，另有日历视图）；搜索、来源、大类、子类、标签、状态筛选通用。
- **移动分组**：分组视图里把卡片拖到其他列即可移动（按子类分列时，先筛选一个大类可显示其空子类作为落点）；「批量操作」里勾选多张后可一次「移动分组」或「建立联系」，拖动已勾选的卡片会带上全部勾选项。
- **卡片详情**：查看与解除联系、页内「+ 建立联系」（猜你想连 + 跨模式搜索 + 预设联系名）、点击关联卡片穿梭并可返回、点击分类胶囊移动模式/分类、编辑、删除。
- **双向引用**：正文里写 `[[卡片标题]]`（或用「插入卡片引用」），保存后生成可点击的内部链接，并自动维护一条「正文引用」联系；删掉引用后该联系自动解除。
- **管理类目**：按模式切换；自定义大类（名称、主题色、符号）与子类（名称、自动归类关键词、行星外观、重点标记）；预置模板支持隐藏；删除含卡片的分类时可「迁移后删除」或「清空后删除」；「导入预设」提供 AI 与计算机科学、金融与投资研究、健康与健身管理三个预设包。
- **设置**：模式开关（至少保留 1 个）、数学模板开关、默认着陆模式与默认看板视图；「检查更新」会把当前版本与 GitHub 上的最新发布版本比较（由宿主进程联网，需要能访问 api.github.com）。
- **星图**：左侧星系导航（可折叠，「全部」模式按模式分组），画布只渲染当前 1 个星系。只有星系核心与背景星尘发光；行星（子类）和卫星（卡片）是不发光的实体，朝向核心的一侧受光、背面有弧形阴影。行星外观分环状巨行星、条纹气态、岩石陨石坑、冰晶/海洋、荒漠/熔岩五种：卡片 ≥ 10 张或标记为重点的子类为环状巨行星，其余按子类 ID 哈希分配，也可在「管理类目」里指定。行星半径随卡片数阶梯增长，空子类是小行星。论文卫星带一圈细轨。有跨星系联系的行星旁显示「🌀 跃迁信标」，点击切换到目标星系并高亮目标行星。滚轮缩放、拖拽平移、双击复位。

## Agent 工具 `knowledge_galaxy`

| 参数 | 说明 |
| --- | --- |
| `action` | `add` \| `list` \| `stats` \| `classify` \| `link`（必填） |
| `mode` | `study` \| `academic` \| `daily`。`add` 时限定自动归类的范围；不传则自动判断 |
| `title` | `add` 必填 |
| `kind` | `knowledge` \| `paper`，缺省时学术模式为 `paper` |
| `categoryId` / `subcategoryId` | 可选；不存在的 id 会被忽略并回退到自动归类 |
| `tags` `summary` `content` `status` | 标签、简介、正文（Markdown/LaTeX）、`todo`/`doing`/`done` |
| `paper` | `title` `year` `journal` `authors` `doi` `url` `abstract` |
| `source` | `conversation` \| `scheduled` \| `manual`，缺省 `scheduled` |
| `itemIds` `linkLabel` `linkNote` | `link` 用 |
| `limit` | `list` 用，默认 20，最大 100 |

`math_universe` 是参数相同的兼容别名，未指定 `mode` 时默认学习模式。

## HTTP API（前缀 `/knowledge-galaxy/api`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/state` | 全量快照：`settings` `taxonomy` `items` `links` `counts` `scheduleTasks` `presetPacks` 等 |
| GET | `/health` | 健康检查 |
| GET | `/update` | 检查更新：`current` `latest` `hasUpdate` `url` 等 |
| PATCH | `/settings` | `{ modes?, mathTemplate?, landingMode?, landingView? }` |
| POST | `/classify` | `{ text, mode?, fallback? }` → 模式与分类建议 |
| POST | `/items` | 新建卡片 |
| POST | `/items/batch` | `{ ids, patch: { mode?, categoryId?, subcategoryId?, status? } }` 批量移动 / 改状态 |
| PATCH / DELETE | `/items/:id` | 编辑（含 `status`、`mode`/`categoryId`/`subcategoryId` 移动）/ 删除（级联删除联系） |
| POST | `/links` | `{ itemIds, label, note }`，或 `{ fromId, targetIds, label, note }`（每个目标一条联系） |
| DELETE | `/links/:id` | 解除联系 |
| POST | `/taxonomy/categories` | `{ mode, name, color?, glyph? }` |
| PATCH / DELETE | `/taxonomy/categories/:id` | 自定义：改名/颜色/符号/隐藏；预置：仅隐藏。删除可带 `?moveTo=<子类id>` 或 `?purge=1` |
| POST | `/taxonomy/subcategories` | `{ categoryId, name, keywords?, style? }` |
| PATCH / DELETE | `/taxonomy/subcategories/:id` | 自定义：名称/关键词；任意子类：`hidden` `style` `starred`。删除同上 |
| POST | `/taxonomy/presets` | `{ mode, packIds }` 导入预设包 |
| GET / POST | `/schedule/tasks` | 列表 / 新建（`mode` 必填，可带 `categoryId` `subcategoryId`） |
| DELETE | `/schedule/tasks/:id` | 删除任务 |
| POST | `/schedule/tasks/:id/run` | 立即运行 |
| POST | `/client/report` | 客户端健康上报 |

成功返回 `{ ok: true, ... }`，失败返回 `{ ok: false, error, code? }`。写操作需 `content-type: application/json`，body 上限 1 MB，带 `Origin` 时必须同源。

## 数据

- `$DSH_HOME/storages/knowledge-galaxy/state.json`（`$DSH_HOME` 缺省 `~/.dsh`），单文件 JSON：`version` `revision` `settings` `taxonomy` `items` `links` `scheduleTasks`。
- 每次写操作 `revision + 1`，采用临时文件 + rename 原子写入；文件损坏时备份为 `state.json.bak-<时间戳>` 后回退到默认状态。
- 看板视图、时间粒度、上次停留的模式等界面偏好保存在浏览器 localStorage。

## 已知限制

- **回到原对话**：DSH 没有向插件公开的会话跳转接口，按钮会依次尝试几个可能的方法名；都不存在时改为复制会话 ID 并提示。这一项未能在真实 DSH 中验证。
- 自动归类与模式预判是关键词启发式，置信度低时请在详情页确认分类。
- `[[卡片标题]]` 按标题精确匹配（忽略大小写）；目标卡片改名后需要同步修改引用。
- 定时收录依赖 DSH 的 `schedule` 服务；删除分类不会改写已创建任务的提示词，届时工具会回退到模式内自动归类。
- 星图是 Canvas 2D 实时渲染，每颗行星最多画 10 颗卫星，其余以「+N 颗卫星」提示，点击行星可在面板中看到全部卡片。
- 单机单文件存储，无多端同步；删除不可恢复；API 无鉴权，不要暴露到公网。

## 开发

```bash
node client/build.mjs          # 由 client/src 生成 client/client.js
node --check client/client.js
node --check lib/index.js
```

调试钩子：`window.__KNOWLEDGE_GALAXY_READY__`、`window.__KG_STAR_DEBUG__`（星系 / 阶段 / fps / 天体屏幕坐标）、`window.__KG_STAR_API__`。
