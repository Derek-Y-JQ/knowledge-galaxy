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
