import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Analizador Pareto - Google Sheets',
  description: 'Análisis de Pareto línea por línea de datos de Google Sheets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
