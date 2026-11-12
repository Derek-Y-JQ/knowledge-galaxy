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
