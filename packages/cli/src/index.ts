#!/usr/bin/env node
import { program } from 'commander'
import { init } from './commands/init.js'
import { start } from './commands/start.js'

program
  .name('trooper')
  .description('Autonomous engineering agent — BYOK, self-hosted')
  .version('0.1.0')

program
  .command('init')
  .description('Set up Trooper for the first time')
  .action(init)

program
  .command('start')
  .description('Start the Trooper server')
  .option('-p, --port <number>', 'Port to run on', '3000')
  .option('--db <url>', 'Database URL (default: SQLite)')
  .action(start)

// Running `npx trooper` with no subcommand runs the wizard
program.action(async () => {
  const { default: chalk } = await import('chalk')
  console.log(chalk.bold('\n  Trooper — autonomous engineering agent\n'))
  await init()
})

program.parse()
