// knowledge-galaxy browser bundle (client/client.js) — GENERATED, edit client/src/*.js
// and run `node client/build.mjs`. Single-file, self-contained client half of the
// plugin: only react / react-dom (and the platform MarkdownText module) are required.
window.__ModuleLoader__.load({
  id: 'knowledge-galaxy',
  factory: function (require) {
    const module = { exports: {} }
    const exports = module.exports

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

    // =====================================================================
    // 10-ui — shared primitives: modal, toast host, form fields, Markdown
    // =====================================================================

    function Modal(props) {
      const { open, onClose, title, size, footer, headerExtra } = props
      const closeRef = useRef(onClose)
      closeRef.current = onClose
      useEffect(() => {
        if (!open) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape' || event.key === 'Esc') {
            event.stopPropagation()
            if (closeRef.current) closeRef.current()
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => document.removeEventListener('keydown', onKeyDown, true)
      }, [open])
      if (!open || !createPortal) return null
      return createPortal(
        h(
          'div',
          {
            className: 'kg-overlay',
            role: 'presentation',
            onMouseDown: (event) => {
              if (event.target === event.currentTarget && onClose) onClose()
            },
          },
          h(
            'div',
            { className: cx('kg-modal', size && 'kg-modal-' + size), role: 'dialog', 'aria-modal': 'true', 'aria-label': typeof title === 'string' ? title : '知识银河' },
            h(
              'div',
              { className: 'kg-modal-head' },
              h('h2', { className: 'kg-modal-title' }, title || ''),
              headerExtra || null,
              h('button', { type: 'button', className: 'kg-icon-btn', onClick: onClose, 'aria-label': '关闭', title: '关闭' }, '✕'),
            ),
            h('div', { className: 'kg-modal-body' }, props.children),
            footer ? h('div', { className: 'kg-modal-foot' }, footer) : null,
          ),
        ),
        document.body,
      )
    }

    /** Several surfaces mount a ToastHost; only the first one renders. */
    function ToastHost() {
      const tokenRef = useRef(null)
      const [, force] = useState(0)
      if (tokenRef.current === null) tokenRef.current = {}
      useEffect(() => {
        const token = tokenRef.current
        toastBus.hosts = toastBus.hosts.concat([token])
        const off = toastBus.subscribe(() => force((value) => value + 1))
        toastBus.emit()
        return () => {
          off()
          toastBus.hosts = toastBus.hosts.filter((host) => host !== token)
          toastBus.emit()
        }
      }, [])
      if (toastBus.hosts[0] !== tokenRef.current || !toastBus.items.length || !createPortal) return null
      return createPortal(
        h(
          'div',
          { className: 'kg-toast-wrap', role: 'status', 'aria-live': 'polite' },
          toastBus.items.map((item) => h('div', { className: 'kg-toast kg-toast-' + item.tone, key: item.id }, item.text)),
        ),
        document.body,
      )
    }

    function Field(props) {
      return h(
        'label',
        { className: cx('kg-field', props.className) },
        props.label ? h('span', { className: 'kg-field-label' }, props.label, props.required ? h('em', null, ' *') : null) : null,
        props.children,
        props.hint ? h('span', { className: 'kg-field-hint' }, props.hint) : null,
      )
    }

    function TextInput(props) {
      const { label, hint, required, className, onChange, ...rest } = props
      return h(
        Field,
        { label, hint, required, className },
        h('input', Object.assign({ className: 'kg-input', type: 'text', onChange: (event) => onChange(event.target.value) }, rest)),
      )
    }

    function TextArea(props) {
      const { label, hint, required, className, onChange, inputRef, ...rest } = props
      return h(
        Field,
        { label, hint, required, className },
        h('textarea', Object.assign({ className: 'kg-input kg-textarea', ref: inputRef, onChange: (event) => onChange(event.target.value) }, rest)),
      )
    }

    /** options: [{ value, label, disabled? }] */
    function Select(props) {
      const { label, hint, className, options, onChange, value, bare, ...rest } = props
      const control = h(
        'select',
        Object.assign({ className: cx('kg-select', bare && className), value, onChange: (event) => onChange(event.target.value) }, rest),
        options.map((option) => h('option', { key: option.value, value: option.value, disabled: option.disabled }, option.label)),
      )
      return bare ? control : h(Field, { label, hint, className }, control)
    }

    /** options: [{ value, label, title?, color? }] */
    function Segmented(props) {
      return h(
        'div',
        { className: cx('kg-seg', props.className), role: 'tablist' },
        props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              type: 'button',
              role: 'tab',
              'aria-selected': props.value === option.value,
              title: option.title,
              className: cx('kg-seg-btn', props.value === option.value && 'is-active'),
              style: props.value === option.value && option.color ? { color: option.color } : undefined,
              onClick: () => props.onChange(option.value),
            },
            option.label,
          ),
        ),
      )
    }

    function Toggle(props) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': !!props.checked,
          'aria-label': props.label,
          disabled: props.disabled,
          className: cx('kg-toggle', props.checked && 'is-on'),
          onClick: () => props.onChange(!props.checked),
        },
        h('span', { className: 'kg-toggle-knob' }),
      )
    }

    function EmptyState(props) {
      return h(
        'div',
        { className: 'kg-empty' },
        h('div', { className: 'kg-empty-icon', 'aria-hidden': 'true' }, props.icon || '🌌'),
        h('div', { className: 'kg-empty-title' }, props.title),
        props.hint ? h('div', { className: 'kg-empty-hint' }, props.hint) : null,
        props.action || null,
      )
    }

    function ModeBadge(props) {
      const meta = MODE_META[props.mode] || MODE_META.study
      return h('span', { className: 'kg-mode-badge', style: { color: ink(meta.color), borderColor: rgba(meta.color, 0.4), background: rgba(meta.color, 0.08) } }, meta.label)
    }

    /** [模式 · 大类 / 子类] capsule tinted with the category color. */
    function LocationCapsule(props) {
      const { model, item, showMode, onClick, compact } = props
      const color = catColor(model, item.categoryId)
      const text = (showMode !== false ? MODE_META[item.mode].label + ' · ' : '') + catName(model, item.categoryId) + ' / ' + subName(model, item.subcategoryId)
      return h(
        onClick ? 'button' : 'span',
        {
          type: onClick ? 'button' : undefined,
          className: cx('kg-capsule', compact && 'is-compact', onClick && 'is-clickable'),
          style: { color: ink(color), borderColor: rgba(color, 0.5), background: rgba(color, 0.12) },
          onClick,
          title: onClick ? '点击修改所属模式与分类' : text,
        },
        h('i', { style: { background: color } }),
        h('span', null, text),
        onClick ? h('span', { className: 'kg-capsule-caret' }, '▾') : null,
      )
    }

    function StatusPill(props) {
      const { item, onCycle } = props
      return h(
        'button',
        {
          type: 'button',
          className: 'kg-status kg-status-' + (item.status || 'todo'),
          title: '点击切换状态',
          onClick: (event) => {
            event.stopPropagation()
            if (onCycle) onCycle(item)
            else cycleStatus(item)
          },
        },
        statusLabel(item),
      )
    }

    // ---------------------------------------------------------------- Markdown

    const MD_LABELS = {
      code: { copyLabel: '复制', copiedLabel: '已复制', toolbarLabels: { codeLabel: '代码', wrapLabel: '自动换行', unwrapLabel: '取消换行' } },
      footnotes: '脚注',
      loading: '图片加载中',
      failed: '图片加载失败',
      open: '查看大图',
      dialog: '图片预览',
      close: '关闭',
    }
    const REF_HREF = '#kg-card-'

    /** Turn [[卡片标题]] into in-app links when the title resolves to a card. */
    function linkifyReferences(text, model, selfId) {
      if (!model || text.indexOf('[[') === -1) return text
      return text.replace(/\[\[([^\[\]\n]{1,300})\]\]/g, (whole, raw) => {
        const target = model.byTitle[raw.trim().toLowerCase()]
        if (!target || target.id === selfId) return whole
        return '[🔗 ' + raw.trim().replace(/([\[\]])/g, '\\$1') + '](' + REF_HREF + encodeURIComponent(target.id) + ')'
      })
    }

    function fallbackInline(text) {
      const nodes = []
      String(text)
        .split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/)
        .forEach((chunk, index) => {
          if (!chunk) return
          if (index % 2 === 1) {
            nodes.push(chunk)
            return
          }
          const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\))/g
          let last = 0
          let match = pattern.exec(chunk)
          while (match) {
            if (match.index > last) nodes.push(chunk.slice(last, match.index))
            const token = match[0]
            const key = 'i' + nodes.length
            if (token.startsWith('**')) nodes.push(h('strong', { key }, token.slice(2, -2)))
            else if (token.startsWith('`')) nodes.push(h('code', { key }, token.slice(1, -1)))
            else if (token.startsWith('[')) {
              const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
              nodes.push(h('a', { key, href: parts[2] }, parts[1].replace(/\\([\[\]])/g, '$1')))
            } else nodes.push(h('em', { key }, token.slice(1, -1)))
            last = match.index + token.length
            match = pattern.exec(chunk)
          }
          if (last < chunk.length) nodes.push(chunk.slice(last))
        })
      return nodes
    }

    /** Minimal Markdown renderer used only when the host MarkdownText is absent (math stays as source). */
    function fallbackMarkdown(text) {
      const blocks = []
      let paragraph = []
      let list = null
      let code = null
      const flushParagraph = () => {
        if (paragraph.length) blocks.push(h('p', { key: 'p' + blocks.length }, fallbackInline(paragraph.join('\n'))))
        paragraph = []
      }
      const flushList = () => {
        if (list) {
          blocks.push(h(list.ordered ? 'ol' : 'ul', { key: 'l' + blocks.length }, list.items.map((item, index) => h('li', { key: index }, fallbackInline(item)))))
        }
        list = null
      }
      String(text).replace(/\r\n/g, '\n').split('\n').forEach((line) => {
        if (code) {
          if (/^\s*```/.test(line)) {
            blocks.push(h('pre', { key: 'c' + blocks.length }, h('code', null, code.join('\n'))))
            code = null
          } else code.push(line)
          return
        }
        if (/^\s*```/.test(line)) {
          flushParagraph()
          flushList()
          code = []
          return
        }
        if (!line.trim()) {
          flushParagraph()
          flushList()
          return
        }
        const heading = line.match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
          flushParagraph()
          flushList()
          blocks.push(h('h' + Math.min(4, heading[1].length), { key: 'h' + blocks.length }, fallbackInline(heading[2])))
          return
        }
        const unordered = line.match(/^\s*[-*+]\s+(.*)$/)
        const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/)
        if (unordered || ordered) {
          flushParagraph()
          if (!list || list.ordered !== !!ordered) {
            flushList()
            list = { ordered: !!ordered, items: [] }
          }
          list.items.push(unordered ? unordered[1] : ordered[1])
          return
        }
        const quote = line.match(/^>\s?(.*)$/)
        if (quote) {
          flushParagraph()
          flushList()
          blocks.push(h('blockquote', { key: 'q' + blocks.length }, fallbackInline(quote[1])))
          return
        }
        flushList()
        paragraph.push(line)
      })
      if (code) blocks.push(h('pre', { key: 'c' + blocks.length }, h('code', null, code.join('\n'))))
      flushParagraph()
      flushList()
      return h('div', { className: 'kg-md-fallback' }, blocks)
    }

    /**
     * Rendered Markdown / LaTeX with a measured max-height collapse.
     * props: { text, limit, collapsible, model, selfId, onOpenItem }
     * With `model`, [[卡片标题]] references become links that call onOpenItem(id).
     */
    function MarkdownBlock(props) {
      const raw = String(props.text == null ? '' : props.text)
      const limit = props.limit || 260
      const collapsible = props.collapsible !== false
      const [expanded, setExpanded] = useState(false)
      const [overflowing, setOverflowing] = useState(false)
      const bodyRef = useRef(null)
      const text = useMemo(() => linkifyReferences(raw, props.model, props.selfId), [raw, props.model, props.selfId])
      useEffect(() => {
        const node = bodyRef.current
        if (!node) return undefined
        const measure = () => setOverflowing(node.scrollHeight > limit + 8)
        measure()
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        return () => observer.disconnect()
      }, [text, limit])
      if (!raw) return null
      const collapsed = collapsible && !expanded
      const onClickCapture = (event) => {
        const anchor = event.target && event.target.closest ? event.target.closest('a') : null
        const href = anchor ? anchor.getAttribute('href') || '' : ''
        const at = href.indexOf(REF_HREF)
        if (at === -1) return
        event.preventDefault()
        event.stopPropagation()
        if (props.onOpenItem) props.onOpenItem(decodeURIComponent(href.slice(at + REF_HREF.length)))
      }
      return h(
        'div',
        { className: cx('kg-md', props.className), onClickCapture },
        h(
          'div',
          { className: cx('kg-md-scroll', collapsed && overflowing && 'is-collapsed'), ref: bodyRef, style: collapsed ? { maxHeight: limit + 'px' } : undefined },
          MarkdownText ? h(MarkdownText, { text, labels: MD_LABELS }) : fallbackMarkdown(text),
        ),
        collapsible && overflowing
          ? h('button', { type: 'button', className: 'kg-link-btn kg-md-toggle', onClick: () => setExpanded(!expanded) }, expanded ? '收起' : '展开全部')
          : null,
      )
    }

    // =====================================================================
    // 20-board — filtering, cards, grouped columns and the timeline view
    // =====================================================================

    const EMPTY_FILTERS = { query: '', source: 'all', categoryId: 'all', subcategoryId: 'all', tag: 'all', status: 'all' }

    function filterItems(model, mode, filters) {
      const query = filters.query.trim().toLowerCase()
      return model.items.filter((item) => {
        if (!inMode(mode, item.mode)) return false
        if (filters.source !== 'all' && item.source !== filters.source) return false
        if (filters.categoryId !== 'all' && item.categoryId !== filters.categoryId) return false
        if (filters.subcategoryId !== 'all' && item.subcategoryId !== filters.subcategoryId) return false
        if (filters.tag !== 'all' && !(item.tags || []).includes(filters.tag)) return false
        if (filters.status !== 'all' && (item.status || 'todo') !== filters.status) return false
        if (query) {
          const paper = item.paper || {}
          const haystack = [item.title, item.summary, item.content, (item.tags || []).join(' '), paper.title, paper.authors, paper.journal]
            .join('\n')
            .toLowerCase()
          if (!haystack.includes(query)) return false
        }
        return true
      })
    }

    const hasFilters = (filters) => Object.keys(EMPTY_FILTERS).some((key) => filters[key] !== EMPTY_FILTERS[key])

    function paperMeta(item) {
      const paper = item.paper || {}
      return [paper.authors && truncateText(paper.authors, 40), paper.journal, paper.year].filter(Boolean).join(' · ')
    }

    function CardTags(props) {
      const tags = props.tags || []
      if (!tags.length) return null
      return h(
        'div',
        { className: 'kg-tags' },
        tags.slice(0, props.max || 4).map((tag) => h('span', { className: 'kg-tag', key: tag }, '#' + tag)),
        tags.length > (props.max || 4) ? h('span', { className: 'kg-tag' }, '+' + (tags.length - (props.max || 4))) : null,
      )
    }

    function SelectMark(props) {
      return h('span', { className: cx('kg-check', props.on && 'is-on'), 'aria-hidden': 'true' }, props.on ? '✓' : '')
    }

    /** Compact card used inside grouped columns. */
    function ItemCard(props) {
      const { model, item, showMode, selectMode, selected, onOpen, onToggleSelect } = props
      const [dragging, setDragging] = useState(false)
      const color = catColor(model, item.categoryId)
      const links = linkCount(model, item.id)
      const activate = () => (selectMode ? onToggleSelect(item.id) : onOpen(item.id))
      const meta = item.kind === 'paper' ? paperMeta(item) : ''
      return h(
        'div',
        {
          className: cx('kg-card', selected && 'is-selected', dragging && 'is-dragging'),
          role: 'button',
          tabIndex: 0,
          draggable: !!props.onDragCard,
          onDragStart: (event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', item.id)
            setDragging(true)
            props.onDragCard(item.id)
          },
          onDragEnd: () => {
            setDragging(false)
            props.onDragCard('')
          },
          style: { '--kg-accent': color },
          onClick: activate,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              activate()
            }
          },
        },
        h(
          'div',
          { className: 'kg-card-top' },
          selectMode ? h(SelectMark, { on: selected }) : null,
          h('span', { className: 'kg-card-sub', style: { color: ink(color) } }, subName(model, item.subcategoryId)),
          showMode ? h(ModeBadge, { mode: item.mode }) : null,
          h('span', { className: 'kg-card-date' }, formatDate(item.createdAt)),
        ),
        h('div', { className: 'kg-card-title' }, item.kind === 'paper' ? '📄 ' : '', item.title),
        meta ? h('div', { className: 'kg-card-meta' }, meta) : null,
        item.summary || item.content ? h('div', { className: 'kg-card-summary' }, plainTextPreview(item.summary || item.content, 90)) : null,
        h(CardTags, { tags: item.tags, max: 3 }),
        h(
          'div',
          { className: 'kg-card-foot' },
          h('span', { title: SOURCE_META[item.source] ? SOURCE_META[item.source].label : '' }, (SOURCE_META[item.source] || SOURCE_META.manual).icon),
          h(StatusPill, { item }),
          h('span', { className: 'kg-grow' }),
          links ? h('span', { className: 'kg-link-badge', title: '已关联 ' + links + ' 条联系' }, '🔗 ' + links) : null,
        ),
      )
    }

    function groupItems(model, mode, items, groupBy, showEmptySubs) {
      const columns = []
      // `patch` = what dropping a card on the column changes (null: not a drop target)
      const push = (key, title, color, glyph, list, patch) => columns.push({ key, title, color, glyph, items: list, patch: patch || null })
      if (groupBy === 'mode') {
        model.enabled.forEach((value) => push(value, MODE_META[value].label + '模式', MODE_META[value].color, MODE_META[value].icon, items.filter((item) => item.mode === value), { mode: value }))
      } else if (groupBy === 'source') {
        SOURCES.forEach((value) => push(value, SOURCE_META[value].label, UNKNOWN_COLOR, SOURCE_META[value].icon, items.filter((item) => item.source === value)))
      } else if (groupBy === 'status') {
        STATUSES.forEach((value) => {
          const title = mode === 'all' ? STATUS_GENERIC[value] : STATUS_LABELS[mode][value]
          push(value, title, UNKNOWN_COLOR, value === 'todo' ? '○' : value === 'doing' ? '◐' : '●', items.filter((item) => (item.status || 'todo') === value), { status: value })
        })
      } else if (groupBy === 'subcategory') {
        displayCategories(model, mode).forEach((category) => {
          displaySubs(model, category).forEach((subcategory) => {
            const list = items.filter((item) => item.subcategoryId === subcategory.id)
            if (list.length || (showEmptySubs && !subcategory.hidden)) push(subcategory.id, subcategory.name, category.color, category.glyph, list, { subcategoryId: subcategory.id })
          })
        })
      } else {
        displayCategories(model, mode).forEach((category) => {
          const title = (mode === 'all' ? MODE_META[category.mode].label + ' · ' : '') + category.name
          push(category.id, title, category.color, category.glyph, items.filter((item) => item.categoryId === category.id), { categoryId: category.id })
        })
      }
      return columns
    }

    function GroupBoard(props) {
      const { model, mode, items, groupBy } = props
      const columns = useMemo(() => groupItems(model, mode, items, groupBy, props.showEmptySubs), [model, mode, items, groupBy, props.showEmptySubs])
      const [dragId, setDragId] = useState('')
      const [overKey, setOverKey] = useState('')
      if (!columns.length) return null
      const canDrop = (column) => !!dragId && !!column.patch && !column.items.some((item) => item.id === dragId)
      const drop = (column) => {
        const id = dragId
        setOverKey('')
        setDragId('')
        if (!id || !column.patch) return
        // dragging one of several ticked cards moves the whole selection
        const ticked = Object.keys(props.selected).filter((key) => props.selected[key] && model.itemsById[key])
        const ids = props.selectMode && ticked.includes(id) ? ticked : [id]
        mutate('POST', '/items/batch', { ids, patch: column.patch }).then(
          (data) => showToast('已将 ' + data.updated + ' 张卡片移动到「' + column.title + '」'),
          (error) => showToast(errorText(error), 'error'),
        )
      }
      return h(
        'div',
        { className: 'kg-board' },
        columns.map((column) =>
          h(
            'section',
            {
              className: cx('kg-col', overKey === column.key && canDrop(column) && 'is-drop'),
              key: column.key,
              onDragOver: (event) => {
                if (!canDrop(column)) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                if (overKey !== column.key) setOverKey(column.key)
              },
              onDragLeave: (event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOverKey('')
              },
              onDrop: (event) => {
                event.preventDefault()
                drop(column)
              },
            },
            h(
              'header',
              { className: 'kg-col-head' },
              h('span', { className: 'kg-col-glyph', style: { color: ink(column.color), background: rgba(column.color, 0.16) } }, column.glyph),
              h('span', { className: 'kg-col-title' }, column.title),
              h('span', { className: 'kg-col-count' }, column.items.length),
            ),
            h(
              'div',
              { className: 'kg-col-body' },
              column.items.length
                ? column.items.map((item) =>
                    h(ItemCard, {
                      key: item.id,
                      model,
                      item,
                      showMode: mode === 'all' && groupBy !== 'mode',
                      selectMode: props.selectMode,
                      selected: !!props.selected[item.id],
                      onOpen: props.onOpen,
                      onToggleSelect: props.onToggleSelect,
                      onDragCard: setDragId,
                    }),
                  )
                : h('div', { className: 'kg-col-empty' }, dragId && column.patch ? '拖到这里' : '暂无卡片'),
            ),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------- timeline

    /** Bucket items (newest first) by local day / week / month. */
    function timelineBuckets(items, granularity) {
      const now = new Date()
      const buckets = []
      const byKey = Object.create(null)
      items
        .slice()
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .forEach((item) => {
          const date = dateOf(item.createdAt) || new Date(0)
          let key
          let title
          let countLabel
          if (granularity === 'month') {
            key = date.getFullYear() + '-' + pad2(date.getMonth() + 1)
            title = key
            countLabel = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() ? '本月收录' : '当月收录'
          } else if (granularity === 'week') {
            const start = weekStart(date)
            const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
            const week = isoWeek(date)
            key = ymd(start)
            title = week.year + ' 年第 ' + week.week + ' 周（' + md(start) + ' ~ ' + md(end) + '）'
            countLabel = ymd(weekStart(now)) === key ? '本周收录' : '当周收录'
          } else {
            key = ymd(date)
            title = key
            countLabel = key === ymd(now) ? '今日收录' : '当日收录'
          }
          if (!byKey[key]) {
            byKey[key] = { key, title, countLabel, items: [] }
            buckets.push(byKey[key])
          }
          byKey[key].items.push(item)
        })
      return buckets
    }

    /** One entry hanging off the time axis: no card chrome, just a point on the line. */
    function TimelineRow(props) {
      const { model, item, granularity, selectMode, selected, onOpen, onToggleSelect } = props
      const date = dateOf(item.createdAt)
      const source = SOURCE_META[item.source] || SOURCE_META.manual
      const links = linkCount(model, item.id)
      const activate = () => (selectMode ? onToggleSelect(item.id) : onOpen(item.id))
      const meta = item.kind === 'paper' ? paperMeta(item) : ''
      const preview = item.summary || item.content ? plainTextPreview(item.summary || item.content, 160) : ''
      return h(
        'div',
        {
          className: cx('kg-tl-item', selected && 'is-selected'),
          role: 'button',
          tabIndex: 0,
          style: { '--kg-accent': catColor(model, item.categoryId) },
          onClick: activate,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              activate()
            }
          },
        },
        h('span', { className: 'kg-tl-pt', 'aria-hidden': 'true' }),
        h('span', { className: 'kg-tl-time', title: formatDateTime(item.createdAt) }, date ? (granularity === 'day' ? hm(date) : md(date) + ' ' + hm(date)) : ''),
        h(
          'div',
          { className: 'kg-tl-main' },
          h(
            'div',
            { className: 'kg-tl-head' },
            selectMode ? h(SelectMark, { on: selected }) : null,
            h('span', { className: 'kg-tl-title' }, item.kind === 'paper' ? '📄 ' : '', item.title),
            h(LocationCapsule, { model, item, compact: true }),
            h('span', { className: 'kg-grow' }),
            links ? h('span', { className: 'kg-link-badge', title: '已关联 ' + links + ' 条联系' }, '🔗 ' + links) : null,
            h(StatusPill, { item }),
          ),
          h(
            'div',
            { className: 'kg-tl-sub' },
            h('span', { className: 'kg-tl-src' }, source.label),
            meta ? h('span', null, meta) : null,
            preview ? h('span', { className: 'kg-tl-summary' }, preview) : null,
            (item.tags || []).slice(0, 5).map((tag) => h('span', { className: 'kg-tl-tag', key: tag }, '#' + tag)),
          ),
        ),
      )
    }

    function TimelineBoard(props) {
      const { model, items, granularity } = props
      const buckets = useMemo(() => timelineBuckets(items, granularity), [items, granularity])
      const [collapsed, setCollapsed] = useState({})
      return h(
        'div',
        { className: 'kg-timeline' },
        buckets.map((bucket) => {
          const isCollapsed = !!collapsed[granularity + bucket.key]
          return h(
            'section',
            { className: 'kg-tl-node', key: bucket.key },
            h(
              'button',
              {
                type: 'button',
                className: 'kg-tl-anchor',
                'aria-expanded': !isCollapsed,
                onClick: () => setCollapsed(Object.assign({}, collapsed, { [granularity + bucket.key]: !isCollapsed })),
              },
              h('span', { className: 'kg-tl-dot' }),
              h('span', { className: 'kg-tl-date' }, bucket.title),
              h('span', { className: 'kg-tl-count' }, '· ' + bucket.countLabel + ' ' + bucket.items.length + ' 条'),
              h('span', { className: 'kg-tl-caret' }, isCollapsed ? '▸ 展开' : '▾'),
            ),
            isCollapsed
              ? null
              : h(
                  'div',
                  { className: 'kg-tl-list' },
                  bucket.items.map((item) =>
                    h(TimelineRow, {
                      key: item.id,
                      model,
                      item,
                      granularity,
                      selectMode: props.selectMode,
                      selected: !!props.selected[item.id],
                      onOpen: props.onOpen,
                      onToggleSelect: props.onToggleSelect,
                    }),
                  ),
                ),
          )
        }),
      )
    }

    /** 日历视图: a month grid of collected cards; picking a day lists it on the axis below. */
    function CalendarBoard(props) {
      const { model, items } = props
      const today = new Date()
      const byDay = useMemo(() => {
        const map = Object.create(null)
        items.forEach((item) => {
          const date = dateOf(item.createdAt)
          if (date) (map[ymd(date)] = map[ymd(date)] || []).push(item)
        })
        Object.keys(map).forEach((key) => map[key].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))))
        return map
      }, [items])
      const latest = useMemo(() => Object.keys(byDay).sort().pop() || ymd(today), [byDay])
      const [month, setMonth] = useState(() => latest.slice(0, 7))
      const [picked, setPicked] = useState(latest)
      const [year, monthIndex] = [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1]
      const shift = (delta) => {
        const next = new Date(year, monthIndex + delta, 1)
        setMonth(next.getFullYear() + '-' + pad2(next.getMonth() + 1))
      }
      const first = new Date(year, monthIndex, 1)
      const start = new Date(year, monthIndex, 1 - ((first.getDay() + 6) % 7))
      const weeks = Math.ceil((((first.getDay() + 6) % 7) + new Date(year, monthIndex + 1, 0).getDate()) / 7)
      const cells = []
      for (let i = 0; i < weeks * 7; i += 1) cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
      const monthTotal = Object.keys(byDay).filter((key) => key.startsWith(month)).reduce((sum, key) => sum + byDay[key].length, 0)
      const pickedItems = byDay[picked] || []
      return h(
        'div',
        { className: 'kg-cal' },
        h(
          'div',
          { className: 'kg-cal-head' },
          h('button', { type: 'button', className: 'kg-icon-btn', 'aria-label': '上个月', onClick: () => shift(-1) }, '‹'),
          h('span', { className: 'kg-cal-month' }, year + ' 年 ' + (monthIndex + 1) + ' 月'),
          h('button', { type: 'button', className: 'kg-icon-btn', 'aria-label': '下个月', onClick: () => shift(1) }, '›'),
          h(
            'button',
            {
              type: 'button',
              className: 'kg-btn kg-btn-sm',
              onClick: () => {
                setMonth(ymd(today).slice(0, 7))
                setPicked(ymd(today))
              },
            },
            '今天',
          ),
          h('span', { className: 'kg-muted' }, '本月收录 ' + monthTotal + ' 条'),
        ),
        h(
          'div',
          { className: 'kg-cal-grid', role: 'grid' },
          WEEKDAY_CHARS.map((char) => h('div', { className: 'kg-cal-dow', key: char }, '周' + char)),
          cells.map((date) => {
            const key = ymd(date)
            const list = byDay[key] || []
            return h(
              'button',
              {
                type: 'button',
                key,
                className: cx('kg-cal-cell', date.getMonth() !== monthIndex && 'is-out', key === ymd(today) && 'is-today', key === picked && 'is-picked', list.length && 'has-items'),
                'aria-label': key + '，收录 ' + list.length + ' 条',
                onClick: () => {
                  setPicked(key)
                  if (date.getMonth() !== monthIndex) setMonth(key.slice(0, 7))
                },
              },
              h('span', { className: 'kg-cal-top' }, h('span', { className: 'kg-cal-num' }, date.getDate()), list.length ? h('span', { className: 'kg-cal-count' }, list.length) : null),
              list.slice(0, 3).map((item) => h('span', { className: 'kg-cal-entry', key: item.id }, h('i', { style: { background: catColor(model, item.categoryId) } }), item.title)),
              list.length > 3 ? h('span', { className: 'kg-cal-more' }, '还有 ' + (list.length - 3) + ' 条') : null,
            )
          }),
        ),
        h(
          'section',
          { className: 'kg-tl-node kg-cal-day' },
          h('div', { className: 'kg-tl-anchor is-static' }, h('span', { className: 'kg-tl-dot' }), h('span', { className: 'kg-tl-date' }, picked), h('span', { className: 'kg-tl-count' }, '· ' + (picked === ymd(today) ? '今日收录 ' : '当日收录 ') + pickedItems.length + ' 条')),
          pickedItems.length
            ? h(
                'div',
                { className: 'kg-tl-list' },
                pickedItems.map((item) =>
                  h(TimelineRow, { key: item.id, model, item, granularity: 'day', selectMode: props.selectMode, selected: !!props.selected[item.id], onOpen: props.onOpen, onToggleSelect: props.onToggleSelect }),
                ),
              )
            : h('div', { className: 'kg-muted kg-pad' }, '这一天没有收录'),
        ),
      )
    }

    /** Filter + view controls shared by both board views. */
    function BoardToolbar(props) {
      const { model, mode, filters, setFilters, boardView, setBoardView, groupBy, setGroupBy, granularity, setGranularity } = props
      const set = (patch) => setFilters(Object.assign({}, filters, patch))
      const categories = displayCategories(model, mode)
      const category = filters.categoryId !== 'all' ? model.catById[filters.categoryId] : null
      const subs = category ? displaySubs(model, category) : []
      const tagNames = Object.keys(model.tags).sort((a, b) => model.tags[b] - model.tags[a]).slice(0, 60)
      const statusNames = mode === 'all' ? STATUS_GENERIC : STATUS_LABELS[mode]
      const groupOptions = [
        { value: 'category', label: '按大类分列' },
        { value: 'subcategory', label: '按子类分列' },
        { value: 'source', label: '按收录来源分列' },
        { value: 'status', label: '按状态分列' },
      ]
      if (mode === 'all') groupOptions.unshift({ value: 'mode', label: '按模式分列' })
      return h(
        'div',
        { className: 'kg-toolbar-row kg-board-tools' },
        h(
          'div',
          { className: 'kg-search' },
          h('span', { 'aria-hidden': 'true' }, '🔍'),
          h('input', { type: 'search', placeholder: '搜索标题 / 摘要 / 标签…', value: filters.query, 'aria-label': '搜索', onChange: (event) => set({ query: event.target.value }) }),
        ),
        h(Select, {
          bare: true, 'aria-label': '来源筛选', value: filters.source, onChange: (value) => set({ source: value }),
          options: [{ value: 'all', label: '全部来源' }].concat(SOURCES.map((value) => ({ value, label: SOURCE_META[value].icon + ' ' + SOURCE_META[value].label }))),
        }),
        h(Select, {
          bare: true, 'aria-label': '大类筛选', value: filters.categoryId, onChange: (value) => set({ categoryId: value, subcategoryId: 'all' }),
          options: [{ value: 'all', label: '全部大类' }].concat(
            categories.map((entry) => ({ value: entry.id, label: (mode === 'all' ? MODE_META[entry.mode].label + ' · ' : '') + entry.name })),
          ),
        }),
        h(Select, {
          bare: true, 'aria-label': '子类筛选', value: filters.subcategoryId, disabled: !category, onChange: (value) => set({ subcategoryId: value }),
          options: [{ value: 'all', label: category ? '全部子类' : '子类（先选大类）' }].concat(subs.map((entry) => ({ value: entry.id, label: entry.name }))),
        }),
        h(Select, {
          bare: true, 'aria-label': '标签筛选', value: filters.tag, onChange: (value) => set({ tag: value }),
          options: [{ value: 'all', label: '全部标签' }].concat(tagNames.map((tag) => ({ value: tag, label: '#' + tag + '（' + model.tags[tag] + '）' }))),
        }),
        h(Select, {
          bare: true, 'aria-label': '状态筛选', value: filters.status, onChange: (value) => set({ status: value }),
          options: [{ value: 'all', label: '全部状态' }].concat(STATUSES.map((value) => ({ value, label: statusNames[value] }))),
        }),
        hasFilters(filters) ? h('button', { type: 'button', className: 'kg-link-btn', onClick: () => setFilters(EMPTY_FILTERS) }, '清除筛选') : null,
        h('span', { className: 'kg-grow' }),
        boardView === 'group'
          ? h(Select, { bare: true, 'aria-label': '分列方式', value: groupBy, onChange: setGroupBy, options: groupOptions })
          : h(Segmented, {
              value: granularity,
              onChange: setGranularity,
              options: [{ value: 'day', label: '按日' }, { value: 'week', label: '按周' }, { value: 'month', label: '按月' }, { value: 'calendar', label: '📅 日历' }],
            }),
        h(Segmented, {
          value: boardView,
          onChange: setBoardView,
          options: [{ value: 'group', label: '📋 分组视图' }, { value: 'timeline', label: '🕒 时间轴视图' }],
        }),
      )
    }

    // =====================================================================
    // 30-dialogs — card detail (links, move, edit), collect dialog, batch link
    // =====================================================================

    const recentViewed = []

    function noteViewed(id) {
      const at = recentViewed.indexOf(id)
      if (at !== -1) recentViewed.splice(at, 1)
      recentViewed.unshift(id)
      if (recentViewed.length > 12) recentViewed.length = 12
    }

    /** Mode-scoped 大类 / 子类 selects. value: { categoryId, subcategoryId } ('auto' = let the plugin decide). */
    function CategoryPicker(props) {
      const { model, mode, value, onChange, allowAuto, keep } = props
      let categories = pickableCategories(model, mode)
      // A card may live in a concealed category; keep that option so editing never silently moves it.
      if (keep && model.catById[keep] && !categories.some((category) => category.id === keep) && model.catById[keep].mode === mode) {
        categories = categories.concat([model.catById[keep]])
      }
      const category = model.catById[value.categoryId]
      const subs = category ? pickableSubs(category) : []
      return h(
        'div',
        { className: 'kg-form-row' },
        h(Select, {
          label: '大类（星系）',
          value: value.categoryId,
          onChange: (categoryId) => onChange({ categoryId, subcategoryId: 'auto' }),
          options: (allowAuto ? [{ value: 'auto', label: '✨ 自动归类' }] : []).concat(
            categories.map((entry) => ({ value: entry.id, label: entry.glyph + ' ' + entry.name })),
          ),
        }),
        h(Select, {
          label: '子类（行星）',
          value: value.subcategoryId,
          disabled: !category,
          onChange: (subcategoryId) => onChange({ categoryId: value.categoryId, subcategoryId }),
          options: [{ value: 'auto', label: category ? '✨ 在该大类内自动匹配' : '—' }].concat(subs.map((entry) => ({ value: entry.id, label: entry.name }))),
        }),
      )
    }

    function PaperFields(props) {
      const { paper, onChange } = props
      const set = (key) => (value) => onChange(Object.assign({}, paper, { [key]: value }))
      return h(
        'fieldset',
        { className: 'kg-fieldset' },
        h('legend', null, '📄 论文信息'),
        h(TextInput, { label: '论文原名', value: paper.title || '', onChange: set('title'), placeholder: '英文 / 原文标题' }),
        h(
          'div',
          { className: 'kg-form-row' },
          h(TextInput, { label: '年份', value: paper.year || '', onChange: set('year'), placeholder: '2026' }),
          h(TextInput, { label: '期刊 / 会议', value: paper.journal || '', onChange: set('journal'), placeholder: 'NeurIPS / Annals of Math …' }),
        ),
        h(TextInput, { label: '作者', value: paper.authors || '', onChange: set('authors'), placeholder: '多位作者用逗号分隔' }),
        h(
          'div',
          { className: 'kg-form-row' },
          h(TextInput, { label: 'DOI', value: paper.doi || '', onChange: set('doi'), placeholder: '10.xxxx/xxxxx' }),
          h(TextInput, { label: '链接', value: paper.url || '', onChange: set('url'), placeholder: 'https://arxiv.org/abs/…' }),
        ),
        h(TextArea, { label: '摘要', rows: 3, value: paper.abstract || '', onChange: set('abstract') }),
      )
    }

    function searchCards(model, query, options) {
      const needle = query.trim().toLowerCase()
      const exclude = (options && options.exclude) || {}
      return model.items.filter((item) => {
        if (exclude[item.id]) return false
        if (options && options.mode && options.mode !== 'all' && item.mode !== options.mode) return false
        if (options && options.categoryId && options.categoryId !== 'all' && item.categoryId !== options.categoryId) return false
        if (!needle) return true
        return [item.title, (item.tags || []).join(' '), item.summary].join('\n').toLowerCase().includes(needle)
      })
    }

    /** One selectable card row used by the link panel and the reference picker. */
    function CardOption(props) {
      const { model, item, checked, onClick, hint } = props
      return h(
        'button',
        { type: 'button', className: cx('kg-option', checked && 'is-checked'), onClick },
        checked === undefined ? null : h(SelectMark, { on: checked }),
        h('span', { className: 'kg-option-title' }, item.title),
        hint ? h('span', { className: 'kg-option-hint' }, hint) : null,
        h(LocationCapsule, { model, item, compact: true }),
      )
    }

    /** 「猜你想连」: same subcategory, shared tags, recently viewed — top 5. */
    function recommendLinks(model, item, exclude) {
      const tags = new Set(item.tags || [])
      return model.items
        .filter((other) => !exclude[other.id])
        .map((other) => {
          const reasons = []
          let score = 0
          if (other.subcategoryId === item.subcategoryId) {
            score += 3
            reasons.push('同子类')
          }
          const shared = (other.tags || []).filter((tag) => tags.has(tag))
          if (shared.length) {
            score += 2 * shared.length
            reasons.push('同标签 #' + shared[0])
          }
          const viewedAt = recentViewed.indexOf(other.id)
          if (viewedAt !== -1) {
            score += 2 - viewedAt * 0.1
            reasons.push('近期浏览')
          }
          return { other, score, reason: reasons.join(' · ') }
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    }

    /** Inline 「+ 建立联系」 panel inside the detail dialog. */
    function LinkPanel(props) {
      const { model, item, onDone, onCancel } = props
      const [query, setQuery] = useState('')
      const [mode, setMode] = useState('all')
      const [categoryId, setCategoryId] = useState('all')
      const [checked, setChecked] = useState({})
      const [label, setLabel] = useState('')
      const [note, setNote] = useState('')
      const [saving, setSaving] = useState(false)
      const rootRef = useRef(null)
      useEffect(() => {
        if (rootRef.current && rootRef.current.scrollIntoView) rootRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }, [])
      const exclude = useMemo(() => {
        const map = { [item.id]: true }
        ;(model.linksByItem[item.id] || []).forEach((link) => {
          if (link.itemIds.length === 2) link.itemIds.forEach((id) => (map[id] = true))
        })
        return map
      }, [model, item.id])
      const searching = query.trim() !== '' || mode !== 'all' || categoryId !== 'all'
      const recommended = useMemo(() => recommendLinks(model, item, exclude), [model, item, exclude])
      const results = searching ? searchCards(model, query, { exclude, mode, categoryId }).slice(0, 30) : []
      const checkedIds = Object.keys(checked).filter((id) => checked[id] && model.itemsById[id])
      const toggle = (id) => setChecked(Object.assign({}, checked, { [id]: !checked[id] }))
      const categories = displayCategories(model, mode)
      const submit = () => {
        if (!checkedIds.length || !label.trim() || saving) return
        setSaving(true)
        mutate('POST', '/links', { fromId: item.id, targetIds: checkedIds, label: label.trim(), note }).then(
          () => {
            setSaving(false)
            showToast('已建立 ' + checkedIds.length + ' 条联系')
            onDone()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      const row = (other, hint) =>
        h(CardOption, { key: other.id, model, item: other, checked: !!checked[other.id], hint, onClick: () => toggle(other.id) })
      return h(
        'div',
        { className: 'kg-linkpanel', ref: rootRef },
        h(
          'div',
          { className: 'kg-linkpanel-search' },
          h(
            'div',
            { className: 'kg-search' },
            h('span', { 'aria-hidden': 'true' }, '🔍'),
            h('input', { type: 'search', autoFocus: true, placeholder: '按标题 / 标签 / 摘要搜索，可跨模式', value: query, 'aria-label': '搜索目标卡片', onChange: (event) => setQuery(event.target.value) }),
          ),
          h(Select, {
            bare: true, 'aria-label': '模式过滤', value: mode,
            onChange: (value) => {
              setMode(value)
              setCategoryId('all')
            },
            options: [{ value: 'all', label: '全部模式' }].concat(model.enabled.map((value) => ({ value, label: MODE_META[value].label + '模式' }))),
          }),
          h(Select, {
            bare: true, 'aria-label': '大类过滤', value: categoryId, onChange: setCategoryId,
            options: [{ value: 'all', label: '全部大类' }].concat(
              categories.map((entry) => ({ value: entry.id, label: (mode === 'all' ? MODE_META[entry.mode].label + ' · ' : '') + entry.name })),
            ),
          }),
        ),
        h(
          'div',
          { className: 'kg-linkpanel-list' },
          searching
            ? results.length
              ? results.map((other) => row(other))
              : h('div', { className: 'kg-muted kg-pad' }, '没有匹配的卡片')
            : recommended.length
              ? [h('div', { className: 'kg-list-caption', key: 'caption' }, '✨ 猜你想连')].concat(recommended.map((entry) => row(entry.other, entry.reason)))
              : h('div', { className: 'kg-muted kg-pad' }, '暂无推荐，试试上方搜索（支持跨模式）'),
        ),
        h(
          'div',
          { className: 'kg-linkpanel-form' },
          h(TextInput, { label: '联系名称', required: true, value: label, onChange: setLabel, maxLength: 120, placeholder: '例如：前置知识' }),
          h(
            'div',
            { className: 'kg-chips' },
            LINK_PRESETS.map((preset) =>
              h('button', { type: 'button', key: preset, className: cx('kg-chip', label === preset && 'is-active'), onClick: () => setLabel(preset) }, preset),
            ),
          ),
          h(TextInput, { label: '联系备注（选填）', value: note, onChange: setNote, maxLength: 2000 }),
          h(
            'div',
            { className: 'kg-actions' },
            h('span', { className: 'kg-muted' }, '已选 ' + checkedIds.length + ' 张'),
            h('span', { className: 'kg-grow' }),
            h('button', { type: 'button', className: 'kg-btn', onClick: onCancel }, '取消'),
            h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: !checkedIds.length || !label.trim() || saving, onClick: submit }, saving ? '保存中…' : '确认建立'),
          ),
        ),
      )
    }

    /** 「知识联系」 section of the detail dialog. */
    function LinksSection(props) {
      const { model, item, onNavigate } = props
      const [adding, setAdding] = useState(false)
      const [confirmId, setConfirmId] = useState('')
      useEffect(() => {
        setAdding(false)
        setConfirmId('')
      }, [item.id])
      const links = model.linksByItem[item.id] || []
      const remove = (link) => {
        if (confirmId !== link.id) {
          setConfirmId(link.id)
          return
        }
        mutate('DELETE', '/links/' + encodeURIComponent(link.id)).then(
          () => showToast('已解除联系'),
          (error) => showToast(errorText(error), 'error'),
        )
      }
      return h(
        'section',
        { className: 'kg-section' },
        h(
          'div',
          { className: 'kg-section-head' },
          h('h3', null, '🔗 知识联系', links.length ? h('span', { className: 'kg-count' }, links.length) : null),
          adding ? null : h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => setAdding(true) }, '+ 建立联系'),
        ),
        links.length
          ? h(
              'ul',
              { className: 'kg-linklist' },
              links.map((link) =>
                h(
                  'li',
                  { key: link.id, className: 'kg-linkrow' },
                  h('span', { className: cx('kg-linklabel', link.kind === 'ref' && 'is-ref') }, link.label),
                  h(
                    'div',
                    { className: 'kg-linktargets' },
                    link.itemIds
                      .filter((id) => id !== item.id)
                      .map((id) => {
                        const other = model.itemsById[id]
                        const color = catColor(model, other.categoryId)
                        return h(
                          'button',
                          {
                            type: 'button',
                            key: id,
                            className: 'kg-target',
                            style: { borderColor: rgba(color, 0.5), background: rgba(color, 0.09) },
                            title: MODE_META[other.mode].label + ' · ' + catName(model, other.categoryId) + ' / ' + subName(model, other.subcategoryId),
                            onClick: () => onNavigate(id),
                          },
                          h('i', { style: { background: color } }),
                          h('span', { className: 'kg-target-title' }, other.title),
                          h('span', { className: 'kg-target-mode', style: { color: ink(MODE_META[other.mode].color) } }, MODE_META[other.mode].label),
                        )
                      }),
                    link.note ? h('div', { className: 'kg-linknote' }, link.note) : null,
                  ),
                  link.kind === 'ref'
                    ? h('span', { className: 'kg-muted kg-linkauto', title: '由正文中的 [[卡片标题]] 自动生成，删除正文引用即可解除' }, '自动')
                    : h(
                        'button',
                        { type: 'button', className: cx('kg-btn kg-btn-sm', confirmId === link.id && 'kg-btn-danger'), onClick: () => remove(link), onBlur: () => setConfirmId('') },
                        confirmId === link.id ? '确认解除' : '解除',
                      ),
                ),
              ),
            )
          : adding
            ? null
            : h('div', { className: 'kg-muted' }, '还没有联系。点击「+ 建立联系」把它和其他卡片（可跨模式）连起来。'),
        adding ? h(LinkPanel, { model, item, onDone: () => setAdding(false), onCancel: () => setAdding(false) }) : null,
      )
    }

    /** Popover under the location capsule: move the card to another mode / category in one step. */
    function MovePopover(props) {
      const { model, item, onClose } = props
      const [mode, setMode] = useState(item.mode)
      const [value, setValue] = useState({ categoryId: item.categoryId, subcategoryId: item.subcategoryId })
      const [saving, setSaving] = useState(false)
      const changeMode = (next) => {
        setMode(next)
        setValue(next === item.mode ? { categoryId: item.categoryId, subcategoryId: item.subcategoryId } : { categoryId: 'auto', subcategoryId: 'auto' })
      }
      const submit = () => {
        const body = value.categoryId === 'auto' ? { mode } : value.subcategoryId === 'auto' ? { categoryId: value.categoryId } : { subcategoryId: value.subcategoryId }
        setSaving(true)
        mutate('PATCH', '/items/' + encodeURIComponent(item.id), body).then(
          (data) => {
            const moved = data.item
            showToast('已移动到 ' + MODE_META[moved.mode].label + ' · ' + catName(store.model, moved.categoryId) + ' / ' + subName(store.model, moved.subcategoryId))
            onClose()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      return h(
        'div',
        { className: 'kg-popover' },
        model.enabled.length > 1
          ? h(Segmented, { value: mode, onChange: changeMode, options: model.enabled.map((entry) => ({ value: entry, label: MODE_META[entry].icon + ' ' + MODE_META[entry].label, color: MODE_META[entry].color })) })
          : null,
        h(CategoryPicker, { model, mode, value, onChange: setValue, allowAuto: true, keep: item.categoryId }),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: onClose }, '取消'),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm kg-btn-primary', disabled: saving, onClick: submit }, '移动'),
        ),
      )
    }

    /** Edit form of one card, including the 「插入卡片引用」 helper for [[卡片标题]]. */
    function ItemEditor(props) {
      const { model, item, onDone } = props
      const [title, setTitle] = useState(item.title)
      const [tags, setTags] = useState((item.tags || []).join('，'))
      const [summary, setSummary] = useState(item.summary || '')
      const [content, setContent] = useState(item.content || '')
      const [isPaper, setIsPaper] = useState(item.kind === 'paper')
      const [paper, setPaper] = useState(Object.assign({}, item.paper || {}))
      const [picking, setPicking] = useState(false)
      const [refQuery, setRefQuery] = useState('')
      const [preview, setPreview] = useState(false)
      const [saving, setSaving] = useState(false)
      const areaRef = useRef(null)
      const insertReference = (other) => {
        const area = areaRef.current
        const token = '[[' + other.title + ']]'
        const start = area ? area.selectionStart : content.length
        const end = area ? area.selectionEnd : content.length
        setContent(content.slice(0, start) + token + content.slice(end))
        setPicking(false)
        setRefQuery('')
        window.setTimeout(() => {
          if (!area) return
          area.focus()
          area.selectionStart = area.selectionEnd = start + token.length
        }, 0)
      }
      const save = () => {
        if (!title.trim() || saving) return
        setSaving(true)
        const body = { title: title.trim(), tags: splitList(tags), summary, content, kind: isPaper ? 'paper' : 'knowledge' }
        if (isPaper) body.paper = paper
        mutate('PATCH', '/items/' + encodeURIComponent(item.id), body).then(
          () => {
            showToast('已保存')
            onDone()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      const refResults = picking ? searchCards(model, refQuery, { exclude: { [item.id]: true } }).slice(0, 8) : []
      return h(
        'div',
        { className: 'kg-form' },
        h(TextInput, { label: '标题', required: true, value: title, onChange: setTitle, maxLength: 300 }),
        h(TextInput, { label: '标签', value: tags, onChange: setTags, hint: '用逗号分隔，最多 20 个' }),
        h(TextInput, { label: '一句话简介', value: summary, onChange: setSummary, maxLength: 500 }),
        h(
          'label',
          { className: 'kg-inline-check' },
          h('input', { type: 'checkbox', checked: isPaper, onChange: (event) => setIsPaper(event.target.checked) }),
          '这是一篇论文 / 文献（显示文献元数据）',
        ),
        isPaper ? h(PaperFields, { paper, onChange: setPaper }) : null,
        h(
          'div',
          { className: 'kg-editor-bar' },
          h('span', { className: 'kg-field-label' }, '笔记正文（Markdown / LaTeX）'),
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => setPicking(!picking), title: '也可以直接输入 [[卡片标题]]' }, '🔗 插入卡片引用'),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => setPreview(!preview) }, preview ? '继续编辑' : '预览'),
        ),
        picking
          ? h(
              'div',
              { className: 'kg-refpicker' },
              h('input', { className: 'kg-input', autoFocus: true, placeholder: '搜索要引用的卡片…', value: refQuery, onChange: (event) => setRefQuery(event.target.value) }),
              refResults.length
                ? refResults.map((other) => h(CardOption, { key: other.id, model, item: other, onClick: () => insertReference(other) }))
                : h('div', { className: 'kg-muted kg-pad' }, '没有匹配的卡片'),
            )
          : null,
        preview
          ? h('div', { className: 'kg-preview' }, h(MarkdownBlock, { text: content || '（空）', collapsible: false, model, selfId: item.id }))
          : h(TextArea, { rows: 12, value: content, onChange: setContent, inputRef: areaRef, placeholder: '支持 $公式$、$$块级公式$$ 与 [[卡片标题]] 双向引用' }),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-muted' }, '保存后，正文中的 [[卡片标题]] 会自动生成「正文引用」联系'),
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn', onClick: onDone }, '取消'),
          h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: !title.trim() || saving, onClick: save }, saving ? '保存中…' : '保存'),
        ),
      )
    }

    function PaperInfo(props) {
      const paper = props.paper || {}
      const rows = [
        ['论文原名', paper.title],
        ['作者', paper.authors],
        ['期刊 / 会议', paper.journal],
        ['年份', paper.year],
      ].filter((row) => row[1])
      const doiUrl = paper.doi ? (/^https?:/.test(paper.doi) ? paper.doi : 'https://doi.org/' + paper.doi) : ''
      if (!rows.length && !paper.doi && !paper.url && !paper.abstract) return null
      return h(
        'section',
        { className: 'kg-paper' },
        h(
          'dl',
          null,
          rows.map((row) => [h('dt', { key: row[0] + 't' }, row[0]), h('dd', { key: row[0] + 'd' }, row[1])]),
          paper.doi ? [h('dt', { key: 'doit' }, 'DOI'), h('dd', { key: 'doid' }, h('a', { href: doiUrl, target: '_blank', rel: 'noreferrer noopener' }, paper.doi))] : null,
          paper.url ? [h('dt', { key: 'urlt' }, '链接'), h('dd', { key: 'urld' }, h('a', { href: paper.url, target: '_blank', rel: 'noreferrer noopener' }, truncateText(paper.url, 80)))] : null,
        ),
        paper.abstract ? h('div', { className: 'kg-paper-abstract' }, h('div', { className: 'kg-field-label' }, '摘要'), h(MarkdownBlock, { text: paper.abstract, limit: 120 })) : null,
      )
    }

    /**
     * Card detail dialog. Navigation between linked cards keeps a breadcrumb
     * stack owned by the panel: props { itemId, trail, onNavigate, onBack, onClose }.
     */
    function ItemDetailDialog(props) {
      const { model, itemId, trail, onNavigate, onBack, onClose } = props
      const item = itemId ? model.itemsById[itemId] : null
      const [editing, setEditing] = useState(false)
      const [moving, setMoving] = useState(false)
      const [confirmDelete, setConfirmDelete] = useState(false)
      useEffect(() => {
        setEditing(false)
        setMoving(false)
        setConfirmDelete(false)
        if (itemId) noteViewed(itemId)
      }, [itemId])
      if (!item) return null
      const source = SOURCE_META[item.source] || SOURCE_META.manual
      const detail = item.sourceDetail || {}
      const previous = trail.length ? model.itemsById[trail[trail.length - 1]] : null
      const statusNames = STATUS_LABELS[item.mode] || STATUS_GENERIC
      const setStatus = (status) =>
        mutate('PATCH', '/items/' + encodeURIComponent(item.id), { status }).catch((error) => showToast(errorText(error), 'error'))
      const remove = () => {
        if (!confirmDelete) {
          setConfirmDelete(true)
          return
        }
        mutate('DELETE', '/items/' + encodeURIComponent(item.id)).then(
          (data) => {
            showToast('已删除卡片' + (data.removedLinks ? '，并解除 ' + data.removedLinks + ' 条联系' : ''))
            if (previous) onBack()
            else onClose()
          },
          (error) => showToast(errorText(error), 'error'),
        )
      }
      const backToConversation = () => {
        if (openSession(detail.sessionId)) {
          onClose()
          showToast('已请求打开原对话')
        } else {
          showToast('当前版本的 DSH 未向插件开放会话跳转，已复制会话 ID：' + detail.sessionId, 'error')
        }
      }
      const footer = editing
        ? null
        : h(
            React.Fragment,
            null,
            h('button', { type: 'button', className: cx('kg-btn', confirmDelete && 'kg-btn-danger'), onClick: remove, onBlur: () => setConfirmDelete(false) }, confirmDelete ? '再次点击确认删除' : '删除'),
            h('span', { className: 'kg-grow' }),
            detail.sessionId ? h('button', { type: 'button', className: 'kg-btn', onClick: backToConversation }, '💬 回到原对话') : null,
            h('button', { type: 'button', className: 'kg-btn', onClick: () => setEditing(true) }, '编辑'),
            h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: onClose }, '完成'),
          )
      return h(
        Modal,
        { open: true, onClose, size: 'wide', title: editing ? '编辑卡片' : '卡片详情', footer },
        previous
          ? h('button', { type: 'button', className: 'kg-breadcrumb', onClick: onBack }, '← 返回上一张卡片', h('span', null, '「' + truncateText(previous.title, 40) + '」'))
          : null,
        editing
          ? h(ItemEditor, { model, item, onDone: () => setEditing(false) })
          : h(
              'div',
              { className: 'kg-detail' },
              h(
                'div',
                { className: 'kg-detail-locate' },
                h(LocationCapsule, { model, item, onClick: () => setMoving(!moving) }),
                h(Segmented, { className: 'kg-seg-sm', value: item.status || 'todo', onChange: setStatus, options: STATUSES.map((value) => ({ value, label: statusNames[value] })) }),
                moving ? h(MovePopover, { model, item, onClose: () => setMoving(false) }) : null,
              ),
              h('h1', { className: 'kg-detail-title' }, item.title),
              h(
                'div',
                { className: 'kg-detail-meta' },
                h('span', null, source.icon + ' ' + source.label + (detail.taskTitle ? '「' + detail.taskTitle + '」' : '')),
                h('span', null, '收录于 ' + formatDateTime(item.createdAt)),
                item.updatedAt && item.updatedAt !== item.createdAt ? h('span', null, '更新于 ' + formatDateTime(item.updatedAt)) : null,
              ),
              h(CardTags, { tags: item.tags, max: 20 }),
              item.summary ? h('p', { className: 'kg-detail-summary' }, item.summary) : null,
              item.kind === 'paper' ? h(PaperInfo, { paper: item.paper }) : null,
              item.content
                ? h('section', { className: 'kg-section' }, h(MarkdownBlock, { text: item.content, limit: 360, model, selfId: item.id, onOpenItem: onNavigate }))
                : null,
              item.knowledge && (item.knowledge.statement || item.knowledge.note)
                ? h('section', { className: 'kg-section' }, h(MarkdownBlock, { text: [item.knowledge.statement, item.knowledge.note].filter(Boolean).join('\n\n'), limit: 240 }))
                : null,
              detail.question || (detail.answer && detail.answer !== item.content)
                ? h(
                    'details',
                    { className: 'kg-origin' },
                    h('summary', null, '💬 收录时的对话快照'),
                    detail.question ? h('div', { className: 'kg-origin-q' }, h('div', { className: 'kg-field-label' }, '提问'), h(MarkdownBlock, { text: detail.question, limit: 140 })) : null,
                    detail.answer && detail.answer !== item.content
                      ? h('div', null, h('div', { className: 'kg-field-label' }, '回答'), h(MarkdownBlock, { text: detail.answer, limit: 240 }))
                      : null,
                  )
                : null,
              h(LinksSection, { model, item, onNavigate }),
            ),
      )
    }

    // ---------------------------------------------------------------- collect dialog

    function deriveCollectTitle(question, answer) {
      const heading = /^#{1,3}\s+(.+)$/m.exec(answer || '')
      const base = (question || '').trim().split('\n')[0] || (heading ? heading[1] : '') || (answer || '').trim().split('\n')[0] || ''
      return truncateText(plainTextPreview(base, 200).replace(/[?？。.!！]+$/, ''), 60)
    }

    /**
     * 「收录到知识银河」/「新建收录」 dialog.
     * props: { open, origin: 'conversation' | 'manual', sessionId, messageId, activeMode, onClose, onSaved }
     */
    function CollectDialog(props) {
      const { open, origin, onClose } = props
      const { model } = useStore()
      const [mode, setMode] = useState('study')
      const [modeHint, setModeHint] = useState('')
      const [title, setTitle] = useState('')
      const [selection, setSelection] = useState({ categoryId: 'auto', subcategoryId: 'auto' })
      const [tags, setTags] = useState('')
      const [summary, setSummary] = useState('')
      const [content, setContent] = useState('')
      const [paper, setPaper] = useState({})
      const [status, setStatus] = useState('todo')
      const [turn, setTurn] = useState({ question: '', answer: '' })
      const [suggestion, setSuggestion] = useState(null)
      const [preview, setPreview] = useState(origin === 'conversation')
      const [saving, setSaving] = useState(false)
      const ready = open && !!model
      const requestRef = useRef(0)

      // Reset + pre-select the mode whenever the dialog opens.
      useEffect(() => {
        if (!ready) return
        const fallback = model.enabled.includes(props.activeMode) ? props.activeMode : lsGet('lastCollectMode', '')
        const initial = model.enabled.includes(fallback) ? fallback : model.enabled[0]
        const read = origin === 'conversation' ? readTurn(props.sessionId, props.messageId) : { question: '', answer: '' }
        setTurn(read)
        setTitle(origin === 'conversation' ? deriveCollectTitle(read.question, read.answer) : '')
        setContent(read.answer || '')
        setSelection({ categoryId: 'auto', subcategoryId: 'auto' })
        setTags('')
        setSummary('')
        setPaper({})
        setStatus('todo')
        setSuggestion(null)
        setSaving(false)
        setPreview(origin === 'conversation' && !!read.answer)
        setMode(initial)
        setModeHint('')
        if (origin === 'conversation' && (read.answer || read.question)) {
          api('POST', '/classify', { text: [read.question, read.answer].join('\n'), fallback: initial }).then(
            (data) => {
              const guess = data.suggestion
              if (guess && store.model.enabled.includes(guess.mode)) {
                setMode(guess.mode)
                setModeHint('已自动预选「' + MODE_META[guess.mode].label + '」' + (guess.modeReason ? '：' + guess.modeReason : '') + '，可手动切换')
              }
            },
            () => {},
          )
        }
      }, [ready, props.sessionId, props.messageId])

      // Live 「自动归类」 forecast, scoped to the chosen mode.
      useEffect(() => {
        if (!ready || selection.categoryId !== 'auto') return undefined
        const text = [title, title, tags, summary, content, paper.title, paper.abstract].filter(Boolean).join('\n')
        if (!text.trim()) {
          setSuggestion(null)
          return undefined
        }
        const ticket = ++requestRef.current
        const timer = window.setTimeout(() => {
          api('POST', '/classify', { text: text.slice(0, 60000), mode }).then(
            (data) => {
              if (ticket === requestRef.current) setSuggestion(data.suggestion)
            },
            () => {},
          )
        }, 350)
        return () => window.clearTimeout(timer)
      }, [ready, mode, title, tags, summary, content, paper.title, paper.abstract, selection.categoryId])

      if (!open) return null
      if (!model) return h(Modal, { open: true, onClose, title: '🌌 收录到知识银河' }, h('div', { className: 'kg-muted kg-pad' }, '正在加载…'))

      const changeMode = (next) => {
        setMode(next)
        setModeHint('')
        setSelection({ categoryId: 'auto', subcategoryId: 'auto' })
      }
      const save = () => {
        if (!title.trim() || saving) return
        setSaving(true)
        const body = {
          mode,
          kind: mode === 'academic' ? 'paper' : 'knowledge',
          title: title.trim(),
          tags: splitList(tags),
          summary,
          content,
          status,
          source: origin === 'conversation' ? 'conversation' : 'manual',
        }
        if (selection.categoryId !== 'auto') {
          if (selection.subcategoryId !== 'auto') body.subcategoryId = selection.subcategoryId
          else body.categoryId = selection.categoryId
        }
        if (mode === 'academic') body.paper = Object.assign({}, paper, { title: paper.title || title.trim() })
        if (origin === 'conversation') {
          body.sourceDetail = {
            sessionId: props.sessionId || '',
            messageId: props.messageId || '',
            question: turn.question.slice(0, 20000),
            answer: turn.answer.slice(0, 20000),
          }
        }
        mutate('POST', '/items', body).then(
          (data) => {
            const item = data.item
            lsSet('lastCollectMode', mode)
            if (origin === 'conversation') collectedKeys[collectKey(props.sessionId, props.messageId)] = true
            showToast('已收录到 ' + MODE_META[item.mode].label + ' · ' + catName(store.model, item.categoryId) + ' / ' + subName(store.model, item.subcategoryId))
            if (props.onSaved) props.onSaved(item)
            onClose()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      const statusNames = STATUS_LABELS[mode]
      let forecast = null
      if (selection.categoryId === 'auto' && suggestion) {
        forecast = suggestion.categoryId
          ? '自动归类预计：' + catName(model, suggestion.categoryId) + ' / ' + subName(model, suggestion.subcategoryId) + '（置信度 ' + Math.round(suggestion.confidence * 100) + '%）'
          : '「' + MODE_META[mode].label + '」模式下暂未命中任何分类关键词，将放入「未分类」，之后可在卡片详情里一键移动'
      }
      return h(
        Modal,
        {
          open: true,
          onClose,
          size: 'wide',
          title: origin === 'conversation' ? '🌌 收录到知识银河' : '✍️ 新建收录',
          footer: h(
            React.Fragment,
            null,
            h('span', { className: 'kg-grow' }),
            h('button', { type: 'button', className: 'kg-btn', onClick: onClose }, '取消'),
            h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: !title.trim() || saving, onClick: save }, saving ? '收录中…' : '收录'),
          ),
        },
        h(
          'div',
          { className: 'kg-form' },
          model.enabled.length > 1
            ? h(
                Field,
                { label: '所属模式', hint: modeHint },
                h(Segmented, {
                  value: mode,
                  onChange: changeMode,
                  options: model.enabled.map((entry) => ({ value: entry, label: MODE_META[entry].icon + ' ' + MODE_META[entry].label, color: MODE_META[entry].color })),
                }),
              )
            : null,
          h(TextInput, { label: mode === 'academic' ? '卡片标题（可用中文译名）' : '标题', required: true, value: title, onChange: setTitle, maxLength: 300, autoFocus: origin !== 'conversation' }),
          h(CategoryPicker, { model, mode, value: selection, onChange: setSelection, allowAuto: true }),
          forecast ? h('div', { className: 'kg-hint-line' }, forecast) : null,
          mode === 'academic' ? h(PaperFields, { paper, onChange: setPaper }) : null,
          h(
            'div',
            { className: 'kg-form-row' },
            h(TextInput, { label: '标签', value: tags, onChange: setTags, placeholder: '用逗号分隔' }),
            h(Select, { label: mode === 'academic' ? '阅读状态' : '状态', value: status, onChange: setStatus, options: STATUSES.map((value) => ({ value, label: statusNames[value] })) }),
          ),
          h(TextInput, { label: '一句话简介', value: summary, onChange: setSummary, maxLength: 500 }),
          h(
            'div',
            { className: 'kg-editor-bar' },
            h('span', { className: 'kg-field-label' }, mode === 'daily' ? '正文（问答快照 / 要点 / 待办清单）' : mode === 'academic' ? '阅读笔记' : '正文（支持 Markdown / LaTeX）'),
            h('span', { className: 'kg-grow' }),
            h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => setPreview(!preview) }, preview ? '✏️ 编辑正文' : '👁 LaTeX 预览'),
          ),
          preview
            ? h('div', { className: 'kg-preview' }, h(MarkdownBlock, { text: content || '（空）', limit: 280, model }))
            : h(TextArea, { rows: 9, value: content, onChange: setContent, maxLength: 50000, placeholder: '支持 $公式$、$$块级公式$$ 与 [[卡片标题]] 引用' }),
          origin === 'conversation' && turn.question
            ? h('details', { className: 'kg-origin' }, h('summary', null, '💬 对应的提问（会随卡片保存，便于回到原对话）'), h(MarkdownBlock, { text: turn.question, limit: 120 }))
            : null,
        ),
      )
    }

    /** Batch 「建立联系」 for cards ticked on the board (one link joining all of them). */
    function LinkDialog(props) {
      const { open, model, itemIds, onClose, onSaved } = props
      const [label, setLabel] = useState('')
      const [note, setNote] = useState('')
      const [saving, setSaving] = useState(false)
      useEffect(() => {
        if (open) {
          setLabel('')
          setNote('')
          setSaving(false)
        }
      }, [open])
      if (!open) return null
      const save = () => {
        setSaving(true)
        mutate('POST', '/links', { itemIds, label: label.trim(), note }).then(
          () => {
            showToast('已建立联系「' + label.trim() + '」')
            onSaved()
            onClose()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      return h(
        Modal,
        {
          open: true,
          onClose,
          title: '🔗 建立联系',
          footer: h(
            React.Fragment,
            null,
            h('span', { className: 'kg-grow' }),
            h('button', { type: 'button', className: 'kg-btn', onClick: onClose }, '取消'),
            h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: !label.trim() || saving, onClick: save }, '确认建立'),
          ),
        },
        h(
          'div',
          { className: 'kg-form' },
          h('div', { className: 'kg-muted' }, '将把以下 ' + itemIds.length + ' 张卡片连成一条联系：'),
          h('div', { className: 'kg-optionlist' }, itemIds.map((id) => (model.itemsById[id] ? h(CardOption, { key: id, model, item: model.itemsById[id] }) : null))),
          h(TextInput, { label: '联系名称', required: true, value: label, onChange: setLabel, maxLength: 120, autoFocus: true }),
          h('div', { className: 'kg-chips' }, LINK_PRESETS.map((preset) => h('button', { type: 'button', key: preset, className: cx('kg-chip', label === preset && 'is-active'), onClick: () => setLabel(preset) }, preset))),
          h(TextInput, { label: '联系备注（选填）', value: note, onChange: setNote, maxLength: 2000 }),
        ),
      )
    }

    /** 「移动分组」 for the cards ticked on the board: one target mode / category for all of them. */
    function BatchMoveDialog(props) {
      const { open, model, itemIds, activeMode, onClose, onSaved } = props
      const [mode, setMode] = useState('study')
      const [value, setValue] = useState({ categoryId: 'auto', subcategoryId: 'auto' })
      const [saving, setSaving] = useState(false)
      useEffect(() => {
        if (!open) return
        const first = model.itemsById[itemIds[0]]
        setMode(model.enabled.includes(activeMode) ? activeMode : first ? first.mode : model.enabled[0])
        setValue({ categoryId: 'auto', subcategoryId: 'auto' })
        setSaving(false)
      }, [open])
      if (!open) return null
      const save = () => {
        const patch = value.categoryId === 'auto' ? { mode } : value.subcategoryId === 'auto' ? { categoryId: value.categoryId } : { subcategoryId: value.subcategoryId }
        setSaving(true)
        mutate('POST', '/items/batch', { ids: itemIds, patch }).then(
          (data) => {
            showToast('已移动 ' + data.updated + ' 张卡片')
            onSaved()
            onClose()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      const hint = value.categoryId === 'auto'
        ? '每张卡片会在「' + MODE_META[mode].label + '」模式的分类树内各自自动归类'
        : value.subcategoryId === 'auto'
          ? '每张卡片会在该大类内各自匹配子类'
          : '所有卡片都会移动到这个子类'
      return h(
        Modal,
        {
          open: true,
          onClose,
          title: '📦 移动分组',
          footer: h(
            React.Fragment,
            null,
            h('span', { className: 'kg-grow' }),
            h('button', { type: 'button', className: 'kg-btn', onClick: onClose }, '取消'),
            h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: saving, onClick: save }, saving ? '移动中…' : '移动 ' + itemIds.length + ' 张卡片'),
          ),
        },
        h(
          'div',
          { className: 'kg-form' },
          h('div', { className: 'kg-optionlist kg-optionlist-scroll' }, itemIds.map((id) => (model.itemsById[id] ? h(CardOption, { key: id, model, item: model.itemsById[id] }) : null))),
          model.enabled.length > 1
            ? h(
                Field,
                { label: '目标模式' },
                h(Segmented, {
                  value: mode,
                  onChange: (next) => {
                    setMode(next)
                    setValue({ categoryId: 'auto', subcategoryId: 'auto' })
                  },
                  options: model.enabled.map((entry) => ({ value: entry, label: MODE_META[entry].icon + ' ' + MODE_META[entry].label, color: MODE_META[entry].color })),
                }),
              )
            : null,
          h(CategoryPicker, { model, mode, value, onChange: setValue, allowAuto: true }),
          h('div', { className: 'kg-hint-line' }, hint),
        ),
      )
    }

    // =====================================================================
    // 40-manage — category manager (per mode) and the settings center
    // =====================================================================

    function ColorPicker(props) {
      const { value, onChange } = props
      return h(
        'div',
        { className: 'kg-colors' },
        PALETTE.map((color) =>
          h('button', { type: 'button', key: color, className: cx('kg-swatch', value === color && 'is-active'), style: { background: color }, 'aria-label': '颜色 ' + color, onClick: () => onChange(color) }),
        ),
        h('input', { className: 'kg-input kg-hex', value, maxLength: 7, placeholder: '#RRGGBB', 'aria-label': '自定义 Hex 颜色', onChange: (event) => onChange(event.target.value.trim()) }),
      )
    }

    const validHex = (value) => /^#[0-9a-fA-F]{6}$/.test(value)

    function CategoryForm(props) {
      const { initial, submitLabel, onSubmit, onCancel } = props
      const [name, setName] = useState(initial ? initial.name : '')
      const [color, setColor] = useState(initial ? initial.color : PALETTE[0])
      const [glyph, setGlyph] = useState(initial ? initial.glyph : '')
      const valid = name.trim() && Array.from(name.trim()).length <= 40 && validHex(color)
      return h(
        'div',
        { className: 'kg-inline-form' },
        h(
          'div',
          { className: 'kg-form-row' },
          h(TextInput, { label: '大类名称（1–40 字）', value: name, onChange: setName, maxLength: 40, autoFocus: true }),
          h(TextInput, { label: '代表符号', className: 'kg-field-narrow', value: glyph, onChange: setGlyph, placeholder: '✦ 或 Emoji' }),
        ),
        h(Field, { label: '主题色' }, h(ColorPicker, { value: color, onChange: setColor })),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-grow' }),
          onCancel ? h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: onCancel }, '取消') : null,
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm kg-btn-primary', disabled: !valid, onClick: () => onSubmit({ name: name.trim(), color: color.toLowerCase(), glyph: glyph.trim() }) }, submitLabel),
        ),
      )
    }

    function SubcategoryForm(props) {
      const { initial, submitLabel, onSubmit, onCancel } = props
      const [name, setName] = useState(initial ? initial.name : '')
      const [keywords, setKeywords] = useState(initial ? (initial.keywords || []).join('，') : '')
      return h(
        'div',
        { className: 'kg-inline-form' },
        h(
          'div',
          { className: 'kg-form-row' },
          h(TextInput, { label: '子类名称', value: name, onChange: setName, maxLength: 40, autoFocus: true }),
          h(TextInput, { label: '自动归类关键词（选填）', value: keywords, onChange: setKeywords, placeholder: '逗号分隔，如：美联储，利率，通胀' }),
        ),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-muted' }, '关键词用于提升对话收录与定时任务的自动归类准确率'),
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: onCancel }, '取消'),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm kg-btn-primary', disabled: !name.trim(), onClick: () => onSubmit({ name: name.trim(), keywords: splitList(keywords) }) }, submitLabel),
        ),
      )
    }

    /** Delete confirmation with 「迁移后删除」 / 「清空后删除」 when the target still holds cards. */
    function DeleteBox(props) {
      const { model, kind, target, count, onDone, onCancel } = props
      const doomed = kind === 'category' ? new Set(target.subcategories.map((sub) => sub.id)) : new Set([target.id])
      const destinations = []
      const ownMode = kind === 'category' ? target.mode : (model.subCat[target.id] || {}).mode
      const modeOrder = model.enabled.slice().sort((a, b) => (a === ownMode ? -1 : 0) - (b === ownMode ? -1 : 0))
      modeOrder.forEach((mode) => {
        pickableCategories(model, mode).forEach((category) => {
          pickableSubs(category).forEach((sub) => {
            if (!doomed.has(sub.id)) destinations.push({ value: sub.id, label: MODE_META[mode].label + ' · ' + category.name + ' / ' + sub.name })
          })
        })
      })
      const [strategy, setStrategy] = useState(destinations.length ? 'move' : 'purge')
      const [moveTo, setMoveTo] = useState(destinations.length ? destinations[0].value : '')
      const [busy, setBusy] = useState(false)
      const label = kind === 'category' ? '大类' : '子类'
      const submit = () => {
        let query = ''
        if (count > 0) query = strategy === 'move' ? '?moveTo=' + encodeURIComponent(moveTo) : '?purge=1'
        setBusy(true)
        mutate('DELETE', '/taxonomy/' + (kind === 'category' ? 'categories/' : 'subcategories/') + encodeURIComponent(target.id) + query).then(
          (data) => {
            showToast('已删除' + label + '「' + target.name + '」' + (data.moved ? '，迁移 ' + data.moved + ' 张卡片' : '') + (data.purged ? '，清空 ' + data.purged + ' 张卡片' : ''))
            onDone()
          },
          (error) => {
            setBusy(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      return h(
        'div',
        { className: 'kg-inline-form kg-danger-box' },
        count > 0
          ? h(
              React.Fragment,
              null,
              h('div', null, label + '「' + target.name + '」下还有 ', h('b', null, count), ' 张卡片，请选择处理方式：'),
              h(
                'label',
                { className: 'kg-inline-check' },
                h('input', { type: 'radio', name: 'kg-del-' + target.id, checked: strategy === 'move', disabled: !destinations.length, onChange: () => setStrategy('move') }),
                '将卡片一键迁移至',
                h(Select, { bare: true, value: moveTo, disabled: strategy !== 'move', onChange: setMoveTo, options: destinations.length ? destinations : [{ value: '', label: '没有可迁移的分类' }] }),
                '后删除',
              ),
              h(
                'label',
                { className: 'kg-inline-check' },
                h('input', { type: 'radio', name: 'kg-del-' + target.id, checked: strategy === 'purge', onChange: () => setStrategy('purge') }),
                '清空后删除（这 ' + count + ' 张卡片及其联系将被永久删除，不可恢复）',
              ),
            )
          : h('div', null, '确认删除' + label + '「' + target.name + '」？'),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: onCancel }, '取消'),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm kg-btn-danger', disabled: busy || (count > 0 && strategy === 'move' && !moveTo), onClick: submit }, '确认删除'),
        ),
      )
    }

    function PresetImport(props) {
      const { model, mode } = props
      const [picked, setPicked] = useState({})
      const [busy, setBusy] = useState(false)
      const ids = Object.keys(picked).filter((id) => picked[id])
      const submit = () => {
        setBusy(true)
        mutate('POST', '/taxonomy/presets', { mode, packIds: ids }).then(
          (data) => {
            setBusy(false)
            setPicked({})
            showToast('已导入 ' + data.created.categories + ' 个大类、' + data.created.subcategories + ' 个子类到「' + MODE_META[mode].label + '」模式')
          },
          (error) => {
            setBusy(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      return h(
        'div',
        { className: 'kg-presets' },
        model.presetPacks.map((pack) =>
          h(
            'label',
            { key: pack.id, className: cx('kg-preset', picked[pack.id] && 'is-picked') },
            h('input', { type: 'checkbox', checked: !!picked[pack.id], onChange: (event) => setPicked(Object.assign({}, picked, { [pack.id]: event.target.checked })) }),
            h(
              'div',
              null,
              h('div', { className: 'kg-preset-name' }, pack.categories.map((category) => category.glyph).join(' ') + ' ' + pack.name, pack.suggestedMode === mode ? h('span', { className: 'kg-pill' }, '推荐') : null),
              h('div', { className: 'kg-muted' }, pack.description),
              h('div', { className: 'kg-preset-subs' }, pack.categories.map((category) => category.name + '：' + category.subcategories.join(' · ')).join('　|　')),
            ),
          ),
        ),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-muted' }, '导入后即为普通自定义分类，可随意改名、增删'),
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn kg-btn-sm kg-btn-primary', disabled: !ids.length || busy, onClick: submit }, '导入到「' + MODE_META[mode].label + '」模式'),
        ),
      )
    }

    /** 「管理类目」: one independent 大类（星系）/ 子类（行星）tree per mode. */
    function CategoryManagerDialog(props) {
      const { open, model, initialMode, onClose } = props
      const [mode, setMode] = useState('study')
      const [expanded, setExpanded] = useState({})
      // { type: 'edit-cat' | 'del-cat' | 'add-sub' | 'edit-sub' | 'del-sub' | 'new-cat' | 'presets', id }
      const [action, setAction] = useState(null)
      useEffect(() => {
        if (open) {
          setMode(MODES.includes(initialMode) ? initialMode : model.enabled[0])
          setAction(null)
        }
      }, [open])
      if (!open) return null
      const is = (type, id) => !!action && action.type === type && action.id === id
      const done = () => setAction(null)
      const run = (method, path, body, message) =>
        mutate(method, path, body).then(
          () => {
            if (message) showToast(message)
            done()
          },
          (error) => showToast(errorText(error), 'error'),
        )
      const categories = model.categories.filter((category) => category.mode === mode)
      const templateOff = mode === 'study' && !model.settings.mathTemplate
      const shown = categories.filter((category) => !(category.preset && templateOff))

      const subRow = (category, sub) => {
        const custom = !category.preset || String(sub.id).startsWith('custom-')
        const count = model.countBySub[sub.id] || 0
        const path = '/taxonomy/subcategories/' + encodeURIComponent(sub.id)
        return h(
          'li',
          { key: sub.id, className: cx('kg-subrow', sub.hidden && 'is-hidden') },
          h(
            'div',
            { className: 'kg-subrow-main' },
            h('button', { type: 'button', className: cx('kg-fav', sub.starred && 'is-on'), title: sub.starred ? '取消重点标记' : '标记为重点子类（星图中显示为环状巨行星）', onClick: () => run('PATCH', path, { starred: !sub.starred }) }, sub.starred ? '★' : '☆'),
            h('span', { className: 'kg-subrow-name' }, sub.name),
            sub.hidden ? h('span', { className: 'kg-pill' }, '已隐藏') : null,
            h('span', { className: 'kg-muted kg-subrow-kw', title: (sub.keywords || []).join('、') }, (sub.keywords || []).length ? '关键词：' + truncateText((sub.keywords || []).join('、'), 36) : '未设关键词'),
            h('span', { className: 'kg-grow' }),
            h('span', { className: 'kg-muted' }, count + ' 张'),
            h(Select, {
              bare: true, className: 'kg-select-sm', 'aria-label': '行星外观', title: '星图中的行星外观', value: sub.style || '',
              onChange: (value) => run('PATCH', path, { style: value }),
              options: Object.keys(PLANET_STYLE_LABELS).map((value) => ({ value, label: '🪐 ' + PLANET_STYLE_LABELS[value] })),
            }),
            custom ? h('button', { type: 'button', className: 'kg-link-btn', onClick: () => setAction({ type: 'edit-sub', id: sub.id }) }, '编辑') : null,
            h('button', { type: 'button', className: 'kg-link-btn', onClick: () => run('PATCH', path, { hidden: !sub.hidden }) }, sub.hidden ? '显示' : '隐藏'),
            custom ? h('button', { type: 'button', className: 'kg-link-btn kg-link-danger', onClick: () => setAction({ type: 'del-sub', id: sub.id }) }, '删除') : null,
          ),
          is('edit-sub', sub.id)
            ? h(SubcategoryForm, { initial: sub, submitLabel: '保存', onCancel: done, onSubmit: (body) => run('PATCH', path, body, '已保存子类') })
            : null,
          is('del-sub', sub.id) ? h(DeleteBox, { model, kind: 'subcategory', target: sub, count, onDone: done, onCancel: done }) : null,
        )
      }

      const categoryBlock = (category) => {
        const open = expanded[category.id] !== false
        const count = model.countByCat[category.id] || 0
        const path = '/taxonomy/categories/' + encodeURIComponent(category.id)
        return h(
          'li',
          { key: category.id, className: cx('kg-catblock', category.hidden && 'is-hidden') },
          h(
            'div',
            { className: 'kg-catrow' },
            h('button', { type: 'button', className: 'kg-icon-btn', 'aria-expanded': open, 'aria-label': open ? '收起' : '展开', onClick: () => setExpanded(Object.assign({}, expanded, { [category.id]: !open })) }, open ? '▾' : '▸'),
            h('span', { className: 'kg-col-glyph', style: { color: ink(category.color), background: rgba(category.color, 0.16) } }, category.glyph),
            h('span', { className: 'kg-catrow-name' }, category.name),
            category.preset ? h('span', { className: 'kg-pill' }, '数学模板') : null,
            category.hidden ? h('span', { className: 'kg-pill' }, '已隐藏') : null,
            h('span', { className: 'kg-muted' }, category.subcategories.length + ' 个子类 · ' + count + ' 张卡片'),
            h('span', { className: 'kg-grow' }),
            h('button', { type: 'button', className: 'kg-link-btn', onClick: () => setAction({ type: 'add-sub', id: category.id }) }, '+ 子类'),
            category.preset ? null : h('button', { type: 'button', className: 'kg-link-btn', onClick: () => setAction({ type: 'edit-cat', id: category.id }) }, '编辑'),
            h('button', { type: 'button', className: 'kg-link-btn', onClick: () => run('PATCH', path, { hidden: !category.hidden }) }, category.hidden ? '显示' : '隐藏'),
            category.preset ? null : h('button', { type: 'button', className: 'kg-link-btn kg-link-danger', onClick: () => setAction({ type: 'del-cat', id: category.id }) }, '删除'),
          ),
          is('edit-cat', category.id) ? h(CategoryForm, { initial: category, submitLabel: '保存', onCancel: done, onSubmit: (body) => run('PATCH', path, body, '已保存大类') }) : null,
          is('del-cat', category.id) ? h(DeleteBox, { model, kind: 'category', target: category, count, onDone: done, onCancel: done }) : null,
          is('add-sub', category.id)
            ? h(SubcategoryForm, {
                submitLabel: '添加子类',
                onCancel: done,
                onSubmit: (body) => run('POST', '/taxonomy/subcategories', Object.assign({ categoryId: category.id }, body), '已添加子类「' + body.name + '」'),
              })
            : null,
          open ? h('ul', { className: 'kg-sublist' }, category.subcategories.length ? category.subcategories.map((sub) => subRow(category, sub)) : h('li', { className: 'kg-muted kg-pad' }, '还没有子类，点击右上「+ 子类」添加')) : null,
        )
      }

      return h(
        Modal,
        {
          open: true,
          onClose,
          size: 'wide',
          title: '🗂 管理类目',
          footer: h(React.Fragment, null, h('span', { className: 'kg-muted' }, '大类 = 星系，子类 = 行星；三个模式的分类树互相独立'), h('span', { className: 'kg-grow' }), h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: onClose }, '完成')),
        },
        h(Segmented, {
          value: mode,
          onChange: (value) => {
            setMode(value)
            setAction(null)
          },
          options: MODES.map((entry) => ({
            value: entry,
            label: MODE_META[entry].icon + ' ' + MODE_META[entry].label + (model.settings.modes[entry] === false ? '（已关闭）' : ''),
            color: MODE_META[entry].color,
          })),
        }),
        templateOff ? h('div', { className: 'kg-hint-line' }, '数学专业分类模板已在「设置」中关闭，这里只显示你自建的学科分类。') : null,
        shown.length
          ? h('ul', { className: 'kg-catlist' }, shown.map(categoryBlock))
          : h(EmptyState, { icon: '🪐', title: '「' + MODE_META[mode].label + '」模式还没有分类', hint: '新增一个大类，或从下方导入预设包，一键生成星系与行星。' }),
        h(
          'div',
          { className: 'kg-manage-foot' },
          h('button', { type: 'button', className: cx('kg-btn', is('new-cat', mode) && 'is-active'), onClick: () => setAction(is('new-cat', mode) ? null : { type: 'new-cat', id: mode }) }, '+ 新增大类'),
          h('button', { type: 'button', className: cx('kg-btn', is('presets', mode) && 'is-active'), onClick: () => setAction(is('presets', mode) ? null : { type: 'presets', id: mode }) }, '📦 导入预设'),
        ),
        is('new-cat', mode)
          ? h(CategoryForm, { submitLabel: '创建大类', onCancel: done, onSubmit: (body) => run('POST', '/taxonomy/categories', Object.assign({ mode }, body), '已创建大类「' + body.name + '」') })
          : null,
        is('presets', mode) ? h(PresetImport, { model, mode }) : null,
      )
    }

    // ---------------------------------------------------------------- settings

    function SettingRow(props) {
      return h(
        'div',
        { className: 'kg-setting' },
        h('div', { className: 'kg-setting-text' }, h('div', { className: 'kg-setting-title' }, props.title), props.hint ? h('div', { className: 'kg-muted' }, props.hint) : null),
        props.children,
      )
    }

    /** 「检查更新」: asks the host to compare the installed version with the latest GitHub release. */
    function UpdateChecker() {
      const [state, setState] = useState({ phase: 'idle', data: null, error: '' })
      const check = () => {
        setState({ phase: 'checking', data: null, error: '' })
        api('GET', '/update').then(
          (data) => setState({ phase: 'done', data, error: '' }),
          (error) => setState({ phase: 'error', data: null, error: errorText(error) }),
        )
      }
      const data = state.data
      const repositoryUrl = (store.state && store.state.repositoryUrl) || ''
      let result = null
      if (state.phase === 'error') {
        result = h('div', { className: 'kg-update kg-update-error', role: 'alert' }, '检查失败：' + state.error)
      } else if (data && data.hasUpdate) {
        result = h(
          'div',
          { className: 'kg-update kg-update-new', role: 'status' },
          h('div', null, '🎉 发现新版本 ', h('b', null, 'v' + data.latest), '（当前 v' + data.current + (data.publishedAt ? '，发布于 ' + formatDate(data.publishedAt) : '') + '）'),
          data.notes ? h(MarkdownBlock, { text: data.notes, limit: 120 }) : null,
          h('div', { className: 'kg-muted' }, '更新方法：在插件目录执行 git pull（或下载新版本覆盖），然后重启 DSH。'),
          h('a', { className: 'kg-btn kg-btn-sm kg-btn-primary', href: data.url, target: '_blank', rel: 'noreferrer noopener' }, '前往 GitHub 查看'),
        )
      } else if (data) {
        result = h(
          'div',
          { className: 'kg-update', role: 'status' },
          data.ahead ? '当前 v' + data.current + ' 比 GitHub 上的最新版本 v' + data.latest + ' 还新（开发版）。' : '✅ 已是最新版本（v' + data.current + '）。',
          data.source === 'branch' ? ' 仓库尚无正式发布，已与主分支的版本号比较。' : '',
        )
      }
      return h(
        React.Fragment,
        null,
        h(
          SettingRow,
          { title: '当前版本 v' + VERSION, hint: repositoryUrl ? h('a', { href: repositoryUrl, target: '_blank', rel: 'noreferrer noopener' }, repositoryUrl.replace('https://', '')) : null },
          h('button', { type: 'button', className: 'kg-btn', disabled: state.phase === 'checking', onClick: check }, state.phase === 'checking' ? '检查中…' : '检查更新'),
        ),
        result,
      )
    }

    function SettingsDialog(props) {
      const { open, model, onClose } = props
      if (!open) return null
      const settings = model.settings
      const patch = (body, message) =>
        mutate('PATCH', '/settings', body).then(
          () => message && showToast(message),
          (error) => showToast(errorText(error), 'error'),
        )
      const enabledCount = model.enabled.length
      const modeHints = {
        study: '学科知识、定理推导、编程技能、课程笔记',
        academic: '论文阅读、文献追踪、开题调研、方法对比',
        daily: '金融研究、健身方法、生活咨询、职场方案、杂项问答',
      }
      return h(
        Modal,
        { open: true, onClose, title: '⚙️ 设置', footer: h(React.Fragment, null, h('span', { className: 'kg-muted' }, '知识银河 v' + VERSION), h('span', { className: 'kg-grow' }), h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: onClose }, '完成')) },
        h('h3', { className: 'kg-setting-group' }, '模式开关'),
        MODES.map((mode) => {
          const on = settings.modes[mode] !== false
          const last = on && enabledCount === 1
          return h(
            SettingRow,
            { key: mode, title: MODE_META[mode].icon + ' ' + MODE_META[mode].label + '模式', hint: modeHints[mode] + (last ? '（至少保留开启 1 个模式）' : '') },
            h(Toggle, {
              checked: on,
              disabled: last,
              label: MODE_META[mode].label + '模式',
              onChange: (value) => patch({ modes: { [mode]: value } }, value ? '已开启「' + MODE_META[mode].label + '」模式' : '已关闭「' + MODE_META[mode].label + '」模式，历史数据已保留'),
            }),
          )
        }),
        h('div', { className: 'kg-hint-line' }, '关闭某个模式不会删除数据：它的卡片、分类和定时任务只是在主页、「全部」视图和收录下拉中隐藏，重新开启后立即恢复。'),
        h('h3', { className: 'kg-setting-group' }, '学习模式预置模板'),
        h(
          SettingRow,
          { title: '启用数学专业分类模板', hint: '分析学 / 代数与几何 / 概率与统计 / 计算与优化（4 大类 27 子类）。非数学专业可关闭后从零建立自己的学科分类；已收录的卡片不受影响。' },
          h(Toggle, { checked: settings.mathTemplate !== false, label: '数学专业分类模板', onChange: (value) => patch({ mathTemplate: value }, value ? '已启用数学模板' : '已关闭数学模板') }),
        ),
        h('h3', { className: 'kg-setting-group' }, '默认着陆页'),
        h(
          SettingRow,
          { title: '打开插件时的默认模式' },
          h(Select, {
            bare: true,
            value: settings.landingMode,
            onChange: (value) => patch({ landingMode: value }),
            options: [{ value: 'last', label: '上次停留的模式' }, { value: 'all', label: '全部' }].concat(MODES.map((mode) => ({ value: mode, label: MODE_META[mode].label + '模式' }))),
          }),
        ),
        h(
          SettingRow,
          { title: '默认看板视图' },
          h(Select, { bare: true, value: settings.landingView, onChange: (value) => patch({ landingView: value }), options: [{ value: 'group', label: '📋 分组看板' }, { value: 'timeline', label: '🕒 时间轴' }] }),
        ),
        h('h3', { className: 'kg-setting-group' }, '关于与更新'),
        h(UpdateChecker, null),
      )
    }

    // =====================================================================
    // 50-star — 星图: galaxy sidebar + single-galaxy Canvas 2D engine
    //
    // Lighting rule: only the galaxy core and the background star dust emit
    // light (additive blending). Planets and moons are opaque bodies: they are
    // drawn with normal blending, never with a glow, and get a lit side facing
    // the core plus a curved shadow (terminator) on the far side.
    // =====================================================================

    const STAR_TILT = 0.5
    const MAX_MOONS = 10
    const PLANET_STYLES = ['banded', 'rocky', 'ice', 'dune']
    const PLANET_PALETTES = {
      ringed: [['#d9b98a', '#a8845a', '#efe0c2'], ['#9fb7d9', '#6a86ad', '#d5e2f2'], ['#cfa9b8', '#9a7384', '#ecd3dc']],
      banded: [['#e3bd74', '#a9793d', '#f4e1b5'], ['#79bfd6', '#3b7896', '#bfe6f0'], ['#a497c2', '#665a88', '#d3cbe6']],
      rocky: [['#8f8c88', '#5c5956', '#b3b0ab'], ['#9a8474', '#63513f', '#bca893'], ['#7c8996', '#4d5763', '#a5b0bb']],
      ice: [['#1f4f90', '#123463', '#eaf6ff'], ['#1c6e8e', '#0f4660', '#e6fbff'], ['#2a4d80', '#182f55', '#dcebff']],
      dune: [['#c68b4c', '#8d582a', '#e2b683'], ['#c56a4b', '#86402c', '#e59c80'], ['#4e9c7b', '#2d6852', '#8fcdb0']],
    }

    function mulberry32(seed) {
      let a = seed >>> 0
      return () => {
        a |= 0
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }

    /** Ringed for busy (>= 10 cards) or starred subcategories, else a hash of the id. */
    function planetStyleOf(subcategory, count) {
      if (subcategory.style && PLANET_PALETTES[subcategory.style]) return subcategory.style
      if (subcategory.starred || count >= 10) return 'ringed'
      return PLANET_STYLES[hashString(subcategory.id) % PLANET_STYLES.length]
    }

    /** Logarithmic steps: empty subcategories are asteroids, busy ones are giants. */
    function planetRadiusOf(count) {
      if (count <= 0) return 4.5
      if (count <= 2) return 8.5
      if (count <= 5) return 11.5
      if (count <= 9) return 14.5
      if (count <= 19) return 17.5
      return 20.5
    }

    /** Paint one planet's surface (unlit) into its own canvas; lighting is applied per frame. */
    function paintPlanetTexture(style, seed, radius) {
      const size = Math.max(16, Math.ceil(radius * 2))
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const g = canvas.getContext('2d')
      const R = size / 2
      const rand = mulberry32(seed)
      const palettes = PLANET_PALETTES[style] || PLANET_PALETTES.rocky
      const [base, dark, light] = palettes[seed % palettes.length]
      g.translate(R, R)
      g.beginPath()
      g.arc(0, 0, R, 0, Math.PI * 2)
      g.clip()
      g.fillStyle = base
      g.fillRect(-R, -R, size, size)
      if (style === 'banded') {
        const bands = 3 + Math.floor(rand() * 3)
        for (let i = 0; i < bands; i += 1) {
          const y0 = -R + ((i + 0.5) * 2 * R) / bands
          const thickness = ((2 * R) / bands) * (0.4 + rand() * 0.3)
          const freq = 1.5 + rand() * 2
          const phase = rand() * 6.28
          const amp = R * 0.07
          g.beginPath()
          for (let x = -R; x <= R; x += 2) g.lineTo(x, y0 + Math.sin((x / R) * Math.PI * freq + phase) * amp)
          for (let x = R; x >= -R; x -= 2) g.lineTo(x, y0 + thickness + Math.sin((x / R) * Math.PI * freq + phase + 0.6) * amp)
          g.closePath()
          g.fillStyle = i % 2 === 0 ? rgba(dark, 0.75) : rgba(light, 0.7)
          g.fill()
        }
      } else if (style === 'ringed') {
        for (let i = 0; i < 6; i += 1) {
          g.fillStyle = i % 2 === 0 ? rgba(dark, 0.32) : rgba(light, 0.3)
          const y = -R + (i * 2 * R) / 6 + rand() * R * 0.08
          g.fillRect(-R, y, size, (R / 6) * (0.8 + rand() * 0.8))
        }
      } else if (style === 'ice') {
        for (let i = 0; i < 4; i += 1) {
          g.save()
          g.translate((rand() - 0.5) * R * 1.1, (rand() - 0.5) * R * 0.8)
          g.rotate((rand() - 0.5) * 0.9)
          g.beginPath()
          g.ellipse(0, 0, R * (0.3 + rand() * 0.3), R * (0.08 + rand() * 0.1), 0, 0, Math.PI * 2)
          g.fillStyle = rgba(dark, 0.7)
          g.fill()
          g.restore()
        }
        g.fillStyle = rgba(light, 0.95)
        g.beginPath()
        g.ellipse(0, -R * 0.93, R * 0.62, R * 0.26, 0, 0, Math.PI * 2)
        g.fill()
        g.beginPath()
        g.ellipse(0, R * 0.95, R * 0.5, R * 0.2, 0, 0, Math.PI * 2)
        g.fill()
      } else if (style === 'dune') {
        for (let i = 0; i < 2; i += 1) {
          g.save()
          g.translate((rand() - 0.5) * R, (rand() - 0.5) * R)
          g.rotate(rand() * 3)
          g.fillStyle = rgba(light, 0.35)
          g.fillRect(-R * 0.35, -R * 0.22, R * (0.5 + rand() * 0.4), R * (0.3 + rand() * 0.3))
          g.restore()
        }
        g.save()
        g.rotate(-0.45 + (rand() - 0.5) * 0.3)
        g.strokeStyle = rgba(dark, 0.55)
        g.lineWidth = Math.max(1, R * 0.07)
        for (let y = -R * 1.2; y < R * 1.2; y += R * 0.26) {
          g.beginPath()
          g.moveTo(-R * 1.3, y)
          g.quadraticCurveTo(0, y + R * 0.16, R * 1.3, y)
          g.stroke()
        }
        g.restore()
      } else {
        // rocky: matte surface, speckles and sharp-edged craters
        for (let i = 0; i < 26; i += 1) {
          g.fillStyle = rgba(i % 2 ? dark : light, 0.18)
          g.fillRect((rand() - 0.5) * 2 * R, (rand() - 0.5) * 2 * R, R * 0.12, R * 0.12)
        }
        const craters = 2 + Math.floor(rand() * 3)
        for (let i = 0; i < craters; i += 1) {
          const angle = rand() * 6.28
          const distance = rand() * R * 0.6
          const cr = R * (0.14 + rand() * 0.14)
          const x = Math.cos(angle) * distance
          const y = Math.sin(angle) * distance
          g.beginPath()
          g.arc(x, y, cr, 0, Math.PI * 2)
          g.fillStyle = rgba(dark, 0.85)
          g.fill()
          g.lineWidth = Math.max(0.8, R * 0.05)
          g.beginPath()
          g.arc(x, y, cr, Math.PI * 0.9, Math.PI * 1.9)
          g.strokeStyle = 'rgba(8,10,16,0.6)'
          g.stroke()
          g.beginPath()
          g.arc(x, y, cr, Math.PI * 1.95, Math.PI * 2.85)
          g.strokeStyle = rgba(light, 0.75)
          g.stroke()
        }
      }
      return { canvas, ring: light, ringDark: dark }
    }

    /**
     * Single-galaxy renderer.
     * @param canvas - <canvas> element owned by GalaxyCanvas
     * @param handlers - { onHover(info|null), onOpenItem(id), onSelectPlanet(id), onJump(beacon) }
     */
    function createGalaxyEngine(canvas, handlers) {
      const ctx = canvas.getContext('2d')
      let width = 0
      let height = 0
      let dpr = 1
      let raf = 0
      let lastFrame = 0
      let clock = 0
      let scene = null
      let nextScene = null
      let phase = 'idle'
      let phaseT = 0
      let options = { showLinks: true, paused: false, status: 'all' }
      let camera = { zoom: 1, ox: 0, oy: 0 }
      let pointer = { x: -9999, y: -9999, down: false, moved: 0, lastX: 0, lastY: 0 }
      let hover = null
      let highlight = { id: '', until: 0 }
      let dust = []
      let arms = []
      let layoutInfo = { cx: 0, cy: 0, minR: 80, maxR: 300, scale: 1 }
      let fps = 60
      let destroyed = false

      function buildDust() {
        const rand = mulberry32(20261112)
        dust = []
        const total = Math.round(Math.min(420, (width * height) / 3600))
        for (let i = 0; i < total; i += 1) {
          const layer = i % 3
          dust.push({ x: rand() * width, y: rand() * height, size: 0.5 + rand() * (layer + 1) * 0.45, alpha: 0.25 + rand() * 0.55, layer, phase: rand() * 6.28, speed: 0.4 + rand() * 1.2 })
        }
      }

      function buildArms() {
        const rand = mulberry32(scene ? hashString(scene.id) : 7)
        arms = []
        const total = width * height > 900000 ? 1500 : 1100
        const armCount = 2 + (scene ? hashString(scene.id) % 2 : 0)
        for (let i = 0; i < total; i += 1) {
          const t = Math.pow(rand(), 0.75)
          const r = 14 + t * layoutInfo.maxR * 1.08
          const arm = i % armCount
          const scatter = (rand() + rand() + rand() - 1.5) * (0.34 + t * 0.5)
          arms.push({
            r,
            theta: (arm * Math.PI * 2) / armCount + t * 4.2 + scatter,
            size: 0.8 + rand() * 1.9 * (1.2 - t),
            alpha: (0.22 + rand() * 0.6) * (1.1 - t * 0.7),
            white: rand() < 0.3,
            phase: rand() * 6.28,
          })
        }
      }

      function layout() {
        const cx = width / 2
        const cy = height / 2 + 4
        const maxR = Math.max(120, Math.min(width * 0.45, (height * 0.44) / STAR_TILT))
        const minR = Math.max(64, maxR * 0.26)
        const count = scene ? scene.planets.length : 0
        const gap = count > 1 ? (maxR - minR) / (count - 1) : maxR
        const scale = Math.max(0.6, Math.min(1.7, gap / 46)) * Math.max(0.8, Math.min(1.15, maxR / 360))
        layoutInfo = { cx, cy, minR, maxR, scale }
        if (!scene) return
        scene.planets.forEach((planet, index) => {
          planet.orbit = count > 1 ? minR + gap * index : (minR + maxR) / 2
          planet.radius = planetRadiusOf(planet.count) * scale
          // Kepler's third law: angular speed falls off as r^-1.5, so inner planets visibly lap outer ones.
          planet.omega = 0.12 * Math.pow(minR / planet.orbit, 1.5)
          const texture = paintPlanetTexture(planet.count > 0 ? planet.style : 'rocky', planet.seed, planet.radius * Math.min(3, dpr * 1.6))
          planet.texture = texture.canvas
          planet.ringColor = texture.ring
          planet.ringDark = texture.ringDark
          planet.moons.forEach((moon, moonIndex) => {
            moon.orbit = planet.radius + (7 + (moonIndex % 2) * 5.5) * scale
            moon.radius = Math.max(2.1, 2.7 * scale)
            moon.omega = 0.42 / (1 + (moonIndex % 2) * 0.35)
          })
        })
        buildArms()
      }

      function resize() {
        const rect = canvas.getBoundingClientRect()
        const nextWidth = Math.max(1, Math.round(rect.width))
        const nextHeight = Math.max(1, Math.round(rect.height))
        const nextDpr = Math.min(2, window.devicePixelRatio || 1)
        if (nextWidth === width && nextHeight === height && nextDpr === dpr) return
        width = nextWidth
        height = nextHeight
        dpr = nextDpr
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
        buildDust()
        layout()
      }

      /** Keep orbital angles of bodies that survive a data refresh. */
      function adoptAngles(next, previous) {
        const planetsById = Object.create(null)
        if (previous) previous.planets.forEach((planet) => (planetsById[planet.id] = planet))
        next.planets.forEach((planet, index) => {
          const old = planetsById[planet.id]
          planet.angle = old ? old.angle : index * 2.399963 + (planet.seed % 628) / 100
          const moonsById = Object.create(null)
          if (old) old.moons.forEach((moon) => (moonsById[moon.id] = moon))
          planet.moons.forEach((moon, moonIndex) => {
            const oldMoon = moonsById[moon.id]
            moon.angle = oldMoon ? oldMoon.angle : (moonIndex / Math.max(1, planet.moons.length)) * Math.PI * 2 + (planet.seed % 97) / 15
          })
        })
      }

      function applyScene(next, previous) {
        adoptAngles(next, previous)
        scene = next
        if (next.highlightId && next.highlightNonce !== (previous && previous.highlightNonce)) {
          highlight = { id: next.highlightId, until: clock + 5 }
        }
        layout()
      }

      function setScene(next) {
        if (!next) {
          scene = null
          nextScene = null
          phase = 'idle'
          return
        }
        if (!scene) {
          applyScene(next, null)
          phase = 'expand'
          phaseT = 0
          return
        }
        if (scene.id === next.id && phase !== 'collapse') {
          applyScene(next, scene)
          return
        }
        // Jump to another galaxy: collapse the old one, then unfold the new one.
        nextScene = next
        if (phase !== 'collapse') {
          phase = 'collapse'
          phaseT = 0
        }
        hover = null
        handlers.onHover(null)
      }

      function bodyPosition(planet) {
        const x = layoutInfo.cx + Math.cos(planet.angle) * planet.orbit
        const y = layoutInfo.cy + Math.sin(planet.angle) * planet.orbit * STAR_TILT
        return { x, y }
      }

      function moonPosition(planet, position, moon) {
        return { x: position.x + Math.cos(moon.angle) * moon.orbit, y: position.y + Math.sin(moon.angle) * moon.orbit * 0.72 }
      }

      function toWorld(px, py) {
        return { x: (px - layoutInfo.cx - camera.ox) / camera.zoom + layoutInfo.cx, y: (py - layoutInfo.cy - camera.oy) / camera.zoom + layoutInfo.cy }
      }

      function toScreen(x, y) {
        return { x: (x - layoutInfo.cx) * camera.zoom + layoutInfo.cx + camera.ox, y: (y - layoutInfo.cy) * camera.zoom + layoutInfo.cy + camera.oy }
      }

      function beaconSlots(planet, position) {
        return planet.beacons.slice(0, 3).map((beacon, index) => ({
          beacon,
          x: position.x + planet.radius + 9 + index * 17,
          y: position.y - planet.radius - 9,
        }))
      }

      function hitTest() {
        if (!scene || phase === 'collapse' || pointer.x < 0) return null
        const world = toWorld(pointer.x, pointer.y)
        const slack = 5 / camera.zoom
        let best = null
        for (const planet of scene.planets) {
          const position = bodyPosition(planet)
          for (const slot of beaconSlots(planet, position)) {
            if (Math.hypot(world.x - slot.x, world.y - slot.y) <= 9) return { kind: 'beacon', planet, beacon: slot.beacon, x: slot.x, y: slot.y }
          }
          for (const moon of planet.moons) {
            const at = moonPosition(planet, position, moon)
            if (Math.hypot(world.x - at.x, world.y - at.y) <= moon.radius + slack) return { kind: 'moon', planet, moon, x: at.x, y: at.y }
          }
          if (Math.hypot(world.x - position.x, world.y - position.y) <= planet.radius + slack) best = { kind: 'planet', planet, x: position.x, y: position.y }
        }
        return best
      }

      function updateHover() {
        const hit = hitTest()
        const key = hit ? hit.kind + ':' + (hit.moon ? hit.moon.id : hit.beacon ? hit.planet.id + hit.beacon.categoryId : hit.planet.id) : ''
        const previousKey = hover ? hover.key : ''
        hover = hit ? Object.assign(hit, { key }) : null
        canvas.style.cursor = hit ? 'pointer' : pointer.down ? 'grabbing' : 'grab'
        if (hit) {
          const screen = toScreen(hit.x, hit.y)
          handlers.onHover({ kind: hit.kind, planetId: hit.planet.id, itemId: hit.moon ? hit.moon.id : '', beacon: hit.beacon || null, x: screen.x, y: screen.y, key })
        } else if (previousKey) {
          handlers.onHover(null)
        }
      }

      // ------------------------------------------------------------ drawing

      function drawBackground() {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.75)
        gradient.addColorStop(0, '#111735')
        gradient.addColorStop(0.55, '#090c1f')
        gradient.addColorStop(1, '#04050d')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
        ctx.globalCompositeOperation = 'lighter'
        for (const star of dust) {
          const drift = (star.layer + 1) * 0.012
          const x = (((star.x + camera.ox * drift * 4) % width) + width) % width
          const y = (((star.y + camera.oy * drift * 4) % height) + height) % height
          const twinkle = 0.65 + 0.35 * Math.sin(clock * star.speed + star.phase)
          ctx.fillStyle = 'rgba(214,226,255,' + (star.alpha * twinkle).toFixed(3) + ')'
          ctx.fillRect(x, y, star.size, star.size)
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      function drawCore(spread) {
        const { cx, cy, minR, maxR } = layoutInfo
        const color = scene.color
        ctx.globalCompositeOperation = 'lighter'
        // far halo: light radiating across the whole system
        let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.05)
        gradient.addColorStop(0, rgba(color, 0.26))
        gradient.addColorStop(0.35, rgba(color, 0.08))
        gradient.addColorStop(1, rgba(color, 0))
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, STAR_TILT + 0.14)
        ctx.translate(-cx, -cy)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, maxR * 1.05, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        // spiral-arm star dust: pure light effect, so it stays put (only a faint twinkle)
        for (const particle of arms) {
          const angle = particle.theta
          const r = particle.r * spread
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r * STAR_TILT
          const glow = (particle.alpha * (0.82 + 0.18 * Math.sin(clock * 0.9 + particle.phase))).toFixed(3)
          ctx.fillStyle = particle.white ? 'rgba(255,255,255,' + glow + ')' : rgba(color, glow)
          ctx.fillRect(x, y, particle.size, particle.size)
        }
        // the star itself — the only light source of the system
        const pulse = 1 + 0.04 * Math.sin(clock * 1.3)
        const coreR = minR * 0.62 * pulse
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
        gradient.addColorStop(0, 'rgba(255,255,255,0.98)')
        gradient.addColorStop(0.16, 'rgba(255,255,255,0.9)')
        gradient.addColorStop(0.36, rgba(color, 0.72))
        gradient.addColorStop(1, rgba(color, 0))
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = 'rgba(20,24,48,0.82)'
        ctx.font = '600 ' + Math.round(minR * 0.2) + 'px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(scene.glyph, cx, cy + 1)
      }

      /** Opaque body shading: lit towards the core, curved terminator on the far side. No glow. */
      function shade(x, y, radius, lightX, lightY) {
        const px = x + lightX * radius * 0.55
        const py = y + lightY * radius * 0.55
        const gradient = ctx.createRadialGradient(px, py, radius * 0.08, px, py, radius * 1.72)
        gradient.addColorStop(0, rgba(scene.color, 0.34))
        gradient.addColorStop(0.2, 'rgba(255,255,255,0.08)')
        gradient.addColorStop(0.42, 'rgba(4,6,14,0.08)')
        gradient.addColorStop(0.6, 'rgba(4,6,14,0.62)')
        gradient.addColorStop(0.86, 'rgba(3,4,10,0.93)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius + 0.4, 0, Math.PI * 2)
        ctx.fill()
      }

      function drawRing(planet, position, front) {
        const rx = planet.radius * 2
        const ry = planet.radius * 0.6
        ctx.save()
        ctx.translate(position.x, position.y)
        ctx.rotate(-0.38)
        ctx.lineWidth = planet.radius * 0.3
        ctx.strokeStyle = rgba(planet.ringColor, front ? 0.78 : 0.42)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2)
        ctx.stroke()
        ctx.lineWidth = Math.max(0.6, planet.radius * 0.06)
        ctx.strokeStyle = rgba(planet.ringDark, front ? 0.8 : 0.45)
        ctx.beginPath()
        ctx.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      function drawPlanet(planet, position) {
        const { cx, cy } = layoutInfo
        const dx = cx - position.x
        const dy = cy - position.y
        const distance = Math.hypot(dx, dy) || 1
        const lightX = dx / distance
        const lightY = dy / distance
        const ringed = planet.style === 'ringed' && planet.count > 0
        if (ringed) drawRing(planet, position, false)
        ctx.save()
        ctx.beginPath()
        ctx.arc(position.x, position.y, planet.radius, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(planet.texture, position.x - planet.radius, position.y - planet.radius, planet.radius * 2, planet.radius * 2)
        shade(position.x, position.y, planet.radius, lightX, lightY)
        ctx.restore()
        if (ringed) drawRing(planet, position, true)
        const hovered = hover && hover.planet === planet && hover.kind !== 'beacon'
        const flagged = highlight.id === planet.id && clock < highlight.until
        if (hovered || flagged) {
          ctx.lineWidth = 1.2
          ctx.strokeStyle = flagged ? 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(clock * 6)).toFixed(2) + ')' : 'rgba(255,255,255,0.7)'
          ctx.setLineDash(flagged ? [4, 4] : [])
          ctx.beginPath()
          ctx.arc(position.x, position.y, planet.radius + (flagged ? 7 : 3.5), 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
        }
        return { lightX, lightY }
      }

      function drawMoon(planet, moon, at, light) {
        const dim = options.status !== 'all' && moon.status !== options.status
        ctx.globalAlpha *= dim ? 0.22 : 1
        if (moon.paper) {
          ctx.lineWidth = 0.7
          ctx.strokeStyle = 'rgba(226,230,245,0.75)'
          ctx.beginPath()
          ctx.ellipse(at.x, at.y, moon.radius * 2, moon.radius * 0.75, -0.4, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = moon.paper ? '#ddd6c4' : '#b4bccb'
        ctx.beginPath()
        ctx.arc(at.x, at.y, moon.radius, 0, Math.PI * 2)
        ctx.fill()
        // far-side shadow: half disc turned away from the core
        const facing = Math.atan2(light.lightY, light.lightX)
        ctx.fillStyle = 'rgba(4,6,14,0.78)'
        ctx.beginPath()
        ctx.arc(at.x, at.y, moon.radius + 0.2, facing + Math.PI / 2, facing + Math.PI * 1.5)
        ctx.fill()
        if (hover && hover.moon === moon) {
          ctx.lineWidth = 1
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'
          ctx.beginPath()
          ctx.arc(at.x, at.y, moon.radius + 2.5, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha /= dim ? 0.22 : 1
      }

      function drawLinks(anchors) {
        if (!options.showLinks || !scene.links.length) return
        ctx.lineWidth = 1.1
        ctx.setLineDash([3, 6])
        ctx.lineDashOffset = -clock * 9
        for (const link of scene.links) {
          const a = anchors[link.a]
          const b = anchors[link.b]
          if (!a || !b) continue
          const mx = (a.x + b.x) / 2
          const my = (a.y + b.y) / 2
          // bend the trail away from the core, like a transfer orbit
          const ox = mx - layoutInfo.cx
          const oy = my - layoutInfo.cy
          const norm = Math.hypot(ox, oy) || 1
          const bend = Math.min(60, Math.hypot(a.x - b.x, a.y - b.y) * 0.28)
          ctx.strokeStyle = 'rgba(214,224,255,0.42)'
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.quadraticCurveTo(mx + (ox / norm) * bend, my + (oy / norm) * bend, b.x, b.y)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }

      function drawScene(alpha, spread, spin) {
        const { cx, cy } = layoutInfo
        ctx.save()
        ctx.translate(cx + camera.ox, cy + camera.oy)
        ctx.scale(camera.zoom * spread, camera.zoom * spread)
        ctx.rotate(spin)
        ctx.translate(-cx, -cy)
        ctx.globalAlpha = alpha
        drawCore(1)
        // orbit guides
        ctx.lineWidth = 0.7 / camera.zoom
        for (const planet of scene.planets) {
          ctx.strokeStyle = 'rgba(170,186,230,0.11)'
          ctx.beginPath()
          ctx.ellipse(cx, cy, planet.orbit, planet.orbit * STAR_TILT, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        const anchors = Object.create(null)
        const ordered = scene.planets
          .map((planet) => ({ planet, position: bodyPosition(planet) }))
          .sort((a, b) => a.position.y - b.position.y)
        for (const entry of ordered) {
          entry.moonsAt = entry.planet.moons.map((moon) => moonPosition(entry.planet, entry.position, moon))
          entry.planet.items.forEach((id) => (anchors[id] = entry.position))
          entry.planet.moons.forEach((moon, index) => (anchors[moon.id] = entry.moonsAt[index]))
        }
        drawLinks(anchors)
        for (const entry of ordered) {
          const { planet, position } = entry
          // moons behind the planet first, then the planet, then the ones in front
          const dx = cx - position.x
          const dy = cy - position.y
          const distance = Math.hypot(dx, dy) || 1
          const light = { lightX: dx / distance, lightY: dy / distance }
          planet.moons.forEach((moon, index) => {
            if (Math.sin(moon.angle) < 0) drawMoon(planet, moon, entry.moonsAt[index], light)
          })
          drawPlanet(planet, position)
          planet.moons.forEach((moon, index) => {
            if (Math.sin(moon.angle) >= 0) drawMoon(planet, moon, entry.moonsAt[index], light)
          })
          // label
          const hovered = hover && hover.planet === planet
          ctx.font = (hovered ? '600 ' : '') + Math.max(10, 11 / Math.sqrt(camera.zoom)) + 'px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'
          const labelY = position.y + planet.radius + (planet.moons.length ? 14 * layoutInfo.scale : 5) + 2
          const text = planet.name + (planet.count ? ' · ' + planet.count : '')
          ctx.fillStyle = 'rgba(4,6,14,0.55)'
          ctx.fillText(text, position.x + 0.6, labelY + 0.8)
          ctx.fillStyle = planet.count ? (hovered ? '#ffffff' : 'rgba(226,232,255,0.88)') : 'rgba(170,180,210,0.6)'
          ctx.fillText(text, position.x, labelY)
          if (planet.hiddenMoons > 0) {
            ctx.fillStyle = 'rgba(190,200,230,0.7)'
            ctx.fillText('+' + planet.hiddenMoons + ' 颗卫星', position.x, labelY + 13)
          }
          // 跃迁信标 for links leaving this galaxy
          for (const slot of beaconSlots(planet, position)) {
            const active = hover && hover.kind === 'beacon' && hover.beacon === slot.beacon
            ctx.fillStyle = 'rgba(14,18,40,0.92)'
            ctx.beginPath()
            ctx.arc(slot.x, slot.y, 8, 0, Math.PI * 2)
            ctx.fill()
            ctx.lineWidth = active ? 1.8 : 1.1
            ctx.strokeStyle = slot.beacon.color
            ctx.stroke()
            ctx.save()
            ctx.translate(slot.x, slot.y)
            ctx.rotate(clock * 0.8)
            ctx.font = '10px system-ui, sans-serif'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = '#ffffff'
            ctx.fillText('🌀', 0, 0.5)
            ctx.restore()
          }
        }
        ctx.restore()
      }

      function frame(now) {
        if (destroyed) return
        raf = window.requestAnimationFrame(frame)
        if (document.hidden) {
          lastFrame = now
          return
        }
        const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 0.016)
        lastFrame = now
        fps = fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05
        clock += dt
        resize()
        const still = options.paused || (hover && hover.kind !== 'planet')
        if (scene && !still) {
          for (const planet of scene.planets) {
            planet.angle += planet.omega * dt
            for (const moon of planet.moons) moon.angle += moon.omega * dt
          }
        } else if (scene && options.paused === false) {
          // hovering a moon freezes orbits so it can be clicked
        }
        let alpha = 1
        let spread = 1
        let spin = 0
        if (phase === 'collapse') {
          phaseT += dt / 0.42
          const e = Math.min(1, phaseT)
          alpha = 1 - e
          spread = 1 - 0.8 * e * e
          spin = e * e * 1.4
          if (e >= 1) {
            const previous = scene
            if (nextScene) applyScene(nextScene, previous && previous.id === nextScene.id ? previous : null)
            nextScene = null
            camera = { zoom: 1, ox: 0, oy: 0 }
            phase = 'expand'
            phaseT = 0
            alpha = 0
          }
        } else if (phase === 'expand') {
          phaseT += dt / 0.7
          const e = Math.min(1, phaseT)
          const ease = 1 - Math.pow(1 - e, 3)
          alpha = ease
          spread = 1.7 - 0.7 * ease
          spin = -(1 - ease) * 0.9
          if (e >= 1) phase = 'idle'
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawBackground()
        if (scene) drawScene(alpha, spread, spin)
        if (phase === 'idle' && !pointer.down) updateHover()
        window.__KG_STAR_DEBUG__ = {
          galaxy: scene ? scene.id : null,
          phase,
          fps: Math.round(fps),
          planets: scene ? scene.planets.length : 0,
          zoom: camera.zoom,
          hover: hover ? hover.key : '',
          positions: scene
            ? scene.planets.map((planet) => {
                const screen = toScreen(bodyPosition(planet).x, bodyPosition(planet).y)
                return { id: planet.id, x: screen.x, y: screen.y, r: planet.radius, moons: planet.moons.map((moon) => { const at = moonPosition(planet, bodyPosition(planet), moon); const s = toScreen(at.x, at.y); return { id: moon.id, x: s.x, y: s.y } }) }
              })
            : [],
        }
      }

      // ------------------------------------------------------------ input

      function local(event) {
        const rect = canvas.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }

      function onMove(event) {
        const at = local(event)
        if (pointer.down) {
          const dx = at.x - pointer.lastX
          const dy = at.y - pointer.lastY
          pointer.moved += Math.abs(dx) + Math.abs(dy)
          if (pointer.moved > 4) {
            camera.ox += dx
            camera.oy += dy
            hover = null
            handlers.onHover(null)
          }
        }
        pointer.x = at.x
        pointer.y = at.y
        pointer.lastX = at.x
        pointer.lastY = at.y
      }

      function onDown(event) {
        const at = local(event)
        pointer = { x: at.x, y: at.y, down: true, moved: 0, lastX: at.x, lastY: at.y }
      }

      function onUp() {
        if (!pointer.down) return
        pointer.down = false
        if (pointer.moved > 4) return
        const hit = hitTest()
        if (!hit) {
          handlers.onSelectPlanet('')
          return
        }
        if (hit.kind === 'moon') handlers.onOpenItem(hit.moon.id)
        else if (hit.kind === 'beacon') handlers.onJump(hit.beacon)
        else handlers.onSelectPlanet(hit.planet.id)
      }

      function onLeave() {
        pointer.x = -9999
        pointer.y = -9999
        pointer.down = false
        if (hover) {
          hover = null
          handlers.onHover(null)
        }
      }

      function onWheel(event) {
        event.preventDefault()
        const at = local(event)
        const before = toWorld(at.x, at.y)
        camera.zoom = Math.max(0.6, Math.min(3, camera.zoom * Math.exp(-event.deltaY * 0.0015)))
        const after = toScreen(before.x, before.y)
        camera.ox += at.x - after.x
        camera.oy += at.y - after.y
      }

      function resetView() {
        camera = { zoom: 1, ox: 0, oy: 0 }
      }

      canvas.addEventListener('mousemove', onMove)
      canvas.addEventListener('mousedown', onDown)
      window.addEventListener('mouseup', onUp)
      canvas.addEventListener('mouseleave', onLeave)
      canvas.addEventListener('wheel', onWheel, { passive: false })
      canvas.addEventListener('dblclick', resetView)
      resize()
      raf = window.requestAnimationFrame(frame)

      return {
        setScene,
        setOptions(next) {
          options = Object.assign({}, options, next)
        },
        resetView,
        destroy() {
          destroyed = true
          window.cancelAnimationFrame(raf)
          canvas.removeEventListener('mousemove', onMove)
          canvas.removeEventListener('mousedown', onDown)
          window.removeEventListener('mouseup', onUp)
          canvas.removeEventListener('mouseleave', onLeave)
          canvas.removeEventListener('wheel', onWheel)
          canvas.removeEventListener('dblclick', resetView)
        },
      }
    }

    /** Plain-data description of one galaxy (= one category) for the engine. */
    function buildGalaxyScene(model, category, highlight) {
      const itemsBySub = Object.create(null)
      model.items.forEach((item) => {
        if (item.categoryId === category.id) (itemsBySub[item.subcategoryId] = itemsBySub[item.subcategoryId] || []).push(item)
      })
      const links = []
      const planets = displaySubs(model, category).map((subcategory) => {
        const items = itemsBySub[subcategory.id] || []
        const beacons = []
        items.forEach((item) => {
          ;(model.linksByItem[item.id] || []).forEach((link) => {
            link.itemIds.forEach((otherId) => {
              const other = model.itemsById[otherId]
              if (!other || other.categoryId === category.id) return
              let beacon = beacons.find((entry) => entry.categoryId === other.categoryId)
              if (!beacon) {
                const target = model.catById[other.categoryId]
                beacon = { categoryId: other.categoryId, subcategoryId: other.subcategoryId, mode: other.mode, name: target ? target.name : '', color: target ? target.color : UNKNOWN_COLOR, count: 0, fromPlanet: subcategory.id }
                beacons.push(beacon)
              }
              beacon.count += 1
            })
          })
        })
        return {
          id: subcategory.id,
          name: subcategory.name,
          count: items.length,
          style: planetStyleOf(subcategory, items.length),
          seed: hashString(subcategory.id),
          items: items.map((item) => item.id),
          moons: items.slice(0, MAX_MOONS).map((item) => ({ id: item.id, paper: item.kind === 'paper', status: item.status || 'todo' })),
          hiddenMoons: Math.max(0, items.length - MAX_MOONS),
          beacons,
        }
      })
      const seen = Object.create(null)
      model.links.forEach((link) => {
        const inside = link.itemIds.filter((id) => model.itemsById[id].categoryId === category.id)
        for (let i = 1; i < inside.length; i += 1) {
          const key = inside[i - 1] + '>' + inside[i]
          if (!seen[key]) {
            seen[key] = true
            links.push({ a: inside[i - 1], b: inside[i], label: link.label })
          }
        }
      })
      return {
        id: category.id,
        name: category.name,
        color: category.color || UNKNOWN_COLOR,
        glyph: category.glyph || '✦',
        planets,
        links,
        highlightId: highlight && highlight.categoryId === category.id ? highlight.subcategoryId : '',
        highlightNonce: highlight ? highlight.nonce : 0,
      }
    }

    function GalaxyCanvas(props) {
      const { scene, options, handlers } = props
      const canvasRef = useRef(null)
      const engineRef = useRef(null)
      const handlersRef = useRef(handlers)
      handlersRef.current = handlers
      useEffect(() => {
        const engine = createGalaxyEngine(canvasRef.current, {
          onHover: (info) => handlersRef.current.onHover(info),
          onOpenItem: (id) => handlersRef.current.onOpenItem(id),
          onSelectPlanet: (id) => handlersRef.current.onSelectPlanet(id),
          onJump: (beacon) => handlersRef.current.onJump(beacon),
        })
        engineRef.current = engine
        window.__KG_STAR_API__ = engine
        return () => {
          engine.destroy()
          engineRef.current = null
        }
      }, [])
      useEffect(() => {
        if (engineRef.current) engineRef.current.setScene(scene)
      }, [scene])
      useEffect(() => {
        if (engineRef.current) engineRef.current.setOptions(options)
      }, [options.showLinks, options.paused, options.status])
      return h('canvas', { ref: canvasRef, className: 'kg-star-canvas', role: 'img', 'aria-label': scene ? '星系「' + scene.name + '」星图' : '星图' })
    }

    /**
     * 星图 view: galaxy sidebar on the left, one focused galaxy on the canvas.
     * props: { model, mode, onModeChange, onOpenItem, onManage }
     */
    function StarView(props) {
      const { model, mode, onOpenItem } = props
      const [collapsed, setCollapsed] = usePref('starSidebar', 'open', ['open', 'closed'])
      const [galaxyId, setGalaxyId] = useState(() => lsGet('galaxy:' + mode, ''))
      const [showLinks, setShowLinks] = useState(true)
      const [paused, setPaused] = useState(false)
      const [status, setStatus] = useState('all')
      const [hover, setHover] = useState(null)
      const [planetId, setPlanetId] = useState('')
      const [highlight, setHighlight] = useState(null)
      const galaxies = displayCategories(model, mode)
      const current = galaxies.find((category) => category.id === galaxyId) || galaxies[0] || null
      useEffect(() => {
        const stored = lsGet('galaxy:' + mode, '')
        if (!galaxies.some((category) => category.id === galaxyId) && stored && stored !== galaxyId) setGalaxyId(stored)
      }, [mode])
      const scene = useMemo(() => (current ? buildGalaxyScene(model, current, highlight) : null), [model, current && current.id, highlight])
      const choose = (id) => {
        setGalaxyId(id)
        lsSet('galaxy:' + mode, id)
        setPlanetId('')
        setHover(null)
      }
      const jump = (beacon) => {
        if (mode !== 'all' && beacon.mode !== mode) props.onModeChange(beacon.mode)
        setHighlight({ categoryId: beacon.categoryId, subcategoryId: beacon.subcategoryId, nonce: Date.now() })
        setGalaxyId(beacon.categoryId)
        lsSet('galaxy:' + beacon.mode, beacon.categoryId)
        setPlanetId('')
        setHover(null)
        showToast('🌀 已跃迁至「' + beacon.name + '」星系')
      }
      const handlers = { onHover: setHover, onOpenItem, onSelectPlanet: setPlanetId, onJump: jump }
      const options = { showLinks, paused, status }

      if (!current) {
        return h(EmptyState, {
          icon: '🪐',
          title: (mode === 'all' ? '' : '「' + MODE_META[mode].label + '」模式') + '还没有星系',
          hint: '每个大类是一个星系，子类是行星，卡片是卫星。先新增一个大类，或导入预设包。',
          action: h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: props.onManage }, '🗂 管理类目'),
        })
      }

      const groups = mode === 'all' ? model.enabled.map((entry) => ({ mode: entry, list: galaxies.filter((category) => category.mode === entry) })).filter((group) => group.list.length) : [{ mode, list: galaxies }]
      const planetItems = planetId ? model.items.filter((item) => item.subcategoryId === planetId) : []
      const hoverItem = hover && hover.kind === 'moon' ? model.itemsById[hover.itemId] : null
      const hoverPlanet = hover && hover.kind === 'planet' && scene ? scene.planets.find((planet) => planet.id === hover.planetId) : null
      const galaxyItems = model.items.filter((item) => item.categoryId === current.id)
      const statusNames = STATUS_LABELS[current.mode]
      const narrow = collapsed === 'closed'

      return h(
        'div',
        { className: 'kg-star' },
        h(
          'aside',
          { className: cx('kg-star-side', narrow && 'is-narrow'), 'aria-label': '星系导航' },
          h(
            'div',
            { className: 'kg-star-side-head' },
            narrow ? null : h('span', null, '星系'),
            h('button', { type: 'button', className: 'kg-star-iconbtn', title: narrow ? '展开星系导航' : '折叠为图标栏', 'aria-label': narrow ? '展开星系导航' : '折叠星系导航', onClick: () => setCollapsed(narrow ? 'open' : 'closed') }, narrow ? '»' : '«'),
          ),
          h(
            'div',
            { className: 'kg-star-side-list' },
            groups.map((group) =>
              h(
                'div',
                { key: group.mode },
                mode === 'all' ? h('div', { className: 'kg-star-group', style: { color: MODE_META[group.mode].color } }, narrow ? MODE_META[group.mode].label.slice(0, 1) : MODE_META[group.mode].icon + ' ' + MODE_META[group.mode].label) : null,
                group.list.map((category) =>
                  h(
                    'button',
                    {
                      type: 'button',
                      key: category.id,
                      className: cx('kg-galaxy', current.id === category.id && 'is-active'),
                      style: { '--kg-accent': category.color },
                      title: category.name + ' · ' + displaySubs(model, category).length + ' 颗行星 · ' + (model.countByCat[category.id] || 0) + ' 张卡片',
                      onClick: () => choose(category.id),
                    },
                    h('span', { className: 'kg-galaxy-glyph' }, category.glyph),
                    narrow
                      ? null
                      : h(
                          'span',
                          { className: 'kg-galaxy-text' },
                          h('span', { className: 'kg-galaxy-name' }, h('i', { className: 'kg-galaxy-dot' }), category.name),
                          h('span', { className: 'kg-galaxy-meta' }, displaySubs(model, category).length + ' 行星 · ' + (model.countByCat[category.id] || 0) + ' 卡片'),
                        ),
                  ),
                ),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'kg-star-stage' },
          h(GalaxyCanvas, { scene, options, handlers }),
          h(
            'div',
            { className: 'kg-hud' },
            h('div', { className: 'kg-hud-title' }, h('span', { className: 'kg-hud-glyph', style: { color: current.color } }, current.glyph), current.name, h(ModeBadge, { mode: current.mode })),
            h(
              'div',
              { className: 'kg-hud-stats' },
              h('span', null, h('b', null, scene.planets.length), ' 行星'),
              h('span', null, h('b', null, galaxyItems.length), ' 卡片'),
              h('span', null, h('b', null, scene.links.length), ' 条星系内联系'),
            ),
            h(
              'div',
              { className: 'kg-hud-status' },
              STATUSES.map((value) => h('span', { key: value }, statusNames[value] + ' ' + galaxyItems.filter((item) => (item.status || 'todo') === value).length)),
            ),
            h('label', { className: 'kg-hud-row' }, h('span', null, '显示联系'), h(Toggle, { checked: showLinks, onChange: setShowLinks, label: '显示联系' })),
            h('label', { className: 'kg-hud-row' }, h('span', null, '暂停公转'), h(Toggle, { checked: paused, onChange: setPaused, label: '暂停公转' })),
            h(
              'label',
              { className: 'kg-hud-row' },
              h('span', null, '高亮状态'),
              h(Select, { bare: true, value: status, onChange: setStatus, options: [{ value: 'all', label: '全部' }].concat(STATUSES.map((value) => ({ value, label: statusNames[value] }))) }),
            ),
            h('div', { className: 'kg-hud-tip' }, '滚轮缩放 · 拖拽平移 · 双击复位 · 点卫星看卡片'),
          ),
          planetId && model.subById[planetId]
            ? h(
                'div',
                { className: 'kg-planet-panel' },
                h(
                  'div',
                  { className: 'kg-planet-head' },
                  h('span', null, '🪐 ' + model.subById[planetId].name),
                  h('span', { className: 'kg-planet-count' }, planetItems.length + ' 张卡片'),
                  h('button', { type: 'button', className: 'kg-star-iconbtn', 'aria-label': '关闭', onClick: () => setPlanetId('') }, '✕'),
                ),
                planetItems.length
                  ? h(
                      'div',
                      { className: 'kg-planet-list' },
                      planetItems.map((item) =>
                        h('button', { type: 'button', key: item.id, className: 'kg-planet-item', onClick: () => onOpenItem(item.id) }, h('span', null, (item.kind === 'paper' ? '📄 ' : '') + item.title), h('em', null, statusLabel(item))),
                      ),
                    )
                  : h('div', { className: 'kg-planet-empty' }, '这还是一颗小行星 —— 收录第一张卡片后它会长大'),
              )
            : null,
          hoverItem
            ? h(
                'div',
                { className: 'kg-star-tip', style: { left: Math.round(hover.x) + 'px', top: Math.round(hover.y) + 'px' } },
                h('div', { className: 'kg-star-tip-title' }, (hoverItem.kind === 'paper' ? '📄 ' : '') + hoverItem.title),
                h('div', { className: 'kg-star-tip-meta' }, subName(model, hoverItem.subcategoryId) + ' · ' + statusLabel(hoverItem) + (linkCount(model, hoverItem.id) ? ' · 🔗 ' + linkCount(model, hoverItem.id) : '')),
                hoverItem.summary || hoverItem.content ? h('div', { className: 'kg-star-tip-body' }, plainTextPreview(hoverItem.summary || hoverItem.content, 110)) : null,
                h('div', { className: 'kg-star-tip-foot' }, '点击打开卡片详情'),
              )
            : hoverPlanet
              ? h(
                  'div',
                  { className: 'kg-star-tip', style: { left: Math.round(hover.x) + 'px', top: Math.round(hover.y) + 'px' } },
                  h('div', { className: 'kg-star-tip-title' }, '🪐 ' + hoverPlanet.name),
                  h('div', { className: 'kg-star-tip-meta' }, (hoverPlanet.count ? hoverPlanet.count + ' 张卡片 · ' + PLANET_STYLE_LABELS[hoverPlanet.style] : '空子类 · 小行星')),
                )
              : hover && hover.kind === 'beacon'
                ? h(
                    'div',
                    { className: 'kg-star-tip', style: { left: Math.round(hover.x) + 'px', top: Math.round(hover.y) + 'px' } },
                    h('div', { className: 'kg-star-tip-title' }, '🌀 跃迁信标'),
                    h('div', { className: 'kg-star-tip-meta' }, '有 ' + hover.beacon.count + ' 条联系通往「' + MODE_META[hover.beacon.mode].label + ' · ' + hover.beacon.name + '」，点击跃迁'),
                  )
                : null,
        ),
      )
    }

    // =====================================================================
    // 60-views — 联系 list and 定时收录
    // =====================================================================

    function LinksView(props) {
      const { model, mode, onOpenItem } = props
      const [query, setQuery] = useState('')
      const [confirmId, setConfirmId] = useState('')
      const needle = query.trim().toLowerCase()
      const links = model.links.filter((link) => {
        const items = link.itemIds.map((id) => model.itemsById[id])
        if (mode !== 'all' && !items.some((item) => item.mode === mode)) return false
        if (!needle) return true
        return [link.label, link.note].concat(items.map((item) => item.title)).join('\n').toLowerCase().includes(needle)
      })
      const remove = (link) => {
        if (confirmId !== link.id) {
          setConfirmId(link.id)
          return
        }
        mutate('DELETE', '/links/' + encodeURIComponent(link.id)).then(
          () => showToast('已解除联系'),
          (error) => showToast(errorText(error), 'error'),
        )
      }
      return h(
        'div',
        { className: 'kg-page' },
        h(
          'div',
          { className: 'kg-toolbar-row' },
          h('div', { className: 'kg-search' }, h('span', { 'aria-hidden': 'true' }, '🔍'), h('input', { type: 'search', placeholder: '搜索联系名称 / 备注 / 卡片标题…', value: query, 'aria-label': '搜索联系', onChange: (event) => setQuery(event.target.value) })),
          h('span', { className: 'kg-muted' }, links.length + ' 条联系' + (mode === 'all' ? '' : '（至少一端在「' + MODE_META[mode].label + '」模式）')),
        ),
        links.length
          ? h(
              'ul',
              { className: 'kg-linkpage' },
              links.map((link) => {
                const modes = new Set(link.itemIds.map((id) => model.itemsById[id].mode))
                return h(
                  'li',
                  { key: link.id, className: 'kg-linkcard' },
                  h(
                    'div',
                    { className: 'kg-linkcard-head' },
                    h('span', { className: cx('kg-linklabel', link.kind === 'ref' && 'is-ref') }, link.label),
                    modes.size > 1 ? h('span', { className: 'kg-pill' }, '跨模式') : null,
                    h('span', { className: 'kg-muted' }, formatDate(link.createdAt)),
                    h('span', { className: 'kg-grow' }),
                    link.kind === 'ref'
                      ? h('span', { className: 'kg-muted', title: '由正文中的 [[卡片标题]] 自动生成' }, '自动生成')
                      : h('button', { type: 'button', className: cx('kg-btn kg-btn-sm', confirmId === link.id && 'kg-btn-danger'), onClick: () => remove(link), onBlur: () => setConfirmId('') }, confirmId === link.id ? '确认解除' : '解除'),
                  ),
                  link.note ? h('div', { className: 'kg-linknote' }, link.note) : null,
                  h(
                    'div',
                    { className: 'kg-optionlist' },
                    link.itemIds.map((id) => h(CardOption, { key: id, model, item: model.itemsById[id], onClick: () => onOpenItem(id) })),
                  ),
                )
              }),
            )
          : h(EmptyState, { icon: '🔗', title: needle ? '没有匹配的联系' : '还没有联系', hint: '打开任意卡片，在详情里点「+ 建立联系」；或在看板里批量勾选卡片后连线。' }),
      )
    }

    // ---------------------------------------------------------------- schedule

    function cadenceText(task) {
      if (task.cadence === 'weekly') {
        const days = (task.weekdays || []).map((day) => '周' + WEEKDAY_CHARS[day - 1]).join('、')
        return '每周 ' + days + ' ' + task.time
      }
      return '每天 ' + task.time
    }

    const SCHEDULE_STATUS = { active: '运行中', enabled: '运行中', paused: '已暂停', disabled: '已停用', unknown: '状态未知' }

    function defaultScheduleForm(mode) {
      return { title: '', mode, selection: { categoryId: 'auto', subcategoryId: 'auto' }, topic: '', cadence: 'daily', weekdays: [1], time: '09:00', count: '2', target: 'new_once', extra: '' }
    }

    function ScheduleForm(props) {
      const { model, initialMode, onDone } = props
      const [form, setForm] = useState(() => defaultScheduleForm(initialMode))
      const [saving, setSaving] = useState(false)
      const set = (patch) => setForm(Object.assign({}, form, patch))
      const sessionId = pickCurrentSessionId()
      const valid = form.title.trim() && (form.cadence === 'daily' || form.weekdays.length) && (form.target !== 'session' || sessionId)
      const examples = {
        study: '例如：每日一个泛函分析定理',
        academic: '例如：每日 ArXiv 强化学习论文速递',
        daily: '例如：每周宏观经济与美股复盘',
      }
      const submit = () => {
        setSaving(true)
        const body = {
          title: form.title.trim(),
          mode: form.mode,
          topic: form.topic,
          cadence: form.cadence,
          weekdays: form.cadence === 'weekly' ? form.weekdays : [],
          time: form.time,
          count: Number(form.count),
          target: form.target,
          sessionId: form.target === 'session' ? sessionId : '',
          extra: form.extra,
        }
        if (form.selection.categoryId !== 'auto') {
          body.categoryId = form.selection.categoryId
          if (form.selection.subcategoryId !== 'auto') body.subcategoryId = form.selection.subcategoryId
        }
        mutate('POST', '/schedule/tasks', body).then(
          () => {
            showToast('已创建定时收录任务「' + body.title + '」')
            onDone()
          },
          (error) => {
            setSaving(false)
            showToast(errorText(error), 'error')
          },
        )
      }
      return h(
        'div',
        { className: 'kg-form kg-schedule-form' },
        h(
          Field,
          { label: '投递模式', required: true, hint: '自动归类只会在该模式的分类树内匹配，不会串到其他模式' },
          h(Segmented, {
            value: form.mode,
            onChange: (value) => set({ mode: value, selection: { categoryId: 'auto', subcategoryId: 'auto' } }),
            options: model.enabled.map((entry) => ({ value: entry, label: MODE_META[entry].icon + ' ' + MODE_META[entry].label, color: MODE_META[entry].color })),
          }),
        ),
        h(TextInput, { label: '任务名', required: true, value: form.title, onChange: (value) => set({ title: value }), maxLength: 120, placeholder: examples[form.mode] }),
        h(CategoryPicker, { model, mode: form.mode, value: form.selection, onChange: (selection) => set({ selection }), allowAuto: true }),
        h(TextInput, { label: '主题范围', value: form.topic, onChange: (value) => set({ topic: value }), maxLength: 200, placeholder: '希望 Agent 关注的主题 / 关键词' }),
        h(
          'div',
          { className: 'kg-form-row' },
          h(Select, { label: '频率', value: form.cadence, onChange: (value) => set({ cadence: value }), options: [{ value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }] }),
          h(Field, { label: '时间（Asia/Shanghai）' }, h('input', { className: 'kg-input', type: 'time', value: form.time, onChange: (event) => set({ time: event.target.value }) })),
          h(Select, { label: '每次条数', value: form.count, onChange: (value) => set({ count: value }), options: ['1', '2', '3', '4', '5'].map((value) => ({ value, label: value + ' 条' })) }),
        ),
        form.cadence === 'weekly'
          ? h(
              Field,
              { label: '星期' },
              h(
                'div',
                { className: 'kg-chips' },
                WEEKDAY_CHARS.map((char, index) => {
                  const day = index + 1
                  const on = form.weekdays.includes(day)
                  return h('button', { type: 'button', key: day, className: cx('kg-chip', on && 'is-active'), 'aria-pressed': on, onClick: () => set({ weekdays: on ? form.weekdays.filter((value) => value !== day) : form.weekdays.concat([day]).sort() }) }, '周' + char)
                }),
              ),
            )
          : null,
        h(Select, {
          label: '内容来源',
          value: form.target,
          onChange: (value) => set({ target: value }),
          options: [{ value: 'new_once', label: '每次开启独立新会话，由 Agent 自行检索整理' }, { value: 'session', label: '回顾当前会话里讨论过的内容', disabled: !sessionId }],
        }),
        h(TextArea, { label: '额外要求（选填）', rows: 2, value: form.extra, onChange: (value) => set({ extra: value }), maxLength: 2000 }),
        h(
          'div',
          { className: 'kg-actions' },
          h('span', { className: 'kg-grow' }),
          h('button', { type: 'button', className: 'kg-btn', onClick: onDone }, '取消'),
          h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: !valid || saving, onClick: submit }, saving ? '创建中…' : '创建任务'),
        ),
      )
    }

    function ScheduleView(props) {
      const { model, mode } = props
      const [creating, setCreating] = useState(false)
      const [busy, setBusy] = useState('')
      const [confirmId, setConfirmId] = useState('')
      // tasks created outside this page may have no known mode: they show under every tab
      const tasks = model.scheduleTasks.filter((task) => !task.mode || (model.enabled.includes(task.mode) && inMode(mode, task.mode)))
      const [adoptMode, setAdoptMode] = useState({})
      const defaultAdoptMode = mode !== 'all' ? mode : model.enabled[0]
      const adopt = (candidate) =>
        mutate('POST', '/schedule/tasks/' + encodeURIComponent(candidate.id) + '/adopt', { mode: adoptMode[candidate.id] || defaultAdoptMode }).then(
          () => showToast('已关联「' + candidate.title + '」'),
          (error) => showToast(errorText(error), 'error'),
        )
      const unlink = (task) =>
        mutate('POST', '/schedule/tasks/' + encodeURIComponent(task.id) + '/unlink', {}).then(
          () => showToast('已取消关联（任务本身仍在 DSH 自动化任务中）'),
          (error) => showToast(errorText(error), 'error'),
        )
      const collected = (task) => model.items.filter((item) => item.source === 'scheduled' && ((item.sourceDetail && item.sourceDetail.taskTitle === task.title) || (item.tags || []).includes(task.title))).length
      const run = (task) => {
        setBusy(task.id)
        api('POST', '/schedule/tasks/' + encodeURIComponent(task.id) + '/run', {}).then(
          (data) => {
            setBusy('')
            showToast(data && data.pending ? '任务已在执行中' : '已触发运行，收录结果稍后出现在看板')
            window.setTimeout(() => store.load(), 4000)
          },
          (error) => {
            setBusy('')
            showToast(errorText(error), 'error')
          },
        )
      }
      const remove = (task) => {
        if (confirmId !== task.id) {
          setConfirmId(task.id)
          return
        }
        mutate('DELETE', '/schedule/tasks/' + encodeURIComponent(task.id)).then(
          () => showToast('已删除定时任务'),
          (error) => showToast(errorText(error), 'error'),
        )
      }
      return h(
        'div',
        { className: 'kg-page' },
        h(
          'div',
          { className: 'kg-toolbar-row' },
          h('span', { className: 'kg-muted' }, '到点由 Agent 调用 knowledge_galaxy 工具，自动收录到任务绑定的模式'),
          h('span', { className: 'kg-grow' }),
          creating ? null : h('button', { type: 'button', className: 'kg-btn kg-btn-primary', disabled: !model.scheduleAvailable, onClick: () => setCreating(true) }, '+ 新建定时收录'),
        ),
        model.scheduleAvailable ? null : h('div', { className: 'kg-error-bar' }, 'DSH 的 schedule 定时任务服务当前不可用：无法新建或运行任务，已有任务也不会触发。'),
        creating ? h(ScheduleForm, { model, initialMode: mode !== 'all' ? mode : model.enabled[0], onDone: () => setCreating(false) }) : null,
        tasks.length
          ? h(
              'ul',
              { className: 'kg-tasks' },
              tasks.map((task) => {
                const category = model.catById[task.categoryId]
                const sub = model.subById[task.subcategoryId]
                return h(
                  'li',
                  { key: task.id, className: 'kg-task' },
                  h(
                    'div',
                    { className: 'kg-task-main' },
                    h(
                      'div',
                      { className: 'kg-task-title' },
                      '⏰ ' + task.title,
                      task.mode ? h(ModeBadge, { mode: task.mode }) : null,
                      h('span', { className: 'kg-pill' }, SCHEDULE_STATUS[task.status] || task.status),
                      task.origin !== 'plugin' ? h('span', { className: 'kg-pill', title: '这个任务不是在本页面创建的，请到 DSH「自动化任务」里修改或删除' }, task.origin === 'adopted' ? '手动关联' : '来自 DSH 自动化任务') : null,
                    ),
                    h(
                      'div',
                      { className: 'kg-task-meta' },
                      task.time ? h('span', null, cadenceText(task)) : null,
                      task.origin === 'plugin'
                        ? h('span', null, '投递到：' + MODE_META[task.mode].label + (category ? ' · ' + category.name + (sub ? ' / ' + sub.name : '（大类内自动匹配）') : '（模式内自动归类）'))
                        : h('span', null, '投递位置由该任务自己的提示词决定'),
                      task.topic ? h('span', null, '主题：' + task.topic) : null,
                      h('span', null, '已收录 ' + collected(task) + ' 条'),
                      task.nextAt ? h('span', null, '下次 ' + formatDateTime(task.nextAt)) : null,
                      task.lastRunAt ? h('span', null, '上次 ' + formatDateTime(task.lastRunAt)) : null,
                    ),
                  ),
                  h('button', { type: 'button', className: 'kg-btn kg-btn-sm', disabled: busy === task.id || !model.scheduleAvailable, onClick: () => run(task) }, busy === task.id ? '触发中…' : '▶ 立即运行'),
                  task.origin === 'plugin'
                    ? h('button', { type: 'button', className: cx('kg-btn kg-btn-sm', confirmId === task.id && 'kg-btn-danger'), onClick: () => remove(task), onBlur: () => setConfirmId('') }, confirmId === task.id ? '确认删除' : '删除')
                    : task.origin === 'adopted'
                      ? h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => unlink(task) }, '取消关联')
                      : null,
                )
              }),
            )
          : creating
            ? null
            : h(EmptyState, { icon: '⏰', title: '还没有定时收录任务', hint: '例如：把「每日 ArXiv 强化学习论文速递」绑定到学术模式，把「每周宏观经济与美股复盘」绑定到日常模式的金融研究。' }),
        model.scheduleCandidates.length
          ? h(
              'details',
              { className: 'kg-origin', open: !tasks.length },
              h('summary', null, 'DSH 里的其他定时任务（' + model.scheduleCandidates.length + '）—— 如果其中有用知识银河收录的任务，可以关联到这里显示'),
              h(
                'ul',
                { className: 'kg-tasks kg-candidates' },
                model.scheduleCandidates.map((candidate) =>
                  h(
                    'li',
                    { key: candidate.id, className: 'kg-task' },
                    h('div', { className: 'kg-task-main' }, h('div', { className: 'kg-task-title' }, candidate.title, h('span', { className: 'kg-pill' }, SCHEDULE_STATUS[candidate.status] || candidate.status))),
                    model.enabled.length > 1
                      ? h(Select, {
                          bare: true,
                          className: 'kg-select-sm',
                          'aria-label': '对应模式',
                          value: adoptMode[candidate.id] || defaultAdoptMode,
                          onChange: (value) => setAdoptMode(Object.assign({}, adoptMode, { [candidate.id]: value })),
                          options: model.enabled.map((entry) => ({ value: entry, label: MODE_META[entry].label + '模式' })),
                        })
                      : null,
                    h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => adopt(candidate) }, '关联到本页'),
                  ),
                ),
              ),
            )
          : null,
      )
    }

    // =====================================================================
    // 70-panel — main panel (mode tabs + views) and the chat collect button
    // =====================================================================

    const VIEWS = [
      { value: 'board', label: '看板' },
      { value: 'star', label: '星图' },
      { value: 'links', label: '联系' },
      { value: 'schedule', label: '定时收录' },
    ]

    function initialMode(model) {
      const landing = model.settings.landingMode
      const wanted = landing === 'last' ? lsGet('mode', 'all') : landing
      if (model.enabled.length === 1) return model.enabled[0]
      return wanted === 'all' || model.enabled.includes(wanted) ? wanted : 'all'
    }

    function KnowledgeGalaxyPanel() {
      const { model, loading, error } = useStore()
      const [modeState, setModeState] = useState(null)
      const [view, setView] = usePref('view', 'board', VIEWS.map((entry) => entry.value))
      const [boardView, setBoardViewState] = useState(null)
      const [groupBy, setGroupBy] = usePref('groupBy', 'category')
      const [granularity, setGranularity] = usePref('granularity', 'day', ['day', 'week', 'month', 'calendar'])
      const [filters, setFilters] = useState(EMPTY_FILTERS)
      const [selectMode, setSelectMode] = useState(false)
      const [selected, setSelected] = useState({})
      const [detail, setDetail] = useState({ id: '', trail: [] })
      const [dialog, setDialog] = useState('')
      const [refreshing, setRefreshing] = useState(false)

      useEffect(() => {
        const onFocus = () => store.load()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
      }, [])

      if (!model) {
        return h(
          'div',
          { className: 'kg-panel' },
          error
            ? h(EmptyState, { icon: '⚠️', title: '加载失败', hint: error, action: h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: () => store.load() }, '重试') })
            : h('div', { className: 'kg-empty' }, h('div', { className: 'kg-spinner' }), h('div', { className: 'kg-muted' }, loading ? '正在加载知识银河…' : '')),
          h(ToastHost, null),
        )
      }

      // The mode tab is hidden (and forced) while only one mode is enabled.
      let mode = modeState === null ? initialMode(model) : modeState
      if (model.enabled.length === 1) mode = model.enabled[0]
      else if (mode !== 'all' && !model.enabled.includes(mode)) mode = 'all'
      const boardViewValue = boardView === null ? model.settings.landingView : boardView
      const setMode = (next) => {
        setModeState(next)
        lsSet('mode', next)
        setFilters(Object.assign({}, filters, { categoryId: 'all', subcategoryId: 'all' }))
      }
      const groupValue = groupBy === 'mode' && mode !== 'all' ? 'category' : groupBy
      const items = filterItems(model, mode, filters)
      const selectedIds = Object.keys(selected).filter((id) => selected[id] && model.itemsById[id])
      const openItem = (id) => setDetail({ id, trail: [] })
      const navigate = (id) => {
        if (!model.itemsById[id] || id === detail.id) return
        setDetail({ id, trail: detail.id ? detail.trail.concat([detail.id]) : [] })
      }
      const back = () => {
        const trail = detail.trail.filter((id) => model.itemsById[id])
        if (!trail.length) setDetail({ id: '', trail: [] })
        else setDetail({ id: trail[trail.length - 1], trail: trail.slice(0, -1) })
      }
      const refresh = () => {
        setRefreshing(true)
        store.load().then(() => setRefreshing(false))
      }
      const toggleSelect = (id) => setSelected(Object.assign({}, selected, { [id]: !selected[id] }))
      const stopSelecting = () => {
        setSelectMode(false)
        setSelected({})
      }
      const modeCount = (value) => (value === 'all' ? model.items.length : model.countByMode[value] || 0)

      let content
      if (view === 'star') {
        content = h(StarView, { model, mode, onModeChange: setMode, onOpenItem: openItem, onManage: () => setDialog('manage') })
      } else if (view === 'links') {
        content = h(LinksView, { model, mode, onOpenItem: openItem })
      } else if (view === 'schedule') {
        content = h(ScheduleView, { model, mode })
      } else if (!items.length) {
        const any = model.items.some((item) => inMode(mode, item.mode))
        content = h(EmptyState, {
          icon: any ? '🔍' : '🌌',
          title: any ? '没有符合筛选条件的卡片' : (mode === 'all' ? '知识银河' : '「' + MODE_META[mode].label + '」模式') + '还是空的',
          hint: any ? '调整或清除筛选条件再试试。' : '在任意助手回答下点「🌌 收录到知识银河」，或点右上角「新建收录」手动添加。',
          action: any
            ? h('button', { type: 'button', className: 'kg-btn', onClick: () => setFilters(EMPTY_FILTERS) }, '清除筛选')
            : h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: () => setDialog('collect') }, '✍️ 新建收录'),
        })
      } else {
        const boardProps = { model, mode, items, selectMode, selected, onOpen: openItem, onToggleSelect: toggleSelect }
        if (boardViewValue !== 'timeline') content = h(GroupBoard, Object.assign({ groupBy: groupValue, showEmptySubs: filters.categoryId !== 'all' }, boardProps))
        else if (granularity === 'calendar') content = h(CalendarBoard, boardProps)
        else content = h(TimelineBoard, Object.assign({ granularity }, boardProps))
      }

      return h(
        'div',
        { className: 'kg-panel' },
        h(
          'div',
          { className: 'kg-toolbar' },
          h(
            'div',
            { className: 'kg-toolbar-row' },
            h('h1', { className: 'kg-title' }, h('span', { 'aria-hidden': 'true' }, '🌌'), '知识银河'),
            model.enabled.length > 1
              ? h(
                  'div',
                  { className: 'kg-modetabs', role: 'tablist', 'aria-label': '模式' },
                  ['all'].concat(model.enabled).map((value) =>
                    h(
                      'button',
                      {
                        key: value,
                        type: 'button',
                        role: 'tab',
                        'aria-selected': mode === value,
                        className: cx('kg-modetab', mode === value && 'is-active'),
                        style: { '--kg-accent': MODE_META[value].color },
                        onClick: () => setMode(value),
                      },
                      MODE_META[value].label,
                      h('span', { className: 'kg-modetab-count' }, modeCount(value)),
                    ),
                  ),
                )
              : h(ModeBadge, { mode }),
            h('span', { className: 'kg-grow' }),
            h(Segmented, { value: view, onChange: setView, options: VIEWS }),
            h('button', { type: 'button', className: 'kg-btn kg-btn-primary', onClick: () => setDialog('collect') }, '+ 新建收录'),
            h('button', { type: 'button', className: 'kg-icon-btn', title: '刷新', 'aria-label': '刷新', disabled: refreshing, onClick: refresh }, refreshing ? '…' : '⟳'),
            h('button', { type: 'button', className: 'kg-icon-btn', title: '设置', 'aria-label': '设置', onClick: () => setDialog('settings') }, '⚙️'),
          ),
          view === 'board'
            ? h(
                React.Fragment,
                null,
                h(BoardToolbar, { model, mode, filters, setFilters, boardView: boardViewValue, setBoardView: setBoardViewState, groupBy: groupValue, setGroupBy, granularity, setGranularity }),
                h(
                  'div',
                  { className: 'kg-toolbar-row kg-toolbar-sub' },
                  h('span', { className: 'kg-muted' }, '共 ' + items.length + ' 张卡片' + (hasFilters(filters) ? '（已筛选）' : '')),
                  model.hiddenItemCount ? h('span', { className: 'kg-muted' }, '· 另有 ' + model.hiddenItemCount + ' 张属于已关闭的模式') : null,
                  boardViewValue === 'group' && groupValue !== 'source' ? h('span', { className: 'kg-muted' }, '· 拖拽卡片到其他列即可移动分组') : null,
                  h('span', { className: 'kg-grow' }),
                  h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: () => setDialog('manage') }, '🗂 管理类目'),
                  h('button', { type: 'button', className: cx('kg-btn kg-btn-sm', selectMode && 'is-active'), onClick: () => (selectMode ? stopSelecting() : setSelectMode(true)) }, selectMode ? '退出批量操作' : '☑ 批量操作'),
                ),
              )
            : null,
        ),
        error ? h('div', { className: 'kg-error-bar', role: 'alert' }, '刷新失败，当前显示的是上一次的数据。', h('button', { type: 'button', className: 'kg-link-btn', onClick: refresh }, '重试')) : null,
        h('div', { className: cx('kg-content', view === 'star' && 'is-star') }, content),
        selectMode && view === 'board'
          ? h(
              'div',
              { className: 'kg-selectbar' },
              h('span', null, '已选 ' + selectedIds.length + ' 张'),
              h('button', { type: 'button', className: 'kg-link-btn', onClick: () => setSelected(Object.fromEntries(items.map((item) => [item.id, true]))) }, '全选当前 ' + items.length + ' 张'),
              h('button', { type: 'button', className: 'kg-btn kg-btn-sm', onClick: stopSelecting }, '取消'),
              h('button', { type: 'button', className: 'kg-btn kg-btn-sm', disabled: selectedIds.length < 2, title: '至少勾选 2 张', onClick: () => setDialog('link') }, '🔗 建立联系'),
              h('button', { type: 'button', className: 'kg-btn kg-btn-sm kg-btn-primary', disabled: selectedIds.length < 1, onClick: () => setDialog('move') }, '📦 移动分组'),
            )
          : null,
        h(CollectDialog, { open: dialog === 'collect', origin: 'manual', activeMode: mode, onClose: () => setDialog('') }),
        h(LinkDialog, { open: dialog === 'link', model, itemIds: selectedIds, onClose: () => setDialog(''), onSaved: stopSelecting }),
        h(BatchMoveDialog, { open: dialog === 'move', model, itemIds: selectedIds, activeMode: mode, onClose: () => setDialog(''), onSaved: stopSelecting }),
        h(CategoryManagerDialog, { open: dialog === 'manage', model, initialMode: mode, onClose: () => setDialog('') }),
        h(SettingsDialog, { open: dialog === 'settings', model, onClose: () => setDialog('') }),
        h(ItemDetailDialog, { model, itemId: detail.id, trail: detail.trail, onNavigate: navigate, onBack: back, onClose: () => setDetail({ id: '', trail: [] }) }),
        h(ToastHost, null),
      )
    }

    // ---------------------------------------------------------------- chat action

    /** 「🌌 收录到知识银河」 under every assistant answer. */
    function CollectButton(props) {
      const [open, setOpen] = useState(false)
      const [saved, setSaved] = useState(false)
      const collected = saved || !!collectedKeys[collectKey(props.sessionId, props.messageId)]
      useEffect(() => {
        if (props.sessionId) services.lastSessionId = props.sessionId
      }, [props.sessionId])
      return h(
        React.Fragment,
        null,
        h(
          'button',
          { type: 'button', className: cx('kg-collect-btn', collected && 'is-collected'), title: '收录到知识银河', onClick: () => setOpen(true) },
          h('span', { 'aria-hidden': 'true' }, '🌌'),
          h('span', null, collected ? '已收录到知识银河' : '收录到知识银河'),
        ),
        open
          ? h(CollectDialog, { open: true, origin: 'conversation', sessionId: props.sessionId, messageId: props.messageId, activeMode: lsGet('mode', ''), onClose: () => setOpen(false), onSaved: () => setSaved(true) })
          : null,
        open || saved ? h(ToastHost, null) : null,
      )
    }

    // =====================================================================
    // 80-css — styles (host design tokens with light fallbacks)
    // =====================================================================

    const CSS_TEXT = `
.kg-panel,.kg-overlay,.kg-toast-wrap,.kg-collect-btn{--kg-bg:var(--dsw-alias-bg-base,#fff);--kg-layer:var(--dsw-alias-bg-layer-1,#f6f7f9);--kg-text:var(--dsw-alias-label-primary,#1f2328);--kg-text2:var(--dsw-alias-label-secondary,#5f6672);--kg-text3:var(--dsw-alias-label-tertiary,#98a0ab);--kg-line:var(--dsw-alias-border-l1,#e5e7eb);--kg-line2:var(--dsw-alias-border-l2,#d0d5dd);--kg-hover:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));--kg-primary:var(--dsw-alias-state-business-primary,#4f7cff);--kg-danger:#d1433a}
.kg-panel{box-sizing:border-box;flex:1 1 auto;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--kg-bg);color:var(--kg-text);font-size:13px;line-height:1.5;position:relative;overflow:hidden}
.kg-panel *,.kg-overlay *{box-sizing:border-box}
.kg-toolbar{flex:none;display:flex;flex-direction:column;gap:8px;padding:12px 16px 10px;border-bottom:1px solid var(--kg-line);background:var(--kg-bg);z-index:5}
.kg-toolbar-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.kg-toolbar-sub{gap:10px}
.kg-title{display:flex;align-items:center;gap:6px;margin:0 6px 0 0;font-size:16px;font-weight:650;line-height:24px;white-space:nowrap}
.kg-grow{flex:1 1 auto;min-width:0}
.kg-muted{color:var(--kg-text3);font-size:12px}
.kg-pad{padding:10px}
.kg-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-layer);color:var(--kg-text);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;transition:background-color .12s,border-color .12s}
.kg-btn:hover:not(:disabled){background:var(--kg-hover)}
.kg-btn:disabled{opacity:.5;cursor:default}
.kg-btn:focus-visible,.kg-icon-btn:focus-visible,.kg-seg-btn:focus-visible,.kg-modetab:focus-visible,.kg-chip:focus-visible,.kg-card:focus-visible,.kg-tl-item:focus-visible,.kg-option:focus-visible,.kg-target:focus-visible,.kg-galaxy:focus-visible,.kg-link-btn:focus-visible,.kg-toggle:focus-visible{outline:2px solid var(--kg-primary);outline-offset:1px}
.kg-btn-primary{background:var(--kg-primary);border-color:transparent;color:#fff}
.kg-btn-primary:hover:not(:disabled){background:var(--kg-primary);filter:brightness(1.08)}
.kg-btn-danger{color:#fff;background:var(--kg-danger);border-color:transparent}
.kg-btn-danger:hover:not(:disabled){background:var(--kg-danger);filter:brightness(1.08)}
.kg-btn-sm{height:26px;padding:0 9px;font-size:11.5px}
.kg-btn.is-active{border-color:var(--kg-primary);color:var(--kg-primary)}
.kg-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:none;border-radius:8px;background:transparent;color:var(--kg-text2);font:inherit;font-size:14px;cursor:pointer}
.kg-icon-btn:hover{background:var(--kg-hover);color:var(--kg-text)}
.kg-link-btn{border:none;background:transparent;color:var(--kg-primary);font:inherit;font-size:12px;cursor:pointer;padding:2px 4px;border-radius:4px;white-space:nowrap}
.kg-link-btn:hover{text-decoration:underline}
.kg-link-danger{color:var(--kg-danger)}
.kg-modetabs{display:flex;align-items:center;gap:2px}
.kg-modetab{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:none;border-bottom:2px solid transparent;background:transparent;color:var(--kg-text2);font:inherit;font-size:13px;cursor:pointer;border-radius:8px 8px 0 0}
.kg-modetab:hover{color:var(--kg-text);background:var(--kg-hover)}
.kg-modetab.is-active{color:var(--kg-accent);border-bottom-color:var(--kg-accent);font-weight:600}
.kg-modetab-count{font-size:11px;font-weight:400;color:var(--kg-text3);font-variant-numeric:tabular-nums}
.kg-seg{display:inline-flex;align-self:flex-start;align-items:center;gap:2px;padding:2px;border-radius:10px;background:var(--kg-layer);flex:none}
.kg-seg-btn{height:26px;padding:0 11px;border-radius:8px;border:none;background:transparent;color:var(--kg-text2);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.kg-seg-btn:hover{color:var(--kg-text)}
.kg-seg-btn.is-active{background:var(--kg-bg);color:var(--kg-text);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.14)}
.kg-seg-sm .kg-seg-btn{height:22px;padding:0 9px;font-size:11.5px}
.kg-search{display:flex;align-items:center;gap:6px;height:30px;min-width:180px;flex:1 1 220px;max-width:340px;padding:0 10px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);font-size:12px}
.kg-search input{flex:1;min-width:0;border:none;background:transparent;outline:none;color:var(--kg-text);font:inherit;font-size:12px}
.kg-search:focus-within{border-color:var(--kg-primary)}
.kg-select{height:30px;max-width:190px;padding:0 6px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;font-size:12px;outline:none;cursor:pointer}
.kg-select:focus{border-color:var(--kg-primary)}
.kg-select:disabled{opacity:.55;cursor:default}
.kg-select-sm{height:24px;max-width:150px;font-size:11px}
.kg-field .kg-select{width:100%;max-width:none}
.kg-content{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:auto}
.kg-content.is-star{overflow:hidden}
.kg-error-bar,.kg-info-bar{flex:none;display:flex;align-items:center;gap:8px;margin:8px 16px 0;padding:7px 12px;border-radius:8px;font-size:12px}
.kg-error-bar{background:rgba(209,67,58,.1);color:var(--kg-danger)}
.kg-info-bar{background:rgba(79,124,255,.1);color:var(--kg-text2)}
.kg-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:48px 20px;text-align:center}
.kg-empty-icon{font-size:34px;line-height:1}
.kg-empty-title{font-size:14px;font-weight:600}
.kg-empty-hint{max-width:420px;color:var(--kg-text2);font-size:12px;margin-bottom:6px}
.kg-spinner{width:22px;height:22px;border-radius:50%;border:2px solid var(--kg-line);border-top-color:var(--kg-primary);animation:kg-spin .8s linear infinite}
@keyframes kg-spin{to{transform:rotate(360deg)}}
.kg-mode-badge{display:inline-flex;align-items:center;height:17px;padding:0 6px;border-radius:5px;border:1px solid;font-size:10.5px;font-weight:600;line-height:1;white-space:nowrap;flex:none}
.kg-pill{display:inline-flex;align-items:center;height:17px;padding:0 6px;margin-left:6px;border-radius:999px;background:var(--kg-layer);color:var(--kg-text2);font-size:10.5px;font-weight:400;white-space:nowrap}
.kg-capsule{display:inline-flex;align-items:center;gap:5px;max-width:100%;height:22px;padding:0 9px;border-radius:999px;border:1px solid;font:inherit;font-size:11.5px;font-weight:550;white-space:nowrap;overflow:hidden}
.kg-capsule i{flex:none;width:6px;height:6px;border-radius:50%}
.kg-capsule span{overflow:hidden;text-overflow:ellipsis}
.kg-capsule.is-compact{height:18px;padding:0 7px;font-size:10.5px;flex:0 1 auto;min-width:0}
.kg-capsule.is-clickable{cursor:pointer}
.kg-capsule.is-clickable:hover{filter:brightness(.94)}
.kg-capsule-caret{font-size:9px;opacity:.8}
.kg-status{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:999px;border:1px solid var(--kg-line);background:transparent;color:var(--kg-text2);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap;flex:none}
.kg-status:hover{border-color:var(--kg-line2);background:var(--kg-hover)}
.kg-status-doing{color:#b7791f;border-color:rgba(183,121,31,.4);background:rgba(250,204,21,.12)}
.kg-status-done{color:#1a7f5a;border-color:rgba(26,127,90,.4);background:rgba(52,211,153,.12)}
.kg-link-badge{flex:none;color:var(--kg-text2);font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.kg-tags{display:flex;flex-wrap:wrap;gap:4px}
.kg-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:var(--kg-layer);color:var(--kg-text2);font-size:10.5px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
.kg-check{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:50%;border:1.5px solid var(--kg-line2);font-size:10px;color:#fff;line-height:1}
.kg-check.is-on{background:var(--kg-primary);border-color:var(--kg-primary)}
/* grouped board */
.kg-board{flex:1 1 auto;min-height:0;display:flex;align-items:stretch;gap:12px;padding:14px 16px;overflow-x:auto}
.kg-col{flex:0 0 280px;width:280px;display:flex;flex-direction:column;min-height:0;border:1px solid var(--kg-line);border-radius:12px;background:var(--kg-layer)}
.kg-col-head{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px 8px}
.kg-col-glyph{display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:24px;border-radius:7px;font-size:13px;font-weight:600}
.kg-col-title{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-col-count{margin-left:auto;color:var(--kg-text3);font-size:11px;font-variant-numeric:tabular-nums}
.kg-col-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:8px;padding:2px 8px 10px;overflow-y:auto}
.kg-col-empty{padding:18px 0;text-align:center;color:var(--kg-text3);font-size:12px}
.kg-card{position:relative;display:flex;flex-direction:column;gap:5px;padding:10px 10px 8px 12px;border:1px solid var(--kg-line);border-radius:10px;background:var(--kg-bg);cursor:pointer;transition:border-color .12s,box-shadow .12s;overflow:hidden;flex:none}
.kg-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--kg-accent)}
.kg-card:hover{border-color:var(--kg-line2);box-shadow:0 2px 10px rgba(0,0,0,.07)}
.kg-card.is-selected{border-color:var(--kg-primary);box-shadow:0 0 0 1px var(--kg-primary)}
.kg-card-top{display:flex;align-items:center;gap:6px;font-size:11px;min-width:0}
.kg-card-sub{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-card-date{margin-left:auto;flex:none;color:var(--kg-text3);font-size:10.5px;font-variant-numeric:tabular-nums}
.kg-card-title{font-size:13px;font-weight:600;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.kg-card-meta{color:var(--kg-text2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-card-summary{color:var(--kg-text2);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-card-foot{display:flex;align-items:center;gap:6px;margin-top:1px;font-size:11px}
/* timeline */
.kg-timeline{width:100%;max-width:980px;margin:0 auto;padding:16px 20px 40px}
.kg-tl-node{position:relative;padding-left:22px;border-left:2px solid var(--kg-line);margin-left:7px;padding-bottom:10px}
.kg-tl-node:last-child{border-left-color:transparent}
.kg-tl-anchor{position:relative;display:flex;align-items:baseline;gap:8px;width:100%;margin:0 0 8px;padding:2px 4px;border:none;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px}
.kg-tl-anchor:hover{background:var(--kg-hover)}
.kg-tl-dot{position:absolute;left:-30px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--kg-bg);border:3px solid var(--kg-primary)}
.kg-tl-date{font-size:14px;font-weight:650;font-variant-numeric:tabular-nums}
.kg-tl-count{color:var(--kg-text2);font-size:12px}
.kg-tl-caret{margin-left:auto;color:var(--kg-text3);font-size:11px}
.kg-tl-anchor.is-static{cursor:default}.kg-tl-anchor.is-static:hover{background:transparent}
.kg-tl-list{display:flex;flex-direction:column;padding-bottom:10px}
.kg-tl-item{position:relative;display:flex;align-items:baseline;gap:12px;padding:7px 8px 7px 4px;border-radius:8px;cursor:pointer}
.kg-tl-item:hover{background:var(--kg-hover)}
.kg-tl-item.is-selected{background:rgba(79,124,255,.1)}
.kg-tl-pt{position:absolute;left:-27px;top:13px;width:8px;height:8px;border-radius:50%;background:var(--kg-accent);box-shadow:0 0 0 3px var(--kg-bg)}
.kg-tl-time{flex:none;width:76px;color:var(--kg-text2);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
.kg-tl-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.kg-tl-head{display:flex;align-items:center;gap:8px;min-width:0}
.kg-tl-title{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:60px}
.kg-tl-sub{display:flex;align-items:baseline;gap:10px;min-width:0;color:var(--kg-text2);font-size:12px;white-space:nowrap;overflow:hidden}
.kg-tl-src{flex:none;color:var(--kg-text3)}
.kg-tl-summary{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.kg-tl-tag{flex:none;color:var(--kg-text3)}
.kg-cal{width:100%;max-width:980px;margin:0 auto;padding:14px 20px 40px;display:flex;flex-direction:column;gap:12px}
.kg-cal-head{display:flex;align-items:center;gap:8px}
.kg-cal-month{min-width:104px;text-align:center;font-size:15px;font-weight:650;font-variant-numeric:tabular-nums}
.kg-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--kg-line);border-left:1px solid var(--kg-line);border-radius:10px;overflow:hidden}
.kg-cal-dow{padding:6px 8px;border-right:1px solid var(--kg-line);border-bottom:1px solid var(--kg-line);background:var(--kg-layer);color:var(--kg-text2);font-size:11.5px;text-align:center}
.kg-cal-cell{display:flex;flex-direction:column;gap:2px;min-height:78px;padding:4px 6px;border:none;border-right:1px solid var(--kg-line);border-bottom:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;text-align:left;cursor:pointer;min-width:0}
.kg-cal-cell:hover{background:var(--kg-hover)}
.kg-cal-cell.is-out{color:var(--kg-text3)}.kg-cal-cell.is-out .kg-cal-entry{opacity:.55}
.kg-cal-cell.is-picked{box-shadow:inset 0 0 0 2px var(--kg-primary)}
.kg-cal-cell:focus-visible{outline:2px solid var(--kg-primary);outline-offset:-2px}
.kg-cal-top{display:flex;align-items:center;justify-content:space-between}
.kg-cal-num{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:50%;font-size:12px;font-variant-numeric:tabular-nums}
.kg-cal-cell.is-today .kg-cal-num{background:var(--kg-primary);color:#fff;font-weight:650}
.kg-cal-count{padding:0 6px;border-radius:9px;background:var(--kg-layer);color:var(--kg-text2);font-size:10.5px;font-variant-numeric:tabular-nums}
.kg-cal-entry{display:block;max-width:100%;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kg-cal-entry i{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;vertical-align:middle}
.kg-cal-more{color:var(--kg-text3);font-size:10.5px}
.kg-cal-day{margin-top:4px}
.kg-col.is-drop{border-color:var(--kg-primary);box-shadow:0 0 0 2px rgba(79,124,255,.25)}
.kg-card.is-dragging{opacity:.45}
.kg-card[draggable=true]{cursor:grab}
.kg-optionlist-scroll{max-height:180px;overflow-y:auto}
.kg-selectbar{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;border:1px solid var(--kg-line);background:var(--kg-bg);box-shadow:0 8px 28px rgba(0,0,0,.18);white-space:nowrap}
/* modal */
.kg-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,12,20,.46);color:var(--kg-text);font-size:13px;line-height:1.5}
.kg-modal{display:flex;flex-direction:column;width:min(560px,100%);max-height:min(88vh,900px);border-radius:14px;border:1px solid var(--kg-line);background:var(--kg-bg);box-shadow:0 24px 70px rgba(0,0,0,.3)}
.kg-modal-wide{width:min(820px,100%)}
.kg-modal-head{flex:none;display:flex;align-items:center;gap:10px;padding:12px 14px 10px 18px;border-bottom:1px solid var(--kg-line)}
.kg-modal-title{flex:1;margin:0;font-size:15px;font-weight:650}
.kg-modal-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px}
.kg-modal-foot{flex:none;display:flex;align-items:center;gap:8px;padding:10px 18px 12px;border-top:1px solid var(--kg-line);flex-wrap:wrap}
.kg-toast-wrap{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:1200;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
.kg-toast{max-width:min(520px,90vw);padding:8px 14px;border-radius:10px;background:#1f2430;color:#fff;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.kg-toast-error{background:#b4372f}
/* forms */
.kg-form{display:flex;flex-direction:column;gap:10px}
.kg-form-row{display:flex;gap:10px;align-items:flex-start}
.kg-form-row>*{flex:1 1 0;min-width:0}
.kg-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.kg-field-narrow{flex:0 0 130px}
.kg-field-label{color:var(--kg-text2);font-size:11.5px;font-weight:550}
.kg-field-label em{color:var(--kg-danger);font-style:normal}
.kg-field-hint,.kg-hint-line{color:var(--kg-text3);font-size:11.5px}
.kg-hint-line{padding:6px 10px;border-radius:8px;background:var(--kg-layer);color:var(--kg-text2)}
.kg-input{width:100%;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;font-size:12.5px;outline:none}
.kg-input:focus{border-color:var(--kg-primary)}
.kg-textarea{height:auto;padding:8px 10px;line-height:1.55;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.kg-fieldset{display:flex;flex-direction:column;gap:10px;margin:0;padding:10px 12px 12px;border:1px solid var(--kg-line);border-radius:10px;min-width:0}
.kg-fieldset legend{padding:0 6px;font-size:12px;font-weight:600}
.kg-inline-check{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;cursor:pointer}
.kg-inline-form{display:flex;flex-direction:column;gap:10px;margin:6px 0;padding:12px;border-radius:10px;border:1px dashed var(--kg-line2);background:var(--kg-layer)}
.kg-danger-box{border-color:rgba(209,67,58,.5);background:rgba(209,67,58,.06)}
.kg-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kg-editor-bar{display:flex;align-items:center;gap:8px}
.kg-preview{padding:10px 12px;border:1px solid var(--kg-line);border-radius:8px;min-height:80px}
.kg-chips{display:flex;flex-wrap:wrap;gap:6px}
.kg-chip{height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--kg-line);background:transparent;color:var(--kg-text2);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.kg-chip:hover{background:var(--kg-hover)}
.kg-chip.is-active{background:var(--kg-primary);border-color:transparent;color:#fff}
.kg-toggle{position:relative;flex:none;width:36px;height:20px;padding:0;border:none;border-radius:999px;background:var(--kg-line2);cursor:pointer;transition:background-color .15s}
.kg-toggle.is-on{background:var(--kg-primary)}
.kg-toggle:disabled{opacity:.5;cursor:default}
.kg-toggle-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}
.kg-toggle.is-on .kg-toggle-knob{transform:translateX(16px)}
.kg-colors{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.kg-swatch{width:22px;height:22px;padding:0;border-radius:50%;border:2px solid transparent;cursor:pointer}
.kg-swatch.is-active{border-color:var(--kg-text);box-shadow:0 0 0 2px var(--kg-bg) inset}
.kg-hex{width:96px;height:26px;font-family:ui-monospace,Menlo,monospace}
/* markdown */
.kg-md{font-size:13px;line-height:1.65;word-break:break-word;min-width:0}
.kg-md-scroll{overflow:hidden;position:relative}
.kg-md-scroll.is-collapsed::after{content:"";position:absolute;left:0;right:0;bottom:0;height:44px;background:linear-gradient(to bottom,transparent,var(--kg-bg));pointer-events:none}
.kg-md-toggle{margin-top:4px}
.kg-md a[href*="#kg-card-"]{display:inline-block;padding:0 6px;border-radius:6px;background:rgba(79,124,255,.12);color:var(--kg-primary);text-decoration:none;font-size:.95em}
.kg-md-fallback p{margin:0 0 8px}.kg-md-fallback pre{padding:10px;border-radius:8px;background:var(--kg-layer);overflow:auto}.kg-md-fallback h1,.kg-md-fallback h2,.kg-md-fallback h3,.kg-md-fallback h4{margin:10px 0 6px;font-size:14px}.kg-md-fallback ul,.kg-md-fallback ol{margin:0 0 8px;padding-left:20px}.kg-md-fallback blockquote{margin:0 0 8px;padding-left:10px;border-left:3px solid var(--kg-line2);color:var(--kg-text2)}
/* detail */
.kg-breadcrumb{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:none;border-radius:8px;background:var(--kg-layer);color:var(--kg-primary);font:inherit;font-size:12px;cursor:pointer;max-width:100%}
.kg-breadcrumb span{color:var(--kg-text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-breadcrumb:hover{background:var(--kg-hover)}
.kg-detail{display:flex;flex-direction:column;gap:10px;min-width:0}
.kg-detail-locate{position:relative;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.kg-detail-title{margin:0;font-size:19px;font-weight:650;line-height:1.35;word-break:break-word}
.kg-detail-meta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--kg-text3);font-size:11.5px}
.kg-detail-summary{margin:0;padding:8px 12px;border-left:3px solid var(--kg-line2);background:var(--kg-layer);border-radius:0 8px 8px 0;color:var(--kg-text2)}
.kg-popover{position:absolute;left:0;top:28px;z-index:30;display:flex;flex-direction:column;gap:10px;width:min(480px,calc(100vw - 80px));padding:12px;border-radius:12px;border:1px solid var(--kg-line);background:var(--kg-bg);box-shadow:0 12px 36px rgba(0,0,0,.22)}
.kg-paper{padding:10px 12px;border:1px solid var(--kg-line);border-radius:10px;background:var(--kg-layer)}
.kg-paper dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:12.5px}
.kg-paper dt{color:var(--kg-text3);white-space:nowrap}
.kg-paper dd{margin:0;min-width:0;word-break:break-word}
.kg-paper a{color:var(--kg-primary)}
.kg-paper-abstract{margin-top:8px}
.kg-section{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--kg-line);min-width:0}
.kg-section-head{display:flex;align-items:center;gap:8px}
.kg-section-head h3{flex:1;display:flex;align-items:center;gap:6px;margin:0;font-size:13.5px;font-weight:650}
.kg-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--kg-layer);color:var(--kg-text2);font-size:11px;font-weight:500}
.kg-origin{padding:8px 12px;border:1px solid var(--kg-line);border-radius:10px}
.kg-origin summary{cursor:pointer;color:var(--kg-text2);font-size:12px}
.kg-origin-q{margin:8px 0}
.kg-linklist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.kg-linkrow{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border:1px solid var(--kg-line);border-radius:10px}
.kg-linklabel{flex:none;display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:6px;background:rgba(79,124,255,.12);color:var(--kg-primary);font-size:11.5px;font-weight:600;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}
.kg-linklabel.is-ref{background:rgba(139,92,246,.13);color:#7c4ddb}
.kg-linktargets{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.kg-linknote{flex-basis:100%;color:var(--kg-text2);font-size:12px}
.kg-linkauto{padding-top:3px}
.kg-target{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:24px;padding:0 9px;border-radius:999px;border:1px solid;background:transparent;color:var(--kg-text);font:inherit;font-size:12px;cursor:pointer}
.kg-target:hover{filter:brightness(.95);text-decoration:underline}
.kg-target i{flex:none;width:6px;height:6px;border-radius:50%}
.kg-target-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px}
.kg-target-mode{flex:none;font-size:10.5px;font-weight:600}
.kg-linkpanel{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:12px;border:1px solid var(--kg-primary);background:var(--kg-layer);animation:kg-slide .18s ease-out}
@keyframes kg-slide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.kg-linkpanel-search{display:flex;gap:8px;flex-wrap:wrap}
.kg-linkpanel-list{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto}
.kg-linkpanel-form{display:flex;flex-direction:column;gap:8px}
.kg-list-caption{color:var(--kg-text2);font-size:11.5px;font-weight:600;padding:2px 4px}
.kg-optionlist{display:flex;flex-direction:column;gap:4px}
.kg-option{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:5px 10px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
.kg-option:hover{border-color:var(--kg-line2);background:var(--kg-hover)}
.kg-option.is-checked{border-color:var(--kg-primary)}
.kg-option-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-option-hint{flex:none;color:var(--kg-text3);font-size:11px}
.kg-refpicker{display:flex;flex-direction:column;gap:4px;padding:8px;border-radius:10px;border:1px solid var(--kg-line);background:var(--kg-layer)}
/* manage + settings */
.kg-catlist,.kg-sublist,.kg-tasks,.kg-linkpage{list-style:none;margin:0;padding:0}
.kg-catlist{display:flex;flex-direction:column;gap:8px}
.kg-catblock{border:1px solid var(--kg-line);border-radius:12px;padding:6px 10px}
.kg-catblock.is-hidden>.kg-catrow .kg-catrow-name,.kg-subrow.is-hidden .kg-subrow-name{opacity:.5;text-decoration:line-through}
.kg-catrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:34px}
.kg-catrow-name{font-weight:650;font-size:13.5px}
.kg-sublist{margin:2px 0 4px 34px;border-top:1px solid var(--kg-line)}
.kg-subrow{border-bottom:1px solid var(--kg-line)}
.kg-subrow:last-child{border-bottom:none}
.kg-subrow-main{display:flex;align-items:center;gap:8px;min-height:34px;flex-wrap:wrap}
.kg-subrow-name{font-weight:550}
.kg-subrow-kw{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px}
.kg-fav{border:none;background:transparent;color:var(--kg-text3);font-size:14px;cursor:pointer;padding:0 2px}
.kg-fav.is-on{color:#f5b301}
.kg-manage-foot{display:flex;gap:8px}
.kg-presets{display:flex;flex-direction:column;gap:8px}
.kg-preset{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--kg-line);border-radius:10px;cursor:pointer}
.kg-preset.is-picked{border-color:var(--kg-primary);background:rgba(79,124,255,.06)}
.kg-preset-name{font-weight:650}
.kg-preset-subs{margin-top:2px;color:var(--kg-text2);font-size:11.5px}
.kg-setting-group{margin:6px 0 0;font-size:12px;font-weight:650;color:var(--kg-text2)}
.kg-setting{display:flex;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid var(--kg-line)}
.kg-setting-text{flex:1 1 auto;min-width:0}
.kg-setting-title{font-weight:600}
.kg-setting-text a,.kg-update a:not(.kg-btn){color:var(--kg-primary)}
.kg-update{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:8px 12px;border-radius:8px;background:var(--kg-layer);font-size:12.5px}
.kg-update-new{background:rgba(52,211,153,.14)}
.kg-update-error{background:rgba(209,67,58,.1);color:var(--kg-danger)}
a.kg-btn{text-decoration:none}
/* pages */
.kg-page{display:flex;flex-direction:column;gap:12px;width:100%;max-width:980px;margin:0 auto;padding:14px 20px 40px}
.kg-linkpage{display:flex;flex-direction:column;gap:10px}
.kg-linkcard{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid var(--kg-line);border-radius:12px}
.kg-linkcard-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kg-schedule-form{padding:14px;border:1px solid var(--kg-line);border-radius:12px;background:var(--kg-layer)}
.kg-tasks{display:flex;flex-direction:column;gap:8px}
.kg-task{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--kg-line);border-radius:12px}
.kg-candidates{margin-top:8px}
.kg-task-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}
.kg-task-title{display:flex;align-items:center;gap:8px;font-weight:650;flex-wrap:wrap}
.kg-task-meta{display:flex;flex-wrap:wrap;gap:2px 14px;color:var(--kg-text2);font-size:12px}
/* star map (always dark) */
.kg-star{flex:1 1 auto;min-height:0;display:flex;background:#05060f;color:#e6ebff}
.kg-star-side{flex:none;width:214px;display:flex;flex-direction:column;border-right:1px solid rgba(160,175,230,.14);background:rgba(10,13,30,.92);transition:width .18s}
.kg-star-side.is-narrow{width:54px}
.kg-star-side-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 10px 6px 14px;color:rgba(200,210,245,.6);font-size:11.5px;letter-spacing:.08em}
.kg-star-side.is-narrow .kg-star-side-head{justify-content:center;padding-left:10px}
.kg-star-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:rgba(214,222,250,.75);font:inherit;font-size:12px;cursor:pointer}
.kg-star-iconbtn:hover{background:rgba(160,175,230,.16);color:#fff}
.kg-star-side-list{flex:1 1 auto;min-height:0;overflow-y:auto;padding:0 8px 12px;display:flex;flex-direction:column;gap:2px}
.kg-star-group{padding:10px 6px 4px;font-size:11px;font-weight:650}
.kg-galaxy{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:1px solid transparent;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.kg-galaxy:hover{background:rgba(160,175,230,.1)}
.kg-galaxy.is-active{background:rgba(160,175,230,.14);border-color:var(--kg-accent)}
.kg-galaxy-glyph{flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1px solid var(--kg-accent);color:var(--kg-accent);font-size:14px;font-weight:600;background:rgba(5,6,15,.6)}
.kg-galaxy-text{min-width:0;display:flex;flex-direction:column}
.kg-galaxy-name{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-galaxy-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--kg-accent);box-shadow:0 0 8px var(--kg-accent)}
.kg-galaxy-meta{color:rgba(200,210,245,.55);font-size:10.5px;font-variant-numeric:tabular-nums}
.kg-star-stage{position:relative;flex:1 1 auto;min-width:0;overflow:hidden}
.kg-star-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}
.kg-hud,.kg-planet-panel,.kg-star-tip{border:1px solid rgba(170,186,240,.22);background:rgba(14,18,40,.62);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:12px;color:#e6ebff}
.kg-hud{position:absolute;top:12px;right:12px;width:212px;display:flex;flex-direction:column;gap:7px;padding:10px 12px;font-size:11.5px}
.kg-hud-title{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:650}
.kg-hud-glyph{font-size:15px}
.kg-hud-stats{display:flex;flex-wrap:wrap;gap:2px 10px;color:rgba(214,222,250,.75)}
.kg-hud-stats b{color:#fff;font-variant-numeric:tabular-nums}
.kg-hud-status{display:flex;flex-wrap:wrap;gap:2px 10px;color:rgba(200,210,245,.6);font-size:11px}
.kg-hud-row{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
.kg-hud .kg-select{height:24px;font-size:11px;background:rgba(5,6,15,.5);color:#e6ebff;border-color:rgba(170,186,240,.25)}
.kg-hud .kg-toggle{background:rgba(170,186,240,.28)}
.kg-hud .kg-toggle.is-on{background:#5b8cff}
.kg-hud-tip{color:rgba(200,210,245,.45);font-size:10.5px}
.kg-planet-panel{position:absolute;left:12px;bottom:12px;width:260px;max-height:46%;display:flex;flex-direction:column;overflow:hidden}
.kg-planet-head{flex:none;display:flex;align-items:center;gap:8px;padding:8px 8px 6px 12px;font-weight:650;font-size:12.5px}
.kg-planet-count{flex:1;color:rgba(200,210,245,.6);font-weight:400;font-size:11px}
.kg-planet-list{overflow-y:auto;padding:0 6px 8px;display:flex;flex-direction:column;gap:2px}
.kg-planet-item{display:flex;align-items:center;gap:8px;width:100%;padding:5px 8px;border:none;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer}
.kg-planet-item:hover{background:rgba(160,175,230,.16)}
.kg-planet-item span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-planet-item em{flex:none;font-style:normal;color:rgba(200,210,245,.55);font-size:10.5px}
.kg-planet-empty{padding:4px 12px 12px;color:rgba(200,210,245,.6);font-size:11.5px}
.kg-star-tip{position:absolute;z-index:4;width:240px;padding:9px 11px;transform:translate(14px,14px);pointer-events:none;font-size:11.5px}
.kg-star-tip-title{font-size:12.5px;font-weight:650;line-height:1.4;word-break:break-word}
.kg-star-tip-meta{margin-top:2px;color:rgba(200,210,245,.7)}
.kg-star-tip-body{margin-top:5px;color:rgba(226,232,255,.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.kg-star-tip-foot{margin-top:5px;color:rgba(200,210,245,.45);font-size:10.5px}
.kg-star .kg-mode-badge{background:rgba(255,255,255,.08)!important}
/* chat action */
.kg-collect-btn{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--kg-text2);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.kg-collect-btn:hover{background:var(--kg-hover);color:var(--kg-text)}
.kg-collect-btn.is-collected{color:var(--kg-primary)}
@media (max-width:760px){.kg-form-row{flex-direction:column}.kg-form-row>*{flex:none;width:100%}.kg-tl-time{width:60px}.kg-cal-cell{min-height:64px}.kg-cal-entry{display:none}.kg-hud{width:180px}.kg-star-side{width:54px}.kg-star-side .kg-galaxy-text,.kg-star-side .kg-star-side-head span{display:none}}
@media (prefers-reduced-motion:reduce){.kg-linkpanel,.kg-spinner{animation:none}}
`

    function installCSS() {
      try {
        if (typeof document === 'undefined') return
        if (document.querySelector('style[data-plugin="knowledge-galaxy"]')) return
        const style = document.createElement('style')
        style.setAttribute('data-plugin', 'knowledge-galaxy')
        style.textContent = CSS_TEXT
        document.head.appendChild(style)
      } catch (error) {
        console.warn('[knowledge-galaxy] css injection failed', error)
      }
    }

    // =====================================================================
    // 90-entry — client plugin registration
    // =====================================================================

    const LOCALE = { zh: { 'app.title': '知识银河' }, en: { 'app.title': 'Knowledge Galaxy' } }

    function apply(ctx) {
      const failures = []
      const noteFailure = (error) => {
        failures.push(error)
        const detail = String((error && error.stack) || error)
        try {
          window.__KNOWLEDGE_GALAXY_ERROR__ = detail
        } catch (_error) {}
        report('error', detail)
        console.error('[knowledge-galaxy] registration failed', error)
      }
      const safeRegister = (slotName, install) => {
        try {
          ctx.slots.inject(slotName, () => {
            try {
              return install()
            } catch (error) {
              noteFailure(error)
              return () => {}
            }
          })
        } catch (error) {
          noteFailure(error)
        }
      }

      try {
        services.ctx = ctx
        services.sessions = (ctx && ctx.sessions) || null
        services.uiConversation = (ctx && ctx.uiConversation) || null
        installCSS()

        let title = () => LOCALE.zh['app.title']
        try {
          if (ctx.locale && typeof ctx.locale.register === 'function') {
            ctx.effect(() => ctx.locale.register(NS, LOCALE), 'knowledge-galaxy: dictionaries')
            const bound = ctx.locale.bind(NS)
            if (typeof bound === 'function') {
              title = () => {
                const text = bound('app.title')
                return text && text !== 'app.title' ? text : LOCALE.zh['app.title']
              }
            }
          }
        } catch (error) {
          console.warn('[knowledge-galaxy] locale registration failed', error)
        }

        try {
          ctx.inject(['layout'], (scope) => {
            services.layout = scope.layout
          })
        } catch (error) {
          console.warn('[knowledge-galaxy] layout service unavailable', error)
        }

        safeRegister('main', () => ctx.slots.register({ name: 'main', key: PLUGIN_ID, locale: NS }, KnowledgeGalaxyPanel))

        safeRegister('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PLUGIN_ID, order: 1, label: () => title(), locale: NS }, (owner) =>
            h('span', { style: { fontSize: ((owner && owner.size) || 18) - 2 + 'px', lineHeight: 1 }, 'aria-hidden': 'true' }, '🌌'),
          ),
        )

        safeRegister('conversation.chat.assistant-actions', () =>
          ctx.slots.register(
            {
              name: 'conversation.chat.assistant-actions',
              id: 'knowledge-galaxy-collect',
              order: 12,
              locale: NS,
              inject: (sessionId) => ({ sessionId }),
            },
            CollectButton,
          ),
        )

        if (!failures.length) {
          report('ready')
          try {
            window.__KNOWLEDGE_GALAXY_READY__ = { version: VERSION, ready: true, slots: ['main', 'sidebar.panellist', 'conversation.chat.assistant-actions'], at: Date.now() }
          } catch (_error) {}
        }
      } catch (error) {
        noteFailure(error)
      }
    }

    exports.apply = apply
    exports.inject = ['slots', 'locale', 'sessions', 'uiConversation']

    return module.exports
  },
})
