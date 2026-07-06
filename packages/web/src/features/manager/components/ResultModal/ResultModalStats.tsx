import { useResultModal } from "@razzia/web/features/manager/contexts/result-modal-context"
import { Users } from "lucide-react"
import { useTranslation } from "react-i18next"

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const ResultModalStats = () => {
  const { result, roundResult, correctPct, answeredCount, totalPlayers } =
    useResultModal()
  const { t } = useTranslation()

  if (result.mode === "practice") {
    const playerResults = roundResult?.playerResults ?? []
    const avgScore =
      playerResults.length > 0
        ? Math.round(
            playerResults.reduce((sum, pr) => sum + pr.score, 0) /
              playerResults.length,
          )
        : 0
    const avgTime =
      playerResults.length > 0
        ? Math.round(
            playerResults.reduce((sum, pr) => sum + pr.time, 0) /
              playerResults.length,
          )
        : 0

    return (
      <div className="flex shrink-0 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-1 items-center justify-between px-5 py-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {t("manager:result.stats.averageScore", "Average Score")}
          </p>
          <span className="text-sm font-bold text-amber-600">
            {avgScore} pts
          </span>
        </div>

        <div className="flex flex-1 items-center justify-between px-5 py-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {t("manager:result.stats.averageTime", "Average Time")}
          </p>
          <span className="text-sm font-bold text-indigo-600">
            {formatTime(avgTime)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50">
      <div className="flex flex-1 items-center justify-between px-5 py-3">
        <p className="text-xs text-gray-500">
          {t("manager:result.stats.correctAnswers")}
        </p>
        <div className="flex items-center gap-2">
          <div className="relative size-6">
            <svg className="size-6 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${94 - correctPct * 0.94 - 2} 94`}
                strokeDashoffset={`${-(correctPct * 0.94 + 1)}`}
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#22c55e"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${correctPct * 0.94} 94`}
              />
            </svg>
          </div>
          <span className="text-sm font-semibold">{correctPct}%</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-between px-5 py-3">
        <p className="text-xs text-gray-500">
          {t("manager:result.stats.playersAnswered")}
        </p>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-blue-500" />
          <span className="text-sm font-semibold">
            {answeredCount}/{totalPlayers}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ResultModalStats
