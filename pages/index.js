import {Alert, Box, Chip, CircularProgress, Container, Divider, LinearProgress, Typography} from "@mui/material";
import _ from "lodash";
import Segment from "../src/Segment";
import {useState} from "react";

export default function Home() {
    const [yearToDistance, setYearToDistance] = useState({})

    const recordYearlyDistance = (year, yearlyDistance) => {
        setYearToDistance(_.merge(
            yearToDistance,
            {[year]: yearlyDistance},
        ))
    }

    const distance = _.sum(_.values(yearToDistance))

    let years = [];
    for (let i = 0; i < 32; i++) {
        years.push(2017 + i)
    }
    return (
        <Container>
            <Typography variant="h2">
                {`赤道计划`}
            </Typography>
            <Alert severity="info" sx={{my: 1}}>数据录入中</Alert>

            <Typography variant="h5" sx={{mb: 3}}>
                ❝ 我是郑鹤，我能在一生结束前，跑过与赤道等长的距离吗？❞
            </Typography>
            <LinearProgress
                variant="determinate"
                value={distance/400075.02 * 100} />
            <Box sx={{mt: 1, display: "flex", flexDirection: "row-reverse"}}>
                <Chip icon={<span style={{fontSize: 25}}>🏃</span>}
                      label={`${distance}/40075.02km ${(distance/40075.02 * 100).toFixed(2)}%`} />
            </Box>

            {
                _.map(years, year => (
                    <Segment
                        year={year}
                        key={year}
                        recordYearlyDistance={recordYearlyDistance}
                    />
                ))
            }
        </Container>
    )
}
