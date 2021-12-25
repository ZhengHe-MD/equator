import 'react-calendar-heatmap/dist/styles.css';
import {Typography} from "@mui/material";
import CalendarHeatmap from "react-calendar-heatmap";
import {useEffect, useState} from "react";
import _ from "lodash";
import dynamic from "next/dynamic";

const ReactTooltip = dynamic(() => import("react-tooltip"), {
    ssr: false,
});

export default function Segment({year, recordYearlyDistance}) {
    const [data, setData] = useState([])

    useEffect(async () => {
        const raw = await fetch(`/${year}.json`)
            .then(response => response.json())
        setData(raw)
        let yearlyDistance = 0;
        recordYearlyDistance(year, _.sumBy(raw, d => d.distance))
    }, [])


    let values = _.map(data, d => ({
        date: d.date,
        distance: d.distance,
        pace: computePace(d),
        count: discretization(d),
    }))

    return (
        <>
            <Typography variant="h3">{year}</Typography>
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
    const secs = _.get(d, "duration.hours", 0) * 3600 +
        _.get(d, "duration.mins", 0) * 60 +
        _.get(d, "duration.secs", 0)
    const minsPerKM = secs / 60 / d.distance
    return {
        mins: _.floor(minsPerKM),
        secs: _.ceil(minsPerKM - _.floor(minsPerKM)) * 60
    }
}

function discretization(d) {
    const distance = d.distance
    if (distance < 5.00) {
        return 1
    } else if (distance < 10.00) {
        return 2
    } else if (distance < 15.00) {
        return 3
    } else if (distance < 21.0975) {
        return 4
    }
    return 5
}