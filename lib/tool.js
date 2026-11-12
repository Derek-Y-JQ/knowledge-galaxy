// knowledge_galaxy agent tool.
// Hand-written tool object — defineTool is intentionally NOT imported.
// Writes go through the same StateStore as HTTP so revisions stay consistent.

import { buildClassifyText } from './classify.js'
import { KIND_LABELS, SOURCE_LABELS, HttpError, buildCounts, sortedItems, isPlainObject } from './service.js'
import { categoryNames, isMode, MODE_LABELS } from './taxonomy.js'

const DESCRIPTION = '知识银河收录工具：把值得留存的内容收录进用户的「知识银河」知识看板。'
  + '三种模式：study=学习（学科知识、定理推导、编程技能、课程笔记），academic=学术（论文与文献，需 paper 元数据），'
  + 'daily=日常（金融研究、健身方法、生活与职场等）。定时收录任务与对话中需要收录内容时调用。'
  + 'add 时传 mode 可把自动归类限定在该模式的分类树内；不传则自动判断模式。add 会返回已收录卡片与归类结果。'

const LIST_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'mode', 'kind', 'title', 'categoryId', 'subcategoryId', 'source'],
  properties: {
    id: { type: 'string' },
    mode: { type: 'string' },
    kind: { type: 'string' },
    title: { type: 'string' },
    categoryId: { type: 'string' },
    subcategoryId: { type: 'string' },
    source: { type: 'string' },
  },
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    itemId: { type: 'string' },
    items: { type: 'array', items: LIST_ITEM_SCHEMA },
    counts: { type: 'object', additionalProperties: true },
  },
}

const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  required: ['action'],
  properties: {
    action: { type: 'string', enum: ['add', 'list', 'stats', 'classify', 'link'] },
    mode: { type: 'string', enum: ['study', 'academic', 'daily'] },
    kind: { type: 'string', enum: ['knowledge', 'paper'] },
    title: { type: 'string' },
    categoryId: { type: 'string' },
    subcategoryId: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    content: { type: 'string' },
    status: { type: 'string', enum: ['todo', 'doing', 'done'] },
    paper: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        year: { type: 'string' },
        journal: { type: 'string' },
        authors: { type: 'string' },
        doi: { type: 'string' },
        url: { type: 'string' },
        abstract: { type: 'string' },
      },
    },
    source: { type: 'string', enum: ['conversation', 'scheduled', 'manual'] },
    itemIds: { type: 'array', items: { type: 'string' } },
    linkLabel: { type: 'string' },
    linkNote: { type: 'string' },
    limit: { type: 'integer' },
  },
}

function toListItem(item) {
  return {
    id: item.id,
    mode: item.mode,
    kind: item.kind,
    title: item.title,
    categoryId: item.categoryId,
    subcategoryId: item.subcategoryId,
    source: item.source,
  }
}

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return undefined
}

function countsSummary(counts) {
  return `共 ${counts.total} 张卡片：学习 ${counts.byMode.study} · 学术 ${counts.byMode.academic} · 日常 ${counts.byMode.daily}；`
    + `对话收录 ${counts.conversation} · 定时任务 ${counts.scheduled} · 手动新建 ${counts.manual}。`
}

function asLimit(value) {
  if (!Number.isInteger(value)) return 20
  return Math.min(100, Math.max(1, value))
}

function location(taxonomy, item) {
  const names = categoryNames(taxonomy, item.categoryId, item.subcategoryId)
  return `${MODE_LABELS[item.mode] ?? names.modeLabel} · ${names.categoryName} / ${names.subcategoryName}`
}

/**
 * Build the tool definition.
 * @param {{ store: import('./state.js').StateStore, service: import('./service.js').KnowledgeGalaxyService }} deps
 * @param {{ name?: string, description?: string, defaultMode?: string }} options
 */
