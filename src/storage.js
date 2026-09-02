import { seedData } from './demoData'

const KEY = 'qentro-finance-demo-v1'

export function loadData() {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    localStorage.setItem(KEY, JSON.stringify(seedData))
    return structuredClone(seedData)
  }
  try { return JSON.parse(raw) } catch { return structuredClone(seedData) }
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function resetData() {
  localStorage.setItem(KEY, JSON.stringify(seedData))
  return structuredClone(seedData)
}
