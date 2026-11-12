// knowledge-galaxy update check: compares the installed version with the latest
// GitHub release. Runs on the host (not in the browser) so it is not subject to
// the web client's content-security policy. Uses the global fetch of Node >= 18.

import { HttpError } from './service.js'

export const REPOSITORY = 'Derek-Y-JQ/knowledge-galaxy'
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`
const TIMEOUT_MS = 8000

/** '1.2.3' / 'v1.2.3' → [1, 2, 3]; null when not a plain semantic version. */
export function parseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(value ?? '').trim())
  return match === null ? null : [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Negative when a < b, 0 when equal, positive when a > b. */
export function compareVersions(a, b) {
  const left = parseVersion(a) ?? [0, 0, 0]
  const right = parseVersion(b) ?? [0, 0, 0]
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i]
  }
  return 0
}

async function getJson(url, fetchImpl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'knowledge-galaxy-update-check' },
      signal: controller.signal,
    })
    if (response.status === 404) return null
    if (response.status === 403 || response.status === 429) {
      throw new HttpError(502, 'GitHub 接口暂时限流，请稍后再试', 'update-rate-limited')
    }
    if (!response.ok) throw new HttpError(502, `GitHub 返回 HTTP ${response.status}`, 'update-check-failed')
    return await response.json()
  } catch (error) {
    if (error instanceof HttpError) throw error
    const reason = error?.name === 'AbortError' ? '连接超时' : (error?.cause?.code ?? error?.message ?? String(error))
    throw new HttpError(502, `无法连接 GitHub（${reason}），请检查网络或代理`, 'update-check-failed')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * GET /update — latest published version vs. the installed one.
 * Prefers the latest GitHub release; falls back to the version in package.json
 * on the default branch when no release has been published yet.
 * @param {string} currentVersion
 * @param {{ fetchImpl?: typeof fetch }} options
 */
export async function checkForUpdate(currentVersion, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new HttpError(502, '当前 Node 版本不支持联网检查（需要 Node 18+）', 'update-check-failed')
  }
  let latest = ''
  let url = `${REPOSITORY_URL}/releases`
  let publishedAt = null
  let notes = ''
  let source = 'release'
  const release = await getJson(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, fetchImpl)
  if (release !== null && parseVersion(release.tag_name) !== null) {
    latest = parseVersion(release.tag_name).join('.')
    url = typeof release.html_url === 'string' ? release.html_url : url
    publishedAt = typeof release.published_at === 'string' ? release.published_at : null
    notes = typeof release.body === 'string' ? release.body.slice(0, 4000) : ''
  } else {
    source = 'branch'
    const manifest = await getJson(`https://raw.githubusercontent.com/${REPOSITORY}/HEAD/package.json`, fetchImpl)
    if (manifest === null || parseVersion(manifest.version) === null) {
      throw new HttpError(502, '在 GitHub 上没有找到可比较的版本（仓库尚未发布，或不是公开仓库）', 'update-not-found')
    }
    latest = parseVersion(manifest.version).join('.')
    url = REPOSITORY_URL
  }
  const order = compareVersions(latest, currentVersion)
  return {
    current: currentVersion,
    latest,
    hasUpdate: order > 0,
    ahead: order < 0,
    url,
    publishedAt,
    notes,
    source,
    repository: REPOSITORY,
    checkedAt: new Date().toISOString(),
  }
}
