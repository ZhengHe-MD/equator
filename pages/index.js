import ShareRoundedIcon from "@mui/icons-material/ShareRounded"
import {Box, Button, Container, LinearProgress, Typography} from "@mui/material"
import dynamic from "next/dynamic"
import Head from "next/head"
import {useEffect, useRef, useState} from "react"
import Segment from "../src/Segment"
import {planConfig} from "../src/lib/planConfig"
import {buildProjection, parseUtcDate} from "../src/lib/projection"

const ReactTooltip = dynamic(() => import("react-tooltip"), {
  ssr: false,
})

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
  const sharePosterRef = useRef(null)
  const shareResetRef = useRef(null)
  const [showPosterPreview, setShowPosterPreview] = useState(false)
  const [shareState, setShareState] = useState({
    loading: false,
    message: "",
    tone: "neutral",
  })
  const runnerPosition = {
    left: `clamp(28px, calc(${summary.completedPct}% - 52px), calc(100% - 116px))`,
  }
  const featuredYear = years.find(year => year.year === asOfYear) || years[years.length - 1] || null

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

  useEffect(() => () => {
    if (shareResetRef.current) {
      window.clearTimeout(shareResetRef.current)
    }
  }, [])

  useEffect(() => {
    const syncPosterPreview = () => {
      const wantsPosterPreview = new URLSearchParams(window.location.search).get("poster") === "1"
      const canRenderPosterPreview = window.matchMedia("(min-width: 768px)").matches

      setShowPosterPreview(wantsPosterPreview && canRenderPosterPreview)
    }

    syncPosterPreview()
    window.addEventListener("resize", syncPosterPreview)

    return () => {
      window.removeEventListener("resize", syncPosterPreview)
    }
  }, [])

  async function handleShareScreenshot() {
    if (shareState.loading) {
      return
    }

    try {
      setShareState({
        loading: true,
        message: "",
        tone: "neutral",
      })

      const target = sharePosterRef.current

      if (!target) {
        throw new Error("share-poster-not-found")
      }

      await waitForImages(target)

      const {default: html2canvas} = await import("html2canvas")
      const captureWidth = target.scrollWidth
      const captureHeight = target.scrollHeight
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: element => element.dataset?.screenshotIgnore === "true",
      })
      const blob = await canvasToBlob(canvas)

      if (!blob) {
        throw new Error("canvas-to-blob-failed")
      }

      const fileName = `${planConfig.title}-${summary.asOfDate}.png`
      const file = typeof File === "function" ? new File([blob], fileName, {type: "image/png"}) : null

      if (file && navigator.share && navigator.canShare?.({files: [file]})) {
        try {
          await navigator.share({
            files: [file],
            title: planConfig.title,
            text: `${planConfig.title} 截至 ${summary.asOfDate} 的页面截图`,
          })
          setShareState({
            loading: false,
            message: "分享已完成",
            tone: "success",
          })
          return
        } catch (error) {
          if (error?.name === "AbortError") {
            setShareState({
              loading: false,
              message: "已取消分享",
              tone: "neutral",
            })
            return
          }
        }
      }

      downloadBlob(blob, fileName)
      setShareState({
        loading: false,
        message: "截图已下载",
        tone: "success",
      })
    } catch (error) {
      console.error("Failed to share screenshot", error)

      setShareState({
        loading: false,
        message: "生成截图失败，请重试",
        tone: "error",
      })
    } finally {
      if (shareResetRef.current) {
        window.clearTimeout(shareResetRef.current)
      }

      shareResetRef.current = window.setTimeout(() => {
        setShareState(current => ({
          ...current,
          message: "",
          tone: "neutral",
        }))
      }, 3200)
    }
  }

  return (
    <>
      <Head>
        <title>{`${planConfig.title} - 已完成 ${summary.completedPct.toFixed(2)}%`}</title>
      </Head>

      {showPosterPreview ? (
        <Box sx={{display: "flex", justifyContent: "center", px: 5, py: 5}}>
          <SharePoster
            summary={summary}
            milestones={milestones}
            runnerPosition={runnerPosition}
            featuredYear={featuredYear}
            asOfYear={asOfYear}
            preview
          />
        </Box>
      ) : null}

      <Container maxWidth="lg" sx={{py: {xs: 3, md: 5}, display: showPosterPreview ? "none" : "block"}}>
        <Box sx={{display: "grid", gap: 3}}>
          <HeroSummaryCard
            summary={summary}
            milestones={milestones}
            runnerPosition={runnerPosition}
            title={planConfig.title}
            actionSlot={
              <Box
                data-screenshot-ignore="true"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: {xs: "flex-start", sm: "flex-end"},
                  gap: 0.8,
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  disableElevation
                  onClick={handleShareScreenshot}
                  disabled={shareState.loading}
                  startIcon={<ShareRoundedIcon fontSize="small" />}
                  sx={{
                    borderRadius: 999,
                    px: 1.8,
                    py: 0.9,
                    minWidth: 0,
                    background: "linear-gradient(135deg, #1f6f5a 0%, #2d8b70 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    "&:hover": {
                      background: "linear-gradient(135deg, #195947 0%, #26745f 100%)",
                    },
                    "&.Mui-disabled": {
                      color: "rgba(255,255,255,0.82)",
                      background: "rgba(31, 111, 90, 0.58)",
                    },
                  }}
                >
                  {shareState.loading ? "生成中..." : "分享截图"}
                </Button>
                <Typography
                  variant="caption"
                  sx={{
                    minHeight: 18,
                    color:
                      shareState.tone === "error"
                        ? "#b42318"
                        : shareState.tone === "success"
                          ? "#1f6f5a"
                          : "var(--muted)",
                  }}
                >
                  {shareState.message}
                </Typography>
              </Box>
            }
          />

          <Box sx={{display: "grid", gap: 2}}>
            <Box
              ref={carouselRef}
              sx={{
                display: "flex",
                gap: {xs: 1, sm: 2},
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                scrollBehavior: "smooth",
                perspective: "1600px",
                scrollPaddingInline: {xs: 0, sm: "10px", md: "24px"},
                pb: 1,
                px: {xs: 0, md: 0},
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
                    minWidth: {xs: "100%", sm: "96%", md: "93%"},
                    flex: {xs: "0 0 100%", sm: "0 0 96%", md: "0 0 93%"},
                    scrollSnapAlign: {xs: "start", sm: "center"},
                    px: {xs: 0, md: 0.75},
                    py: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      transform: {
                        xs: "none",
                        sm:
                          year.year === asOfYear
                            ? "perspective(1600px) rotateY(0deg) translateY(0)"
                            : "perspective(1600px) rotateY(-2.5deg) translateY(2px)",
                      },
                      transformOrigin: "center center",
                      transition: "transform 220ms ease, filter 220ms ease",
                      filter: {
                        xs: "drop-shadow(0 16px 24px rgba(20, 34, 28, 0.12))",
                        sm:
                          year.year === asOfYear
                            ? "drop-shadow(0 24px 40px rgba(20, 34, 28, 0.14))"
                            : "drop-shadow(0 18px 30px rgba(20, 34, 28, 0.1))",
                      },
                      "&:hover": {
                        transform: {sm: "perspective(1600px) rotateY(0deg) translateY(-2px)"},
                        filter: {sm: "drop-shadow(0 28px 44px rgba(20, 34, 28, 0.16))"},
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
        <ReactTooltip multiline />
      </Container>
      <SharePoster
        posterRef={sharePosterRef}
        summary={summary}
        milestones={milestones}
        runnerPosition={runnerPosition}
        featuredYear={featuredYear}
        asOfYear={asOfYear}
        hidden
      />
    </>
  )
}

function HeroSummaryCard({summary, milestones, runnerPosition, title, actionSlot, sx}) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 7,
        p: {xs: 2.5, sm: 3, md: 4},
        background:
          "radial-gradient(circle at top left, rgba(31, 111, 90, 0.16), transparent 42%), linear-gradient(135deg, rgba(255,255,255,0.98), rgba(242, 247, 244, 0.96))",
        border: "1px solid rgba(33, 57, 45, 0.1)",
        boxShadow: "0 30px 80px rgba(20, 34, 28, 0.12)",
        ...sx,
      }}
    >
      <Box sx={{display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start", flexWrap: "wrap"}}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: 800,
            fontSize: {xs: "2rem", sm: "2.2rem", md: "3.2rem"},
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            pr: {sm: 2},
            "@media (max-width:359.95px)": {
              fontSize: "1.8rem",
            },
          }}
        >
          {title}
        </Typography>

        {actionSlot || null}
      </Box>

      <Box sx={{mt: 4}}>
        <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, flexWrap: "wrap"}}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: {xs: "1.3rem", sm: "2.125rem"},
              lineHeight: 1.15,
              maxWidth: {xs: "100%", sm: "none"},
              "@media (max-width:359.95px)": {
                fontSize: "1.05rem",
              },
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
              gap: {xs: 0.25, sm: 0.75},
              transform: {xs: "translateX(-50%) scale(0.74)", sm: "translateX(-50%)"},
              transformOrigin: "center center",
              "@media (max-width:359.95px)": {
                gap: 0.15,
                transform: "translateX(-50%) scale(0.66)",
              },
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
              transform: {xs: "translate(0, -50%)", sm: "translate(-10%, -50%)"},
              fontSize: {xs: 18, md: 24},
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
        <Box sx={{position: "relative", height: {xs: 58, sm: 54}, mt: 0.9}}>
          <Box
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: "translateX(0)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              width: {xs: 56, sm: 84},
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
            <Typography
              variant="caption"
              sx={{mt: 0.6, color: "var(--text)", fontWeight: 700, fontSize: {xs: 11, sm: 12}}}
            >
              起点
            </Typography>
            <Typography
              variant="caption"
              sx={{
                mt: 0.2,
                color: "var(--muted)",
                whiteSpace: "nowrap",
                fontSize: {xs: 11, sm: 12},
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
              key={milestone[0]}
              sx={{
                position: "absolute",
                left: `calc(${milestone[1] * 100}% - 1px)`,
                top: 0,
                transform: milestone[1] === 1 ? "translateX(-100%)" : "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: {xs: milestone[1] === 1 ? 38 : 30, sm: milestone[1] === 1 ? 72 : 84},
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
              <Typography
                variant="caption"
                sx={{mt: 0.6, color: "var(--text)", fontWeight: 700, fontSize: {xs: 11, sm: 12}}}
              >
                {milestone[0]}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.2,
                  color: "var(--muted)",
                  whiteSpace: "nowrap",
                  transform: milestone[1] === 1 ? "translateX(-8px)" : "none",
                  fontSize: {xs: 11, sm: 12},
                }}
              >
                <Box component="span" sx={{display: {xs: "inline", sm: "none"}}}>
                  {formatYearOnly(milestone[2])}
                </Box>
                <Box component="span" sx={{display: {xs: "none", sm: "inline"}}}>
                  {formatLongDate(milestone[2])}
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
  )
}

