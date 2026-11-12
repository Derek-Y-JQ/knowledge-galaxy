// knowledge-galaxy domain service: validation + persistence for items, links,
// the per-mode taxonomy and settings. Shared by the HTTP router and the
// knowledge_galaxy agent tool. Only node: built-ins are used.

import { createHash, randomBytes } from 'node:crypto'
import { classifyText, buildClassifyText, detectMode } from './classify.js'
import {
  findCategory,
  findSubcategory,
  categoryNames,
  visibleCategories,
  isCustomCategoryId,
  isCustomSubcategoryId,
  isMode,
  readKeywords,
  MODES,
  MODE_LABELS,
  DEFAULT_MODE,
  PLANET_STYLES,
  INBOX_NAME,
  CUSTOM_CATEGORY_PALETTE,
  DEFAULT_CUSTOM_GLYPH,
} from './taxonomy.js'
import { STATUSES, LANDING_MODES, LANDING_VIEWS } from './state.js'
import { findPresetPack } from './presets.js'

const KINDS = ['knowledge', 'paper']
const SOURCES = ['conversation', 'scheduled', 'manual']
const KIND_LABELS = { knowledge: '知识卡片', paper: '论文文献' }
const SOURCE_LABELS = { conversation: '对话收录', scheduled: '定时任务', manual: '手动新建' }
/** Mode-specific wording of the shared todo / doing / done status. */
const STATUS_LABELS = {
  study: { todo: '待理解', doing: '复习中', done: '已掌握' },
  academic: { todo: '待读', doing: '精读中', done: '已读完' },
  daily: { todo: '备忘', doing: '进行中', done: '已归档' },
}
/** Label of the links generated from [[卡片标题]] references in note bodies. */
export const REF_LINK_LABEL = '正文引用'

const LIMITS = {
  title: 300,
  summary: 500,
  content: 50000,
  tag: 40,
  tags: 20,
  knowledgeField: 20000,
  paperYear: 20,
  paperJournal: 300,
  paperAuthors: 500,
  paperDoi: 200,
  paperUrl: 2000,
  paperAbstract: 20000,
  sourceDetailQuestion: 20000,
  sourceDetailAnswer: 20000,
  sourceDetailId: 500,
  linkLabel: 120,
  linkNote: 2000,
}

/** HTTP-facing error: status code + human-readable Chinese message + optional machine code/details. */
export class HttpError extends Error {
  constructor(status, message, code, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    if (details !== undefined) this.details = details
  }
}

export { KIND_LABELS, SOURCE_LABELS, STATUS_LABELS, KINDS, SOURCES }

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return maxLength === undefined ? value : value.slice(0, maxLength)
}

function toTrimmed(value, maxLength) {
  return toText(value, maxLength).trim()
}

function requireObject(input) {
  if (!isPlainObject(input)) throw new HttpError(400, '请求体必须是 JSON 对象', 'invalid-input')
  return input
}

/** Strict string field: over-limit input is rejected with 400. */
function requireText(value, maxLength, label) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new HttpError(400, `${label}必须是字符串`, 'invalid-input')
  if (value.length > maxLength) throw new HttpError(400, `${label}不能超过 ${maxLength} 字`, 'invalid-input')
  return value
}

