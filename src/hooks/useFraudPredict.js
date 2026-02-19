// src/hooks/useFraudPredict.js
import { useState } from 'react'
import { predictSingle, predictBatch } from '../api/fraudApi'
import { saveToHistory } from '../utils/helpers'
import toast from 'react-hot-toast'

export const useFraudPredict = () => {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const predict = async (transaction) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await predictSingle(transaction)
      setResult(data)

      // ── Save to real-time history ──
      saveToHistory({
        mode:              'single',
        type:              transaction.type,
        amount:            transaction.amount,
        prediction:        data.prediction,
        is_fraud:          data.is_fraud,
        fraud_probability: data.fraud_probability,
        risk_level:        data.risk_level,
      })

      return data
    } catch (err) {
      const msg = err.response?.data?.detail || 'Prediction failed. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setError(null) }
  return { result, loading, error, predict, reset }
}

export const useBatchPredict = () => {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const predict = async (transactions) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await predictBatch(transactions)
      setResult(data)

      // ── Save each batch result to history ──
      data.results.forEach((r) => {
        saveToHistory({
          mode:              'batch',
          type:              r.type,
          amount:            r.amount,
          prediction:        r.prediction,
          is_fraud:          r.is_fraud,
          fraud_probability: r.fraud_probability,
          risk_level:        r.risk_level,
        })
      })

      toast.success(`Analyzed ${data.total_transactions} transactions`)
      return data
    } catch (err) {
      const msg = err.response?.data?.detail || 'Batch prediction failed.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setError(null) }
  return { result, loading, error, predict, reset }
}