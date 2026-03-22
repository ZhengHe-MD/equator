const DAY_MS = 24 * 60 * 60 * 1000
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function parseUtcDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
  }

  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS)
}

function addMonths(date, count) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1))
}

function startOfYear(year) {
  return new Date(Date.UTC(year, 0, 1))
}

function startOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex, 1))
}

function daysBetween(start, endExclusive) {
  return Math.max(0, Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS))
}

function overlapDays(rangeStart, rangeEndExclusive, windowStart, windowEndExclusive) {
  const start = maxDate(rangeStart, windowStart)
  const end = minDate(rangeEndExclusive, windowEndExclusive)
  return daysBetween(start, end)
}

function minDate(...dates) {
  return new Date(Math.min(...dates.map(date => date.getTime())))
}

function maxDate(...dates) {
  return new Date(Math.max(...dates.map(date => date.getTime())))
}

function round(value, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  return {hours, mins, secs}
}

export function normalizeActivities(records) {
  const byDate = new Map()

  records.forEach(record => {
    const date = record.date
    const current = byDate.get(date)
    const nextDistance = Number(record.distance || 0)

    if (!current || nextDistance > current.distance) {
      byDate.set(date, {
        date,
        distance: nextDistance,
        duration: record.duration || {hours: 0, mins: 0, secs: 0},
      })
    }
  })

  return Array.from(byDate.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(record => ({
      date: record.date,
      distance: round(record.distance, 3),
      duration: {
        hours: record.duration.hours || 0,
        mins: record.duration.mins || 0,
        secs: record.duration.secs || 0,
      },
    }))
}

function sumDistance(records, start, endExclusive) {
  return records.reduce((total, record) => {
    const recordDate = parseUtcDate(record.date)

    if (recordDate >= start && recordDate < endExclusive) {
      return total + record.distance
    }

    return total
  }, 0)
}

function getStatus({hasPlan, observedPlanKm, varianceKm}) {
  if (!hasPlan) {
    return {label: "历史完成", tone: "baseline"}
  }

  if (observedPlanKm === 0) {
    return {label: "计划阶段", tone: "planned"}
  }

  const tolerance = Math.max(18, observedPlanKm * 0.08)

  if (varianceKm > tolerance) {
    return {label: "领先计划", tone: "ahead"}
  }

  if (varianceKm < -tolerance) {
    return {label: "落后计划", tone: "behind"}
  }

  return {label: "基本持平", tone: "onPace"}
}

function buildMilestones({goalKm, baselineKm, dailyTargetKm, planStart, targetInclusive}) {
  return [0.25, 0.5, 0.75, 1].map(progress => {
    const targetKm = goalKm * progress
    const requiredKm = Math.max(targetKm - baselineKm, 0)
    const daysToMilestone = dailyTargetKm === 0 ? 0 : Math.max(Math.ceil(requiredKm / dailyTargetKm) - 1, 0)
    const date = progress === 1 ? targetInclusive : addDays(planStart, daysToMilestone)

    return {
      label: `${Math.round(progress * 100)}%`,
      progress,
      targetKm: round(targetKm, 2),
      date: formatDateKey(date),
    }
  })
}

function buildChartSeries({firstRecordDate, lastVisibleActualDate, targetExclusive, planStart, cumulativeActualAt, cumulativePlanAt}) {
  const actualSeries = []
  const actualStart = startOfYear(firstRecordDate.getUTCFullYear())
  let cursor = actualStart

  while (cursor < lastVisibleActualDate) {
    actualSeries.push({date: formatDateKey(cursor), value: round(cumulativeActualAt(cursor), 1)})
    cursor = addMonths(cursor, 1)
  }

  actualSeries.push({date: formatDateKey(lastVisibleActualDate), value: round(cumulativeActualAt(lastVisibleActualDate), 1)})

  const planSeries = [{date: formatDateKey(planStart), value: round(cumulativePlanAt(planStart), 1)}]
  cursor = addMonths(new Date(Date.UTC(planStart.getUTCFullYear(), planStart.getUTCMonth(), 1)), 1)

  while (cursor < targetExclusive) {
    planSeries.push({date: formatDateKey(cursor), value: round(cumulativePlanAt(cursor), 1)})
    cursor = addMonths(cursor, 1)
  }

  planSeries.push({date: formatDateKey(targetExclusive), value: round(cumulativePlanAt(targetExclusive), 1)})

  return {
    startDate: formatDateKey(actualStart),
    endDate: formatDateKey(targetExclusive),
    actualSeries,
    planSeries,
  }
}

export function buildProjection({records, config, asOfDate}) {
  const normalizedRecords = normalizeActivities(records)

  if (normalizedRecords.length === 0) {
    throw new Error("Cannot build a projection without activity data.")
  }

  const firstRecordDate = parseUtcDate(normalizedRecords[0].date)
  const lastRecordDate = parseUtcDate(normalizedRecords[normalizedRecords.length - 1].date)
  const planStart = parseUtcDate(config.planStartDate)
  const targetInclusive = parseUtcDate(config.targetDate)
  const targetExclusive = addDays(targetInclusive, 1)
  const asOf = parseUtcDate(asOfDate || formatDateKey(new Date()))
  const asOfCursor = minDate(maxDate(asOf, planStart), targetExclusive)

  const totalCompletedKm = normalizedRecords.reduce((total, record) => total + record.distance, 0)
  const baselineKm = sumDistance(normalizedRecords, firstRecordDate, planStart)
  const activitiesByYear = normalizedRecords.reduce((accumulator, record) => {
    const year = parseUtcDate(record.date).getUTCFullYear()

    if (!accumulator.has(year)) {
      accumulator.set(year, [])
    }

    accumulator.get(year).push(record)
    return accumulator
  }, new Map())
  const totalPlanDays = daysBetween(planStart, targetExclusive)
  const dailyTargetKm = totalPlanDays === 0 ? 0 : (config.goalKm - baselineKm) / totalPlanDays

  const cumulativeActualAt = dateExclusive => sumDistance(normalizedRecords, firstRecordDate, dateExclusive)
  const cumulativePlanAt = dateExclusive => {
    const activeEnd = minDate(maxDate(dateExclusive, planStart), targetExclusive)
    return baselineKm + overlapDays(planStart, activeEnd, planStart, targetExclusive) * dailyTargetKm
  }

  const plannedToDateKm = cumulativePlanAt(asOfCursor)
  const actualToDateKm = cumulativeActualAt(asOfCursor)
  const varianceKm = actualToDateKm - plannedToDateKm
  const remainingKm = Math.max(config.goalKm - totalCompletedKm, 0)
  const remainingDays = Math.max(daysBetween(maxDate(asOfCursor, planStart), targetExclusive), 1)
  const historicalDays = Math.max(daysBetween(firstRecordDate, addDays(lastRecordDate, 1)), 1)
  const historicalYearlyKm = (totalCompletedKm / historicalDays) * 365.25
  const planYearlyKm = dailyTargetKm * 365.25
  const lastVisibleActualDate = minDate(maxDate(addDays(lastRecordDate, 1), asOfCursor), targetExclusive)
  const milestones = buildMilestones({
    goalKm: config.goalKm,
    baselineKm,
    dailyTargetKm,
    planStart,
    targetInclusive,
  })
  const firstYear = firstRecordDate.getUTCFullYear()
  const targetYear = targetInclusive.getUTCFullYear()
  const years = []

  for (let year = firstYear; year <= targetYear; year += 1) {
    const yearStart = startOfYear(year)
    const yearEnd = startOfYear(year + 1)
    const observedEnd = minDate(yearEnd, asOfCursor)
    const yearPlanKm = overlapDays(yearStart, yearEnd, planStart, targetExclusive) * dailyTargetKm
    const observedPlanKm = overlapDays(yearStart, observedEnd, planStart, targetExclusive) * dailyTargetKm
    const actualYearKm = sumDistance(normalizedRecords, yearStart, yearEnd)
    const observedActualKm = sumDistance(normalizedRecords, yearStart, observedEnd)
    const yearVarianceKm = observedActualKm - observedPlanKm
    const hasPlan = yearPlanKm > 0
    const months = []

    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const monthStart = startOfMonth(year, monthIndex)
      const monthEnd = addMonths(monthStart, 1)
      const observedMonthEnd = minDate(monthEnd, asOfCursor)
      const monthPlanKm = overlapDays(monthStart, monthEnd, planStart, targetExclusive) * dailyTargetKm
      const observedMonthPlanKm = overlapDays(monthStart, observedMonthEnd, planStart, targetExclusive) * dailyTargetKm
      const actualMonthKm = sumDistance(normalizedRecords, monthStart, monthEnd)
      const observedActualMonthKm = sumDistance(normalizedRecords, monthStart, observedMonthEnd)
      const monthVarianceKm = observedActualMonthKm - observedMonthPlanKm

      months.push({
        label: MONTH_LABELS[monthIndex],
        actualKm: round(actualMonthKm, 1),
        planKm: round(monthPlanKm, 1),
        observedPlanKm: round(observedMonthPlanKm, 1),
        varianceKm: round(monthVarianceKm, 1),
        isPast: monthEnd <= asOfCursor,
        isFuture: monthStart >= asOfCursor,
      })
    }

    years.push({
      year,
      actualKm: round(actualYearKm, 1),
      planKm: round(yearPlanKm, 1),
      observedPlanKm: round(observedPlanKm, 1),
      varianceKm: round(yearVarianceKm, 1),
      cumulativeActualKm: round(cumulativeActualAt(yearEnd), 1),
      cumulativePlanKm: round(cumulativePlanAt(minDate(yearEnd, targetExclusive)), 1),
      status: getStatus({hasPlan, observedPlanKm, varianceKm: yearVarianceKm}),
      activities: activitiesByYear.get(year) || [],
      months,
    })
  }

  return {
    summary: {
      goalKm: config.goalKm,
      completedKm: round(totalCompletedKm, 2),
      completedPct: round((totalCompletedKm / config.goalKm) * 100, 2),
      baselineKm: round(baselineKm, 2),
      remainingKm: round(remainingKm, 2),
      dailyTargetKm: round(dailyTargetKm, 3),
      weeklyTargetKm: round(dailyTargetKm * 7, 2),
      monthlyTargetKm: round(dailyTargetKm * 30.4375, 2),
      yearlyTargetKm: round(planYearlyKm, 2),
      historicalYearlyKm: round(historicalYearlyKm, 1),
      paceMultiplier: round(planYearlyKm / historicalYearlyKm, 2),
      plannedToDateKm: round(plannedToDateKm, 2),
      actualToDateKm: round(actualToDateKm, 2),
      varianceKm: round(varianceKm, 2),
      overallStatus: getStatus({hasPlan: true, observedPlanKm: plannedToDateKm - baselineKm, varianceKm}),
      firstActivityDate: normalizedRecords[0].date,
      lastActivityDate: normalizedRecords[normalizedRecords.length - 1].date,
      planStartDate: config.planStartDate,
      targetDate: config.targetDate,
      asOfDate: formatDateKey(asOf),
    },
    milestones,
    years,
    chart: buildChartSeries({
      firstRecordDate,
      lastVisibleActualDate,
      targetExclusive,
      planStart,
      cumulativeActualAt,
      cumulativePlanAt,
    }),
  }
}
