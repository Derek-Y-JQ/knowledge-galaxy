// knowledge-galaxy HTTP API router.
// One prefix route owned by lib/index.js delegates here; every endpoint answers
// JSON and no exception is allowed to bubble into the webServer.

import { HttpError, buildCounts, sortedItems, sortedLinks, STATUS_LABELS } from './service.js'
import { presetPackSummaries } from './presets.js'
import { MODES, MODE_LABELS, PLANET_STYLES } from './taxonomy.js'
import { checkForUpdate, REPOSITORY_URL } from './update.js'

export const ROUTE_PREFIX = '/knowledge-galaxy/api'
const MAX_BODY_BYTES = 1024 * 1024
const ALLOW_HEADER = 'GET, POST, PATCH, DELETE, OPTIONS'
const JSON_TYPE = 'application/json; charset=utf-8'

function json(res, status, payload, extraHeaders = {}) {
  if (res.headersSent) {
    try {
      res.end()
    } catch {
      // response already unusable
    }
    return
  }
  res.writeHead(status, { 'cache-control': 'no-store', 'content-type': JSON_TYPE, ...extraHeaders })
  res.end(JSON.stringify(payload))
}

function nowIso() {
  return new Date().toISOString()
}

function checkSameOrigin(req) {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || origin === '') return
  const host = req.headers.host
  if (typeof host !== 'string' || host === '') throw new HttpError(403, '请求来源不被允许', 'forbidden')
  let parsed
  try {
    parsed = new URL(origin)
  } catch {
    throw new HttpError(403, '请求来源不被允许', 'forbidden')
  }
  if (parsed.host !== host) throw new HttpError(403, '请求来源不被允许', 'forbidden')
}

function readJsonBody(req, { optional = false } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (error) => {
      if (settled) return
      settled = true
      try {
        req.resume()
      } catch {
        // ignore stream teardown failures
      }
      reject(error)
    }
    const declared = Number(req.headers['content-length'] ?? '0')
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      fail(new HttpError(413, '请求体超过 1MB 限制', 'payload-too-large'))
      return
    }
    const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
    if (!contentType.startsWith('application/json')) {
      if (optional) {
        settled = true
        req.resume()
        resolve({})
        return
      }
      fail(new HttpError(400, '请求体必须是 application/json', 'invalid-content-type'))
      return
    }
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        fail(new HttpError(413, '请求体超过 1MB 限制', 'payload-too-large'))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.trim() === '') {
        resolve({})
        return
      }
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        reject(new HttpError(400, '请求体 JSON 解析失败', 'invalid-json'))
        return
      }
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        reject(new HttpError(400, '请求体必须是 JSON 对象', 'invalid-body'))
        return
      }
      resolve(parsed)
    })
    req.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
  })
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    throw new HttpError(400, '路径参数编码无效', 'invalid-path')
  }
}

/** `?moveTo=<subcategoryId>` / `?purge=1` on taxonomy DELETEs. */
function deleteOptions(url) {
  return {
    moveTo: url.searchParams.get('moveTo') ?? '',
    purge: ['1', 'true'].includes(url.searchParams.get('purge') ?? ''),
  }
}

const METHOD_NOT_ALLOWED = () => new HttpError(405, '不支持的请求方法', 'method-not-allowed')

/**
 * @param {{
 *   store: import('./state.js').StateStore,
 *   service: import('./service.js').KnowledgeGalaxyService,
 *   scheduleBridge: ReturnType<import('./schedule.js').createScheduleBridge>,
 *   health: object,
 *   logger?: any,
 * }} deps
 */
