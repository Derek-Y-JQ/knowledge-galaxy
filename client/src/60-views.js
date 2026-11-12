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