function SharePoster({posterRef, summary, milestones, runnerPosition, featuredYear, asOfYear, hidden = false, preview = false}) {
  return (
    <Box
      aria-hidden={hidden ? "true" : undefined}
      sx={{
        position: hidden ? "fixed" : "relative",
        left: hidden ? "-10000px" : "auto",
        top: hidden ? 0 : "auto",
        width: 1080,
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <Box
        ref={posterRef}
        sx={{
          width: 1080,
          px: 5,
          py: 5,
          display: "grid",
          gap: 4,
          borderRadius: preview ? 7 : 0,
          boxShadow: preview ? "0 30px 80px rgba(20, 34, 28, 0.14)" : "none",
          background:
            "radial-gradient(circle at top left, rgba(31, 111, 90, 0.14), transparent 30%), linear-gradient(180deg, #f7f6ef 0%, #eef3ef 46%, #f7faf8 100%)",
        }}
      >
        <HeroSummaryCard
          summary={summary}
          milestones={milestones}
          runnerPosition={runnerPosition}
          title={planConfig.title}
          actionSlot={
            <Box
              sx={{
                px: 2,
                py: 1.2,
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.82)",
                border: "1px solid rgba(33, 57, 45, 0.08)",
              }}
            >
              <Typography variant="body2" sx={{color: "var(--muted)", fontWeight: 700}}>
                截至 {formatLongDate(summary.asOfDate)}
              </Typography>
            </Box>
          }
          sx={{
            p: 4.5,
          }}
        />
        {featuredYear ? <Segment year={featuredYear} asOfYear={asOfYear} /> : null}
      </Box>
    </Box>
  )
}

function RunnerBadge({src, width, height, alt}) {
  return (
    <Box
      sx={{
        width: width + 8,
        height: height + 8,
        display: "grid",
        placeItems: "center",
        padding: "4px",
        borderRadius: "50%",
        backgroundColor: "rgba(255,255,255,0.68)",
        boxShadow: "inset 0 0 0 1px rgba(33, 57, 45, 0.05)",
      }}
    >
      <Box
        component="img"
        src={src}
        alt={alt}
        className="runner-image"
        width={width}
        height={height}
        sx={{
          display: "block",
          width,
          height,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    </Box>
  )
}

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll("img"))

  await Promise.all(
    images.map(image => {
      if (image.complete) {
        return image.decode?.().catch(() => undefined)
      }

      return new Promise(resolve => {
        image.addEventListener("load", resolve, {once: true})
        image.addEventListener("error", resolve, {once: true})
      })
    })
  )
}

function canvasToBlob(canvas) {
  return new Promise(resolve => {
    canvas.toBlob(resolve, "image/png")
  })
}

function downloadBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = objectUrl
  link.download = fileName
  link.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 0)
}