export function createKnowledgeGalaxyTool({ store, service }, options = {}) {
  const toolName = options.name ?? 'knowledge_galaxy'

  async function run(args, exec) {
    const input = isPlainObject(args) ? args : {}
    const action = typeof input.action === 'string' ? input.action : ''
    const mode = isMode(input.mode) ? input.mode : undefined

    if (action === 'add') {
      const title = typeof input.title === 'string' ? input.title.trim() : ''
      if (title === '') throw new Error('action=add 需要提供非空的 title')
      const session = exec?.agent?.session
      const sessionId = pickString(session?.id)
      const taskTitle = pickString(session?.taskTitle, session?.scheduleTitle)
      const sourceDetail = { ...(sessionId === undefined ? {} : { sessionId }), ...(taskTitle === undefined ? {} : { taskTitle }) }
      const created = await service.addItem(
        {
          title,
          ...(mode === undefined ? (isMode(options.defaultMode) ? { mode: options.defaultMode } : {}) : { mode }),
          ...(typeof input.kind === 'string' ? { kind: input.kind } : {}),
          ...(typeof input.categoryId === 'string' ? { categoryId: input.categoryId } : {}),
          ...(typeof input.subcategoryId === 'string' ? { subcategoryId: input.subcategoryId } : {}),
          ...(Array.isArray(input.tags) ? { tags: input.tags } : {}),
          ...(typeof input.summary === 'string' ? { summary: input.summary } : {}),
          ...(typeof input.content === 'string' ? { content: input.content } : {}),
          ...(typeof input.status === 'string' ? { status: input.status } : {}),
          ...(isPlainObject(input.paper) ? { paper: input.paper } : {}),
          source: typeof input.source === 'string' ? input.source : 'scheduled',
          sourceDetail,
        },
        { defaultSource: 'scheduled', lenientIds: true },
      )
      const state = await store.read()
      let summary = `已收录到【${location(state.taxonomy, created.item)}】${created.item.title}`
        + `（${KIND_LABELS[created.item.kind] ?? created.item.kind}，来源：${SOURCE_LABELS[created.item.source] ?? created.item.source}）。`
      if (created.suggestion !== undefined && created.suggestion.confidence < 0.35) {
        summary += '（自动归类置信度较低，建议在看板中确认分类）'
      }
      return { ok: true, summary, itemId: created.item.id, items: [toListItem(created.item)], counts: buildCounts(state) }
    }

    if (action === 'list') {
      const limit = asLimit(input.limit)
      const state = await store.read()
      const filtered = sortedItems(state).filter((item) => {
        if (mode !== undefined && item.mode !== mode) return false
        if (typeof input.kind === 'string' && item.kind !== input.kind) return false
        if (typeof input.categoryId === 'string' && input.categoryId !== '' && item.categoryId !== input.categoryId) return false
        if (typeof input.subcategoryId === 'string' && input.subcategoryId !== '' && item.subcategoryId !== input.subcategoryId) return false
        if (typeof input.source === 'string' && input.source !== '' && item.source !== input.source) return false
        return true
      })
      const page = filtered.slice(0, limit)
      const lines = page.map((item) => {
        const date = typeof item.createdAt === 'string' ? item.createdAt.slice(0, 10) : ''
        return `- [${item.id}]【${location(state.taxonomy, item)}】${item.title}（${SOURCE_LABELS[item.source] ?? item.source}${date !== '' ? `，${date}` : ''}）`
      })
      const summary = lines.length === 0
        ? '没有符合条件的卡片。'
        : `共 ${filtered.length} 张符合条件的卡片${filtered.length > page.length ? `，以下为最新 ${page.length} 张` : ''}：\n${lines.join('\n')}`
      return { ok: true, summary, items: page.map(toListItem), counts: buildCounts(state) }
    }

    if (action === 'stats') {
      const counts = await service.counts()
      return { ok: true, summary: countsSummary(counts), counts }
    }

    if (action === 'classify') {
      const text = buildClassifyText({
        title: input.title,
        tags: input.tags,
        summary: input.summary,
        content: input.content,
        paper: input.paper,
      })
      if (text.trim() === '') throw new Error('action=classify 需要提供 title/content/summary/tags 中至少一项')
      const suggestion = await service.classify(text, { mode, kind: input.kind })
      const modeLabel = MODE_LABELS[suggestion.mode] ?? suggestion.mode
      if (suggestion.categoryId === '') {
        return { ok: true, summary: `建议模式：${modeLabel}；该模式下没有命中任何分类，收录时会放入「未分类」。` }
      }
      const state = await store.read()
      const names = categoryNames(state.taxonomy, suggestion.categoryId, suggestion.subcategoryId)
      const percent = Math.round((suggestion.confidence ?? 0) * 100)
      const matched = suggestion.matchedKeywords.length > 0
        ? `命中关键词：${suggestion.matchedKeywords.join('、')}。`
        : '未命中关键词，按启发式给出默认分类。'
      return {
        ok: true,
        summary: `建议归类：【${modeLabel} · ${names.categoryName} / ${names.subcategoryName}】，置信度 ${percent}%。${matched}`,
      }
    }

    if (action === 'link') {
      const itemIds = Array.isArray(input.itemIds) ? input.itemIds : []
      if (itemIds.length < 2) throw new Error('action=link 需要至少 2 个 itemIds')
      const label = typeof input.linkLabel === 'string' ? input.linkLabel.trim() : ''
      if (label === '') throw new Error('action=link 需要提供 linkLabel')
      const { link } = await service.addLink({
        itemIds,
        label,
        note: typeof input.linkNote === 'string' ? input.linkNote : '',
      })
      return { ok: true, summary: `已建立联系「${link.label}」（涉及 ${link.itemIds.length} 张卡片）。` }
    }

    throw new Error(`不支持的 action：${action === '' ? '(未提供)' : action}`)
  }

  return {
    name: toolName,
    description: options.description ?? DESCRIPTION,
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: String(value?.summary ?? '') }],
    },
    async execute(args, exec) {
      try {
        return await run(args, exec)
      } catch (error) {
        if (error instanceof HttpError) throw new Error(error.message)
        throw error instanceof Error ? error : new Error(String(error))
      }
    },
  }
}