function requireTitle(value, maxLength = LIMITS.title) {
  const title = requireText(value, maxLength, '标题').trim()
  if (title === '') throw new HttpError(400, '标题不能为空', 'invalid-input')
  return title
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeTags(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const tags = []
  for (const value of raw) {
    if (typeof value !== 'string') continue
    const tag = value.trim().slice(0, LIMITS.tag)
    if (tag === '' || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length >= LIMITS.tags) break
  }
  return tags
}

function normalizeKnowledge(raw) {
  const source = isPlainObject(raw) ? raw : {}
  return {
    statement: toText(source.statement, LIMITS.knowledgeField),
    note: toText(source.note, LIMITS.knowledgeField),
  }
}

function normalizePaper(raw, itemTitle) {
  const source = isPlainObject(raw) ? raw : {}
  return {
    title: toTrimmed(source.title, LIMITS.title) || toTrimmed(itemTitle, LIMITS.title),
    year: toTrimmed(typeof source.year === 'number' ? String(source.year) : source.year, LIMITS.paperYear),
    journal: toTrimmed(source.journal, LIMITS.paperJournal),
    authors: toTrimmed(source.authors, LIMITS.paperAuthors),
    doi: toTrimmed(source.doi, LIMITS.paperDoi),
    url: toTrimmed(source.url, LIMITS.paperUrl),
    abstract: toText(source.abstract, LIMITS.paperAbstract),
  }
}

function normalizeSourceDetail(raw) {
  const source = isPlainObject(raw) ? raw : {}
  const detail = {}
  const stringField = (key, maxLength) => {
    if (typeof source[key] === 'string' && source[key] !== '') detail[key] = source[key].slice(0, maxLength)
  }
  stringField('sessionId', LIMITS.sourceDetailId)
  stringField('messageId', LIMITS.sourceDetailId)
  stringField('taskId', LIMITS.sourceDetailId)
  stringField('taskTitle', LIMITS.sourceDetailId)
  stringField('question', LIMITS.sourceDetailQuestion)
  stringField('answer', LIMITS.sourceDetailAnswer)
  return detail
}

function normalizeStatus(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (!STATUSES.includes(value)) throw new HttpError(400, 'status 必须是 todo/doing/done', 'invalid-input')
  return value
}

function enabledModes(settings) {
  const enabled = MODES.filter((mode) => settings?.modes?.[mode] !== false)
  return enabled.length > 0 ? enabled : [DEFAULT_MODE]
}

// ---------------------------------------------------------------- id helpers

function collectIds(taxonomy) {
  const ids = new Set()
  for (const category of taxonomy.categories) {
    ids.add(category.id)
    for (const subcategory of category.subcategories) ids.add(subcategory.id)
  }
  return ids
}

function uniqueHashedId(prefix, existing, seed) {
  let attempt = 0
  for (;;) {
    const hash = createHash('sha1')
      .update(`${seed}:${Date.now()}:${attempt}:${Math.random()}`)
      .digest('hex')
      .slice(0, 8)
    const id = `${prefix}${hash}`
    if (!existing.has(id)) return id
    attempt += 1
  }
}

function newCustomCategoryId(taxonomy, seed = 'category') {
  return uniqueHashedId('custom-cat-', collectIds(taxonomy), seed)
}

function newCustomSubcategoryId(taxonomy, seed = 'subcategory') {
  return uniqueHashedId('custom-', collectIds(taxonomy), seed)
}

function nextCustomCategoryColor(taxonomy) {
  const customCount = taxonomy.categories.filter((category) => isCustomCategoryId(category.id)).length
  return CUSTOM_CATEGORY_PALETTE[customCount % CUSTOM_CATEGORY_PALETTE.length]
}

/** The catch-all 未分类 subcategory of one category (created on demand). */
function ensureInboxSubcategory(taxonomy, category) {
  const existing = category.subcategories.find((subcategory) => subcategory.name === INBOX_NAME)
  if (existing !== undefined) return existing.id
  const id = newCustomSubcategoryId(taxonomy, `inbox:${category.id}`)
  category.subcategories.push({ id, name: INBOX_NAME, en: 'Uncategorized', keywords: [], hidden: false })
  return id
}

/** The catch-all 未分类 category of one mode (created on demand). */
function ensureInbox(taxonomy, mode) {
  let category = taxonomy.categories.find(
    (candidate) => candidate.mode === mode && candidate.preset !== true && candidate.name === INBOX_NAME,
  )
  if (category === undefined) {
    category = {
      id: newCustomCategoryId(taxonomy, `inbox:${mode}`),
      mode,
      name: INBOX_NAME,
      en: 'Uncategorized',
      color: '#9aa4b2',
      glyph: DEFAULT_CUSTOM_GLYPH,
      preset: false,
      hidden: false,
      subcategories: [],
    }
    taxonomy.categories.push(category)
  }
  return { categoryId: category.id, subcategoryId: ensureInboxSubcategory(taxonomy, category) }
}

/**
 * Pick a mode for text that names none: strong surface signals first (paper
 * metadata, formulas), then whichever enabled mode's tree matches best, then
 * the fallback (the caller's active mode, else 日常).
 */
function chooseMode(state, text, options = {}) {
  const enabled = enabledModes(state.settings)
  const detected = detectMode(text, { kind: options.kind, enabled, fallback: options.fallback })
  if (detected.reason !== '') return detected
  let best = null
  for (const mode of enabled) {
    const hit = classifyText(visibleCategories(state.taxonomy, state.settings, mode), text)
    if (hit.categoryId !== '' && hit.confidence >= 0.3 && (best === null || hit.confidence > best.confidence)) {
      best = { mode, confidence: hit.confidence }
    }
  }
  if (best !== null) return { mode: best.mode, reason: `内容与「${MODE_LABELS[best.mode]}」模式下的分类关键词最匹配` }
  return detected
}

// ---------------------------------------------------------------- selection

/**
 * Resolve `{ mode, categoryId, subcategoryId, suggestion? }` for a new or moved item.
 * Auto-classification never leaves the target mode's own category tree.
 */
function resolveSelection(draft, input, classifySource, options = {}) {
  const taxonomy = draft.taxonomy
  let rawCategoryId = toTrimmed(input.categoryId, 200)
  let rawSubcategoryId = toTrimmed(input.subcategoryId, 200)
  const rawMode = toTrimmed(input.mode, 40)
  if (rawMode !== '' && !isMode(rawMode)) throw new HttpError(400, 'mode 必须是 study/academic/daily', 'invalid-input')

  let explicitCategory = rawCategoryId === '' ? undefined : findCategory(taxonomy, rawCategoryId)
  let explicitSub = rawSubcategoryId === '' ? undefined : findSubcategory(taxonomy, rawSubcategoryId)
  if (options.lenientIds === true) {
    // Scheduled prompts may carry ids of categories deleted since; fall back to auto.
    if (explicitCategory === undefined) rawCategoryId = ''
    if (explicitSub === undefined) rawSubcategoryId = ''
    if (explicitSub !== undefined && explicitCategory !== undefined && explicitSub.category.id !== explicitCategory.id) {
      explicitCategory = explicitSub.category
    }
  }
  if (rawCategoryId !== '' && explicitCategory === undefined) throw new HttpError(400, `未知大类：${rawCategoryId}`, 'invalid-input')
  if (rawSubcategoryId !== '' && explicitSub === undefined) throw new HttpError(400, `未知子类：${rawSubcategoryId}`, 'invalid-input')

  if (explicitSub !== undefined) {
    if (explicitCategory !== undefined && explicitCategory.id !== explicitSub.category.id) {
      throw new HttpError(400, '大类与子类不匹配', 'invalid-input')
    }
    return { mode: explicitSub.category.mode, categoryId: explicitSub.category.id, subcategoryId: explicitSub.subcategory.id }
  }

  if (explicitCategory !== undefined) {
    const visibleSubs = explicitCategory.subcategories.filter((subcategory) => subcategory.hidden !== true)
    const suggestion = classifyText([{ ...explicitCategory, subcategories: visibleSubs }], classifySource)
    const subcategoryId = suggestion.subcategoryId !== ''
      ? suggestion.subcategoryId
      : (visibleSubs[0]?.id ?? ensureInboxSubcategory(taxonomy, explicitCategory))
    return { mode: explicitCategory.mode, categoryId: explicitCategory.id, subcategoryId }
  }

  if (options.autoClassify === false) {
    throw new HttpError(400, '缺少类目：请指定 categoryId/subcategoryId 或允许自动归类', 'invalid-input')
  }

  let mode = rawMode
  let modeReason = ''
  if (mode === '') {
    const detected = chooseMode(draft, classifySource, { kind: options.kind, fallback: options.defaultMode })
    mode = detected.mode
    modeReason = detected.reason
  }
  const scope = visibleCategories(taxonomy, draft.settings, mode)
  const suggestion = classifyText(scope, classifySource)
  if (suggestion.categoryId === '') {
    const inbox = ensureInbox(taxonomy, mode)
    return { mode, ...inbox, suggestion: { ...suggestion, ...inbox, mode, modeReason } }
  }
  return {
    mode,
    categoryId: suggestion.categoryId,
    subcategoryId: suggestion.subcategoryId,
    suggestion: { ...suggestion, mode, modeReason },
  }
}

function normalizeKind(value) {
  if (value === undefined || value === null || value === '') return undefined
  if (!KINDS.includes(value)) throw new HttpError(400, 'kind 必须是 knowledge 或 paper', 'invalid-input')
  return value
}

function normalizeSource(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (!SOURCES.includes(value)) throw new HttpError(400, 'source 必须是 conversation/scheduled/manual', 'invalid-input')
  return value
}

// ---------------------------------------------------------------- [[references]]

/** Titles mentioned as [[卡片标题]] in a note body. */
export function extractReferences(content) {
  const titles = []
  if (typeof content !== 'string' || content.indexOf('[[') === -1) return titles
  const pattern = /\[\[([^\[\]\n]{1,300})\]\]/g
  let match = pattern.exec(content)
  while (match !== null) {
    const title = match[1].trim()
    if (title !== '' && !titles.includes(title)) titles.push(title)
    match = pattern.exec(content)
  }
  return titles
}

/** Keep the 正文引用 links owned by `item` in sync with the [[…]] references in its body. */
function syncReferenceLinks(draft, item) {
  const byTitle = new Map()
  for (const other of Object.values(draft.items)) {
    if (other.id === item.id || typeof other.title !== 'string') continue
    const key = other.title.trim().toLowerCase()
    const known = byTitle.get(key)
    if (known === undefined || String(other.createdAt ?? '') > String(known.createdAt ?? '')) byTitle.set(key, other)
  }
  const wanted = new Set()
  for (const title of extractReferences(item.content)) {
    const target = byTitle.get(title.toLowerCase())
    if (target !== undefined) wanted.add(target.id)
  }
  for (const [linkId, link] of Object.entries(draft.links)) {
    if (link.kind !== 'ref' || link.refOwner !== item.id) continue
    const targetId = (link.itemIds ?? []).find((id) => id !== item.id)
    if (targetId !== undefined && wanted.has(targetId)) wanted.delete(targetId)
    else delete draft.links[linkId]
  }
  for (const targetId of wanted) {
    const link = {
      id: newId('ml'),
      kind: 'ref',
      refOwner: item.id,
      itemIds: [item.id, targetId],
      label: REF_LINK_LABEL,
      note: '',
      createdAt: nowIso(),
    }
    draft.links[link.id] = link
  }
}

// ---------------------------------------------------------------- items

function buildItemFromInput(draft, rawInput, options = {}) {
  const input = requireObject(rawInput)
  const requestedKind = normalizeKind(input.kind)
  const title = requireTitle(input.title)
  const tags = normalizeTags(input.tags)
  const summary = requireText(input.summary, LIMITS.summary, '简介')
  const content = requireText(input.content, LIMITS.content, '笔记')
  const source = normalizeSource(input.source, options.defaultSource ?? 'manual')
  const classifySource = buildClassifyText({ title, tags, summary, content, knowledge: input.knowledge, paper: input.paper })

  const selection = resolveSelection(draft, input, classifySource, {
    autoClassify: options.autoClassify,
    lenientIds: options.lenientIds,
    defaultMode: options.defaultMode,
    kind: requestedKind,
  })
  const kind = requestedKind ?? (selection.mode === 'academic' || isPlainObject(input.paper) ? 'paper' : 'knowledge')

  const item = {
    id: newId('kg'),
    mode: selection.mode,
    kind,
    title,
    categoryId: selection.categoryId,
    subcategoryId: selection.subcategoryId,
    tags,
    summary,
    content,
    status: normalizeStatus(input.status, 'todo'),
  }
  if (kind === 'knowledge') item.knowledge = normalizeKnowledge(input.knowledge)
  else item.paper = normalizePaper(input.paper, title)
  item.source = source
  item.sourceDetail = normalizeSourceDetail(input.sourceDetail)
  item.pinned = input.pinned === true
  item.createdAt = nowIso()
  item.updatedAt = item.createdAt
  draft.items[item.id] = item
  syncReferenceLinks(draft, item)
  return { item, suggestion: selection.suggestion }
}

function applyItemPatch(draft, item, rawPatch) {
  const patch = requireObject(rawPatch)
  if (patch.kind !== undefined) item.kind = normalizeKind(patch.kind) ?? item.kind
  if (patch.title !== undefined) item.title = requireTitle(patch.title)
  if (patch.categoryId !== undefined || patch.subcategoryId !== undefined || patch.mode !== undefined) {
    const classifySource = buildClassifyText({
      title: item.title,
      tags: patch.tags !== undefined ? patch.tags : item.tags,
      summary: patch.summary !== undefined ? patch.summary : item.summary,
      content: patch.content !== undefined ? patch.content : item.content,
      paper: patch.paper !== undefined ? patch.paper : item.paper,
    })
    // Moving to another mode without naming a category re-classifies inside that mode.
    const selection = resolveSelection(draft, patch, classifySource, { kind: item.kind })
    item.mode = selection.mode
    item.categoryId = selection.categoryId
    item.subcategoryId = selection.subcategoryId
  }
  if (patch.tags !== undefined) item.tags = normalizeTags(patch.tags)
  if (patch.summary !== undefined) item.summary = requireText(patch.summary, LIMITS.summary, '简介')
  if (patch.content !== undefined) item.content = requireText(patch.content, LIMITS.content, '笔记')
  if (patch.pinned !== undefined) item.pinned = patch.pinned === true
  if (patch.status !== undefined) item.status = normalizeStatus(patch.status, item.status ?? 'todo')
  if (item.kind === 'knowledge') {
    item.knowledge = normalizeKnowledge({
      ...(isPlainObject(item.knowledge) ? item.knowledge : {}),
      ...(isPlainObject(patch.knowledge) ? patch.knowledge : {}),
    })
    // Paper metadata is kept (dormant) so switching kind back does not lose it.
  } else {
    item.paper = normalizePaper({
      ...(isPlainObject(item.paper) ? item.paper : {}),
      ...(isPlainObject(patch.paper) ? patch.paper : {}),
    }, item.title)
  }
  item.updatedAt = nowIso()
  if (patch.content !== undefined) syncReferenceLinks(draft, item)
  return item
}

function removeItem(draft, id) {
  delete draft.items[id]
  let removedLinks = 0
  for (const [linkId, link] of Object.entries(draft.links)) {
    if (Array.isArray(link.itemIds) && link.itemIds.includes(id)) {
      delete draft.links[linkId]
      removedLinks += 1
    }
  }
  return removedLinks
}

// ---------------------------------------------------------------- taxonomy input helpers

function requireDisplayName(value, label) {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new HttpError(400, `${label}必须是字符串`, 'invalid-input')
  }
  const name = typeof value === 'string' ? value.trim() : ''
  if (name === '') throw new HttpError(400, `${label}不能为空`, 'invalid-input')
  if (Array.from(name).length > 40) throw new HttpError(400, `${label}不能超过 40 字`, 'invalid-input')
  return name
}

