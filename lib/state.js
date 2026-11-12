// knowledge-galaxy persistent state: atomic JSON writes, revision, corruption
// recovery, and one-time migration from the legacy math-universe store.
// Only node: built-ins are used.

import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { createTaxonomy, normalizeTaxonomy, findCategory, findSubcategory, MODES, DEFAULT_MODE } from './taxonomy.js'

export const STATE_VERSION = 2
export const STATUSES = ['todo', 'doing', 'done']
export const LANDING_MODES = ['last', 'all', ...MODES]
export const LANDING_VIEWS = ['group', 'timeline']

function dshHome() {
  const home = typeof process.env.DSH_HOME === 'string' ? process.env.DSH_HOME.trim() : ''
  return home !== '' ? home : join(homedir(), '.dsh')
}

/** `${DSH_HOME || ~/.dsh}/storages/knowledge-galaxy`. */
export function storageDir() {
  return join(dshHome(), 'storages', 'knowledge-galaxy')
}

/** Where math-universe (<= 0.2.0) kept its state; read once for migration, never written. */
export function legacyStateFile() {
  return join(dshHome(), 'storages', 'math-universe', 'state.json')
}

export function defaultSettings() {
  return {
    modes: { study: true, academic: true, daily: true },
    mathTemplate: true,
    landingMode: 'last',
    landingView: 'group',
  }
}

