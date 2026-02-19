// src/api/fraudApi.js
import axios from 'axios'

// ✅ FIXED: proper URL string, not a code snippet
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://NitinGupta04-fraud-detection-api.hf.space/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ── Single prediction ────────────────────────────────────────
export const predictSingle = async (transaction) => {
  const { data } = await api.post('/predict', transaction)
  return data
}

// ── Batch prediction ─────────────────────────────────────────
// ✅ correct endpoint from routes.py: /predict/batch
export const predictBatch = async (transactions) => {
  const { data } = await api.post('/predict/batch', { transactions })
  return data
}

// ── Health check ─────────────────────────────────────────────
export const healthCheck = async () => {
  const { data } = await api.get('/health')
  return data
}

export default api