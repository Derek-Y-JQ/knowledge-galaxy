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
