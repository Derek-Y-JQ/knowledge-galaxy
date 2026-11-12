// knowledge-galaxy schedule integration.
// Wraps the optional `schedule` service: catalog merge, remoteCreate prompt,
// remoteEdit deletion and run. Every task is bound to a delivery mode (and
// optionally a target category/subcategory) so scheduled content is classified
// inside that mode's tree only.

import { HttpError } from './service.js'
import { findCategory, findSubcategory, isMode, MODE_LABELS } from './taxonomy.js'

export const DEFAULT_TIME_ZONE = 'Asia/Shanghai'
export const DEFAULT_TIME = '09:00'

const CADENCES = ['daily', 'weekly']
const KIND_HINTS = ['knowledge', 'paper', 'both']
const TARGETS = ['new_once', 'session']

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toTrimmed(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

/** Accept HH:MM / HH:MM:SS (also H:MM) and normalize to HH:MM:SS. */
export function normalizeClock(value, fallback) {
  const raw = toTrimmed(value)
  if (raw === '') return fallback
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw)
  if (match === null) throw new HttpError(400, `时间格式无效：${raw}（应为 HH:MM）`, 'invalid-input')
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = match[3] === undefined ? 0 : Number(match[3])
  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new HttpError(400, `时间格式无效：${raw}（应为 HH:MM）`, 'invalid-input')
  }
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

export function displayClock(value, fallback) {
  const raw = toTrimmed(value)
  const match = /^(\d{1,2}):(\d{2})/.exec(raw)
  if (match === null) return fallback
  return `${pad2(Number(match[1]))}:${match[2]}`
}

function normalizeWeekdays(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  for (const value of raw) {
    const day = Number(value)
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new HttpError(400, 'weekdays 必须是 1..7 的整数（周一=1）', 'invalid-input')
    }
    seen.add(day)
  }
  return [...seen].sort((a, b) => a - b)
}

function normalizeTimeZone(value) {
  const raw = toTrimmed(value)
  if (raw === '') return DEFAULT_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw }).format(new Date())
  } catch {
    throw new HttpError(400, `无效时区：${raw}`, 'invalid-input')
  }
  return raw
}

/**
 * Validate + normalize a POST /schedule/tasks body against the current taxonomy.
 * `mode` is required; `categoryId` / `subcategoryId` are optional and must
 * belong to that mode.
 */
export function normalizeScheduleInput(input, taxonomy) {
  if (!isPlainObject(input)) throw new HttpError(400, '请求体必须是 JSON 对象', 'invalid-input')

  const title = toTrimmed(input.title)
  if (title === '') throw new HttpError(400, '任务名不能为空', 'invalid-input')
  if (title.length > 120) throw new HttpError(400, '任务名不能超过 120 字', 'invalid-input')

  const mode = toTrimmed(input.mode)
  if (!isMode(mode)) throw new HttpError(400, '必须指定投递模式（学习 / 学术 / 日常）', 'invalid-input')

  let categoryId = toTrimmed(input.categoryId)
  const subcategoryId = toTrimmed(input.subcategoryId)
  let categoryName = ''
  let subcategoryName = ''
  if (subcategoryId !== '') {
    const found = findSubcategory(taxonomy, subcategoryId)
    if (found === undefined) throw new HttpError(400, '目标子类不存在', 'invalid-input')
    if (categoryId !== '' && found.category.id !== categoryId) throw new HttpError(400, '目标大类与子类不匹配', 'invalid-input')
    categoryId = found.category.id
    subcategoryName = found.subcategory.name
  }
  if (categoryId !== '') {
    const category = findCategory(taxonomy, categoryId)
    if (category === undefined) throw new HttpError(400, '目标大类不存在', 'invalid-input')
    if (category.mode !== mode) throw new HttpError(400, '目标分类不属于所选投递模式', 'invalid-input')
    categoryName = category.name
  }

  const cadence = toTrimmed(input.cadence) || 'daily'
  if (!CADENCES.includes(cadence)) throw new HttpError(400, 'cadence 必须是 daily 或 weekly', 'invalid-input')

  const time = normalizeClock(input.time, normalizeClock(DEFAULT_TIME))
  const timeZone = normalizeTimeZone(input.timeZone)
  const weekdays = normalizeWeekdays(input.weekdays)
  if (cadence === 'weekly' && weekdays.length === 0) {
    throw new HttpError(400, '每周任务必须至少选择一个星期几', 'invalid-input')
  }

  const target = toTrimmed(input.target) || 'new_once'
  if (!TARGETS.includes(target)) throw new HttpError(400, 'target 必须是 new_once 或 session', 'invalid-input')
  const sessionId = toTrimmed(input.sessionId)
  if (target === 'session' && sessionId === '') {
    throw new HttpError(400, 'target=session 时必须提供 sessionId', 'invalid-input')
  }

  const topic = toTrimmed(input.topic).slice(0, 200)
  const kindHint = toTrimmed(input.kindHint) || (mode === 'academic' ? 'paper' : 'knowledge')
  if (!KIND_HINTS.includes(kindHint)) throw new HttpError(400, 'kindHint 必须是 knowledge/paper/both', 'invalid-input')
  const count = input.count === undefined ? 2 : Number(input.count)
  if (!Number.isInteger(count) || count < 1 || count > 5) {
    throw new HttpError(400, 'count 必须是 1..5 的整数', 'invalid-input')
  }
  const extra = typeof input.extra === 'string' ? input.extra.trim().slice(0, 2000) : ''

  return {
    title, mode, categoryId, subcategoryId, categoryName, subcategoryName,
    cadence, time, timeZone, weekdays, target, sessionId, topic, kindHint, count, extra,
  }
}

