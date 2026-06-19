import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@trooper/db'

const SETTING_KEYS = [
  'model_provider', 'model_name', 'api_key',
  'github_token', 'repo_owner', 'repo_name',
] as const

type SettingKey = typeof SETTING_KEYS[number]

export async function GET() {
  const rows = await prisma.config.findMany({
    where: { key: { in: SETTING_KEYS.map((k) => `setting:${k}`) } },
  })

  const saved: Record<string, string> = {}
  for (const row of rows) {
    saved[row.key.replace('setting:', '')] = row.value
  }

  // Env vars take precedence — show them (masked) so user knows what's active
  const active: Record<string, string> = {
    model_provider: process.env.TROOPER_MODEL_PROVIDER ?? saved.model_provider ?? '',
    model_name:     process.env.TROOPER_MODEL_NAME     ?? saved.model_name     ?? '',
    api_key:        process.env.TROOPER_API_KEY        ? '••••••••' : (saved.api_key ? '••••••••' : ''),
    github_token:   process.env.TROOPER_GITHUB_TOKEN   ? '••••••••' : (saved.github_token ? '••••••••' : ''),
    repo_owner:     process.env.TROOPER_REPO_OWNER     ?? saved.repo_owner     ?? '',
    repo_name:      process.env.TROOPER_REPO_NAME      ?? saved.repo_name      ?? '',
  }

  const source: Record<string, string> = {
    model_provider: process.env.TROOPER_MODEL_PROVIDER ? 'env' : (saved.model_provider ? 'db' : 'unset'),
    model_name:     process.env.TROOPER_MODEL_NAME     ? 'env' : (saved.model_name     ? 'db' : 'unset'),
    api_key:        process.env.TROOPER_API_KEY        ? 'env' : (saved.api_key        ? 'db' : 'unset'),
    github_token:   process.env.TROOPER_GITHUB_TOKEN   ? 'env' : (saved.github_token   ? 'db' : 'unset'),
    repo_owner:     process.env.TROOPER_REPO_OWNER     ? 'env' : (saved.repo_owner     ? 'db' : 'unset'),
    repo_name:      process.env.TROOPER_REPO_NAME      ? 'env' : (saved.repo_name      ? 'db' : 'unset'),
  }

  return NextResponse.json({ active, source })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Record<SettingKey, string>>

  for (const key of SETTING_KEYS) {
    const value = body[key]
    if (value === undefined) continue
    if (!value.trim()) continue // don't save empty values

    await prisma.config.upsert({
      where:  { key: `setting:${key}` },
      update: { value: value.trim() },
      create: { key: `setting:${key}`, value: value.trim() },
    })
  }

  return NextResponse.json({ ok: true })
}
