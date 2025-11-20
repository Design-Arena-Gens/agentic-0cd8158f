import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const { sheetUrl } = await request.json()

    if (!sheetUrl) {
      return NextResponse.json(
        { error: 'URL de hoja de cálculo requerida' },
        { status: 400 }
      )
    }

    // Convert Google Sheets URL to CSV export URL
    let csvUrl = sheetUrl
    if (sheetUrl.includes('docs.google.com/spreadsheets')) {
      const sheetId = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1]
      if (sheetId) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
      }
    }

    // Fetch the data
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error('No se pudo acceder a la hoja de cálculo. Asegúrate de que sea pública.')
    }

    const csvText = await response.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      throw new Error('La hoja de cálculo está vacía')
    }

    // Perform Pareto analysis
    const analysis = performParetoAnalysis(rows)

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Error analyzing sheet:', error)
    return NextResponse.json(
      { error: error.message || 'Error al analizar la hoja de cálculo' },
      { status: 500 }
    )
  }
}

function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return rows
}

function performParetoAnalysis(rows: any[]): AnalysisResult {
  // Calculate total value for each row (sum of all numeric values)
  const rowsWithValues = rows.map((row, index) => {
    let totalValue = 0
    const numericValues: number[] = []

    Object.entries(row).forEach(([key, value]) => {
      const numValue = parseFloat(String(value).replace(/[^0-9.-]/g, ''))
      if (!isNaN(numValue)) {
        totalValue += Math.abs(numValue)
        numericValues.push(numValue)
      }
    })

    return {
      rowNumber: index + 1,
      data: row,
      totalValue,
      numericValues,
    }
  })

  // Sort by total value descending
  rowsWithValues.sort((a, b) => b.totalValue - a.totalValue)

  // Calculate cumulative values
  const grandTotal = rowsWithValues.reduce((sum, row) => sum + row.totalValue, 0)
  let cumulativeValue = 0

  const rowAnalyses: RowAnalysis[] = rowsWithValues.map((row, index) => {
    cumulativeValue += row.totalValue
    const contribution = grandTotal > 0 ? (row.totalValue / grandTotal) * 100 : 0
    const cumulativePercentage = grandTotal > 0 ? (cumulativeValue / grandTotal) * 100 : 0

    // Pareto classification: 80/20 rule
    let classification = 'Baja Prioridad'
    let paretoScore = contribution

    if (cumulativePercentage <= 80) {
      classification = 'Alta Prioridad' // Top items contributing to 80% of value
      paretoScore += 30
    } else if (cumulativePercentage <= 95) {
      classification = 'Media Prioridad'
      paretoScore += 15
    }

    // Generate recommendations
    const recommendations = generateRecommendations(
      row,
      classification,
      contribution,
      cumulativePercentage
    )

    return {
      rowNumber: row.rowNumber,
      data: row.data,
      paretoScore,
      classification,
      metrics: {
        totalValue: row.totalValue,
        cumulativePercentage,
        contribution,
      },
      recommendations,
    }
  })

  // Calculate summary
  const summary = {
    totalRows: rowAnalyses.length,
    highPriority: rowAnalyses.filter(r => r.classification === 'Alta Prioridad').length,
    mediumPriority: rowAnalyses.filter(r => r.classification === 'Media Prioridad').length,
    lowPriority: rowAnalyses.filter(r => r.classification === 'Baja Prioridad').length,
    totalValue: grandTotal,
  }

  return {
    summary,
    rowAnalyses,
    paretoThreshold: 80,
  }
}

function generateRecommendations(
  row: any,
  classification: string,
  contribution: number,
  cumulativePercentage: number
): string[] {
  const recommendations: string[] = []

  if (classification === 'Alta Prioridad') {
    recommendations.push(
      `Esta línea es crítica: representa el ${contribution.toFixed(1)}% del valor total`
    )
    recommendations.push(
      'Priorizar recursos y atención inmediata en este elemento'
    )
    recommendations.push(
      'Implementar seguimiento continuo y métricas de rendimiento'
    )

    if (row.totalValue > 0) {
      recommendations.push(
        'Buscar oportunidades de optimización para maximizar el retorno'
      )
    }
  } else if (classification === 'Media Prioridad') {
    recommendations.push(
      `Contribuye con ${contribution.toFixed(1)}% del valor total`
    )
    recommendations.push(
      'Mantener seguimiento regular y considerar para optimización secundaria'
    )
    recommendations.push(
      'Evaluar si puede mejorarse para entrar en el grupo de alta prioridad'
    )
  } else {
    recommendations.push(
      `Impacto limitado: ${contribution.toFixed(1)}% del valor total`
    )
    recommendations.push(
      'Considerar automatización o simplificación de procesos'
    )
    recommendations.push(
      'Evaluar si los recursos asignados son proporcionales al impacto'
    )
  }

  // Add specific recommendation based on cumulative percentage
  if (cumulativePercentage <= 20) {
    recommendations.push(
      '⭐ Top 20%: Este elemento es de los más valiosos del conjunto'
    )
  }

  return recommendations
}