export function defaultState() {
  return {
    version: STATE_VERSION,
    revision: 0,
    settings: defaultSettings(),
    taxonomy: createTaxonomy(),
    items: {},
    links: {},
    scheduleTasks: {},
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeRecordMap(value, requiredKey) {
  const result = {}
  if (!isPlainObject(value)) return result
  for (const [key, entry] of Object.entries(value)) {
    if (!isPlainObject(entry)) continue
    if (typeof entry[requiredKey] !== 'string') continue
    result[key] = entry
  }
  return result
}

export function normalizeSettings(raw) {
  const settings = defaultSettings()
  if (!isPlainObject(raw)) return settings
  if (isPlainObject(raw.modes)) {
    for (const mode of MODES) {
      if (typeof raw.modes[mode] === 'boolean') settings.modes[mode] = raw.modes[mode]
    }
  }
  if (!MODES.some((mode) => settings.modes[mode])) settings.modes[DEFAULT_MODE] = true
  if (typeof raw.mathTemplate === 'boolean') settings.mathTemplate = raw.mathTemplate
  if (LANDING_MODES.includes(raw.landingMode)) settings.landingMode = raw.landingMode
  if (LANDING_VIEWS.includes(raw.landingView)) settings.landingView = raw.landingView
  return settings
}

/**
 * Coerce a parsed file (v1 math-universe or v2) into a valid v2 state.
 * v1 items carry no mode/status: mode follows the category (every v1 category
 * becomes a 学习 category) and status starts at 'todo'.
 */
export function normalizeState(parsed) {
  if (!isPlainObject(parsed)) throw new Error('state root must be an object')
  const revision = Number.isSafeInteger(parsed.revision) && parsed.revision >= 0 ? parsed.revision : 0
  const taxonomy = normalizeTaxonomy(parsed.taxonomy)
  const items = normalizeRecordMap(parsed.items, 'id')
  for (const item of Object.values(items)) {
    const found = findSubcategory(taxonomy, item.subcategoryId)
    const category = found?.category ?? findCategory(taxonomy, item.categoryId)
    item.mode = category?.mode ?? (MODES.includes(item.mode) ? item.mode : DEFAULT_MODE)
    if (!STATUSES.includes(item.status)) item.status = 'todo'
  }
  const links = normalizeRecordMap(parsed.links, 'id')
  for (const link of Object.values(links)) {
    if (link.kind !== 'ref') link.kind = 'manual'
  }
  const scheduleTasks = normalizeRecordMap(parsed.scheduleTasks, 'id')
  for (const task of Object.values(scheduleTasks)) {
    if (!MODES.includes(task.mode)) {
      // Created by math-universe: its prompt still calls the math_universe tool alias.
      task.mode = DEFAULT_MODE
      task.legacyTool = true
    }
  }
  return {
    version: STATE_VERSION,
    revision,
    settings: normalizeSettings(parsed.settings),
    taxonomy,
    items,
    links,
    scheduleTasks,
  }
}

function timestampSuffix() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * One JSON state file under `storages/knowledge-galaxy/state.json`.
 * Reads are lazy and memoized; mutations are serialized through a promise chain
 * so concurrent HTTP requests and tool calls share one revision sequence.
 */
export class StateStore {
  constructor(options = {}) {
    this.dir = options.dir ?? storageDir()
    this.file = options.file ?? join(this.dir, 'state.json')
    this.legacyFile = options.legacyFile === undefined ? legacyStateFile() : options.legacyFile
    this.logger = options.logger
    this.state = null
    this.loading = null
    this.chain = Promise.resolve()
    /** 'math-universe' when this run imported the legacy store. */
    this.migratedFrom = null
  }

  warn(message) {
    try {
      this.logger?.warn?.(`[knowledge-galaxy] ${message}`)
    } catch {
      // logging must never break state handling
    }
  }

  async load() {
    if (this.state !== null) return this.state
    if (this.loading !== null) return this.loading
    this.loading = this.#loadFromDisk()
      .then((state) => {
        this.state = state
        return state
      })
      .finally(() => {
        this.loading = null
      })
    return this.loading
  }

  async #loadFromDisk() {
    let raw
    try {
      raw = await readFile(this.file, 'utf8')
    } catch (error) {
      if (error && error.code === 'ENOENT') return this.#migrateLegacy()
      this.warn(`读取状态文件失败，使用默认状态：${String(error)}`)
      await this.#backupCorrupt()
      return defaultState()
    }
    try {
      return normalizeState(JSON.parse(raw))
    } catch (error) {
      this.warn(`状态文件损坏，已备份并重置：${String(error)}`)
      await this.#backupCorrupt()
      return defaultState()
    }
  }

  /** First run after the rename: import math-universe/state.json (left untouched as a backup). */
  async #migrateLegacy() {
    if (typeof this.legacyFile !== 'string' || this.legacyFile === '') return defaultState()
    let raw
    try {
      raw = await readFile(this.legacyFile, 'utf8')
    } catch {
      return defaultState()
    }
    try {
      const state = normalizeState(JSON.parse(raw))
      await this.#persist(state)
      this.migratedFrom = 'math-universe'
      this.warn(`已从 math-universe 迁移 ${Object.keys(state.items).length} 条内容（原文件保留未动）`)
      return state
    } catch (error) {
      this.warn(`迁移 math-universe 数据失败，使用默认状态：${String(error)}`)
      return defaultState()
    }
  }

  async #backupCorrupt() {
    try {
      await mkdir(dirname(this.file), { recursive: true })
      await copyFile(this.file, `${this.file}.bak-${timestampSuffix()}`)
    } catch {
      // backup is best effort
    }
  }

  /** Wait for pending writes, then return the current state reference. */
  async read() {
    await this.load()
    await this.chain
    return this.state
  }

  /**
   * Apply one serialized mutation.
   * @param {(draft: object) => any} mutator - mutates the draft and returns a value.
   * @returns {Promise<{ value: any, revision: number }>}
   */
  async mutate(mutator) {
    const run = async () => {
      const current = await this.load()
      const draft = structuredClone(current)
      const value = await mutator(draft)
      draft.revision = (Number.isSafeInteger(current.revision) ? current.revision : 0) + 1
      await this.#persist(draft)
      this.state = draft
      return { value, revision: draft.revision }
    }
    const previous = this.chain
    const task = previous.then(run, run)
    this.chain = task.then(() => undefined, () => undefined)
    return task
  }

  async #persist(draft) {
    await mkdir(dirname(this.file), { recursive: true })
    const temp = `${this.file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`
    try {
      await writeFile(temp, `${JSON.stringify(draft, null, 2)}\n`, 'utf8')
      await rename(temp, this.file)
    } finally {
      try {
        await unlink(temp)
      } catch {
        // temp file already renamed or never created
      }
    }
  }
}
