// knowledge-galaxy taxonomy: three modes, each with its own category tree.
// 学习 (study) ships the built-in mathematics template; 学术 (academic) and
// 日常 (daily) are fully user-defined. Pure data + helpers, node built-ins only.

import { MATH_PRESET_CATEGORIES } from './preset-math.js'

export const TAXONOMY_VERSION = 2

export const MODES = ['study', 'academic', 'daily']
export const MODE_LABELS = { study: '学习', academic: '学术', daily: '日常' }
export const DEFAULT_MODE = 'study'

/** Id prefix of a user-created category; everything else is preset. */
export const CUSTOM_CATEGORY_PREFIX = 'custom-cat-'
/** Id prefix of a user-created subcategory. */
export const CUSTOM_SUBCATEGORY_PREFIX = 'custom-'
export const DEFAULT_CUSTOM_GLYPH = '✦'
export const DEFAULT_CUSTOM_COLOR = '#9db4ff'
export const CUSTOM_CATEGORY_PALETTE = [
  '#f472b6', '#fb923c', '#34d399', '#60a5fa',
  '#a78bfa', '#f87171', '#facc15', '#2dd4bf',
]
/** Planet looks a subcategory can be pinned to ('' = derived from the id hash). */
export const PLANET_STYLES = ['ringed', 'banded', 'rocky', 'ice', 'dune']
/** Name of the catch-all category/subcategory created on demand. */
export const INBOX_NAME = '未分类'

export function isMode(value) {
  return MODES.includes(value)
}

export function isCustomCategoryId(id) {
  return typeof id === 'string' && id.startsWith(CUSTOM_CATEGORY_PREFIX)
}

export function isCustomSubcategoryId(id) {
  return typeof id === 'string' && id.startsWith(CUSTOM_SUBCATEGORY_PREFIX) && !id.startsWith(CUSTOM_CATEGORY_PREFIX)
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value
  for (const key of Object.keys(value)) deepFreeze(value[key])
  return Object.freeze(value)
}

const DEEP_FROZEN = deepFreeze(MATH_PRESET_CATEGORIES)

/** Fresh (mutable) taxonomy holding only the built-in mathematics template. */
export function createTaxonomy() {
  const categories = structuredClone(DEEP_FROZEN).map((category) => ({
    ...category,
    mode: 'study',
    preset: true,
    hidden: false,
    subcategories: category.subcategories.map((subcategory) => ({ ...subcategory, hidden: false })),
  }))
  return { version: TAXONOMY_VERSION, categories }
}

export function findCategory(taxonomy, categoryId) {
  if (!taxonomy || !Array.isArray(taxonomy.categories) || typeof categoryId !== 'string') return undefined
  return taxonomy.categories.find((category) => category.id === categoryId)
}

/** Look up one subcategory by id; returns `{ category, subcategory }` or undefined. */
export function findSubcategory(taxonomy, subcategoryId) {
  if (!taxonomy || !Array.isArray(taxonomy.categories) || typeof subcategoryId !== 'string') return undefined
  for (const category of taxonomy.categories) {
    const subcategory = (category.subcategories ?? []).find((candidate) => candidate.id === subcategoryId)
    if (subcategory !== undefined) return { category, subcategory }
  }
  return undefined
}

/** Mode of a category id ('study' when unknown). */
export function modeOfCategory(taxonomy, categoryId) {
  const category = findCategory(taxonomy, categoryId)
  return category !== undefined && isMode(category.mode) ? category.mode : DEFAULT_MODE
}

export function categoryNames(taxonomy, categoryId, subcategoryId) {
  const category = findCategory(taxonomy, categoryId)
  const found = findSubcategory(taxonomy, subcategoryId)
  return {
    modeLabel: MODE_LABELS[category?.mode] ?? '',
    categoryName: category?.name ?? categoryId ?? '',
    subcategoryName: found?.subcategory?.name ?? subcategoryId ?? '',
  }
}

/**
 * Categories a classifier / picker may use for one mode: not hidden, and the
 * mathematics template only while `settings.mathTemplate` is on. Hidden
 * subcategories are dropped from the returned copies.
 */
export function visibleCategories(taxonomy, settings, mode) {
  const mathOn = settings?.mathTemplate !== false
  const result = []
  for (const category of taxonomy?.categories ?? []) {
    if (mode !== undefined && mode !== 'all' && category.mode !== mode) continue
    if (category.hidden === true) continue
    if (category.preset === true && !mathOn) continue
    result.push({
      ...category,
      subcategories: (category.subcategories ?? []).filter((subcategory) => subcategory.hidden !== true),
    })
  }
  return result
}

