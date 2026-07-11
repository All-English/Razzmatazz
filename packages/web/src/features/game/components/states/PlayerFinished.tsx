import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import { useTranslation } from "react-i18next"
import Button from "@razzia/web/components/Button"
import { socketClient } from "@razzia/web/features/game/contexts/socket-context"
import { EVENTS } from "@razzia/common/constants"
import { useEffect, useRef } from "react"
import { Star } from "lucide-react"
import clsx from "clsx"

interface Props {
  data: CommonStatusDataMap["FINISHED"]
}

const PlayerFinished = ({ data: { rank, subject, practiceTime } }: Props) => {
  const {
    player,
    gameId,
    bestPracticeTime,
    setBestPracticeTime,
    bestPracticeScore,
    setBestPracticeScore,
    practiceHistory,
    addPracticeRun,
  } = usePlayerStore()
  const { t } = useTranslation()

  // rank === 0 signals practice mode — no leaderboard applies
  const isPracticeMode = rank === 0

  const hasLogged = useRef(false)

  useEffect(() => {
    if (
      isPracticeMode &&
      typeof practiceTime === "number" &&
      !hasLogged.current
    ) {
      hasLogged.current = true

      // Update best time
      if (bestPracticeTime === null || practiceTime < bestPracticeTime) {
        setBestPracticeTime(practiceTime)
      }

      // Update best score
      const currentScore = player?.points ?? 0
      if (bestPracticeScore === null || currentScore > bestPracticeScore) {
        setBestPracticeScore(currentScore)
      }

      // Record history if this round hasn't been added yet
      const roundNum = player?.practiceRound ?? 1
      const alreadyAdded = practiceHistory.some((h) => h.round === roundNum)
      if (!alreadyAdded) {
        addPracticeRun({
          round: roundNum,
          score: currentScore,
          time: practiceTime,
        })
      }
    }
  }, [
    isPracticeMode,
    practiceTime,
    bestPracticeTime,
    setBestPracticeTime,
    bestPracticeScore,
    setBestPracticeScore,
    player?.points,
    player?.practiceRound,
    practiceHistory,
    addPracticeRun,
  ])

  const handleRestart = () => {
    if (gameId) {
      socketClient.emit(EVENTS.PLAYER.PRACTICE_RESTART, { gameId })
    }
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  // Find the personal best run from history (highest score, break ties with lowest time)
  const personalBestRun = practiceHistory.reduce<{
    round: number
    score: number
    time: number
  } | null>((best, current) => {
    if (!best) return current
    if (current.score > best.score) return current
    if (current.score === best.score && current.time < best.time) return current
    return best
  }, null)

  const rankKeyMap: Record<number, string> = {
    1: "game:rank.1",
    2: "game:rank.2",
    3: "game:rank.3",
  }
  const rankKey =
    typeof rank === "number" && !isPracticeMode
      ? (rankKeyMap[rank] ?? "game:rank.other")
      : null

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
      <p className="text-center text-4xl font-bold text-white drop-shadow-lg md:text-5xl">
        {subject}
      </p>

      {isPracticeMode ? (
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="text-center">
            <span className="animate-pulse text-5xl">🎉</span>
            <h1 className="mt-2 text-3xl font-black text-white drop-shadow-lg md:text-4xl">
              {t("game:practiceCompleteHeader")}
            </h1>
            <p className="mt-1.5 text-xl font-bold text-white/90 drop-shadow-md md:text-2xl">
              {t("game:practiceCompleteSub")}
            </p>
          </div>

          {/* History Comparison Table */}
          {practiceHistory.length > 0 && (
            <div className="w-full rounded-2xl border border-white/10 bg-black/50 p-4 shadow-2xl backdrop-blur-md">
              {/* Table Headers */}
              <div className="mb-2 grid grid-cols-[1fr_75px_75px_90px] items-center gap-3 border-b border-white/10 px-4 pb-2 text-xs font-semibold tracking-wider text-white/40 uppercase sm:grid-cols-[1fr_80px_80px_100px]">
                <span>{t("game:history.round", "Round")}</span>
                <span></span>
                <span className="text-right">
                  {t("game:history.time", "Time")}
                </span>
                <span className="text-right">
                  {t("game:history.score", "Score")}
                </span>
              </div>
              <div className="flex max-h-80 scrollbar-thin scrollbar-thumb-white/10 flex-col gap-2 overflow-y-auto pr-1">
                {practiceHistory.map((run) => {
                  const isBest =
                    personalBestRun && personalBestRun.round === run.round
                  return (
                    <div
                      key={run.round}
                      className={clsx(
                        "grid grid-cols-[1fr_75px_75px_90px] items-center gap-3 rounded-xl border px-4 py-3 text-lg transition-all duration-300 sm:grid-cols-[1fr_80px_80px_100px]",
                        isBest
                          ? "border-amber-400/40 bg-amber-500/10 font-semibold text-amber-200 shadow-lg shadow-amber-500/5"
                          : "border-white/5 bg-white/5 text-white/80 hover:bg-white/10",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="truncate">
                          {t("game:roundLabel", { round: run.round })}
                        </span>
                      </div>
                      <div className="flex justify-center">
                        {isBest && practiceHistory.length > 1 && (
                          <span className="flex items-center gap-0.5 rounded bg-amber-400 px-2 py-0.5 text-xs font-black tracking-wider text-black uppercase shadow-sm">
                            <Star className="h-3 w-3 fill-black" />{" "}
                            {t("game:personalBestBadge")}
                          </span>
                        )}
                      </div>
                      <span className="text-right">{formatTime(run.time)}</span>
                      <span className="text-right font-mono">
                        {run.score} pts
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <Button
            onClick={handleRestart}
            className="w-full rounded-xl border-b-4 border-gray-300 bg-white px-10 py-3.5 text-xl font-extrabold text-black shadow-2xl transition-all hover:bg-gray-200 active:mt-1 active:border-b-0 sm:w-auto"
          >
            {t("game:startRoundN", { round: (player?.practiceRound ?? 1) + 1 })}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
            {rankKey !== null ? t(rankKey, { rank }) : "—"}
          </p>
          <p className="mt-2 rounded bg-black/40 px-6 py-2 text-2xl font-bold text-white">
            {player?.points ?? 0} pts
          </p>
          <p className="mt-6 animate-pulse text-base font-semibold text-white/60">
            {t("game:waitingForHost")}
          </p>
        </>
      )}
    </div>
  )
}

export default PlayerFinished