const MODE_BRIEF = {
  study: '学习模式（学科知识、定理推导、编程技能、课程笔记）：content 用 Markdown 写清概念、结论与推导要点，公式用 LaTeX（$...$ / $$...$$）。',
  academic: '学术模式（论文与文献）：每条必须是真实存在的论文，kind 用 "paper"，并在 paper 中填写 title（论文原名）、year、journal（期刊/会议）、authors、doi 或 url、abstract；不确定的字段留空，不要编造。',
  daily: '日常模式（金融研究、健身方法、生活与职场等）：content 用 Markdown 提炼要点，并给出可执行的待办或实操清单。',
}

/** Build the schedule prompt used for timer-driven collection tasks. */
export function buildSchedulePrompt(task) {
  const targetClause = task.target === 'session' ? '请回顾当前会话中与用户讨论过的内容，' : ''
  const topicClause = task.topic !== '' ? `主题范围：${task.topic}。` : ''
  const kindClause = task.kindHint === 'paper'
    ? '优先收录研究论文。'
    : task.kindHint === 'both' ? '可收录知识要点或研究论文。' : ''
  let categoryClause = 'categoryId / subcategoryId 留空，由插件在该模式的分类树内自动归类。'
  if (task.subcategoryId !== '') {
    categoryClause = `归入「${task.categoryName} / ${task.subcategoryName}」：传 subcategoryId="${task.subcategoryId}"。`
  } else if (task.categoryId !== '') {
    categoryClause = `归入大类「${task.categoryName}」：传 categoryId="${task.categoryId}"，subcategoryId 留空由插件在该大类内自动匹配。`
  }
  return `「知识银河」定时收录任务「${task.title}」。${targetClause}${topicClause}投递到${MODE_BRIEF[task.mode]}${kindClause}`
    + `请调用 knowledge_galaxy 工具，以 action="add"、mode="${task.mode}" 收录 ${task.count} 条最有价值的内容；`
    + `source 使用 "scheduled"，tags 中包含「${task.title}」。${categoryClause}${task.extra}`
    + '完成后用一两句话汇报收录结果即可，不要展开讲解。'
}

function buildTiming(task) {
  if (task.cadence === 'weekly') {
    return { kind: 'weekly', weekly: { time: task.time, time_zone: task.timeZone, weekdays: task.weekdays } }
  }
  return { kind: 'daily', daily: { time: task.time, time_zone: task.timeZone } }
}

function buildTarget(task) {
  return task.target === 'session' ? { kind: 'session', sessionId: task.sessionId } : { kind: 'new_once' }
}

function scheduleUnavailable() {
  return new HttpError(503, '定时任务服务不可用', 'schedule-unavailable')
}

function entryId(entry) {
  if (!isPlainObject(entry)) return ''
  if (typeof entry.id === 'string' && entry.id !== '') return entry.id
  if (isPlainObject(entry.record) && typeof entry.record.id === 'string') return entry.record.id
  return ''
}

/** Merge one stored task row with its live catalog entry (runtime fields are not persisted). */
function publicTask(stored, entry) {
  const targetKind = isPlainObject(entry?.target) ? entry.target.kind : undefined
  const lastDelivery = isPlainObject(entry?.lastDelivery) ? entry.lastDelivery : undefined
  const mode = isMode(stored.mode) ? stored.mode : 'study'
  return {
    id: stored.id,
    title: stored.title ?? entry?.title ?? '',
    status: typeof entry?.status === 'string' ? entry.status : 'unknown',
    mode,
    modeLabel: MODE_LABELS[mode],
    categoryId: stored.categoryId ?? '',
    subcategoryId: stored.subcategoryId ?? '',
    topic: stored.topic ?? '',
    kindHint: stored.kindHint ?? 'both',
    cadence: stored.cadence ?? (entry?.kind === 'weekly' ? 'weekly' : 'daily'),
    time: displayClock(stored.time ?? entry?.time, DEFAULT_TIME),
    weekdays: Array.isArray(stored.weekdays) ? stored.weekdays : (Array.isArray(entry?.weekdays) ? entry.weekdays : []),
    target: stored.target ?? (targetKind === 'session' ? 'session' : 'new_once'),
    legacyTool: stored.legacyTool === true,
    nextAt: typeof entry?.scheduledAt === 'string' ? entry.scheduledAt : null,
    createdAt: stored.createdAt ?? entry?.createdAt ?? null,
    lastRunAt: typeof lastDelivery?.acceptedAt === 'string' ? lastDelivery.acceptedAt : null,
  }
}

