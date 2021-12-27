import 'react-calendar-heatmap/dist/styles.css';
import {Box, CircularProgress, Typography} from "@mui/material";
import CalendarHeatmap from "react-calendar-heatmap";
import {useEffect, useState} from "react";
import _ from "lodash";
import dynamic from "next/dynamic";

const ReactTooltip = dynamic(() => import("react-tooltip"), {
    ssr: false,
});

export default function Segment({year, yearlyDistance, recordYearlyDistance}) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(async () => {
        const raw = await fetch(`/equator/${year}.json`)
            .then(response => response.json())
        setLoading(false)
        setData(raw)
        recordYearlyDistance(year, _.sumBy(raw, d => d.distance))
    }, [])


    const keyByDate = _.keyBy(data, "date")
    const allDates = getDateRange(year)
    _.forEach(allDates, dt => {
        if (!_.has(keyByDate, dt)) {
            keyByDate[dt] = newEmptyRecord(dt)
        }
    })
    const filledData = _.values(keyByDate)

    const values = _.map(filledData, d => ({
        date: d.date,
        distance: d.distance,
        pace: computePace(d),
        count: discretization(d),
    }))

    return (
        <>
            <Box sx={{display: "flex", alignItems: "flex-end", justifyContent: "space-between"}}>
                <Typography variant="h3" id={year}>
                    {year}
                </Typography>
                {
                    loading
                        ? <CircularProgress disableShrink size={20}/>
                        : <Typography
                            variant="body2">{`${yearlyDistance ? yearlyDistance.toFixed(2) : 0} km ${getYearStatus(year)}`}</Typography>
                }
            </Box>
            <CalendarHeatmap
                values={values}
                gutterSize={1}
                startDate={new Date(`${year}-01-01`)}
                endDate={new Date(`${year}-12-31`)}
                classForValue={value => {
                    if (!value) {
                        return 'color-empty';
                    }
                    return `color-github-${value.count}`;
                }}
                tooltipDataAttrs={value => {
                    return {
                        'data-tip': `${value.date}
                            ${_.get(value, "distance", 0)}km
                            ${_.get(value, "pace.mins", 0)}'${_.get(value, "pace.secs", 0)}''
                            `,
                    };
                }}
            />
            <ReactTooltip/>
        </>
    )
}

function computePace(d) {
    if (d.duration.mins === 0 && d.duration.secs === 0) {
        return { mins: 0, secs: 0 }
    }
    const secs = _.get(d, "duration.hours", 0) * 3600 +
        _.get(d, "duration.mins", 0) * 60 +
        _.get(d, "duration.secs", 0)
    const minsPerKM = secs / 60 / d.distance
    return {
        mins: _.floor(minsPerKM),
        secs: _.floor((minsPerKM - _.floor(minsPerKM)) * 60)
    }
}

function discretization(d) {
    const distance = d.distance
    if (distance === 0) {
        return 0
    } else if (distance < 5.00) {
        return 1
    } else if (distance < 10.00) {
        return 2
    } else if (distance < 15.00) {
        return 3
    } else if (distance < 21.0975) {
        return 4
    } else if (distance < 42.195) {
        return 5
    } else {
        return 6
    }
}

const getYearStatus = (year) => {
    const currentYear = new Date().getFullYear()
    if (year < currentYear) {
        return '🔚'
    } else if (year === currentYear) {
        return '▶️'
    } else {
        return '🔜'
    }
}

const getDateRange = (year) => {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31)
    let dateRange = []
    for (let dt = startDate; dt <= endDate; dt.setDate(dt.getDate() + 1)) {
        dateRange.push(`${dt.getFullYear().toString()}-${_.padStart((dt.getMonth()+1).toString(), 2, '0')}-${_.padStart(dt.getDate().toString(), 2, '0')}`);
    }
    return dateRange
}

const newEmptyRecord = (dt) => ({
    date: dt,
    distance: 0,
    duration: {
        hours: 0,
        mins: 0,
        secs: 0,
    }
})