export async function getStaticProps() {
  const fs = require("fs/promises")
  const path = require("path")
  const dataPath = path.join(process.cwd(), "public", "data.json")
  const raw = await fs.readFile(dataPath, "utf8")
  const records = JSON.parse(raw)
  const generatedAt = new Date().toISOString()
  const rawViewModel = buildProjection({
    records,
    config: planConfig,
    asOfDate: generatedAt.slice(0, 10),
  })
  const viewModel = {
    summary: {
      goalKm: rawViewModel.summary.goalKm,
      completedKm: rawViewModel.summary.completedKm,
      completedPct: rawViewModel.summary.completedPct,
      remainingKm: rawViewModel.summary.remainingKm,
      firstActivityDate: rawViewModel.summary.firstActivityDate,
      lastActivityDate: rawViewModel.summary.lastActivityDate,
      asOfDate: rawViewModel.summary.asOfDate,
    },
    milestones: rawViewModel.milestones.map(({label, progress, date}) => [label, progress, date]),
    years: rawViewModel.years.map(year => ({
      year: year.year,
      actualKm: year.actualKm,
      activities: year.activities.map(activity => [
        activity.date,
        activity.distance,
        (activity.duration.hours || 0) * 3600 + (activity.duration.mins || 0) * 60 + (activity.duration.secs || 0),
      ]),
      months: year.months.map(month => month.actualKm),
    })),
  }

  return {
    props: {
      viewModel,
    },
  }
}
