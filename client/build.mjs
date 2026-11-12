// Concatenates client/src/*.js into the single-file browser bundle client/client.js.
// Usage: node client/build.mjs   (no dependencies, no transpilation)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const parts = readdirSync(join(here, 'src')).filter((name) => name.endsWith('.js')).sort()
const body = parts.map((name) => readFileSync(join(here, 'src', name), 'utf8').replace(/\s+$/, '')).join('\n\n')
const bundle = `// knowledge-galaxy browser bundle (client/client.js) — GENERATED, edit client/src/*.js
// and run \`node client/build.mjs\`. Single-file, self-contained client half of the
// plugin: only react / react-dom (and the platform MarkdownText module) are required.
window.__ModuleLoader__.load({
  id: 'knowledge-galaxy',
  factory: function (require) {
    const module = { exports: {} }
    const exports = module.exports

${body}

    return module.exports
  },
})
`
writeFileSync(join(here, 'client.js'), bundle)
console.log(`client.js: ${parts.length} parts, ${bundle.length} bytes`)
