import "react-calendar-heatmap/dist/styles.css"
import {Box, Typography} from "@mui/material"
import CalendarHeatmap from "react-calendar-heatmap"
import _ from "lodash"
import {useEffect, useRef} from "react"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const stageColors = {
  ended: {
    background: "rgba(99, 116, 107, 0.12)",
    color: "#62746b",
  },
  active: {
    background: "rgba(31, 111, 90, 0.12)",
    color: "#1f6f5a",
  },
  upcoming: {
    background: "rgba(198, 123, 49, 0.12)",
    color: "#c67b31",
  },
}

function formatKm(value, digits = 1) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function buildStage(yearValue, asOfYear) {
  if (yearValue < asOfYear) {
    return {label: "已结束", tone: "ended"}
  }
  if (yearValue === asOfYear) {
    return {label: "进行中", tone: "active"}
  }
  return {label: "未开始", tone: "upcoming"}
}

function buildMonthLabels() {
  return MONTH_LABELS
}

function computePace(distance, durationSeconds) {
  if (!distance || durationSeconds === 0) {
    return "无配速"
  }

  const minsPerKm = durationSeconds / 60 / distance
  const mins = Math.floor(minsPerKm)
  const secs = Math.floor((minsPerKm - mins) * 60)
  return `${mins}'${String(secs).padStart(2, "0")}'' /km`
}

function discretization(distance) {
  if (distance === 0) {
    return 0
  }
  if (distance < 5) {
    return 1
  }
  if (distance < 10) {
    return 2
  }
  if (distance < 15) {
    return 3
  }
  if (distance < 21.0975) {
    return 4
  }
  if (distance < 42.195) {
    return 5
  }
  return 6
}

function formatTooltip(date, distance, durationSeconds) {
  return `${date}
距离：${formatKm(distance, 2)} km
配速：${computePace(distance, durationSeconds)}`
}

export default function Segment({year, asOfYear}) {
  const stage = buildStage(year.year, asOfYear)
  const badge = stageColors[stage.tone]
  const heatmapScrollRef = useRef(null)
  const heatmapContentRef = useRef(null)
  const keyByDate = new Map(year.activities.map(([date, distance, durationSeconds]) => [date, {distance, durationSeconds}]))
  const monthLabels = buildMonthLabels()
  const values = getDateRange(year.year).map(date => {
    const record = keyByDate.get(date) || newEmptyRecord()

    return {
      date,
      distance: record.distance,
      count: discretization(record.distance),
      tooltip: formatTooltip(date, record.distance, record.durationSeconds),
    }
  })

  useEffect(() => {
    if (year.year !== asOfYear) {
      return
    }

    const container = heatmapScrollRef.current
    const content = heatmapContentRef.current

    if (!container || !content) {
      return
    }

    const currentMonthIndex = new Date().getMonth()
    const maxScrollLeft = Math.max(content.scrollWidth - container.clientWidth, 0)

    if (maxScrollLeft <= 0) {
      return
    }

    const targetLeft = (maxScrollLeft * currentMonthIndex) / 11

    container.scrollTo({
      left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
      behavior: "smooth",
    })
  }, [asOfYear, year.year])

  return (
    <Box
      sx={{
        borderRadius: 5,
        p: {xs: 2.25, md: 2.75},
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 18px 55px rgba(20, 34, 28, 0.06)",
      }}
    >
      <Box sx={{display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center"}}>
        <Box sx={{display: "flex", alignItems: "baseline", gap: 1.2, flexWrap: "wrap"}}>
          <Typography variant="h5" sx={{fontWeight: 700}}>
            {year.year}
          </Typography>
          <Typography variant="body2" sx={{color: "var(--muted)", fontWeight: 700}}>
            {formatKm(year.actualKm, year.actualKm >= 100 ? 0 : 1)} km
          </Typography>
        </Box>

        <Box
          sx={{
            px: 1.4,
            py: 0.7,
            borderRadius: 999,
            backgroundColor: badge.background,
            color: badge.color,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {stage.label}
        </Box>
      </Box>

      <Box sx={{mt: 2.75}}>
        <Typography variant="body2" sx={{color: "var(--text)", fontWeight: 700, mb: 1.2}}>
          日度
        </Typography>

        <Box ref={heatmapScrollRef} sx={{overflowX: "auto"}}>
          <Box ref={heatmapContentRef} sx={{minWidth: 720}}>
            <CalendarHeatmap
              values={values}
              gutterSize={3}
              startDate={new Date(`${year.year}-01-01`)}
              endDate={new Date(`${year.year}-12-31`)}
              showWeekdayLabels
              monthLabels={monthLabels}
              classForValue={value => {
                if (!value || !value.count) {
                  return "color-empty"
                }

                return `color-github-${value.count}`
              }}
              tooltipDataAttrs={value => ({
                "data-tip": value ? value.tooltip : "",
              })}
            />
          </Box>
        </Box>
      </Box>

      <Box sx={{mt: 2.2}}>
        <Typography variant="body2" sx={{color: "var(--text)", fontWeight: 700, mb: 1.2}}>
          月度
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: {xs: 1, sm: 0.75},
            gridTemplateColumns: {xs: "repeat(3, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))", md: "repeat(12, minmax(0, 1fr))"},
          }}
        >
          {year.months.map((actualKm, index) => (
            <Box
              key={`${year.year}-${MONTH_LABELS[index]}-total`}
              sx={{
                textAlign: "center",
                py: 0.8,
                px: 0.35,
                borderRadius: 2.5,
                backgroundColor: {xs: "rgba(33, 57, 45, 0.035)", md: "transparent"},
              }}
            >
              <Typography variant="caption" sx={{display: "block", color: "var(--muted)", fontSize: {xs: 11, md: 12}}}>
                {MONTH_LABELS[index]}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.25,
                  color: "var(--text)",
                  fontWeight: 700,
                  fontSize: {xs: 11, md: 12},
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                }}
              >
                {actualKm > 0 ? `${formatKm(actualKm, actualKm >= 100 ? 0 : 1)} km` : "-"}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

function getDateRange(year) {
  const startDate = new Date(Date.UTC(year, 0, 1))
  const endDate = new Date(Date.UTC(year, 11, 31))
  const range = []

  for (let date = startDate; date <= endDate; date = new Date(date.getTime() + 24 * 60 * 60 * 1000)) {
    range.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
    )
  }

  return range
}

function newEmptyRecord() {
  return {
    distance: 0,
    durationSeconds: 0,
  }
}