function normalizeOptionalEn(value, fallback) {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string') throw new HttpError(400, 'en 必须是字符串', 'invalid-input')
  const en = value.trim().slice(0, 60)
  return en === '' ? fallback : en
}

function normalizeColorInput(value) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new HttpError(400, 'color 必须是 #RRGGBB 字符串', 'invalid-input')
  const color = value.trim()
  if (color === '') return undefined
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new HttpError(400, '颜色必须是 #RRGGBB 格式', 'invalid-input')
  return color.toLowerCase()
}

function normalizeGlyphInput(value) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new HttpError(400, 'glyph 必须是 1~2 个字符', 'invalid-input')
  const glyph = value.trim()
  if (glyph === '') return undefined
  // Emoji may span several code points (ZWJ sequences); cap by grapheme-ish length.
  if (Array.from(glyph).length > 8) throw new HttpError(400, '符号过长（1 个 Emoji 或 1~2 个字符）', 'invalid-input')
  return glyph
}

function normalizeKeywordsInput(value) {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new HttpError(400, 'keywords 必须是字符串数组', 'invalid-input')
  return readKeywords(value)
}

function normalizeStyleInput(value) {
  if (value === undefined || value === null || value === '') return ''
  if (!PLANET_STYLES.includes(value)) throw new HttpError(400, `style 必须是 ${PLANET_STYLES.join('/')} 之一`, 'invalid-input')
  return value
}

