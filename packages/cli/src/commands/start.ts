import chalk from 'chalk'
import ora from 'ora'
import { execSync, spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function start(options: { port: string; db?: string }) {
  config() // load .env

  const port = options.port || process.env.PORT || '3000'

  console.log(chalk.cyan(`\n  Starting Trooper on port ${port}...\n`))

  const spinner = ora('Building app...').start()

  try {
    const appDir = path.resolve(__dirname, '../../app')

    execSync('pnpm build', { cwd: appDir, stdio: 'pipe' })
    spinner.succeed('App built')

    const server = spawn('node', [path.join(appDir, '.next/standalone/server.js')], {
      env: { ...process.env, PORT: port },
      stdio: 'inherit',
    })

    console.log(chalk.green(`\n  Trooper running at http://localhost:${port}\n`))
    console.log(`  Webhook endpoints:`)
    console.log(`    GitHub    →  http://localhost:${port}/api/ingest/github`)
    console.log(`    Custom    →  http://localhost:${port}/api/ingest/webhook`)
    console.log(`\n  Press Ctrl+C to stop\n`)

    server.on('exit', (code) => process.exit(code ?? 0))
  } catch (err) {
    spinner.fail('Failed to start')
    console.error(err)
    process.exit(1)
  }
}