/**
 * Schedule bridge over the optional service.
 * @param {{ getService: () => any, store: import('./state.js').StateStore, logger?: any }} options
 */
export function createScheduleBridge(options) {
  const { getService, store, logger } = options
  const warn = (message) => {
    try {
      logger?.warn?.(`[knowledge-galaxy] ${message}`)
    } catch {
      // ignore logging failures
    }
  }

  const service = () => {
    try {
      const value = getService()
      return value === undefined || value === null ? null : value
    } catch {
      return null
    }
  }

  async function catalogEntries() {
    const current = service()
    if (current === null || typeof current.catalog !== 'function') return []
    try {
      const entries = await current.catalog()
      return Array.isArray(entries) ? entries : []
    } catch (error) {
      warn(`读取定时任务目录失败：${String(error)}`)
      return []
    }
  }

  return {
    available() {
      const current = service()
      return current !== null && typeof current.remoteCreate === 'function' && typeof current.remoteEdit === 'function'
    },

    /** List our tasks, merged with live catalog state. */
    async listTasks({ requireService = false } = {}) {
      if (requireService && !this.available()) throw scheduleUnavailable()
      const state = await store.read()
      const entries = await catalogEntries()
      const byId = new Map()
      for (const entry of entries) {
        const id = entryId(entry)
        if (id !== '') byId.set(id, entry)
      }
      return Object.values(state.scheduleTasks ?? {})
        .filter((task) => isPlainObject(task) && typeof task.id === 'string')
        .map((task) => publicTask(task, byId.get(task.id)))
        .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
    },

    /** POST /schedule/tasks. */
    async createTask(input) {
      const current = service()
      if (current === null || typeof current.remoteCreate !== 'function') throw scheduleUnavailable()
      const state = await store.read()
      const task = normalizeScheduleInput(input, state.taxonomy)
      const prompt = buildSchedulePrompt(task)
      let entry
      try {
        entry = await current.remoteCreate({
          title: task.title,
          prompt,
          timing: buildTiming(task),
          target: buildTarget(task),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new HttpError(400, `创建定时任务失败：${message}`, 'schedule-create-failed')
      }
      const id = entryId(entry)
      if (id === '') throw new HttpError(500, '定时任务服务未返回任务 id', 'schedule-create-failed')

      const stored = {
        id,
        title: task.title,
        mode: task.mode,
        categoryId: task.categoryId,
        subcategoryId: task.subcategoryId,
        topic: task.topic,
        kindHint: task.kindHint,
        cadence: task.cadence,
        time: task.time,
        weekdays: task.weekdays,
        target: task.target,
        createdAt: typeof entry?.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
      }
      const { revision } = await store.mutate((draft) => {
        draft.scheduleTasks[id] = stored
      })
      return { task: publicTask(stored, entry), revision }
    },

    /** DELETE /schedule/tasks/:id — deletes remotely, then drops our row. */
    async deleteTask(id) {
      const current = service()
      if (current === null || typeof current.remoteEdit !== 'function') throw scheduleUnavailable()
      try {
        await current.remoteEdit({ id, action: 'delete' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new HttpError(400, `删除定时任务失败：${message}`, 'schedule-delete-failed')
      }
      const { revision } = await store.mutate((draft) => {
        delete draft.scheduleTasks[id]
      })
      return { revision }
    },

    /** POST /schedule/tasks/:id/run. */
    async runTask(id) {
      const current = service()
      if (current === null || typeof current.run !== 'function') {
        throw new HttpError(503, '定时任务服务不可用（run 不可用）', 'schedule-unavailable')
      }
      let result
      try {
        result = await current.run({ id })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new HttpError(400, `运行定时任务失败：${message}`, 'schedule-run-failed')
      }
      if (isPlainObject(result) && result.code === 'schedule_not_found') {
        throw new HttpError(404, '定时任务不存在', 'not-found')
      }
      return { pending: isPlainObject(result) && result.code === 'schedule_execution_pending' }
    },
  }
}
