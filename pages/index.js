import {Alert, Box, Chip, Container, LinearProgress, Typography} from "@mui/material";
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
    for (let i = 0; i < 32; i++) {
        years.push(2017 + i)
    }

    const translation = {pl: `${progress - 8}%`}

    return (
        <div>
            <Head>
                <title>{`郑鹤的赤道计划 - ${progress.toFixed(2)}%`}</title>
            </Head>
            <Container>
                <Image src="/equator-square.jpg" width={0} height={0} className="image-no-display"/>
                <Typography variant="h2">
                    {`赤道计划`}
                </Typography>
                <Alert severity="info" sx={{my: 1}}>数据录入中</Alert>

                <Typography variant="h5" sx={{mb: 3}}>
                    ❝ 我是郑鹤，我能在一生结束前，跑过与赤道等长的距离吗？❞
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
                    <Typography variant="body2" sx={{fontSize: 10}}>{`${distance}/40075.02 km`}</Typography>
                </Box>

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
            </Container>
        </div>
    )
}
