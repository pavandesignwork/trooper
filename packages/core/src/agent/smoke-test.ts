import { execSync } from 'node:child_process'

export type SmokeTestResult =
  | { passed: true }
  | { passed: false; failures: string[]; output: string }
export async function runSmokeTest(
  workDir: string,
  testCommand: string
): Promise<SmokeTestResult> {
  const result = runCommand(testCommand, workDir, 120_000)

  if (result.exitCode === 0) {
    return { passed: true }
  }

  // One auto-fix attempt: install missing deps and retry (gbrain pattern: auto-fix → re-test)
  const fixResult = runCommand('npm install', workDir, 60_000)
  if (fixResult.exitCode === 0) {
    const retryResult = runCommand(testCommand, workDir, 120_000)
    if (retryResult.exitCode === 0) return { passed: true }
  }

  return {
    passed: false,
    failures: extractFailures(result.output),
    output: result.output.slice(-3000), // last 3000 chars — enough to diagnose
  }
}

export function formatSmokeTestFailure(result: Extract<SmokeTestResult, { passed: false }>): string {
  return `## Test failures (agent must fix before PR can open)

${result.failures.map((f) => `- ${f}`).join('\n')}

\`\`\`
${result.output}
\`\`\``
}

function runCommand(cmd: string, cwd: string, timeoutMs: number): { exitCode: number; output: string } {
  try {
    const output = execSync(cmd, { cwd, timeout: timeoutMs, stdio: 'pipe' }).toString()
    return { exitCode: 0, output }
  } catch (err: any) {
    return {
      exitCode: err.status ?? 1,
      output: (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? ''),
    }
  }
}

function extractFailures(output: string): string[] {
  const lines = output.split('\n')
  return lines
    .filter((l) => /fail|error|✗|✘|FAIL|ERROR/i.test(l))
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20)
}
