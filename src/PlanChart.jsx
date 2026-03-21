import {Box, Typography} from "@mui/material"
import {parseUtcDate} from "./lib/projection"

const CHART_WIDTH = 920
const CHART_HEIGHT = 320
const PADDING = {top: 20, right: 20, bottom: 42, left: 56}

function formatYear(date) {
  return parseUtcDate(date).getUTCFullYear()
}

function buildPath(series, scaleX, scaleY) {
  return series
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(point.date)} ${scaleY(point.value)}`)
    .join(" ")
}

export default function PlanChart({chart, goalKm}) {
  const start = parseUtcDate(chart.startDate)
  const end = parseUtcDate(chart.endDate)
  const displayEndYear = formatYear(chart.endDate) - (end.getUTCMonth() === 0 && end.getUTCDate() === 1 ? 1 : 0)
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const totalSpan = end.getTime() - start.getTime()
  const scaleX = dateKey =>
    PADDING.left + ((parseUtcDate(dateKey).getTime() - start.getTime()) / totalSpan) * innerWidth
  const scaleY = value => PADDING.top + innerHeight - (value / goalKm) * innerHeight
  const actualPath = buildPath(chart.actualSeries, scaleX, scaleY)
  const planPath = buildPath(chart.planSeries, scaleX, scaleY)
  const xTicks = [2015, 2020, 2025, 2030, 2035, 2040, 2045, 2048]
  const yTicks = [0, 10000, 20000, 30000, goalKm]

  return (
    <Box
      sx={{
        borderRadius: 6,
        p: {xs: 2.5, md: 3},
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 24px 70px rgba(20, 34, 28, 0.08)",
      }}
    >
      <Typography variant="h5" sx={{mb: 0.5, fontWeight: 700}}>
        累计实际 vs 累计计划
      </Typography>
      <Typography variant="body2" sx={{color: "var(--muted)", mb: 2.5}}>
        曲线先承接历史累计，再从计划起点开始，沿一条恒定速度的直线推进到 2048 年底。
      </Typography>

      <Box sx={{overflowX: "auto"}}>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} width="100%" role="img" aria-label="累计实际与累计计划里程图">
          <defs>
            <linearGradient id="actual-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f6f5a" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#1f6f5a" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={CHART_WIDTH - PADDING.right}
                y1={scaleY(tick)}
                y2={scaleY(tick)}
                stroke="rgba(33, 57, 45, 0.12)"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 10}
                y={scaleY(tick) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#62746b"
              >
                {Math.round(tick).toLocaleString("zh-CN")}
              </text>
            </g>
          ))}

          {xTicks.map(year => {
            const tickDate = `${year}-01-01`

            return (
              <g key={year}>
                <line
                  x1={scaleX(tickDate)}
                  x2={scaleX(tickDate)}
                  y1={PADDING.top}
                  y2={CHART_HEIGHT - PADDING.bottom}
                  stroke="rgba(33, 57, 45, 0.08)"
                  strokeWidth="1"
                />
                <text
                  x={scaleX(tickDate)}
                  y={CHART_HEIGHT - 14}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#62746b"
                >
                  {year}
                </text>
              </g>
            )
          })}

          <path d={`${actualPath} L ${scaleX(chart.actualSeries[chart.actualSeries.length - 1].date)} ${scaleY(0)} L ${scaleX(chart.actualSeries[0].date)} ${scaleY(0)} Z`} fill="url(#actual-gradient)" />
          <path d={planPath} fill="none" stroke="#c67b31" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" />
          <path d={actualPath} fill="none" stroke="#1f6f5a" strokeWidth="4" strokeLinecap="round" />

          <circle
            cx={scaleX(chart.actualSeries[chart.actualSeries.length - 1].date)}
            cy={scaleY(chart.actualSeries[chart.actualSeries.length - 1].value)}
            r="5"
            fill="#1f6f5a"
          />
          <circle
            cx={scaleX(chart.planSeries[chart.planSeries.length - 1].date)}
            cy={scaleY(chart.planSeries[chart.planSeries.length - 1].value)}
            r="5"
            fill="#c67b31"
          />
        </svg>
      </Box>

      <Box sx={{display: "flex", gap: 2.5, flexWrap: "wrap", mt: 1}}>
        <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
          <Box sx={{width: 18, height: 4, borderRadius: 999, backgroundColor: "#1f6f5a"}} />
          <Typography variant="caption" sx={{color: "var(--muted)"}}>
            实际累计里程
          </Typography>
        </Box>
        <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
          <Box sx={{width: 18, height: 4, borderRadius: 999, backgroundColor: "#c67b31"}} />
          <Typography variant="caption" sx={{color: "var(--muted)"}}>
            截至 {displayEndYear} 年底的计划累计里程
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
