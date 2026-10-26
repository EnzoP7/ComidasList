import { useEffect, useState } from 'react'

const PREFIX = 'recomp:'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // almacenamiento lleno o bloqueado: la app sigue funcionando en memoria
  }
}

// Estado de React persistido en localStorage
export function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))
  useEffect(() => save(key, value), [key, value])
  return [value, setValue]
}

export const STORAGE_KEYS = ['settings', 'logs', 'recipes', 'prices', 'foods', 'favorites', 'expenses', 'shopping']

export function exportAll() {
  const data = {}
  for (const k of STORAGE_KEYS) data[k] = load(k, null)
  return { app: 'recomp', version: 1, exportedAt: new Date().toISOString(), data }
}

export function importAll(json) {
  if (!json || json.app !== 'recomp' || !json.data) throw new Error('Archivo no válido')
  for (const k of STORAGE_KEYS) if (json.data[k] != null) save(k, json.data[k])
}
