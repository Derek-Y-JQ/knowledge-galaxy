// knowledge-galaxy host plugin entry: HTTP API + agent tool + optional schedule
// integration. ESM, node: built-ins only, no @deepseek-ai/*.

import { StateStore } from './state.js'
import { KnowledgeGalaxyService } from './service.js'
import { createScheduleBridge } from './schedule.js'
import { createKnowledgeGalaxyTool } from './tool.js'
import { createRouter, ROUTE_PREFIX } from './router.js'

export const name = 'knowledge-galaxy'
export const inject = ['webServer', 'tools']

const PLUGIN_VERSION = '1.0.0'

/** Run one registration inside a cordis effect so unload cleans it up. */
function registerEffect(ctx, callback, label) {
  if (typeof ctx.effect === 'function') return ctx.effect(callback, label)
  return callback()
}

export function apply(ctx, config) {
  // Runtime-only health (never persisted).
  const health = {
    version: PLUGIN_VERSION,
    toolRegistered: false,
    clientReady: false,
    clientVersion: null,
    lastClientReportAt: null,
    lastClientError: null,
  }

  const logger = ctx.logger
  const warn = (message) => {
    try {
      logger?.warn?.(`[knowledge-galaxy] ${message}`)
    } catch {
      // logging must never break plugin startup
    }
  }

  try {
    const store = new StateStore({ logger })
    const service = new KnowledgeGalaxyService({ store })

    // Optional schedule service; null while unavailable, set by the injection below.
    let scheduleService = null
    const scheduleBridge = createScheduleBridge({ getService: () => scheduleService, store, logger })

    // Load eagerly so a corrupt state file surfaces at startup.
    Promise.resolve()
      .then(() => store.load())
      .catch((error) => warn(`加载状态文件失败：${String(error)}`))

    // 1) Single prefix HTTP route.
    try {
      const handler = createRouter({ store, service, scheduleBridge, health, logger })
      registerEffect(
        ctx,
        () => ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }),
        'knowledge-galaxy: api',
      )
    } catch (error) {
      warn(`注册 HTTP 路由失败：${String(error)}`)
    }

    // 2) Agent tool. toolRegistered feeds GET /health.
    try {
      const tool = createKnowledgeGalaxyTool({ store, service })
      registerEffect(ctx, () => ctx.tools.register(tool), 'knowledge-galaxy: tool')
      health.toolRegistered = true
    } catch (error) {
      health.toolRegistered = false
      warn(`注册 knowledge_galaxy 工具失败：${String(error)}`)
    }

    // 3) Optional schedule integration; the rest of the plugin keeps working without it.
    try {
      if (typeof ctx.inject === 'function') {
        ctx.inject(['schedule'], (scope) => {
          try {
            const value = scope?.schedule ?? (typeof scope?.get === 'function' ? scope.get('schedule') : undefined)
            scheduleService = value ?? null
          } catch (error) {
            scheduleService = null
            warn(`获取 schedule 服务失败：${String(error)}`)
          }
          return () => {
            scheduleService = null
          }
        })
      }
    } catch (error) {
      warn(`注入 schedule 服务失败：${String(error)}`)
    }

    health.clientVersion = PLUGIN_VERSION
    health.version = PLUGIN_VERSION
    // config is accepted for cordis compatibility; the plugin has no options yet.
    void config
  } catch (error) {
    // apply must never fail the whole profile.
    warn(`插件初始化失败：${String(error)}`)
  }
}
