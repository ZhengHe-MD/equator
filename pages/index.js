import {Box, Container, LinearProgress, Typography} from "@mui/material"
import Head from "next/head"
import Image from "next/image"
import {useEffect, useRef} from "react"
import Segment from "../src/Segment"
import {planConfig} from "../src/lib/planConfig"
import {buildProjection, parseUtcDate} from "../src/lib/projection"

function formatKm(value, digits = 1) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseUtcDate(value))
}

function formatYearOnly(value) {
  return String(parseUtcDate(value).getUTCFullYear())
}

export default function Home({viewModel}) {
  const {summary, milestones, years} = viewModel
  const asOfYear = parseUtcDate(summary.asOfDate).getUTCFullYear()
  const carouselRef = useRef(null)
  const runnerPosition = {
    left: `clamp(28px, calc(${summary.completedPct}% - 52px), calc(100% - 116px))`,
  }

  useEffect(() => {
    const container = carouselRef.current

    if (!container) {
      return
    }

    const currentIndex = years.findIndex(year => year.year === asOfYear)

    if (currentIndex < 0) {
      return
    }

    const target = container.children[currentIndex]

    if (target instanceof HTMLElement) {
      const centeredLeft = target.offsetLeft - (container.clientWidth - target.clientWidth) / 2

      container.scrollTo({
        left: Math.max(centeredLeft, 0),
        behavior: "smooth",
      })
    }
  }, [asOfYear, years])

  return (
    <>
      <Head>
        <title>{`${planConfig.title} - 已完成 ${summary.completedPct.toFixed(2)}%`}</title>
      </Head>

      <Container maxWidth="lg" sx={{py: {xs: 3, md: 5}}}>
        <Box sx={{display: "grid", gap: 3}}>
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 7,
              p: {xs: 3, md: 4},
              background:
                "radial-gradient(circle at top left, rgba(31, 111, 90, 0.16), transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.98), rgba(242, 247, 244, 0.96))",
              border: "1px solid rgba(33, 57, 45, 0.1)",
              boxShadow: "0 30px 80px rgba(20, 34, 28, 0.12)",
            }}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: {xs: "2.2rem", md: "3.2rem"},
                letterSpacing: "-0.04em",
              }}
            >
              郑鹤的赤道计划
            </Typography>

            <Box sx={{mt: 4}}>
              <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap"}}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    fontSize: {xs: "1.45rem", sm: "2.125rem"},
                    lineHeight: 1.15,
                  }}
                >
                  {formatKm(summary.completedKm, 2)} / {formatKm(summary.goalKm, 2)} km
                </Typography>
                <Typography variant="body2" sx={{color: "var(--muted)"}}>
                  剩余 {formatKm(summary.remainingKm, 2)} km
                </Typography>
              </Box>
              <Box sx={{position: "relative", height: 36, mt: 1.4}}>
                <Box
                  sx={{
                    position: "absolute",
                    ...runnerPosition,
                    display: "flex",
                    alignItems: "center",
                    gap: {xs: 0.35, sm: 0.75},
                    transform: {xs: "translateX(-50%) scale(0.74)", sm: "translateX(-50%)"},
                    transformOrigin: "center center",
                  }}
                >
                  <RunnerBadge src="/running-girl.gif" width={24} height={24} alt="女儿 1" />
                  <RunnerBadge src="/running-girl.gif" width={24} height={24} alt="女儿 2" />
                  <RunnerBadge src="/running.gif" width={32} height={32} alt="郑鹤" />
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    right: 0,
                    top: "50%",
                    transform: "translate(-10%, -50%)",
                    fontSize: {xs: 20, md: 24},
                    lineHeight: 1,
                  }}
                  aria-label="终点"
                >
                  🏁
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={summary.completedPct}
                sx={{
                  mt: 1.75,
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: "rgba(33, 57, 45, 0.08)",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    background: "linear-gradient(90deg, #1f6f5a 0%, #56a488 100%)",
                  },
                }}
              />
              <Box sx={{position: "relative", height: 54, mt: 0.9}}>
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: "translateX(0)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    width: 84,
                  }}
                >
                  <Box
                    sx={{
                      width: 2,
                      height: 12,
                      borderRadius: 999,
                      backgroundColor: "rgba(31, 111, 90, 0.42)",
                    }}
                  />
                  <Typography variant="caption" sx={{mt: 0.6, color: "var(--text)", fontWeight: 700}}>
                    起点
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.2,
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Box component="span" sx={{display: {xs: "inline", sm: "none"}}}>
                      {formatYearOnly(summary.firstActivityDate)}
                    </Box>
                    <Box component="span" sx={{display: {xs: "none", sm: "inline"}}}>
                      {formatLongDate(summary.firstActivityDate)}
                    </Box>
                  </Typography>
                </Box>
                {milestones.map(milestone => (
                  <Box
                    key={milestone.label}
                    sx={{
                      position: "absolute",
                      left: `calc(${milestone.progress * 100}% - 1px)`,
                      top: 0,
                      transform: milestone.progress === 1 ? "translateX(-100%)" : "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      width: {xs: 34, sm: milestone.progress === 1 ? 72 : 84},
                    }}
                  >
                    <Box
                      sx={{
                        width: 2,
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: "rgba(198, 123, 49, 0.55)",
                      }}
                    />
                    <Typography variant="caption" sx={{mt: 0.6, color: "var(--text)", fontWeight: 700}}>
                      {milestone.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.2,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        transform: milestone.progress === 1 ? "translateX(-8px)" : "none",
                      }}
                    >
                      <Box component="span" sx={{display: {xs: "inline", sm: "none"}}}>
                        {formatYearOnly(milestone.date)}
                      </Box>
                      <Box component="span" sx={{display: {xs: "none", sm: "inline"}}}>
                        {formatLongDate(milestone.date)}
                      </Box>
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box sx={{display: "flex", justifyContent: "space-between", mt: 1.2, gap: 2, flexWrap: "wrap"}}>
                <Typography variant="body2" sx={{color: "var(--muted)"}}>
                  已完成 {summary.completedPct.toFixed(2)}%
                </Typography>
                <Typography variant="body2" sx={{color: "var(--muted)"}}>
                  最近一次同步跑步：{formatLongDate(summary.lastActivityDate)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{display: "grid", gap: 2}}>
            <Box
              ref={carouselRef}
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollBehavior: "smooth",
                perspective: "1600px",
                scrollPaddingInline: {xs: "10px", md: "24px"},
                pb: 1,
                px: {xs: 0.5, md: 0},
                WebkitOverflowScrolling: "touch",
                "&::-webkit-scrollbar": {
                  height: 8,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "rgba(33, 57, 45, 0.06)",
                  borderRadius: 999,
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "rgba(33, 57, 45, 0.18)",
                  borderRadius: 999,
                },
              }}
            >
              {years.map(year => (
                <Box
                  key={year.year}
                  sx={{
                    minWidth: {xs: "96%", md: "93%"},
                    flex: {xs: "0 0 96%", md: "0 0 93%"},
                    scrollSnapAlign: "center",
                    px: {xs: 0.25, md: 0.75},
                    py: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      transform:
                        year.year === asOfYear
                          ? "perspective(1600px) rotateY(0deg) translateY(0)"
                          : "perspective(1600px) rotateY(-2.5deg) translateY(2px)",
                      transformOrigin: "center center",
                      transition: "transform 220ms ease, filter 220ms ease",
                      filter:
                        year.year === asOfYear
                          ? "drop-shadow(0 24px 40px rgba(20, 34, 28, 0.14))"
                          : "drop-shadow(0 18px 30px rgba(20, 34, 28, 0.1))",
                      "&:hover": {
                        transform: "perspective(1600px) rotateY(0deg) translateY(-2px)",
                        filter: "drop-shadow(0 28px 44px rgba(20, 34, 28, 0.16))",
                      },
                    }}
                  >
                    <Segment year={year} asOfYear={asOfYear} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

        </Box>
      </Container>
    </>
  )
}

function RunnerBadge({src, width, height, alt}) {
  return (
    <Box
      sx={{
        width: width + 8,
        height: height + 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.68)",
        boxShadow: "inset 0 0 0 1px rgba(33, 57, 45, 0.05)",
        overflow: "hidden",
      }}
    >
      <Image
        src={src}
        width={width}
        height={height}
        alt={alt}
        unoptimized
        style={{mixBlendMode: "multiply"}}
      />
    </Box>
  )
}

export async function getStaticProps() {
  const fs = require("fs/promises")
  const path = require("path")
  const dataPath = path.join(process.cwd(), "public", "data.json")
  const raw = await fs.readFile(dataPath, "utf8")
  const records = JSON.parse(raw)
  const generatedAt = new Date().toISOString()
  const viewModel = buildProjection({
    records,
    config: planConfig,
    asOfDate: generatedAt.slice(0, 10),
  })

  return {
    props: {
      viewModel,
    },
  }
}
