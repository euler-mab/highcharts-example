'use client'

import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FC } from 'react'

interface Parameters {
  px: number
  py: number
  x0: number
  y0: number
  cx: number
  cy: number
}

// Generalised dydx
function dydx(x: number, px: number, py: number, x0: number, c: number): number {
  return - (px / py) * (c + (1 - c) * (x0 / x) ** 2)
}

// First series: x ∈ [-1, 0]
function priceImpactX(x: number, parameters: Parameters): number {
  const scaledX = (x + 1) * parameters.x0
  const dydxVal = dydx(scaledX, parameters.px, parameters.py, parameters.x0, parameters.cx)
  return (parameters.px / parameters.py) / (-dydxVal)
}

// Second series: x ∈ [0, 1]
function priceImpactY(x: number, parameters: Parameters): number {
  const scaledX = (1 - x) * parameters.y0
  const dydxVal = dydx(scaledX, parameters.py, parameters.px, parameters.y0, parameters.cy)
  return (parameters.py / parameters.px) / (-dydxVal)
}

function generateSeriesData(
  fn: (x: number) => number,
  xStart: number,
  xEnd: number,
  steps = 100
): [number, number][] {
  const data: [number, number][] = []
  const dx = (xEnd - xStart) / steps

  for (let i = 0; i <= steps; i++) {
    const x = xStart + i * dx
    try {
      const y = fn(x)
      if (y >= 0 && y <= 1) {
        data.push([x, y])
      }
    } catch {
      // skip invalid x values
    }
  }

  return data
}

const AreaChart: FC = () => {
  const parameters: Parameters = {
    px: 2,
    py: 1,
    x0: 5,
    y0: 10,
    cx: 0.5,
    cy: 0.99
  }

  const xSeries = generateSeriesData(x => priceImpactX(x, parameters), -1, 0)
  const ySeries = generateSeriesData(x => priceImpactY(x, parameters), 0, 1)

  const options: Highcharts.Options = {
    chart: {
      type: 'areaspline',
      events: {
        render: function () {
      const chart = this as Highcharts.Chart
      const xAxis = chart.xAxis[0]
      const labelY = chart.plotTop + chart.plotHeight + 15

      // Remove existing labels if any (to prevent duplicates)
      if (chart.customLabels) {
        chart.customLabels.forEach(label => label.destroy())
      }
      chart.customLabels = [
        chart.renderer
          .label('X liquidity', xAxis.toPixels(-0.5) - 50, labelY)
          .css({ fontSize: '12px', color: '#A1ACB8' })
          .add(),
        chart.renderer
          .label('Y liquidity', xAxis.toPixels(0.5) - 50, labelY)
          .css({ fontSize: '12px', color: '#A1ACB8' })
          .add()
      ]
      chart.customLabels.forEach(label => label.attr({ zIndex: 5 }))
    }
      }
    },
    title: { text: 'Price impact vs % of liquidity swapped out' },
    xAxis: {
      title: { text: '' },
      min: -1,
      max: 1,
      tickLength: -5,
      tickInterval: 0.25,
      labels: {
        y: 15,
        formatter: function () {
          const x = this.value as number
          if (x >= -1 && x <= 0) {
            return `${Math.round(-x * 100)}%` // left: 100% to 0%
          } else if (x > 0 && x <= 1) {
            return `${Math.round(x * 100)}%`  // right: 0% to 100%
          }
          return ''
        }
      }
    },
    yAxis: {
      title: { text: 'Price Impact' },
      min: 0,
      max: 1,
      labels: {
        formatter: function () {
          return `${Math.round((this.value as number) * 100)}%`
        }
      }
    },
    tooltip: {
      shared: true,
      valueDecimals: 4
    },
    plotOptions: {
      areaspline: {
        fillOpacity: 0.3
      }
    },
    series: [
      {
        showInLegend: false,
        type: 'areaspline',
        data: xSeries,
        color: '#2AE5B9',
      },
      {
        showInLegend: false,
        type: 'areaspline',
        data: ySeries,
        color: '#fc8f04',
      }
    ]
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: 800, width: '100%' }}>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
    </div>
  )
}

export default AreaChart
