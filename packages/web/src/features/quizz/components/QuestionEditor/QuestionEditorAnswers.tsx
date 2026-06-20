import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import {
  autoGenerateChunks,
  isDerivationSuccessful,
} from "@razzia/web/features/quizz/utils/chunks"
import { AlertTriangle, Minus, Plus, Wand2 } from "lucide-react"
import type { ChangeEvent } from "react"
import { useTranslation } from "react-i18next"

const CHUNK_COLORS = [
  "bg-[#E69F00]",
  "bg-[#56B4E9]",
  "bg-[#3DBFA0]",
  "bg-[#CC79A7]",
  "bg-[#9B59B6]",
  "bg-[#E74C3C]",
  "bg-[#2ECC71]",
  "bg-[#F39C12]",
]

const QuestionEditorAnswers = () => {
  const { currentQuestion, currentIndex, updateQuestion } = useQuizzEditor()
  const { t } = useTranslation()

  const handleChangeCorrectSentence = (e: ChangeEvent<HTMLInputElement>) => {
    updateQuestion(currentIndex, { correctSentence: e.target.value })
  }

  const isMismatched =
    currentQuestion.correctSentence.trim() !== "" &&
    !isDerivationSuccessful(
      currentQuestion.correctSentence,
      currentQuestion.scrambledChunks,
    )

  const updateChunk = (index: number, value: string) => {
    const next = [...currentQuestion.scrambledChunks]
    next[index] = value
    updateQuestion(currentIndex, { scrambledChunks: next })
  }

  const addChunk = () => {
    updateQuestion(currentIndex, {
      scrambledChunks: [...currentQuestion.scrambledChunks, ""],
    })
  }

  const removeChunk = () => {
    if (currentQuestion.scrambledChunks.length <= 2) {
      return
    }

    updateQuestion(currentIndex, {
      scrambledChunks: currentQuestion.scrambledChunks.slice(0, -1),
    })
  }

  const handleAutoGenerateChunks = () => {
    const generated = autoGenerateChunks(currentQuestion.correctSentence)

    if (generated.length > 0) {
      updateQuestion(currentIndex, { scrambledChunks: generated })
    }
  }

  return (
    <div className="z-10 flex flex-col gap-4">
      {/* Correct Sentence */}
      <div>
        <label className="mb-1 block px-1 text-sm font-semibold text-white drop-shadow-md">
          {t("quizz:correctSentenceLabel")}
        </label>
        <div className="rounded-xl bg-emerald-500 shadow-sm">
          <input
            className="w-full bg-transparent p-4 text-lg font-semibold text-white placeholder-white/60 outline-none"
            placeholder={t("quizz:correctSentencePlaceholder")}
            value={currentQuestion.correctSentence}
            onChange={handleChangeCorrectSentence}
          />
        </div>
        {isMismatched && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-red-200 backdrop-blur-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
            <p className="text-sm leading-relaxed font-medium">
              {t("quizz:mismatchWarning")}
            </p>
          </div>
        )}
      </div>

      {/* Chunks */}
      <div>
        <div className="flex items-center justify-between px-1">
          <label className="text-sm font-semibold text-white drop-shadow-md">
            {t("quizz:chunksLabel")} ({currentQuestion.scrambledChunks.length})
          </label>
          <div className="flex items-center gap-2">
            {currentQuestion.correctSentence.trim() && (
              <button
                onClick={handleAutoGenerateChunks}
                className="flex h-7 items-center justify-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-600 px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
              >
                <Wand2 className="size-3.5" />
                {t("quizz:autoGenerate")}
              </button>
            )}
            <button
              onClick={removeChunk}
              disabled={currentQuestion.scrambledChunks.length <= 2}
              className="flex size-7 items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
            <button
              onClick={addChunk}
              className="flex size-7 items-center justify-center rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {currentQuestion.scrambledChunks.map((chunk, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 ${CHUNK_COLORS[i % CHUNK_COLORS.length]}`}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-black/20 text-xs font-bold text-white">
                {i + 1}
              </span>
              <input
                className="w-32 bg-transparent font-semibold text-white placeholder-white/60 outline-none sm:w-40"
                placeholder={t("quizz:chunkPlaceholder")}
                value={chunk}
                onChange={(e) => updateChunk(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {currentQuestion.scrambledChunks.some((c) => c.trim()) && (
        <div className="z-10 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          <p className="mb-1 text-xs font-semibold tracking-wider text-white/60 uppercase">
            {t("quizz:correctChunksLabel")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {isMismatched ? (
              <span className="text-sm text-red-200 italic">
                {t("quizz:previewMismatchPlaceholder")}
              </span>
            ) : (
              currentQuestion.correctChunks
                .filter((c) => c.trim())
                .map((chunk, i) => {
                  const originalIndex =
                    currentQuestion.scrambledChunks.indexOf(chunk)
                  const colorIndex = originalIndex !== -1 ? originalIndex : i

                  return (
                    <span
                      key={i}
                      className={`rounded-lg px-3 py-1 text-sm font-bold text-white transition-all duration-200 ${CHUNK_COLORS[colorIndex % CHUNK_COLORS.length]}`}
                    >
                      {chunk}
                    </span>
                  )
                })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionEditorAnswers
