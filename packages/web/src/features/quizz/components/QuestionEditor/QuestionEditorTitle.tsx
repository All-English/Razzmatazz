import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import type { ChangeEvent } from "react"
import { useTranslation } from "react-i18next"

const QuestionEditorTitle = () => {
  const { updateQuestion, currentIndex, currentQuestion } = useQuizzEditor()
  const { t } = useTranslation()

  const handleChangePrompt = (e: ChangeEvent<HTMLInputElement>) => {
    updateQuestion(currentIndex, { prompt: e.target.value })
  }

  return (
    <div className="z-10 rounded-xl bg-white shadow-sm">
      <input
        className="w-full resize-none p-4 text-center text-xl font-semibold text-gray-800 outline-none placeholder:text-gray-400"
        placeholder={t("quizz:promptPlaceholder")}
        value={currentQuestion.prompt}
        onChange={handleChangePrompt}
      />
    </div>
  )
}

export default QuestionEditorTitle
