import {Alert, Box, Container, LinearProgress, Typography} from "@mui/material";
import _ from "lodash";
import Segment from "../src/Segment";
import {useState} from "react";
import Image from "next/image";
import Head from "next/head";

export default function Home() {
    const [yearToDistance, setYearToDistance] = useState({})

    const recordYearlyDistance = (year, yearlyDistance) => {
        setYearToDistance(prev => ({...prev, [year]: yearlyDistance}))
    }

    const distance = _.sum(_.values(yearToDistance))
    const progress = distance / 40075.02 * 100

    let years = [];
    for (let i = 0; i < 34; i++) {
        years.push(2015 + i)
    }

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
                    <Image src="/equator-square.png" width={65} height={50}/>
                </Box>
                <Alert severity="info" sx={{my: 1}}>数据录入中</Alert>

                <Typography variant="h5" sx={{mb: 3}}>
                    ❝ 我叫郑鹤，我想在人生结束前跑过 40075.02 公里。 ❞
                </Typography>

                <Box sx={{...translation}}>
                    <Image src="/running-girl.gif" width={30} height={30} className="running-girl"/>
                    <Image src="/running.gif" width={40} height={40}/>
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
                                recordYearlyDistance={recordYearlyDistance}
                            />
                        ))
                    }
                </Box>
            </Container>
        </div>
    )
}
