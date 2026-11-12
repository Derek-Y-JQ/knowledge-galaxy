    // =====================================================================
    // 00-core — constants, utilities, HTTP, store, derived model
    // =====================================================================

    const React = require('react')
    const ReactDOM = require('react-dom')
    // Platform Markdown + KaTeX renderer; probed defensively so a host without
    // ui-primitives still works (falls back to a light local renderer).
    let primitives = null
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives')
    } catch (_error) {
      primitives = null
    }
    const MarkdownText = primitives
      ? primitives.MarkdownText || (primitives.default && primitives.default.MarkdownText) || null
      : null
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef, useCallback } = React
    const createPortal = (ReactDOM && (ReactDOM.createPortal || (ReactDOM.default && ReactDOM.default.createPortal))) || null

    const NS = 'knowledgeGalaxy'
    const VERSION = '1.0.0'
    const PLUGIN_ID = 'knowledge-galaxy'
    const API_BASE = '/knowledge-galaxy/api'
    const UNKNOWN_COLOR = '#9aa4b2'
    const MODES = ['study', 'academic', 'daily']
    const MODE_META = {
      all: { label: '全部', color: '#64748b', icon: '🌌' },
      study: { label: '学习', color: '#4f7cff', icon: '🎓' },
      academic: { label: '学术', color: '#8b5cf6', icon: '📄' },
      daily: { label: '日常', color: '#10a37f', icon: '☕' },
    }
    const STATUSES = ['todo', 'doing', 'done']
    const STATUS_LABELS = {
      study: { todo: '待理解', doing: '复习中', done: '已掌握' },
      academic: { todo: '待读', doing: '精读中', done: '已读完' },
      daily: { todo: '备忘', doing: '进行中', done: '已归档' },
    }
    const STATUS_GENERIC = { todo: '未开始', doing: '进行中', done: '已完成' }
    const SOURCE_META = {
      conversation: { label: '对话收录', icon: '💬' },
      scheduled: { label: '定时任务', icon: '⏰' },
      manual: { label: '手动新建', icon: '✍️' },
    }
    const SOURCES = ['conversation', 'scheduled', 'manual']
    const PLANET_STYLE_LABELS = {
      '': '自动（按子类哈希）',
      ringed: '环状巨行星',
      banded: '条纹气态行星',
      rocky: '岩石陨石坑行星',
      ice: '冰晶 / 海洋行星',
      dune: '荒漠 / 熔岩行星',
    }
    const LINK_PRESETS = ['前置知识', '应用实例', '论文实现', '观点补充', '反例对比', '同课题延伸']
    const REF_LINK_LABEL = '正文引用'
    const WEEKDAY_CHARS = ['一', '二', '三', '四', '五', '六', '日']
    const PALETTE = ['#4f7cff', '#8b5cf6', '#f472b6', '#fb923c', '#facc15', '#34d399', '#2dd4bf', '#60a5fa', '#f87171', '#a3a3a3']
    const DEFAULT_SETTINGS = { modes: { study: true, academic: true, daily: true }, mathTemplate: true, landingMode: 'last', landingView: 'group' }

    // Services captured in apply(); readTurn() needs sessions + uiConversation.
    const services = { ctx: null, sessions: null, uiConversation: null, layout: null, lastSessionId: '' }
    // (sessionId, messageId) pairs already collected during this page lifetime.
    const collectedKeys = Object.create(null)

    if (typeof window !== 'undefined') {
      window.__KG_MD_DEBUG__ = { hasPrimitives: !!primitives, usingHostMarkdown: MarkdownText !== null }
    }

    // ---------------------------------------------------------------- utilities

    function report(event, detail) {
      try {
        fetch(API_BASE + '/client/report', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event, version: VERSION, detail: detail == null ? undefined : String(detail) }),
        }).catch(() => {})
      } catch (_error) {
        // Reporting must never break the plugin.
      }
    }

    const cx = (...parts) => parts.filter(Boolean).join(' ')
    const pad2 = (value) => (value < 10 ? '0' + value : String(value))

    function truncateText(text, max) {
      const value = String(text == null ? '' : text)
      return value.length <= max ? value : value.slice(0, max) + '…'
    }

    function splitList(text) {
      return String(text || '')
        .split(/[,，;；、\n]/)
        .map((part) => part.trim())
        .filter(Boolean)
    }

    function lsGet(key, fallback) {
      try {
        const value = window.localStorage.getItem('kg:' + key)
        return value === null ? fallback : value
      } catch (_error) {
        return fallback
      }
    }

    function lsSet(key, value) {
      try {
        window.localStorage.setItem('kg:' + key, String(value))
      } catch (_error) {
        // private mode etc. — preference just does not persist
      }
    }

    /** useState persisted to localStorage (per-browser view preferences only). */
    function usePref(key, fallback, allowed) {
      const [value, setValue] = useState(() => {
        const stored = lsGet(key, fallback)
        return allowed && !allowed.includes(stored) ? fallback : stored
      })
      const set = useCallback((next) => {
        setValue(next)
        lsSet(key, next)
      }, [key])
      return [value, set]
    }

    function dateOf(iso) {
      if (!iso) return null
      const date = new Date(iso)
      return isNaN(date.getTime()) ? null : date
    }

    const ymd = (date) => date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
    const md = (date) => pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
    const hm = (date) => pad2(date.getHours()) + ':' + pad2(date.getMinutes())

    function formatDate(iso) {
      const date = dateOf(iso)
      return date ? ymd(date) : ''
    }

    function formatDateTime(iso) {
      const date = dateOf(iso)
      return date ? ymd(date) + ' ' + hm(date) : ''
    }

    /** Monday of the local week containing `date`. */
    function weekStart(date) {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
      return start
    }

    /** ISO-8601 week number of a local date. */
    function isoWeek(date) {
      const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const day = target.getUTCDay() || 7
      target.setUTCDate(target.getUTCDate() + 4 - day)
      const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
      return { year: target.getUTCFullYear(), week: Math.ceil(((target - yearStart) / 86400000 + 1) / 7) }
    }

    function hashString(text) {
      let hash = 2166136261
      const value = String(text)
      for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }

    function hexToRgb(hex) {
      const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''))
      if (!match) return [154, 164, 178]
      return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
    }

    function rgba(hex, alpha) {
      const [r, g, b] = hexToRgb(hex)
      return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
    }

    /** Text colour derived from a category colour that stays readable on the host background. */
    const ink = (hex) => 'color-mix(in srgb, ' + (hex || UNKNOWN_COLOR) + ' 58%, var(--kg-text))'

    /** Collapse Markdown and math source into one plain preview line (cards, tooltips). */
    function plainTextPreview(text, max) {
      let value = String(text == null ? '' : text)
      value = value.replace(/```[a-zA-Z0-9_-]*[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*/g, ' '))
      value = value.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      value = value.replace(/\[\[([^\]]*)\]\]/g, '$1')
      value = value.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      value = value.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g, (match) => match.replace(/^\$\$?/, '').replace(/\$\$?$/, ''))
      value = value.replace(/[*_`#>~|]/g, ' ')
      value = value.replace(/\s+/g, ' ').trim()
      return truncateText(value, max || 140)
    }

    const collectKey = (sessionId, messageId) => String(sessionId || '') + '::' + String(messageId || '')

    // ---------------------------------------------------------------- HTTP

    function readJsonResponse(response) {
      return response.text().then((text) => {
        let data = null
        if (text) {
          try {
            data = JSON.parse(text)
          } catch (_error) {
            data = null
          }
        }
        if (!response.ok || (data && data.ok === false)) {
          const error = new Error((data && (data.error || data.message)) || '请求失败（HTTP ' + response.status + '）')
          error.code = data && data.code
          error.data = data
          throw error
        }
        return data
      })
    }

    function api(method, path, body) {
      return fetch(API_BASE + path, {
        method,
        headers: body === undefined ? { accept: 'application/json' } : { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then(readJsonResponse)
    }

    const errorText = (error) => (error && error.message) || '网络异常，请稍后重试'

    // ---------------------------------------------------------------- store

    const store = {
      state: null,
      model: null,
      loading: true,
      error: null,
      loadedOnce: false,
      pending: null,
      listeners: new Set(),
      subscribe(listener) {
        store.listeners.add(listener)
        return () => store.listeners.delete(listener)
      },
      emit() {
        store.listeners.forEach((listener) => {
          try {
            listener()
          } catch (error) {
            console.error('[knowledge-galaxy] store listener failed', error)
          }
        })
      },
      load() {
        if (store.pending) return store.pending
        if (!store.loadedOnce) store.loading = true
        store.pending = api('GET', '/state').then(
          (data) => {
            if (data) {
              store.state = data
              store.model = buildModel(data)
              store.loadedOnce = true
            }
            store.error = null
            store.loading = false
            store.pending = null
            store.emit()
            return store.state
          },
          (error) => {
            store.error = errorText(error)
            store.loading = false
            store.pending = null
            store.emit()
            return null
          },
        )
        return store.pending
      },
    }

    /** Run one write, then refresh the shared snapshot. Rejects with a readable Error. */
    function mutate(method, path, body) {
      return api(method, path, body).then((data) => store.load().then(() => data))
    }

    function useStore() {
      const [, setTick] = useState(0)
      useEffect(() => {
        const off = store.subscribe(() => setTick((value) => value + 1))
        if (!store.loadedOnce && !store.pending) store.load()
        return off
      }, [])
      return store
    }

    /**
     * Derived, read-only view of one /state snapshot.
     * Cards and links of switched-off modes are kept on disk but dropped here,
     * so every surface hides them consistently.
     */
    function buildModel(snapshot) {
      const settings = Object.assign({}, DEFAULT_SETTINGS, snapshot.settings || {})
      settings.modes = Object.assign({}, DEFAULT_SETTINGS.modes, (snapshot.settings && snapshot.settings.modes) || {})
      let enabled = MODES.filter((mode) => settings.modes[mode] !== false)
      if (!enabled.length) enabled = ['study']
      const categories = (snapshot.taxonomy && snapshot.taxonomy.categories) || []
      const catById = Object.create(null)
      const subById = Object.create(null)
      const subCat = Object.create(null)
      categories.forEach((category) => {
        catById[category.id] = category
        ;(category.subcategories || []).forEach((subcategory) => {
          subById[subcategory.id] = subcategory
          subCat[subcategory.id] = category
        })
      })
      const allItems = snapshot.items || []
      const items = allItems.filter((item) => enabled.includes(item.mode))
      const itemsById = Object.create(null)
      items.forEach((item) => {
        itemsById[item.id] = item
      })
      const byTitle = Object.create(null)
      items.forEach((item) => {
        const key = String(item.title || '').trim().toLowerCase()
        if (key && !byTitle[key]) byTitle[key] = item
      })
      const links = []
      const linksByItem = Object.create(null)
      ;(snapshot.links || []).forEach((link) => {
        const ids = (link.itemIds || []).filter((id) => itemsById[id])
        if (ids.length < 2) return
        const visible = Object.assign({}, link, { itemIds: ids })
        links.push(visible)
        ids.forEach((id) => {
          ;(linksByItem[id] = linksByItem[id] || []).push(visible)
        })
      })
      const countByCat = Object.create(null)
      const countBySub = Object.create(null)
      const countByMode = { study: 0, academic: 0, daily: 0 }
      const tags = Object.create(null)
      items.forEach((item) => {
        countByCat[item.categoryId] = (countByCat[item.categoryId] || 0) + 1
        countBySub[item.subcategoryId] = (countBySub[item.subcategoryId] || 0) + 1
        countByMode[item.mode] = (countByMode[item.mode] || 0) + 1
        ;(item.tags || []).forEach((tag) => {
          tags[tag] = (tags[tag] || 0) + 1
        })
      })
      const model = {
        revision: snapshot.revision,
        settings,
        enabled,
        categories,
        catById,
        subById,
        subCat,
        items,
        hiddenItemCount: allItems.length - items.length,
        itemsById,
        byTitle,
        links,
        linksByItem,
        countByCat,
        countBySub,
        countByMode,
        tags,
        scheduleTasks: snapshot.scheduleTasks || [],
        scheduleCandidates: snapshot.scheduleCandidates || [],
        scheduleAvailable: snapshot.scheduleAvailable !== false,
        presetPacks: snapshot.presetPacks || [],
      }
      return model
    }

    const inMode = (mode, value) => mode === 'all' || mode === value

    /** Categories offered when filing a card: visible, in an enabled mode, template on. */
    function pickableCategories(model, mode) {
      return model.categories.filter(
        (category) =>
          inMode(mode, category.mode) &&
          model.enabled.includes(category.mode) &&
          !category.hidden &&
          !(category.preset && !model.settings.mathTemplate),
      )
    }

    /** Categories shown on the board / star map: pickable ones plus hidden ones that still hold cards. */
    function displayCategories(model, mode) {
      return model.categories.filter((category) => {
        if (!inMode(mode, category.mode) || !model.enabled.includes(category.mode)) return false
        const concealed = category.hidden || (category.preset && !model.settings.mathTemplate)
        return !concealed || (model.countByCat[category.id] || 0) > 0
      })
    }

    const pickableSubs = (category) => ((category && category.subcategories) || []).filter((subcategory) => !subcategory.hidden)

    function displaySubs(model, category) {
      return ((category && category.subcategories) || []).filter(
        (subcategory) => !subcategory.hidden || (model.countBySub[subcategory.id] || 0) > 0,
      )
    }

    const catColor = (model, categoryId) => (model.catById[categoryId] && model.catById[categoryId].color) || UNKNOWN_COLOR
    const catName = (model, categoryId) => (model.catById[categoryId] && model.catById[categoryId].name) || '未分类'
    const subName = (model, subcategoryId) => (model.subById[subcategoryId] && model.subById[subcategoryId].name) || '未分类'
    const statusLabel = (item) => (STATUS_LABELS[item.mode] || STATUS_GENERIC)[item.status || 'todo'] || ''
    const linkCount = (model, itemId) => (model.linksByItem[itemId] || []).length

    function nextStatus(status) {
      return STATUSES[(STATUSES.indexOf(status || 'todo') + 1) % STATUSES.length]
    }

    function cycleStatus(item) {
      const status = nextStatus(item.status)
      return mutate('PATCH', '/items/' + encodeURIComponent(item.id), { status }).then(
        () => showToast('状态已更新为「' + (STATUS_LABELS[item.mode] || STATUS_GENERIC)[status] + '」'),
        (error) => showToast(errorText(error), 'error'),
      )
    }

    // ---------------------------------------------------------------- toasts

    const toastBus = {
      items: [],
      nextId: 1,
      listeners: new Set(),
      hosts: [],
      subscribe(listener) {
        toastBus.listeners.add(listener)
        return () => toastBus.listeners.delete(listener)
      },
      emit() {
        toastBus.listeners.forEach((listener) => listener())
      },
      push(text, tone) {
        const item = { id: toastBus.nextId++, text: String(text || ''), tone: tone || 'success' }
        toastBus.items = toastBus.items.concat([item]).slice(-4)
        toastBus.emit()
        window.setTimeout(() => {
          toastBus.items = toastBus.items.filter((entry) => entry.id !== item.id)
          toastBus.emit()
        }, 3600)
      },
    }

    function showToast(text, tone) {
      try {
        toastBus.push(text, tone)
      } catch (_error) {}
    }

    // ---------------------------------------------------------------- conversation access

    function blocksText(blocks) {
      if (!Array.isArray(blocks)) return ''
      return blocks
        .filter((block) => block && (block.kind === 'text' || block.type === 'text') && typeof block.text === 'string' && block.text)
        .map((block) => block.text)
        .join('\n')
    }

    /** Question + answer text of one assistant turn, read from the chat snapshot. */
    function readTurn(sessionId, messageId) {
      const result = { question: '', answer: '' }
      try {
        if (!sessionId || !services.sessions || !services.uiConversation) return result
        const binding = services.sessions.binding(sessionId)
        if (!binding) return result
        const conversation = services.uiConversation.binding(binding)
        if (!conversation || typeof conversation.target !== 'function') return result
        const target = conversation.target('chat')
        const snapshot = target && typeof target.getSnapshot === 'function' ? target.getSnapshot() : null
        if (!snapshot) return result
        const order = Array.isArray(snapshot.order) ? snapshot.order : []
        const nodes = snapshot.nodes
        const nodeAt = (key) => {
          try {
            return nodes && typeof nodes.get === 'function' ? nodes.get(key) : undefined
          } catch (_error) {
            return undefined
          }
        }
        let tail = null
        let tailIndex = -1
        for (let i = 0; i < order.length; i += 1) {
          const node = nodeAt(order[i])
          if (!node || node.kind !== 'turn-tail') continue
          const finalNode = node.data && node.data.closing && node.data.closing.finalNode
          if (finalNode && finalNode.messageId === messageId) {
            tail = node
            tailIndex = i
            break
          }
        }
        if (!tail) return result
        result.answer = blocksText(tail.data.closing.blocks)
        for (let j = tailIndex - 1; j >= 0; j -= 1) {
          const previous = nodeAt(order[j])
          if (previous && previous.kind === 'user') {
            result.question = blocksText(previous.data && previous.data.content)
            break
          }
        }
      } catch (error) {
        console.warn('[knowledge-galaxy] failed to read conversation turn', error)
      }
      return result
    }

    function pickCurrentSessionId() {
      try {
        const snapshot = services.sessions && services.sessions.list ? services.sessions.list.getSnapshot() : null
        if (snapshot) {
          if (typeof snapshot.currentId === 'string' && snapshot.currentId) return snapshot.currentId
          if (snapshot.current && typeof snapshot.current.id === 'string' && snapshot.current.id) return snapshot.current.id
          const byId = snapshot.byId
          if (byId) {
            const found = Object.keys(byId).find((id) => byId[id] && byId[id].retainedBy && byId[id].retainedBy.mainView > 0)
            if (found) return found
          }
        }
      } catch (_error) {}
      return services.lastSessionId || ''
    }

    /**
     * 「回到原对话」: ask the host to bring a session back into the main view.
     * The session service exposes no documented navigation call to plugins, so
     * known method names are probed in order; when none exists the session id is
     * copied so the user can still locate the conversation.
     * @returns {boolean} true when a host navigation call was made.
     */
    function openSession(sessionId) {
      if (!sessionId) return false
      const sessions = services.sessions
      const layout = services.layout
      const attempts = [
        [sessions, 'open'], [sessions, 'select'], [sessions, 'activate'], [sessions, 'switchTo'], [sessions, 'setCurrent'],
        [sessions && sessions.list, 'select'], [sessions && sessions.list, 'setCurrent'], [sessions && sessions.list, 'open'],
        [layout, 'openSession'], [layout, 'showSession'], [layout, 'navigateToSession'],
      ]
      for (const [owner, method] of attempts) {
        if (owner && typeof owner[method] === 'function') {
          try {
            owner[method](sessionId)
            return true
          } catch (_error) {
            // try the next candidate
          }
        }
      }
      try {
        if (navigator.clipboard) navigator.clipboard.writeText(sessionId)
      } catch (_error) {}
      return false
    }