function readString(value, maxLength) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return maxLength === undefined ? trimmed : trimmed.slice(0, maxLength)
}

function readColor(value) {
  if (typeof value !== 'string') return undefined
  const color = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : undefined
}

function readGlyph(value) {
  if (typeof value !== 'string') return undefined
  const glyph = value.trim()
  if (glyph === '') return undefined
  return Array.from(glyph).slice(0, 2).join('')
}

export function readKeywords(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const keywords = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const keyword = raw.trim().slice(0, 40)
    if (keyword === '' || seen.has(keyword)) continue
    seen.add(keyword)
    keywords.push(keyword)
    if (keywords.length >= 50) break
  }
  return keywords
}

function readStyle(value) {
  return PLANET_STYLES.includes(value) ? value : ''
}

/** Per-subcategory appearance overrides that survive for preset entries too. */
function applySubcategoryExtras(target, stored) {
  target.hidden = stored?.hidden === true
  const style = readStyle(stored?.style)
  if (style !== '') target.style = style
  else delete target.style
  if (stored?.starred === true) target.starred = true
  else delete target.starred
}

/**
 * Merge a persisted taxonomy with the frozen template:
 * - template ids/names/keywords always win; only hidden/style/starred persist,
 * - `custom-cat-*` categories are restored with their mode ('study' when absent),
 * - `custom-*` subcategories are re-attached to their parent,
 * - unknown non-custom entries are dropped.
 */
export function normalizeTaxonomy(stored) {
  const taxonomy = createTaxonomy()
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.categories)) return taxonomy

  const storedById = new Map()
  for (const storedCategory of stored.categories) {
    if (storedCategory && typeof storedCategory === 'object' && typeof storedCategory.id === 'string') {
      storedById.set(storedCategory.id, storedCategory)
    }
  }

  const seenCategoryIds = new Set(taxonomy.categories.map((category) => category.id))
  const seenSubcategoryIds = new Set()
  for (const category of taxonomy.categories) {
    const storedCategory = storedById.get(category.id)
    category.hidden = storedCategory?.hidden === true
    const storedSubs = new Map(
      (Array.isArray(storedCategory?.subcategories) ? storedCategory.subcategories : [])
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => [entry.id, entry]),
    )
    for (const subcategory of category.subcategories) {
      seenSubcategoryIds.add(subcategory.id)
      applySubcategoryExtras(subcategory, storedSubs.get(subcategory.id))
    }
  }

  let customCount = 0
  for (const storedCategory of stored.categories) {
    if (!storedCategory || typeof storedCategory !== 'object') continue
    const id = readString(storedCategory.id, 120)
    if (!isCustomCategoryId(id) || seenCategoryIds.has(id)) continue
    const name = readString(storedCategory.name, 40)
    if (name === '') continue
    taxonomy.categories.push({
      id,
      mode: isMode(storedCategory.mode) ? storedCategory.mode : DEFAULT_MODE,
      name,
      en: readString(storedCategory.en, 60) || name,
      color: readColor(storedCategory.color) ?? CUSTOM_CATEGORY_PALETTE[customCount % CUSTOM_CATEGORY_PALETTE.length],
      glyph: readGlyph(storedCategory.glyph) ?? DEFAULT_CUSTOM_GLYPH,
      preset: false,
      hidden: storedCategory.hidden === true,
      subcategories: [],
    })
    customCount += 1
    seenCategoryIds.add(id)
  }

  for (const storedCategory of stored.categories) {
    if (!storedCategory || typeof storedCategory !== 'object') continue
    const parent = findCategory(taxonomy, readString(storedCategory.id, 120))
    if (parent === undefined || !Array.isArray(storedCategory.subcategories)) continue
    for (const storedSub of storedCategory.subcategories) {
      if (!storedSub || typeof storedSub !== 'object') continue
      const id = readString(storedSub.id, 120)
      const name = readString(storedSub.name, 40)
      if (!isCustomSubcategoryId(id) || name === '' || seenSubcategoryIds.has(id)) continue
      seenSubcategoryIds.add(id)
      const subcategory = { id, name, en: readString(storedSub.en, 60) || name, keywords: readKeywords(storedSub.keywords) }
      applySubcategoryExtras(subcategory, storedSub)
      parent.subcategories.push(subcategory)
    }
  }

  return taxonomy
}
