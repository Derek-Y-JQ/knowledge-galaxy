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