function requireMode(value) {
  if (!isMode(value)) throw new HttpError(400, 'mode 必须是 study/academic/daily', 'invalid-input')
  return value
}

function itemsIn(draft, predicate) {
  return Object.values(draft.items).filter((item) => isPlainObject(item) && predicate(item))
}

/**
 * Empty a category/subcategory before deletion.
 * `moveTo` (a subcategory id outside the doomed set) re-homes the cards,
 * `purge` deletes them; with neither the caller gets 409 + count.
 */
function evacuate(draft, items, options, doomedSubIds, code, label) {
  if (items.length === 0) return { moved: 0, purged: 0 }
  const moveTo = toTrimmed(options?.moveTo, 200)
  if (moveTo !== '') {
    const target = findSubcategory(draft.taxonomy, moveTo)
    if (target === undefined) throw new HttpError(400, '迁移目标子类不存在', 'invalid-input')
    if (doomedSubIds.has(moveTo)) throw new HttpError(400, '迁移目标不能位于被删除的分类内', 'invalid-input')
    for (const item of items) {
      item.mode = target.category.mode
      item.categoryId = target.category.id
      item.subcategoryId = target.subcategory.id
      item.updatedAt = nowIso()
    }
    return { moved: items.length, purged: 0 }
  }
  if (options?.purge === true) {
    for (const item of items) removeItem(draft, item.id)
    return { moved: 0, purged: items.length }
  }
  throw new HttpError(409, `该${label}下还有 ${items.length} 张卡片，请选择迁移或清空`, code, { count: items.length })
}

