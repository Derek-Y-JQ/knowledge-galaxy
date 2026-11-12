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
