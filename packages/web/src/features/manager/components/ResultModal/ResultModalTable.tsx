import { useResultModal } from "@razzia/web/features/manager/contexts/result-modal-context"
import { Check, X } from "lucide-react"
import { useTranslation } from "react-i18next"

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

const ResultModalTable = () => {
  const { result, questionResult, roundResult, getPlayerPoints } =
    useResultModal()
  const { t } = useTranslation()

  if (result.mode === "practice") {
    return (
      <table className="w-full min-w-[380px] text-sm">
        <thead className="sticky top-0 shadow-sm">
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <th className="px-5 py-2.5">{t("manager:result.table.player")}</th>
            <th className="px-4 py-2.5">
              {t("manager:result.stats.averageTime", "Time")}
            </th>
            <th className="px-4 py-2.5 text-right">
              {t("manager:result.table.points")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {result.players.map((p, i) => {
            const playerRound = roundResult?.playerResults.find(
              (pr) => pr.playerName === p.username,
            )

            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-5 py-2.5 font-medium">{p.username}</td>
                <td className="px-4 py-2.5">
                  {playerRound ? (
                    <span className="text-xs font-medium text-gray-700">
                      {formatTime(playerRound.time)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                  {playerRound ? (
                    <span>{playerRound.score} pts</span>
                  ) : (
                    <span className="font-normal text-gray-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <table className="w-full min-w-[500px] text-sm">
      <thead className="sticky top-0 shadow-sm">
        <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
          <th className="px-5 py-2.5">{t("manager:result.table.player")}</th>
          <th className="px-4 py-2.5">{t("manager:result.table.answered")}</th>
          <th className="px-4 py-2.5">
            {t("manager:result.table.correctIncorrect")}
          </th>
          <th className="px-4 py-2.5 text-right">
            {t("manager:result.table.points")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {questionResult?.playerAnswers.map((pa, i) => {
          const cleanStr = (s: string) =>
            s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "")
          const isCorrect =
            pa.submittedSentence !== null &&
            questionResult &&
            cleanStr(pa.submittedSentence) ===
              cleanStr(questionResult.correctSentence)

          return (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-5 py-2.5 font-medium">{pa.playerName}</td>
              <td className="px-4 py-2.5">
                {pa.submittedSentence !== null ? (
                  <span
                    className="block max-w-[200px] truncate text-xs text-gray-700"
                    title={pa.submittedSentence}
                  >
                    {pa.submittedSentence}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {pa.submittedSentence === null ? (
                  <span className="text-xs text-gray-400">—</span>
                ) : isCorrect ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="size-3.5" />{" "}
                    {t("manager:result.table.correct")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500">
                    <X className="size-3.5" />{" "}
                    {t("manager:result.table.incorrect")}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-700">
                {getPlayerPoints(pa.playerName)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default ResultModalTable