/** Item/link/taxonomy/settings operations backed by one shared StateStore. */
export class KnowledgeGalaxyService {
  constructor({ store }) {
    this.store = store
  }

  // ------------------------------------------------------------------ items

  /** Create one item; returns `{ item, suggestion?, revision }`. */
  async addItem(input, options = {}) {
    const { value, revision } = await this.store.mutate((draft) => buildItemFromInput(draft, input, options))
    return {
      item: structuredClone(value.item),
      ...(value.suggestion === undefined ? {} : { suggestion: value.suggestion }),
      revision,
    }
  }

  async updateItem(id, patch) {
    const { value, revision } = await this.store.mutate((draft) => {
      const item = draft.items[id]
      if (item === undefined) throw new HttpError(404, '卡片不存在', 'not-found')
      return applyItemPatch(draft, item, patch)
    })
    return { item: structuredClone(value), revision }
  }

  /**
   * POST /items/batch — move and/or re-status several cards in one revision.
   * `patch` may hold mode / categoryId / subcategoryId (same rules as a single
   * move: a bare mode re-classifies each card inside that mode) and status.
   */
  async updateItems(rawInput) {
    const input = requireObject(rawInput)
    const ids = [...new Set((Array.isArray(input.ids) ? input.ids : []).filter((id) => typeof id === 'string' && id !== ''))]
    if (ids.length === 0) throw new HttpError(400, '请至少选择 1 张卡片', 'invalid-input')
    if (ids.length > 500) throw new HttpError(400, '一次最多处理 500 张卡片', 'invalid-input')
    const source = requireObject(input.patch)
    const patch = {}
    for (const key of ['mode', 'categoryId', 'subcategoryId', 'status']) {
      if (typeof source[key] === 'string' && source[key] !== '') patch[key] = source[key]
    }
    if (Object.keys(patch).length === 0) throw new HttpError(400, '没有可更新的字段', 'invalid-input')
    const { value, revision } = await this.store.mutate((draft) => {
      let updated = 0
      for (const id of ids) {
        const item = draft.items[id]
        if (item === undefined) continue
        applyItemPatch(draft, item, patch)
        updated += 1
      }
      if (updated === 0) throw new HttpError(404, '卡片不存在', 'not-found')
      return updated
    })
    return { updated: value, revision }
  }

  /** Delete one item plus every link that mentions it. */
  async deleteItem(id) {
    const { value, revision } = await this.store.mutate((draft) => {
      if (draft.items[id] === undefined) throw new HttpError(404, '卡片不存在', 'not-found')
      return { removedLinks: removeItem(draft, id) }
    })
    return { removedLinks: value.removedLinks, revision }
  }

  // ------------------------------------------------------------------ links

  /** Create one link between >= 2 existing items (any modes). */
  async addLink(rawInput) {
    const { value, revision } = await this.store.mutate((draft) => {
      const input = requireObject(rawInput)
      const itemIds = []
      const seen = new Set()
      for (const raw of Array.isArray(input.itemIds) ? input.itemIds : []) {
        const id = toTrimmed(raw, 200)
        if (id === '' || seen.has(id)) continue
        seen.add(id)
        itemIds.push(id)
      }
      if (itemIds.length < 2) throw new HttpError(400, '建立联系至少需要 2 张卡片', 'invalid-input')
      for (const id of itemIds) {
        if (draft.items[id] === undefined) throw new HttpError(400, `联系引用的卡片不存在：${id}`, 'invalid-input')
      }
      const label = toTrimmed(input.label, LIMITS.linkLabel)
      if (label === '') throw new HttpError(400, '联系名称不能为空', 'invalid-input')
      const link = {
        id: newId('ml'),
        kind: 'manual',
        itemIds,
        label,
        note: toText(input.note, LIMITS.linkNote),
        createdAt: nowIso(),
      }
      draft.links[link.id] = link
      return structuredClone(link)
    })
    return { link: value, revision }
  }

