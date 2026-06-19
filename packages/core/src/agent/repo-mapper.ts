import fs from 'node:fs/promises'
import path from 'node:path'

export interface RepoMap {
  tree: string          // directory tree as text
  entryPoints: string[] // likely main files (index.ts, main.ts, app.ts, etc.)
  testCommand: string   // detected test runner command
  buildCommand: string  // detected build command
  language: string      // primary language
  frameworks: string[]  // detected frameworks
}
export async function mapRepo(workDir: string): Promise<RepoMap> {
  const tree = await buildTree(workDir, 0, 3)

  const pkgJsonPath = path.join(workDir, 'package.json')
  const pyprojectPath = path.join(workDir, 'pyproject.toml')
  const cargoPath = path.join(workDir, 'Cargo.toml')

  let testCommand = 'npm test'
  let buildCommand = 'npm run build'
  let language = 'unknown'
  const frameworks: string[] = []

  if (await exists(pkgJsonPath)) {
    language = 'typescript/javascript'
    const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf-8'))
    testCommand = pkg.scripts?.test ?? 'npm test'
    buildCommand = pkg.scripts?.build ?? 'npm run build'

    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps?.next) frameworks.push('Next.js')
    if (deps?.react) frameworks.push('React')
    if (deps?.express) frameworks.push('Express')
    if (deps?.fastify) frameworks.push('Fastify')
    if (deps?.prisma || deps?.['@prisma/client']) frameworks.push('Prisma')
  } else if (await exists(pyprojectPath)) {
    language = 'python'
    testCommand = 'pytest'
    buildCommand = 'python -m build'
    frameworks.push('Python')
  } else if (await exists(cargoPath)) {
    language = 'rust'
    testCommand = 'cargo test'
    buildCommand = 'cargo build'
    frameworks.push('Rust')
  }

  const entryPoints = await findEntryPoints(workDir)

  return { tree, entryPoints, testCommand, buildCommand, language, frameworks }
}

export function formatRepoMapForPrompt(map: RepoMap): string {
  return `## Repository Map

Language: ${map.language}
Frameworks: ${map.frameworks.join(', ') || 'none detected'}
Test command: \`${map.testCommand}\`
Build command: \`${map.buildCommand}\`

Entry points:
${map.entryPoints.map((f) => `  - ${f}`).join('\n') || '  none detected'}

Directory structure (3 levels):
\`\`\`
${map.tree}
\`\`\`

Use the directory structure to identify which files are relevant to the ticket before making changes.
File by subject matter — change only what the ticket requires.`
}

async function buildTree(dir: string, depth: number, maxDepth: number): Promise<string> {
  if (depth > maxDepth) return ''
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const ignored = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '__pycache__', '.venv', 'target'])
  const lines: string[] = []
  const indent = '  '.repeat(depth)

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue
    if (entry.isDirectory()) {
      lines.push(`${indent}${entry.name}/`)
      lines.push(await buildTree(path.join(dir, entry.name), depth + 1, maxDepth))
    } else {
      lines.push(`${indent}${entry.name}`)
    }
  }
  return lines.filter(Boolean).join('\n')
}

async function findEntryPoints(dir: string): Promise<string[]> {
  const candidates = [
    'src/index.ts', 'src/main.ts', 'src/app.ts', 'index.ts', 'main.ts',
    'app/page.tsx', 'pages/index.tsx', 'src/index.js', 'main.py', 'app.py', 'src/main.rs',
  ]
  const found: string[] = []
  for (const c of candidates) {
    if (await exists(path.join(dir, c))) found.push(c)
  }
  return found
}

async function exists(p: string): Promise<boolean> {
  return fs.access(p).then(() => true).catch(() => false)
}
