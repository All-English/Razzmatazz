import { MEDIA_TYPES } from "@razzia/common/constants"
import type { QuestionMedia } from "@razzia/common/types/game"
import AlertDialog from "@razzia/web/components/AlertDialog"
import { type QuestionWithId } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import { isDerivationSuccessful } from "@razzia/web/features/quizz/utils/chunks"
import clsx from "clsx"
import { AlertTriangle, Music, Trash2, Video } from "lucide-react"
import { useTranslation } from "react-i18next"
import { twMerge } from "tailwind-merge"

const CHUNK_MINI_COLORS = [
  "bg-[#E69F00]",
  "bg-[#56B4E9]",
  "bg-[#3DBFA0]",
  "bg-[#CC79A7]",
]

const SlideMedia = ({ media }: { media?: QuestionMedia }) => {
  if (media?.type === MEDIA_TYPES.IMAGE) {
    return (
      <img src={media.url} className="mx-auto max-h-14 w-auto rounded-md" />
    )
  }

  if (media?.type === MEDIA_TYPES.VIDEO) {
    return <Video className="mx-auto size-10 text-gray-400" />
  }

  if (media?.type === MEDIA_TYPES.AUDIO) {
    return <Music className="mx-auto size-10 text-gray-400" />
  }

  return null
}

interface Props {
  question: QuestionWithId
  index: number
  isActive: boolean
  canDelete: boolean
  onClick: () => void
  onDelete: () => void
}

const QuizzEditorCard = ({
  question,
  index,
  isActive,
  canDelete,
  onClick,
  onDelete,
}: Props) => {
  const { t } = useTranslation()
  const isMismatched =
    question.correctSentence.trim() !== "" &&
    !isDerivationSuccessful(question.correctSentence, question.scrambledChunks)

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          "group relative flex h-36 cursor-pointer flex-col justify-between gap-1 rounded-lg border-2 border-gray-200 bg-white px-6 py-2",
          {
            "border-indigo-600": isActive,
            "border-red-400 bg-red-50/10": isMismatched && !isActive,
            "border-red-500": isMismatched && isActive,
          },
        ),
      )}
    >
      <div className="absolute top-2 left-2 flex items-center gap-1">
        <span className="text-xs font-semibold text-gray-400">{index + 1}</span>
        {isMismatched && <AlertTriangle className="size-3.5 text-red-500" />}
      </div>
      <p className="truncate text-center text-xs font-semibold text-gray-700">
        {question.prompt || t("quizz:noQuestionYet")}
      </p>

      <SlideMedia media={question.media} />

      {/* Chunk count indicator */}
      <div className="flex flex-wrap justify-center gap-1">
        {question.scrambledChunks.slice(0, 4).map((_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-sm ${CHUNK_MINI_COLORS[i % CHUNK_MINI_COLORS.length]}`}
          />
        ))}
        {question.scrambledChunks.length > 4 && (
          <span className="text-[10px] text-gray-400">
            +{question.scrambledChunks.length - 4}
          </span>
        )}
      </div>

      {canDelete && (
        <AlertDialog
          trigger={
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute top-1.5 right-1.5 hidden rounded-sm bg-white p-1 text-gray-400 group-hover:block hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="size-3.5" />
            </button>
          }
          title={t("quizz:question.deleteQuestion")}
          description={t("quizz:question.deleteQuestionConfirm")}
          confirmLabel={t("common:delete")}
          onConfirm={onDelete}
        />
      )}
    </div>
  )
}

export default QuizzEditorCard
