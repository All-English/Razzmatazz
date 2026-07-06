import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import CricleCheck from "@razzia/web/features/game/components/icons/CricleCheck"
import CricleXmark from "@razzia/web/features/game/components/icons/CricleXmark"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import { SFX } from "@razzia/web/features/game/utils/constants"
import clsx from "clsx"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"

interface Props {
  data: CommonStatusDataMap["SHOW_RESULT"]
}

const Result = ({
  data: {
    correct,
    message,
    points,
    myPoints,
    rank,
    aheadOfMe,
    submittedChunks,
    correctChunks,
  },
}: Props) => {
  const player = usePlayerStore()
  const { t } = useTranslation()

  // rank === 0 signals practice mode — no leaderboard context applies
  const isPracticeMode = rank === 0

  const rankKeyMap: Record<number, string> = {
    1: "game:rank.1",
    2: "game:rank.2",
    3: "game:rank.3",
  }
  const rankKey = rankKeyMap[rank] ?? "game:rank.other"

  const [sfxResults] = useSound(SFX.RESULTS_SOUND, {
    volume: 0.2,
  })

  const feedbackMessage = useMemo<string>(() => {
    const list = t(correct ? "game:correctMessages" : "game:wrongMessages", {
      returnObjects: true,
    }) as unknown as string[]
    if (Array.isArray(list) && list.length > 0) {
      const idx = Math.floor(Math.random() * list.length)
      return list[idx]
    }
    return t(message)
  }, [correct, message, t])

  useEffect(() => {
    player.updatePoints(myPoints)

    if (!correct && typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200)
    }
    // oxlint-disable-next-line
  }, [myPoints, correct, isPracticeMode])

  return (
    <section className="anim-show relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
      {correct ? (
        <CricleCheck className="aspect-square max-h-60 w-full text-emerald-400" />
      ) : (
        <CricleXmark className="aspect-square max-h-60 w-full text-red-500" />
      )}
      <h2 className="mt-1 text-4xl font-bold text-white drop-shadow-lg">
        {feedbackMessage}
      </h2>

      {/* Submitted Chunks Feedback */}
      {submittedChunks && submittedChunks.length > 0 && (
        <div className="mt-8 mb-4 flex max-w-3xl flex-wrap justify-center gap-2 px-4">
          {submittedChunks.map((chunk, i) => {
            const isWrong = chunk !== correctChunks[i]
            return (
              <div
                key={i}
                className={clsx(
                  "rounded-xl border-b-4 border-black/20 px-5 py-3 text-xl font-bold text-white shadow-xl transition-all",
                  isWrong ? "bg-red-500" : "bg-emerald-500",
                )}
              >
                {chunk}
              </div>
            )
          })}
        </div>
      )}

      {!isPracticeMode && (
        <p className="mt-1 text-xl font-bold text-white drop-shadow-lg">
          {t("game:resultTop")}
          {t(rankKey, { rank })}
          {aheadOfMe ? `${t("game:resultBehind")}${aheadOfMe}` : ""}
        </p>
      )}
      {correct && (
        <span className="mt-2 animate-bounce rounded-lg bg-black/40 px-4 py-2 text-2xl font-bold text-white drop-shadow-lg">
          +{points}
        </span>
      )}
    </section>
  )
}

export default Result
