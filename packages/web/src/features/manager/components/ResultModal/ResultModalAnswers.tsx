import { MEDIA_TYPES, NO_TIME_LIMIT } from "@razzia/common/constants"
import type { QuestionMedia } from "@razzia/common/types/game"
import { useResultModal } from "@razzia/web/features/manager/contexts/result-modal-context"
import { Check, Clock, ImageOff, Music, Video, X, Trophy } from "lucide-react"
import { useTranslation } from "react-i18next"

const MediaPreview = ({ media }: { media?: QuestionMedia }) => {
  if (media?.type === MEDIA_TYPES.IMAGE) {
    return (
      <img
        src={media.url}
        alt=""
        className="h-16 w-auto rounded-md object-contain md:h-full"
      />
    )
  }

  if (media?.type === MEDIA_TYPES.VIDEO) {
    return (
      <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-200 md:h-38 md:w-full">
        <Video className="size-6 text-gray-400 md:size-10" />
      </div>
    )
  }

  if (media?.type === MEDIA_TYPES.AUDIO) {
    return (
      <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-200 md:h-38 md:w-full">
        <Music className="size-6 text-gray-400 md:size-10" />
      </div>
    )
  }

  return (
    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-200 md:h-38 md:w-full">
      <ImageOff className="size-6 text-gray-400 md:size-10" />
    </div>
  )
}

const ResultModalAnswers = () => {
  const { result, questionResult, roundResult, totalPlayers, answeredCount } =
    useResultModal()
  const { t } = useTranslation()

  if (result.mode === "practice") {
    const completedCount = roundResult?.playerResults.length ?? 0
    return (
      <div className="flex flex-col border-b border-gray-100 md:flex-row">
        <div className="flex shrink-0 flex-row items-center gap-4 border-b border-gray-100 bg-gray-50 p-4 md:w-66 md:flex-col md:justify-center md:border-r md:border-b-0">
          <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-gray-200 md:h-38 md:w-full">
            <Trophy className="size-6 text-amber-500 md:size-10" />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 overflow-hidden px-4 py-3 md:px-5 md:py-4">
          <p className="text-xl font-bold text-gray-800">
            {t("game:roundLabel", { round: roundResult?.round ?? 1 })}
          </p>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>
              {t("manager:result.playerCount", { count: completedCount })}{" "}
              {t("manager:result.paginationOf")} {totalPlayers}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (!questionResult) {
    return null
  }

  const noAnswerCount = totalPlayers - answeredCount

  const cleanStr = (s: string) =>
    s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "")
  const correctCount = questionResult
    ? questionResult.playerAnswers.filter(
        (pa) =>
          pa.submittedSentence !== null &&
          cleanStr(pa.submittedSentence) ===
            cleanStr(questionResult.correctSentence),
      ).length
    : 0

  const incorrectCount = answeredCount - correctCount

  return (
    <div className="flex flex-col border-b border-gray-100 md:flex-row">
      <div className="flex shrink-0 flex-row items-center gap-4 border-b border-gray-100 bg-gray-50 p-4 md:w-66 md:flex-col md:justify-center md:border-r md:border-b-0">
        <MediaPreview media={questionResult?.media} />
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="size-3.5" />
          <span>
            {questionResult.time === NO_TIME_LIMIT
              ? "∞"
              : `${questionResult.time}${t("manager:result.timeLimitSuffix")}`}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 md:px-5 md:py-4">
        {/* Prompt */}
        <p className="text-md font-semibold text-gray-800">
          {questionResult.prompt}
        </p>

        {/* Correct Sentence */}
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <p className="text-sm font-bold text-emerald-700">
            ✅ {questionResult.correctSentence}
          </p>
        </div>

        {/* Scrambled Chunks */}
        <div className="flex flex-wrap gap-1">
          {questionResult.scrambledChunks.map((chunk, i) => (
            <span
              key={i}
              className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600"
            >
              {chunk}
            </span>
          ))}
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <Check className="size-3.5" />
            {correctCount} {t("manager:result.table.correct")}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <X className="size-3.5" />
            {incorrectCount} {t("manager:result.table.incorrect")}
          </span>
          {noAnswerCount > 0 && (
            <span className="text-gray-400">
              {noAnswerCount} {t("manager:result.noAnswer")}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResultModalAnswers
