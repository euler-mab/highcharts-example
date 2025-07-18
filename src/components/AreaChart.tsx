"use client";

import React, { useState } from "react";
import { FC } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Slider } from "@eulerxyz/euler-materials";
// Or whatever components are provided by the package

// Typescript: extend the Highcharts Chart type to hold custom labels
declare module "highcharts" {
  interface Chart {
    customLabels?: Highcharts.SVGElement[];
  }
}

interface Parameters {
  px: number;
  py: number;
  x0: number;
  y0: number;
  cx: number;
  cy: number;
}

interface State {
  currentPriceX: number;
}

function f(
  x: number,
  x0: number,
  y0: number,
  px: number,
  py: number,
  c: number
): number {
  const inner = c + (1 - c) * (x0 / x);
  return y0 + (px / py) * (x0 - x) * inner;
}

// Generalised dydx
function dydx(
  x: number,
  px: number,
  py: number,
  x0: number,
  c: number
): number {
  return -(px / py) * (c + (1 - c) * (x0 / x) ** 2);
}

function calculateX(
  p: number,
  px: number,
  py: number,
  x0: number,
  c: number
): number {
  const numerator = (py / px) * -p - c;
  const denominator = 1 - c;
  const inner = numerator / denominator;
  return x0 / Math.sqrt(inner);
}

// First series: x ∈ [-1, 0]
function priceImpactX(x: number, parameters: Parameters): number {
  const scaledX = (x + 1) * parameters.x0;
  const dydxVal = dydx(
    scaledX,
    parameters.px,
    parameters.py,
    parameters.x0,
    parameters.cx
  );
  return parameters.px / parameters.py / -dydxVal;
}

// Second series: x ∈ [0, 1]
function priceImpactY(x: number, parameters: Parameters): number {
  const scaledX = (1 - x) * parameters.y0;
  const dydxVal = dydx(
    scaledX,
    parameters.py,
    parameters.px,
    parameters.y0,
    parameters.cy
  );
  return parameters.py / parameters.px / -dydxVal;
}

function generateSeriesData(
  fn: (x: number) => number,
  xStart: number,
  xEnd: number,
  steps = 1000
): [number, number][] {
  const data: [number, number][] = [];
  const dx = (xEnd - xStart) / steps;

  for (let i = 0; i <= steps; i++) {
    const x = xStart + i * dx;
    try {
      const y = fn(x);
      if (y >= 0 && y <= 1) {
        data.push([x, y]);
      }
    } catch {
      // skip invalid x values
    }
  }

  return data;
}

const AreaChart: FC = () => {
  const [cx, setCx] = useState(0); // initial value 0.5
  const [cy, setCy] = useState(0); // initial value 0.5
  const parameters: Parameters = {
    x0: 5,
    y0: 10,
    px: 2,
    py: 1,
    cx,
    cy,
  };

  const current: State = {
    currentPriceX: 0.9,
  };

  const xSeries = generateSeriesData((x) => priceImpactX(x, parameters), -1, 0);
  const ySeries = generateSeriesData((x) => priceImpactY(x, parameters), 0, 1);

  const options: Highcharts.Options = {
    chart: {
      type: "areaspline",
      backgroundColor: "#0C1D2F",
      spacingTop: 40,
      spacingRight: 40,
      spacingBottom: 40,
      spacingLeft: 40,
      events: {
        render: function () {
          const chart = this as Highcharts.Chart;
          const xAxis = chart.xAxis[0];

          const labelY = chart.plotTop + chart.plotHeight - 32;

          // Remove existing labels if any (to prevent duplicates)
          if (chart.customLabels) {
            chart.customLabels.forEach((label) => label.destroy());
          }
          chart.customLabels = [
            chart.renderer
              .label("X", xAxis.toPixels(-0.5) - 10, labelY)
              .css({ fontSize: "13px", color: "#F7F7F8" })
              .attr({ zIndex: 10 })
              .add(),
            chart.renderer
              .label("Y", xAxis.toPixels(0.5) - 10, labelY)
              .css({ fontSize: "13px", color: "#F7F7F8" })
              .attr({ zIndex: 10 })
              .add(),
          ];
        },
      },
    },
    title: { text: "" },
    xAxis: {
      title: {
        text: "Liquidity",
        style: { color: "#F7F7F8", fontSize: "14px" },
      },
      min: -1,
      max: 1,
      tickLength: -5,
      tickInterval: 0.25,
      labels: {
        y: 15,
        style: { color: "#A1ACB8", fontFamily: "Inter, sans-serif" },
        formatter: function () {
          const x = this.value as number;
          if (x >= -1 && x <= 0) {
            return `${Math.round(-x * 100)}%`; // left: 100% to 0%
          } else if (x > 0 && x <= 1) {
            return `${Math.round(x * 100)}%`; // right: 0% to 100%
          }
          return "";
        },
      },
      plotLines: [
        // {
        //   value: current.currentPriceX,
        //   color: "#FFFFFF",
        //   width: 1,
        //   dashStyle: "Dash",
        //   zIndex: 5,
        //   label: {
        //     text: "Current price",
        //     align:
        //       current.currentPriceX < -0.9
        //         ? "left"
        //         : current.currentPriceX > 0.9
        //         ? "right"
        //         : "center",
        //     verticalAlign: "top",
        //     rotation: 0,
        //     y: -5,
        //     style: {
        //       color: "#FFF",
        //       fontSize: "13px",
        //       fontFamily: "Inter, sans-serif",
        //       textShadow: "0 0 2px #0C1D2F",
        //     },
        //   },
        // },
        {
          value: 0,
          color: "#FFFFFF",
          width: 1,
          zIndex: 5,
          label: {
            text: "Initial price",
            align: "center",
            verticalAlign: "top",
            rotation: 0,
            y: -5,
            style: {
              color: "#FFF",
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
              textShadow: "0 0 2px #0C1D2F",
            },
          },
        },
      ],
    },

    yAxis: {
      title: { text: "Price impact", style: { color: "#F7F7F8" } },
      min: 0,
      max: 1,
      gridLineColor: "#10263E",
      labels: {
        style: { color: "#A1ACB8" },
        formatter: function () {
          return `${Math.round((1 - (this.value as number)) * 100)}%`;
        },
      },
    },
    tooltip: {
      shared: true,
      backgroundColor: "#14304e",
      style: { color: "#A1ACB8" },
      formatter: function () {
        let s = "";
        if (this.points) {
          this.points.forEach(function (point: any, i: number) {
            let liquidityLabelX = "X";
            let liquidityLabelY = "Y";
            let liquidityValueX;
            let liquidityValueY;
            let priceXY;
            let priceYX;
            // x axis: left side [-1,0] is X liquidity, right side [0,1] is Y liquidity
            if (point.series.index === 0) {
              // X liquidity: x runs from -1 to 0 (so invert and scale)
              liquidityValueX = `${(point.x * parameters.x0).toFixed(2)} (-${(
                -point.x * 100
              ).toFixed(2)}%)`;
              liquidityValueY = `${(
                f(
                  (1 + point.x) * parameters.x0,
                  parameters.x0,
                  parameters.y0,
                  parameters.px,
                  parameters.py,
                  parameters.cx
                ) - parameters.y0
              ).toFixed(2)} (${(
                ((f(
                  (1 + point.x) * parameters.x0,
                  parameters.x0,
                  parameters.y0,
                  parameters.px,
                  parameters.py,
                  parameters.cx
                ) -
                  parameters.y0) /
                  parameters.y0) *
                100
              ).toFixed(2)}%)`;
              priceXY = `${-dydx(
                (1 + point.x) * parameters.x0,
                parameters.px,
                parameters.py,
                parameters.x0,
                parameters.cx
              )}`;
              priceYX = `${
                1 /
                -dydx(
                  (1 + point.x) * parameters.x0,
                  parameters.px,
                  parameters.py,
                  parameters.x0,
                  parameters.cx
                )
              }`;
            } else {
              // Y liquidity: x runs from 0 to 1
              liquidityValueX = `${(
                f(
                  (1 - point.x) * parameters.y0,
                  parameters.y0,
                  parameters.x0,
                  parameters.py,
                  parameters.px,
                  parameters.cy
                ) - parameters.x0
              ).toFixed(2)} (${(
                ((f(
                  (1 - point.x) * parameters.y0,
                  parameters.y0,
                  parameters.x0,
                  parameters.py,
                  parameters.px,
                  parameters.cy
                ) -
                  parameters.x0) /
                  parameters.x0) *
                100
              ).toFixed(2)}%)`;
              liquidityValueY = `-${(point.x * parameters.y0).toFixed(2)} (${(
                -point.x * 100
              ).toFixed(2)}%)`;
              priceXY = `${
                1 /
                -dydx(
                  (1 - point.x) * parameters.y0,
                  parameters.py,
                  parameters.px,
                  parameters.y0,
                  parameters.cy
                )
              }`;
              priceYX = `${-dydx(
                (1 - point.x) * parameters.y0,
                parameters.py,
                parameters.px,
                parameters.y0,
                parameters.cy
              )}`;
            }
            s += `
            <span>
            Price impact: ${((1 - point.y) * 100).toFixed(2)}%            
            <br/>
            <br/>
            Swap amounts:
            <br/>
            ${liquidityLabelX}: ${liquidityValueX}
            <br/>
            ${liquidityLabelY}: ${liquidityValueY}            
            <br/>            
            <br/>
            Exchange rates:
            <br/>
            ${"X/Y"}: ${priceXY}
            <br/>
            ${"Y/X"}: ${priceYX}
            </span>`;
          });
          return s;
        }
      },
    },

    legend: {
      itemStyle: { color: "#A1ACB8" },
    },
    plotOptions: {
      areaspline: {
        fillOpacity: 0.3,
      },
    },
    series: [
      {
        showInLegend: false,
        type: "areaspline",
        data: xSeries,
        color: "#2AE5B9",
      },
      {
        showInLegend: false,
        type: "areaspline",
        data: ySeries,
        color: "#fc8f04",
      },
    ],
  };
  console.log("cx:", cx, "cy:", cy);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          background: "#0C1D2F",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: 800, width: "100%" }}>
          <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          background: "#0C1D2F",
          padding: "1rem",
        }}
      >
        <div
          style={{ display: "flex", maxWidth: 800, width: "100%", gap: "2rem" }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{ textAlign: "left", color: "#A1ACB8", marginBottom: 4 }}
            >
              cx: {cx}
            </div>
            <Slider
              value={cx}
              setValue={(val) => setCx(Array.isArray(val) ? val[0] : val)}
              min={0}
              max={1}
              step={0.0001}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{ textAlign: "right", color: "#A1ACB8", marginBottom: 4 }}
            >
              cy: {cy}
            </div>
            <Slider
              value={cy}
              setValue={(val) => setCy(Array.isArray(val) ? val[0] : val)}
              min={0}
              max={1}
              step={0.0001}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AreaChart;