  /**
   * Link one card to several targets at once (detail-dialog flow): one pairwise
   * link per target, all sharing label + note.
   */
  async addLinksFrom(rawInput) {
    const { value, revision } = await this.store.mutate((draft) => {
      const input = requireObject(rawInput)
      const fromId = toTrimmed(input.fromId, 200)
      if (draft.items[fromId] === undefined) throw new HttpError(400, '当前卡片不存在', 'invalid-input')
      const targets = [...new Set((Array.isArray(input.targetIds) ? input.targetIds : []).map((id) => toTrimmed(id, 200)))]
        .filter((id) => id !== '' && id !== fromId)
      if (targets.length === 0) throw new HttpError(400, '请至少选择 1 张目标卡片', 'invalid-input')
      for (const id of targets) {
        if (draft.items[id] === undefined) throw new HttpError(400, `目标卡片不存在：${id}`, 'invalid-input')
      }
      const label = toTrimmed(input.label, LIMITS.linkLabel)
      if (label === '') throw new HttpError(400, '联系名称不能为空', 'invalid-input')
      const note = toText(input.note, LIMITS.linkNote)
      const created = []
      for (const targetId of targets) {
        const link = { id: newId('ml'), kind: 'manual', itemIds: [fromId, targetId], label, note, createdAt: nowIso() }
        draft.links[link.id] = link
        created.push(structuredClone(link))
      }
      return created
    })
    return { links: value, revision }
  }

  async deleteLink(id) {
    const { revision } = await this.store.mutate((draft) => {
      if (draft.links[id] === undefined) throw new HttpError(404, '联系不存在', 'not-found')
      delete draft.links[id]
    })
    return { revision }
  }

  // ------------------------------------------------------------------ settings

  /** PATCH /settings — mode toggles (>= 1 stays on), math template, landing page. */
  async updateSettings(rawInput) {
    const input = requireObject(rawInput)
    const { value, revision } = await this.store.mutate((draft) => {
      const settings = draft.settings
      if (input.modes !== undefined) {
        const modes = requireObject(input.modes)
        const next = { ...settings.modes }
        for (const mode of MODES) {
          if (modes[mode] === undefined) continue
          if (typeof modes[mode] !== 'boolean') throw new HttpError(400, 'modes 的值必须是布尔值', 'invalid-input')
          next[mode] = modes[mode]
        }
        if (!MODES.some((mode) => next[mode])) throw new HttpError(400, '至少需要保留开启 1 个模式', 'last-mode')
        settings.modes = next
      }
      if (input.mathTemplate !== undefined) {
        if (typeof input.mathTemplate !== 'boolean') throw new HttpError(400, 'mathTemplate 必须是布尔值', 'invalid-input')
        settings.mathTemplate = input.mathTemplate
      }
      if (input.landingMode !== undefined) {
        if (!LANDING_MODES.includes(input.landingMode)) throw new HttpError(400, 'landingMode 无效', 'invalid-input')
        settings.landingMode = input.landingMode
      }
      if (input.landingView !== undefined) {
        if (!LANDING_VIEWS.includes(input.landingView)) throw new HttpError(400, 'landingView 无效', 'invalid-input')
        settings.landingView = input.landingView
      }
      return structuredClone(settings)
    })
    return { settings: value, revision }
  }

  // ------------------------------------------------------------------ taxonomy

