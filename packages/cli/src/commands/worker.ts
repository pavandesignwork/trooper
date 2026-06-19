import chalk from 'chalk'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function worker() {
  config()

  console.log(chalk.cyan('\n  Starting Trooper agent worker...\n'))
  console.log('  Polling job queue every 5 seconds.')
  console.log('  Press Ctrl+C to stop.\n')

  const workerPath = path.resolve(__dirname, '../../core/dist/worker.js')

  const proc = spawn('node', [workerPath], {
    env: process.env,
    stdio: 'inherit',
  })

  proc.on('error', (err) => {
    console.error(chalk.red(`\n  Failed to start worker: ${err.message}`))
    console.error(chalk.gray('  Make sure you have run: pnpm build (from the repo root)\n'))
    process.exit(1)
  })

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(chalk.red(`\n  Worker exited with code ${code}\n`))
    }
    process.exit(code ?? 0)
  })

  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n  Stopping worker...\n'))
    proc.kill('SIGINT')
  })
}
