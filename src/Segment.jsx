import "react-calendar-heatmap/dist/styles.css"
import {Box, Typography} from "@mui/material"
import CalendarHeatmap from "react-calendar-heatmap"
import _ from "lodash"
import dynamic from "next/dynamic"

const ReactTooltip = dynamic(() => import("react-tooltip"), {
  ssr: false,
})

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

function buildMonthLabels(months) {
  return months.map(month => month.label)
}

function computePace(record) {
  const duration = record.duration || {}
  const totalSeconds = (duration.hours || 0) * 3600 + (duration.mins || 0) * 60 + (duration.secs || 0)

  if (!record.distance || totalSeconds === 0) {
    return "无配速"
  }

  const minsPerKm = totalSeconds / 60 / record.distance
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

function formatTooltip(record) {
  return `${record.date}
距离：${formatKm(_.get(record, "distance", 0), 2)} km
配速：${computePace(record)}`
}

export default function Segment({year, asOfYear}) {
  const stage = buildStage(year.year, asOfYear)
  const badge = stageColors[stage.tone]
  const keyByDate = _.keyBy(year.activities, "date")
  const monthLabels = buildMonthLabels(year.months)
  const values = getDateRange(year.year).map(date => {
    const record = keyByDate[date] || newEmptyRecord(date)

    return {
      date,
      distance: record.distance,
      count: discretization(record.distance),
      tooltip: formatTooltip(record),
    }
  })

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

        <Box sx={{overflowX: "auto"}}>
          <Box sx={{minWidth: 720}}>
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
        <ReactTooltip multiline />
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
          {year.months.map(month => (
            <Box
              key={`${year.year}-${month.label}-total`}
              sx={{
                textAlign: "center",
                py: 0.8,
                px: 0.35,
                borderRadius: 2.5,
                backgroundColor: {xs: "rgba(33, 57, 45, 0.035)", md: "transparent"},
              }}
            >
              <Typography variant="caption" sx={{display: "block", color: "var(--muted)", fontSize: {xs: 11, md: 12}}}>
                {month.label}
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
                {month.actualKm > 0 ? `${formatKm(month.actualKm, month.actualKm >= 100 ? 0 : 1)} km` : "-"}
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

function newEmptyRecord(date) {
  return {
    date,
    distance: 0,
    duration: {
      hours: 0,
      mins: 0,
      secs: 0,
    },
  }
}