  /** POST /taxonomy/categories — create a custom category inside one mode (same name reuses). */
  async createCategory(rawInput) {
    const input = requireObject(rawInput)
    const mode = requireMode(input.mode ?? DEFAULT_MODE)
    const name = requireDisplayName(input.name, '大类名称')
    const en = normalizeOptionalEn(input.en, name)
    const color = normalizeColorInput(input.color)
    const glyph = normalizeGlyphInput(input.glyph)
    const { value, revision } = await this.store.mutate((draft) => {
      const duplicate = draft.taxonomy.categories.find((category) => category.mode === mode && category.name === name)
      if (duplicate !== undefined) return { id: duplicate.id, reused: true }
      const id = newCustomCategoryId(draft.taxonomy)
      draft.taxonomy.categories.push({
        id,
        mode,
        name,
        en,
        color: color ?? nextCustomCategoryColor(draft.taxonomy),
        glyph: glyph ?? DEFAULT_CUSTOM_GLYPH,
        preset: false,
        hidden: false,
        subcategories: [],
      })
      return { id, reused: false }
    })
    return { ...(await this.#taxonomyResult(revision)), categoryId: value.id, reused: value.reused }
  }

  /** PATCH /taxonomy/categories/:id — custom: name/color/glyph/hidden; template: hidden only. */
  async updateCategory(id, rawInput) {
    const input = requireObject(rawInput)
    const name = input.name === undefined ? undefined : requireDisplayName(input.name, '大类名称')
    const color = input.color === undefined ? undefined : normalizeColorInput(input.color)
    const glyph = input.glyph === undefined ? undefined : normalizeGlyphInput(input.glyph)
    const hidden = input.hidden === undefined ? undefined : input.hidden === true
    if (name === undefined && color === undefined && glyph === undefined && hidden === undefined) {
      throw new HttpError(400, '没有可更新的字段', 'invalid-input')
    }
    const { revision } = await this.store.mutate((draft) => {
      const target = findCategory(draft.taxonomy, id)
      if (target === undefined) throw new HttpError(404, '大类不存在', 'not-found')
      if (!isCustomCategoryId(id) && (name !== undefined || color !== undefined || glyph !== undefined)) {
        throw new HttpError(400, '预置模板大类只支持隐藏，不可改名', 'preset-immutable')
      }
      if (name !== undefined) {
        const duplicate = draft.taxonomy.categories.find(
          (category) => category.id !== id && category.mode === target.mode && category.name === name,
        )
        if (duplicate !== undefined) throw new HttpError(400, `同名大类已存在：${name}`, 'invalid-input')
        target.name = name
        if (input.en === undefined) target.en = name
      }
      if (color !== undefined) target.color = color
      if (glyph !== undefined) target.glyph = glyph
      if (hidden !== undefined) target.hidden = hidden
    })
    return { ...(await this.#taxonomyResult(revision)), categoryId: id }
  }

  /** DELETE /taxonomy/categories/:id — custom only; `{ moveTo }` or `{ purge }` when it holds cards. */
  async deleteCategory(id, options = {}) {
    const { value, revision } = await this.store.mutate((draft) => {
      const index = draft.taxonomy.categories.findIndex((category) => category.id === id)
      if (index === -1) throw new HttpError(404, '大类不存在', 'not-found')
      if (!isCustomCategoryId(id)) throw new HttpError(400, '预置模板大类不可删除，可改为隐藏', 'preset-immutable')
      const doomed = new Set(draft.taxonomy.categories[index].subcategories.map((subcategory) => subcategory.id))
      const result = evacuate(
        draft, itemsIn(draft, (item) => item.categoryId === id), options, doomed, 'category-not-empty', '大类',
      )
      draft.taxonomy.categories.splice(index, 1)
      return result
    })
    return { ...(await this.#taxonomyResult(revision)), ...value }
  }

  /** POST /taxonomy/subcategories — create a custom subcategory under any category. */
  async createSubcategory(rawInput) {
    const input = requireObject(rawInput)
    const categoryId = toTrimmed(input.categoryId, 120)
    const name = requireDisplayName(input.name, '子类名称')
    const en = normalizeOptionalEn(input.en, name)
    const keywords = normalizeKeywordsInput(input.keywords)
    const style = normalizeStyleInput(input.style)
    const { value, revision } = await this.store.mutate((draft) => {
      const target = findCategory(draft.taxonomy, categoryId)
      if (target === undefined) throw new HttpError(400, '未知大类', 'invalid-input')
      const duplicate = target.subcategories.find((candidate) => candidate.name === name)
      if (duplicate !== undefined) return { id: duplicate.id, reused: true }
      const subcategoryId = newCustomSubcategoryId(draft.taxonomy)
      const subcategory = { id: subcategoryId, name, en, keywords, hidden: false }
      if (style !== '') subcategory.style = style
      if (input.starred === true) subcategory.starred = true
      target.subcategories.push(subcategory)
      return { id: subcategoryId, reused: false }
    })
    return { ...(await this.#taxonomyResult(revision)), categoryId, subcategoryId: value.id, reused: value.reused }
  }

  /**
   * PATCH /taxonomy/subcategories/:id — custom: name/keywords; any subcategory
   * (template included): hidden, planet style, starred.
   */
  async updateSubcategory(id, rawInput) {
    const input = requireObject(rawInput)
    const name = input.name === undefined ? undefined : requireDisplayName(input.name, '子类名称')
    const keywords = input.keywords === undefined ? undefined : normalizeKeywordsInput(input.keywords)
    const style = input.style === undefined ? undefined : normalizeStyleInput(input.style)
    const hidden = input.hidden === undefined ? undefined : input.hidden === true
    const starred = input.starred === undefined ? undefined : input.starred === true
    if ([name, keywords, style, hidden, starred].every((value) => value === undefined)) {
      throw new HttpError(400, '没有可更新的字段', 'invalid-input')
    }
    const { value, revision } = await this.store.mutate((draft) => {
      const target = findSubcategory(draft.taxonomy, id)
      if (target === undefined) throw new HttpError(404, '子类不存在', 'not-found')
      if (!isCustomSubcategoryId(id) && (name !== undefined || keywords !== undefined)) {
        throw new HttpError(400, '预置模板子类只支持隐藏与外观设置', 'preset-immutable')
      }
      if (name !== undefined) {
        const duplicate = target.category.subcategories.find((candidate) => candidate.id !== id && candidate.name === name)
        if (duplicate !== undefined) throw new HttpError(400, `同名子类已存在：${name}`, 'invalid-input')
        target.subcategory.name = name
        target.subcategory.en = name
      }
      if (keywords !== undefined) target.subcategory.keywords = keywords
      if (hidden !== undefined) target.subcategory.hidden = hidden
      if (style !== undefined) {
        if (style === '') delete target.subcategory.style
        else target.subcategory.style = style
      }
      if (starred !== undefined) {
        if (starred) target.subcategory.starred = true
        else delete target.subcategory.starred
      }
      return target.category.id
    })
    return { ...(await this.#taxonomyResult(revision)), categoryId: value, subcategoryId: id }
  }

  /** DELETE /taxonomy/subcategories/:id — custom only; `{ moveTo }` or `{ purge }` when it holds cards. */
  async deleteSubcategory(id, options = {}) {
    const { value, revision } = await this.store.mutate((draft) => {
      const target = findSubcategory(draft.taxonomy, id)
      if (target === undefined) throw new HttpError(404, '子类不存在', 'not-found')
      if (!isCustomSubcategoryId(id)) throw new HttpError(400, '预置模板子类不可删除，可改为隐藏', 'preset-immutable')
      const result = evacuate(
        draft, itemsIn(draft, (item) => item.subcategoryId === id), options, new Set([id]), 'subcategory-not-empty', '子类',
      )
      const index = target.category.subcategories.findIndex((candidate) => candidate.id === id)
      if (index !== -1) target.category.subcategories.splice(index, 1)
      return result
    })
    return { ...(await this.#taxonomyResult(revision)), ...value }
  }

  /** POST /taxonomy/presets — import one-click packs as ordinary custom categories of `mode`. */
  async importPresets(rawInput) {
    const input = requireObject(rawInput)
    const mode = requireMode(input.mode)
    const packIds = Array.isArray(input.packIds) ? input.packIds.filter((id) => typeof id === 'string') : []
    const packs = packIds.map((id) => {
      const pack = findPresetPack(id)
      if (pack === undefined) throw new HttpError(400, `未知预设包：${id}`, 'invalid-input')
      return pack
    })
    if (packs.length === 0) throw new HttpError(400, '请至少选择 1 个预设包', 'invalid-input')
    const { value, revision } = await this.store.mutate((draft) => {
      let categories = 0
      let subcategories = 0
      for (const pack of packs) {
        for (const preset of pack.categories) {
          let category = draft.taxonomy.categories.find(
            (candidate) => candidate.mode === mode && candidate.name === preset.name,
          )
          if (category === undefined) {
            category = {
              id: newCustomCategoryId(draft.taxonomy, `pack:${pack.id}`),
              mode,
              name: preset.name,
              en: preset.en ?? preset.name,
              color: preset.color ?? nextCustomCategoryColor(draft.taxonomy),
              glyph: preset.glyph ?? DEFAULT_CUSTOM_GLYPH,
              preset: false,
              hidden: false,
              subcategories: [],
            }
            draft.taxonomy.categories.push(category)
            categories += 1
          }
          for (const presetSub of preset.subcategories) {
            if (category.subcategories.some((candidate) => candidate.name === presetSub.name)) continue
            category.subcategories.push({
              id: newCustomSubcategoryId(draft.taxonomy, `pack:${pack.id}`),
              name: presetSub.name,
              en: presetSub.name,
              keywords: readKeywords(presetSub.keywords),
              hidden: false,
            })
            subcategories += 1
          }
        }
      }
      return { categories, subcategories }
    })
    return { ...(await this.#taxonomyResult(revision)), created: value }
  }

  async #taxonomyResult(revision) {
    const state = await this.store.read()
    return { taxonomy: structuredClone(state.taxonomy), revision }
  }

  // ------------------------------------------------------------------ queries

  /**
   * Classify text. With `mode` the match stays inside that mode's tree; without
   * it the mode itself is guessed first.
   */
  async classify(text, options = {}) {
    const state = await this.store.read()
    const source = typeof text === 'string' ? text : ''
    let mode = isMode(options.mode) ? options.mode : ''
    let modeReason = ''
    if (mode === '') {
      const detected = chooseMode(state, source, { kind: options.kind, fallback: isMode(options.fallback) ? options.fallback : undefined })
      mode = detected.mode
      modeReason = detected.reason
    }
    const suggestion = classifyText(visibleCategories(state.taxonomy, state.settings, mode), source)
    return { ...suggestion, mode, modeReason }
  }

  async counts() {
    return buildCounts(await this.store.read())
  }

  /** Display names for one item, for tool summaries. */
  async describeItem(item) {
    const state = await this.store.read()
    const names = categoryNames(state.taxonomy, item.categoryId, item.subcategoryId)
    return {
      ...names,
      modeLabel: MODE_LABELS[item.mode] ?? names.modeLabel,
      kindLabel: KIND_LABELS[item.kind] ?? item.kind,
      sourceLabel: SOURCE_LABELS[item.source] ?? item.source,
      statusLabel: STATUS_LABELS[item.mode]?.[item.status] ?? '',
    }
  }
}

/** Compute the counts block attached to state. */
export function buildCounts(state) {
  const counts = {
    total: 0,
    knowledge: 0,
    paper: 0,
    conversation: 0,
    scheduled: 0,
    manual: 0,
    byMode: { study: 0, academic: 0, daily: 0 },
    byCategory: {},
    bySubcategory: {},
  }
  for (const item of Object.values(state.items ?? {})) {
    if (!isPlainObject(item)) continue
    counts.total += 1
    if (item.kind === 'paper') counts.paper += 1
    else counts.knowledge += 1
    if (SOURCES.includes(item.source)) counts[item.source] += 1
    if (isMode(item.mode)) counts.byMode[item.mode] += 1
    if (typeof item.categoryId === 'string' && item.categoryId !== '') {
      counts.byCategory[item.categoryId] = (counts.byCategory[item.categoryId] ?? 0) + 1
    }
    if (typeof item.subcategoryId === 'string' && item.subcategoryId !== '') {
      counts.bySubcategory[item.subcategoryId] = (counts.bySubcategory[item.subcategoryId] ?? 0) + 1
    }
  }
  return counts
}

/** Items newest-first, as returned by GET /state and tool list. */
export function sortedItems(state) {
  return Object.values(state.items ?? {})
    .filter(isPlainObject)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
}

export function sortedLinks(state) {
  return Object.values(state.links ?? {})
    .filter(isPlainObject)
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
}

export { isPlainObject }
