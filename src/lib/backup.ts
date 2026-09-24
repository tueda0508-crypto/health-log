import { db } from './db'
import { getSettings, updateSettings } from './settings'
import { toDateKey } from './date'

const FORMAT = 'health-log-backup'
const VERSION = 1

export async function exportBackup(): Promise<void> {
  const s = getSettings()
  const data = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    // APIキーはバックアップに含めない
    settings: { profile: s.profile, targetOverrides: s.targetOverrides, model: s.model },
    meals: await db.meals.toArray(),
    favorites: await db.favorites.toArray(),
    bodyLogs: await db.bodyLogs.toArray(),
    exercises: await db.exercises.toArray(),
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const file = new File([blob], `health-log-${toDateKey()}.json`, { type: 'application/json' })

  // iPhone では共有シートから「ファイルに保存」できるようにする
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'ヘルスログのバックアップ' })
      updateSettings({ lastExportAt: Date.now() })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      // 共有できなければダウンロードにフォールバック
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  updateSettings({ lastExportAt: Date.now() })
}

export async function importBackup(file: File): Promise<{ meals: number }> {
  const data = JSON.parse(await file.text())
  if (data?.format !== FORMAT) throw new Error('ヘルスログのバックアップファイルではありません。')

  await db.transaction('rw', [db.meals, db.favorites, db.bodyLogs, db.exercises], async () => {
    await Promise.all([db.meals.clear(), db.favorites.clear(), db.bodyLogs.clear(), db.exercises.clear()])
    await db.meals.bulkAdd(data.meals ?? [])
    await db.favorites.bulkAdd(data.favorites ?? [])
    await db.bodyLogs.bulkPut(data.bodyLogs ?? [])
    await db.exercises.bulkAdd(data.exercises ?? [])
  })
  if (data.settings) {
    updateSettings({
      profile: data.settings.profile ?? null,
      targetOverrides: data.settings.targetOverrides ?? {},
      ...(data.settings.model ? { model: data.settings.model } : {}),
    })
  }
  return { meals: (data.meals ?? []).length }
}

export const BACKUP_REMIND_DAYS = 7

/** 最後の書き出し（未実施なら最初の記録）から一定日数が過ぎたか */
export function backupOverdue(lastExportAt: number | null, firstRecordAt: number | undefined): boolean {
  const since = lastExportAt ?? firstRecordAt
  if (since == null) return false
  return Date.now() - since > BACKUP_REMIND_DAYS * 24 * 60 * 60 * 1000
}
