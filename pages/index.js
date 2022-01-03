import {Box, Container, LinearProgress, Typography} from "@mui/material";
import _ from "lodash";
import Segment from "../src/Segment";
import {useEffect, useState} from "react";
import Image from "next/image";
import Head from "next/head";

export default function Home() {
    let years = [];
    let initYearToData = {};
    let yearToDistance = {};
    for (let i = 0; i < 34; i++) {
        const year = 2015 + i
        years.push(year)
        initYearToData[year] = []
        yearToDistance[year] = 0
    }

    const [yearToData, setYearToData] = useState(initYearToData)
    const [loading, setLoading] = useState(true)

    useEffect(async () => {
        const raw = await fetch("https://raw.githubusercontent.com/ZhengHe-MD/equator/main/public/data.json")
            .then(response => response.json())

        const nextYearToData = {}
        _.forEach(yearToData, (_, year) => {
            nextYearToData[year] = []
        })
        _.forEach(raw, record => {
            const year = parseInt(record.date.slice(0, 4), 10)
            nextYearToData[year].push(record)
        })
        setYearToData(nextYearToData)
        setLoading(false)
    }, [])

    _.forEach(yearToData, (data, year) => {
        _.forEach(data, record => {
            yearToDistance[year] += record.distance
        })
    })

    const distance = _.sum(_.values(yearToDistance))
    const progress = distance / 40075.02 * 100
    const translation = {pl: `${progress - 8}%`}

    return (
        <div>
            <Head>
                <title>{`郑鹤的赤道计划 - ${progress.toFixed(2)}%`}</title>
            </Head>
            <Container sx={{display: "flex", flexDirection: "column", height: "100vh"}}>
                <Box sx={{display: "flex"}} id="top">
                    <Typography variant="h2" sx={{mr: 2}}>
                        {`赤道计划`}
                    </Typography>
                    <Image src="/equator/equator-square.png" width={65} height={50}/>
                </Box>

                <Typography variant="h5" sx={{mb: 3}}>
                    ❝ 我叫郑鹤，我想在人生结束前跑过 40075.02 公里。 ❞
                </Typography>

                <Box sx={{...translation}}>
                    <Image src="/equator/running-girl.gif" width={30} height={30} className="running-girl"/>
                    <Image src="/equator/running.gif" width={40} height={40}/>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}/>
                <Box sx={{...translation}}>
                    <Typography variant="body2" sx={{fontSize: 10}}>{`${progress.toFixed(2)}%`}</Typography>
                </Box>
                <Box sx={{...translation}}>
                    <Typography variant="body2" sx={{fontSize: 10}}>{`${distance.toFixed(2)}/40075.02 km`}</Typography>
                </Box>

                <Box sx={{overflowY: "scroll", flexGrow: 1, px: 1}}>
                    {
                        _.map(years, year => (
                            <Segment
                                year={year}
                                key={year}
                                yearlyDistance={yearToDistance[year]}
                                yearlyData={yearToData[year]}
                                loading={loading}
                            />
                        ))
                    }
                </Box>
            </Container>
        </div>
    )
}
