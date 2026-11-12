// knowledge-galaxy auto-classification.
// Pure functions: weigh keyword hits per subcategory inside ONE mode's category
// list (scope isolation), and guess which mode a piece of text belongs to.

const MAX_MATCHED_KEYWORDS = 20

function countOccurrences(haystack, needle) {
  if (needle === '') return 0
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count += 1
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isAscii(value) {
  return /^[\x20-\x7e]+$/.test(value)
}

/** Occurrence count for one keyword: ASCII uses word boundaries, CJK uses includes. */
function countKeyword(text, lowerText, keyword) {
  const raw = keyword.trim()
  if (raw === '') return 0
  if (isAscii(raw)) {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(raw.toLowerCase())}(?=$|[^a-z0-9])`, 'g')
    const matches = lowerText.match(pattern)
    return matches === null ? 0 : matches.length
  }
  return countOccurrences(text, raw)
}

/** Join arbitrary item fields into the classifier input, repeating title/tags for weight. */
export function buildClassifyText(input = {}) {
  const parts = []
  const push = (value) => {
    if (typeof value === 'string' && value.trim() !== '') parts.push(value)
  }
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (title !== '') parts.push(title, title)
  const tags = Array.isArray(input.tags) ? input.tags.filter((tag) => typeof tag === 'string') : []
  if (tags.length > 0) {
    const joined = tags.join(' ')
    parts.push(joined, joined)
  }
  push(input.summary)
  push(input.content)
  if (input.knowledge && typeof input.knowledge === 'object') {
    push(input.knowledge.statement)
    push(input.knowledge.note)
  }
  if (input.paper && typeof input.paper === 'object') {
    push(input.paper.title)
    push(input.paper.journal)
    push(input.paper.abstract)
  }
  return parts.join('\n')
}

/** Coarse fallback that only applies while the mathematics template is in scope. */
function mathFallbackCategoryId(text) {
  if (/概率|统计|分布/.test(text)) return 'probability-statistics'
  if (/算法|优化|数值|复杂度/.test(text)) return 'computation-optimization'
  if (/群论|环论|几何|拓扑|代数/.test(text)) return 'algebra-geometry'
  if (/函数|极限|收敛|积分|导数|方程/.test(text)) return 'analysis'
  return ''
}

function round2(value) {
  return Math.round(value * 100) / 100
}

/**
 * Classify text against a scoped category list (one mode's visible tree).
 * @param {Array} categories - categories to match in; nothing outside is ever returned.
 * @param {string} text
 * @returns {{categoryId:string, subcategoryId:string, confidence:number, matchedKeywords:string[]}}
 *   Empty ids mean "no usable target" — the caller files the item into 未分类.
 */
export function classifyText(categories, text) {
  const scope = Array.isArray(categories) ? categories : (Array.isArray(categories?.categories) ? categories.categories : [])
  const source = typeof text === 'string' ? text : String(text ?? '')
  const lowerText = source.toLowerCase()

  let best = null
  for (const category of scope) {
    const subcategories = Array.isArray(category.subcategories) ? category.subcategories : []
    for (const subcategory of subcategories) {
      const declared = Array.isArray(subcategory.keywords)
        ? subcategory.keywords.filter((keyword) => typeof keyword === 'string' && keyword.trim() !== '')
        : []
      const name = typeof subcategory.name === 'string' ? subcategory.name.trim() : ''
      // The subcategory name always counts; "未分类" style catch-alls never attract text.
      const keywords = name !== '' && name !== '未分类' && !declared.includes(name) ? [...declared, name] : declared
      let score = 0
      const matched = []
      for (const keyword of keywords) {
        const hits = countKeyword(source, lowerText, keyword)
        if (hits > 0) {
          score += hits
          if (matched.length < MAX_MATCHED_KEYWORDS) matched.push(keyword.trim())
        }
      }
      if (score > 0 && (best === null || score > best.score)) {
        best = { categoryId: category.id, subcategoryId: subcategory.id, score, matched }
      }
    }
  }

  if (best !== null) {
    return {
      categoryId: best.categoryId,
      subcategoryId: best.subcategoryId,
      confidence: round2(best.score / (best.score + 2)),
      matchedKeywords: best.matched,
    }
  }

  const fallbackId = mathFallbackCategoryId(source)
  const fallback = fallbackId === '' ? undefined : scope.find((category) => category.id === fallbackId)
  if (fallback !== undefined && fallback.subcategories?.length > 0) {
    return { categoryId: fallback.id, subcategoryId: fallback.subcategories[0].id, confidence: 0.1, matchedKeywords: [] }
  }
  return { categoryId: '', subcategoryId: '', confidence: 0, matchedKeywords: [] }
}

const ACADEMIC_PATTERN = /\b(doi\s*[:：]|10\.\d{4,9}\/\S+|arxiv|abstract|et al\.|proceedings|neurips|icml|iclr|cvpr|acl\b|journal of)|论文|摘要[:：]|期刊|会议论文|文献|引用量|审稿/gi
const STUDY_PATTERN = /\$[^$\n]+\$|\\(frac|int|sum|lim|mathbb|partial|nabla|begin\{)|定理|引理|推论|证明|定义[:：]|公式|推导|命题|theorem|lemma|proof|corollary/gi

/**
 * Guess the mode of a piece of text.
 * @param {string} text
 * @param {{ kind?: string, enabled?: string[], fallback?: string }} options
 * @returns {{ mode: string, reason: string }}
 */
export function detectMode(text, options = {}) {
  const enabled = Array.isArray(options.enabled) && options.enabled.length > 0 ? options.enabled : ['study', 'academic', 'daily']
  const allow = (mode) => enabled.includes(mode)
  const source = typeof text === 'string' ? text : ''
  const academicHits = (source.match(ACADEMIC_PATTERN) ?? []).length
  const studyHits = (source.match(STUDY_PATTERN) ?? []).length
  if (allow('academic') && (options.kind === 'paper' || (academicHits >= 2 && academicHits >= studyHits / 3))) {
    return { mode: 'academic', reason: '检测到论文标题 / DOI / Abstract 等文献特征' }
  }
  if (allow('study') && studyHits >= 3) return { mode: 'study', reason: '检测到较多公式 / 定理关键词' }
  const fallback = allow(options.fallback) ? options.fallback : (allow('daily') ? 'daily' : enabled[0])
  return { mode: fallback, reason: '' }
}