export function createRouter({ store, service, scheduleBridge, health, logger }) {
  const warn = (message) => {
    try {
      logger?.warn?.(`[knowledge-galaxy] ${message}`)
    } catch {
      // ignore logging failures
    }
  }

  async function dispatch(req, res) {
    const method = String(req.method ?? 'GET').toUpperCase()
    const url = new URL(req.url ?? '/', 'http://localhost')
    const pathname = url.pathname

    if (method === 'OPTIONS') {
      res.writeHead(204, { allow: ALLOW_HEADER, 'cache-control': 'no-store' })
      res.end()
      return
    }
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
      json(res, 405, { ok: false, error: '不支持的请求方法', code: 'method-not-allowed' }, { allow: ALLOW_HEADER })
      return
    }
    checkSameOrigin(req)

    const subPath = pathname.startsWith(ROUTE_PREFIX) ? pathname.slice(ROUTE_PREFIX.length) : pathname
    const seg = subPath.split('/').filter((segment) => segment !== '')
    const is = (...parts) => seg.length === parts.length && parts.every((part, index) => part === null || part === seg[index])

    if (is('state')) {
      if (method !== 'GET') throw METHOD_NOT_ALLOWED()
      const state = await store.read()
      const schedule = await scheduleBridge.overview()
      json(res, 200, {
        ok: true,
        revision: state.revision,
        settings: state.settings,
        taxonomy: state.taxonomy,
        items: sortedItems(state),
        links: sortedLinks(state),
        counts: buildCounts(state),
        scheduleTasks: schedule.tasks,
        scheduleCandidates: schedule.candidates,
        scheduleAvailable: scheduleBridge.available(),
        presetPacks: presetPackSummaries(),
        meta: { modes: MODES, modeLabels: MODE_LABELS, statusLabels: STATUS_LABELS, planetStyles: PLANET_STYLES },
        version: health.version ?? null,
        repositoryUrl: REPOSITORY_URL,
        health: {
          toolRegistered: health.toolRegistered === true,
          clientReady: health.clientReady === true,
          clientVersion: health.clientVersion ?? null,
          lastClientReportAt: health.lastClientReportAt ?? null,
          lastClientError: health.lastClientError ?? null,
        },
      })
      return
    }

    if (is('health')) {
      if (method !== 'GET') throw METHOD_NOT_ALLOWED()
      const state = await store.read()
      json(res, 200, {
        ok: true,
        revision: state.revision,
        itemCount: Object.keys(state.items ?? {}).length,
        toolRegistered: health.toolRegistered === true,
        clientReady: health.clientReady === true,
      })
      return
    }

    if (is('update')) {
      if (method !== 'GET') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await checkForUpdate(health.version ?? '0.0.0')) })
      return
    }

    if (is('settings')) {
      if (method !== 'PATCH') throw METHOD_NOT_ALLOWED()
      const result = await service.updateSettings(await readJsonBody(req))
      json(res, 200, { ok: true, ...result })
      return
    }

    if (is('classify')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      const body = await readJsonBody(req)
      if (typeof body.text !== 'string') throw new HttpError(400, '缺少 text 字段（字符串）', 'invalid-input')
      const suggestion = await service.classify(body.text, { mode: body.mode, kind: body.kind, fallback: body.fallback })
      json(res, 200, { ok: true, suggestion })
      return
    }

    if (is('items')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      const result = await service.addItem(await readJsonBody(req), { defaultSource: 'manual' })
      json(res, 200, { ok: true, ...result })
      return
    }

    if (is('items', 'batch')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await service.updateItems(await readJsonBody(req))) })
      return
    }

    if (is('items', null)) {
      const id = decodeSegment(seg[1])
      if (method === 'PATCH') {
        json(res, 200, { ok: true, ...(await service.updateItem(id, await readJsonBody(req))) })
        return
      }
      if (method === 'DELETE') {
        json(res, 200, { ok: true, ...(await service.deleteItem(id)) })
        return
      }
      throw METHOD_NOT_ALLOWED()
    }

    if (is('links')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      const body = await readJsonBody(req)
      // `{ fromId, targetIds }` = detail-dialog flow (one pairwise link per target).
      const result = typeof body.fromId === 'string' ? await service.addLinksFrom(body) : await service.addLink(body)
      json(res, 200, { ok: true, ...result })
      return
    }

    if (is('links', null)) {
      if (method !== 'DELETE') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await service.deleteLink(decodeSegment(seg[1]))) })
      return
    }

    if (is('taxonomy', 'presets')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await service.importPresets(await readJsonBody(req))) })
      return
    }

    if (is('taxonomy', 'categories')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await service.createCategory(await readJsonBody(req))) })
      return
    }

    if (is('taxonomy', 'categories', null)) {
      const id = decodeSegment(seg[2])
      if (method === 'PATCH') {
        json(res, 200, { ok: true, ...(await service.updateCategory(id, await readJsonBody(req))) })
        return
      }
      if (method === 'DELETE') {
        json(res, 200, { ok: true, ...(await service.deleteCategory(id, deleteOptions(url))) })
        return
      }
      throw METHOD_NOT_ALLOWED()
    }

    if (is('taxonomy', 'subcategories')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await service.createSubcategory(await readJsonBody(req))) })
      return
    }

    if (is('taxonomy', 'subcategories', null)) {
      const id = decodeSegment(seg[2])
      if (method === 'PATCH') {
        json(res, 200, { ok: true, ...(await service.updateSubcategory(id, await readJsonBody(req))) })
        return
      }
      if (method === 'DELETE') {
        json(res, 200, { ok: true, ...(await service.deleteSubcategory(id, deleteOptions(url))) })
        return
      }
      throw METHOD_NOT_ALLOWED()
    }

    if (is('schedule', 'tasks')) {
      if (method === 'GET') {
        json(res, 200, { ok: true, tasks: await scheduleBridge.listTasks({ requireService: true }) })
        return
      }
      if (method === 'POST') {
        json(res, 200, { ok: true, ...(await scheduleBridge.createTask(await readJsonBody(req))) })
        return
      }
      throw METHOD_NOT_ALLOWED()
    }

    if (is('schedule', 'tasks', null)) {
      if (method !== 'DELETE') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await scheduleBridge.deleteTask(decodeSegment(seg[2]))) })
      return
    }

    if (is('schedule', 'tasks', null, 'adopt')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      json(res, 200, { ok: true, ...(await scheduleBridge.adoptTask(decodeSegment(seg[2]), await readJsonBody(req))) })
      return
    }

    if (is('schedule', 'tasks', null, 'unlink')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      await readJsonBody(req, { optional: true })
      json(res, 200, { ok: true, ...(await scheduleBridge.unlinkTask(decodeSegment(seg[2]))) })
      return
    }

    if (is('schedule', 'tasks', null, 'run')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      await readJsonBody(req, { optional: true })
      const result = await scheduleBridge.runTask(decodeSegment(seg[2]))
      json(res, 200, { ok: true, ...(result.pending === true ? { pending: true } : {}) })
      return
    }

    if (is('client', 'report')) {
      if (method !== 'POST') throw METHOD_NOT_ALLOWED()
      const body = await readJsonBody(req)
      if (body.event !== 'ready' && body.event !== 'error') {
        throw new HttpError(400, 'event 必须是 ready 或 error', 'invalid-input')
      }
      const version = typeof body.version === 'string' ? body.version.slice(0, 100) : ''
      const detail = typeof body.detail === 'string' ? body.detail.slice(0, 2000) : ''
      if (body.event === 'ready') {
        health.clientReady = true
        if (version !== '') health.clientVersion = version
      } else {
        health.lastClientError = detail === '' ? '客户端未知错误' : detail
      }
      health.lastClientReportAt = nowIso()
      json(res, 200, { ok: true })
      return
    }

    json(res, 404, { ok: false, error: '未找到该接口', code: 'not-found' })
  }

  return function handler(req, res) {
    void dispatch(req, res).catch((error) => {
      if (error instanceof HttpError) {
        const headers = error.status === 405 ? { allow: ALLOW_HEADER } : {}
        json(
          res,
          error.status,
          { ok: false, error: error.message, ...(error.code === undefined ? {} : { code: error.code }), ...(error.details ?? {}) },
          headers,
        )
        return
      }
      warn(`处理请求失败：${error instanceof Error ? (error.stack ?? error.message) : String(error)}`)
      json(res, 500, { ok: false, error: '服务器内部错误', code: 'internal' })
    })
  }
}
