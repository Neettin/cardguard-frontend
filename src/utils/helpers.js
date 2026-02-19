// src/utils/helpers.js

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export const formatPercent = (value) =>
  `${(value * 100).toFixed(1)}%`

export const getRiskColor = (risk) =>
  ({ HIGH: '#FF4060', MEDIUM: '#F0D080', LOW: '#4ADE80' })[risk] || '#718096'

export const getRiskBg = (risk) =>
  ({ HIGH: 'rgba(255,64,96,0.1)', MEDIUM: 'rgba(240,208,128,0.1)', LOW: 'rgba(74,222,128,0.1)' })[risk] || 'rgba(113,128,150,0.1)'

export const getRiskBorder = (risk) =>
  ({ HIGH: 'rgba(255,64,96,0.3)', MEDIUM: 'rgba(240,208,128,0.3)', LOW: 'rgba(74,222,128,0.3)' })[risk] || 'rgba(113,128,150,0.3)'

export const TRANSACTION_TYPES = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'CASH_IN', 'DEBIT']

// ── LocalStorage history ──────────────────────────────────────────────────────
const HISTORY_KEY = 'fraudguard_history'
const MAX_HISTORY = 200

export const saveToHistory = (entry) => {
  try {
    const existing = getHistory()
    const updated  = [{ ...entry, id: Date.now(), timestamp: new Date().toISOString() }, ...existing]
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, MAX_HISTORY)))
  } catch {}
}

export const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

export const clearHistory = () => {
  try { localStorage.removeItem(HISTORY_KEY) } catch {}
}