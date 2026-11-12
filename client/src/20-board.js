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
