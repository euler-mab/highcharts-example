'use client'

import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { FC } from 'react'

// Typescript: extend the Highcharts Chart type to hold custom labels
declare module 'highcharts' {
  interface Chart {
    customLabels?: Highcharts.SVGElement[]
  }
}

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
      backgroundColor: '#0C1D2F',
      events: {
        render: function () {
          const chart = this as Highcharts.Chart
          const xAxis = chart.xAxis[0]

          // Y-coordinate: just above the x-axis (axis line), adjust for font
          // The axis is at chart.plotTop + chart.plotHeight, axis labels slightly below that, axis title below that
          // So place custom labels just above axis line, e.g. -32px from axis line
          const labelY = chart.plotTop + chart.plotHeight - 32

          // Remove existing labels if any (to prevent duplicates)
          if (chart.customLabels) {
            chart.customLabels.forEach(label => label.destroy())
          }
          chart.customLabels = [
            chart.renderer
              .label('X', xAxis.toPixels(-0.5) - 15, labelY)
              .css({ fontSize: '13px', color: '#F7F7F8' })
              .attr({ zIndex: 10 })
              .add(),
            chart.renderer
              .label('Y', xAxis.toPixels(0.5) - 15, labelY)
              .css({ fontSize: '13px', color: '#F7F7F8' })
              .attr({ zIndex: 10 })
              .add()
          ]
        }
      }
    },
    title: { text: 'Price impact vs % of liquidity swapped out', style: { color: '#FFFFFF' } },
    xAxis: {
      title: { text: 'Liquidity', style: { color: '#F7F7F8', fontSize: '14px' } },
      min: -1,
      max: 1,
      tickLength: -5,
      tickInterval: 0.25,
      labels: {
        y: 15,
        style: { color: '#A1ACB8',     fontFamily: 'Inter, sans-serif', },
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
      title: { text: 'Price impact', style: { color: '#F7F7F8' } },
      min: 0,
      max: 1,
        gridLineColor: '#10263E',
      labels: {
        style: { color: '#A1ACB8' },
        formatter: function () {
          return `${Math.round((this.value as number) * 100)}%`
        }
      }
    },
    tooltip: {
      shared: true,
      valueDecimals: 4,
      style: { color: '#A1ACB8' }
    },
    legend: {
      itemStyle: { color: '#A1ACB8' }
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
    <div style={{ display: 'flex', justifyContent: 'center', background: '#0C1D2F', padding: '1rem' }}>
      <div style={{ maxWidth: 800, width: '100%' }}>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </div>
    </div>
  )
}

export default AreaChart
