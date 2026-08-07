export interface PendingPhoto {
  name: string
  type: string
  base64: string
}

export interface PendingReport {
  id?: string
  projectId: string
  projectName?: string
  date: string
  workDone: string
  quantity?: string
  labourSkilled: number
  labourUnskilled: number
  labourOperators: number
  tomorrowPlan?: string
  issues?: string
  remarks?: string
  photos: PendingPhoto[]
  createdAt: number
}

const DB_NAME = 'sitetrack_offline'
const STORE_NAME = 'pending_reports'
const DB_VERSION = 1

/**
 * Initialize IndexedDB and returns database instance.
 */
export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Add a new report to the pending offline queue in IndexedDB.
 */
export async function addPendingReport(report: Omit<PendingReport, 'id'>): Promise<string> {
  const db = await initDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const id = `dpr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const newReport: PendingReport = { ...report, id }

    const request = store.add(newReport)

    request.onsuccess = () => {
      // Trigger event to notify standard pages/header of count change
      window.dispatchEvent(new CustomEvent('pending-reports-updated'))
      resolve(id)
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Fetch all pending reports saved in IndexedDB.
 */
export async function getPendingReports(): Promise<PendingReport[]> {
  const db = await initDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Count the pending reports saved offline.
 */
export async function getPendingReportsCount(): Promise<number> {
  const db = await initDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete a pending report by its offline queue ID.
 */
export async function deletePendingReport(id: string): Promise<void> {
  const db = await initDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('pending-reports-updated'))
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}
