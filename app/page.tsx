'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

interface RowAnalysis {
  rowNumber: number
  data: any
  paretoScore: number
  classification: string
  metrics: {
    totalValue: number
    cumulativePercentage: number
    contribution: number
  }
  recommendations: string[]
}

interface AnalysisResult {
  summary: {
    totalRows: number
    highPriority: number
    mediumPriority: number
    lowPriority: number
    totalValue: number
  }
  rowAnalyses: RowAnalysis[]
  paretoThreshold: number
}

export default function Home() {
  const [sheetUrl, setSheetUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')

  const analyzeSheet = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sheetUrl }),
      })

      if (!response.ok) {
        throw new Error('Error al analizar la hoja de cálculo')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getScoreClass = (classification: string) => {
    switch (classification) {
      case 'Alta Prioridad':
        return 'score-high'
      case 'Media Prioridad':
        return 'score-medium'
      case 'Baja Prioridad':
        return 'score-low'
      default:
        return 'score-medium'
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Analizador Pareto</h1>
        <p>Análisis de Pareto línea por línea de datos de Google Sheets</p>
      </div>

      <div className="card">
        <div className="input-group">
          <label htmlFor="sheetUrl">URL de Google Sheets (pública o CSV público)</label>
          <input
            id="sheetUrl"
            type="text"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
        </div>

        <div className="info-box">
          <strong>💡 Instrucciones:</strong>
          <ol style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Comparte tu Google Sheet como público (Archivo → Compartir → Obtener enlace)</li>
            <li>O exporta como CSV público</li>
            <li>La hoja debe contener columnas con valores numéricos para el análisis</li>
          </ol>
        </div>

        <button
          className="btn"
          onClick={analyzeSheet}
          disabled={loading || !sheetUrl}
        >
          {loading ? 'Analizando...' : 'Analizar Datos'}
        </button>

        {error && (
          <div className="error">
            <strong>❌ Error:</strong> {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Analizando datos con principio de Pareto...</p>
        </div>
      )}

      {result && (
        <div className="results">
          <div className="summary-card">
            <h2>📈 Resumen del Análisis</h2>
            <div className="summary-stats">
              <div className="stat-box">
                <h4>Total de Filas</h4>
                <p>{result.summary.totalRows}</p>
              </div>
              <div className="stat-box">
                <h4>Alta Prioridad</h4>
                <p>{result.summary.highPriority}</p>
              </div>
              <div className="stat-box">
                <h4>Media Prioridad</h4>
                <p>{result.summary.mediumPriority}</p>
              </div>
              <div className="stat-box">
                <h4>Baja Prioridad</h4>
                <p>{result.summary.lowPriority}</p>
              </div>
            </div>
          </div>

          <div className="card chart-container">
            <h3 style={{ marginBottom: '20px' }}>Distribución de Prioridades</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Alta', value: result.summary.highPriority, fill: '#4caf50' },
                { name: 'Media', value: result.summary.mediumPriority, fill: '#ff9800' },
                { name: 'Baja', value: result.summary.lowPriority, fill: '#f44336' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-container">
            <h3 style={{ marginBottom: '20px' }}>Curva de Pareto (Acumulativo)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.rowAnalyses.map((row, idx) => ({
                name: `Fila ${row.rowNumber}`,
                percentage: row.metrics.cumulativePercentage,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#667eea" strokeWidth={2} name="% Acumulado" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h2 style={{ color: 'white', margin: '30px 0 20px' }}>Análisis por Línea</h2>

          {result.rowAnalyses.map((row) => (
            <div key={row.rowNumber} className="result-item">
              <h3>
                📄 Línea {row.rowNumber}
                <span className={`score-badge ${getScoreClass(row.classification)}`}>
                  {row.classification}
                </span>
              </h3>

              <div style={{ marginTop: '15px' }}>
                <div className="metric">
                  <span className="metric-label">Puntuación Pareto:</span>
                  <span className="metric-value">{row.paretoScore.toFixed(2)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Valor Total:</span>
                  <span className="metric-value">{row.metrics.totalValue.toFixed(2)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Contribución:</span>
                  <span className="metric-value">{row.metrics.contribution.toFixed(2)}%</span>
                </div>
                <div className="metric">
                  <span className="metric-label">% Acumulado:</span>
                  <span className="metric-value">{row.metrics.cumulativePercentage.toFixed(2)}%</span>
                </div>
              </div>

              {row.recommendations.length > 0 && (
                <div style={{ marginTop: '15px', padding: '12px', background: '#f0f4ff', borderRadius: '6px' }}>
                  <strong>💡 Recomendaciones:</strong>
                  <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                    {row.recommendations.map((rec, idx) => (
                      <li key={idx} style={{ marginBottom: '5px' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <details style={{ marginTop: '15px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#667eea' }}>
                  Ver datos completos de la línea
                </summary>
                <pre style={{
                  marginTop: '10px',
                  padding: '15px',
                  background: '#f5f5f5',
                  borderRadius: '6px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(row.data, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
