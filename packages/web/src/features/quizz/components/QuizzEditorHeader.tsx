import { EVENTS } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import Input from "@razzia/web/components/Input"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import BulkImportModal from "@razzia/web/features/quizz/components/BulkImportModal"
import StoryImportModal from "@razzia/web/features/quizz/components/StoryImportModal"
import {
  useQuizzEditor,
  type QuestionWithId,
} from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import { isDerivationSuccessful } from "@razzia/web/features/quizz/utils/chunks"
import { useNavigate } from "@tanstack/react-router"
import type { ChangeEvent } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const QuizzEditorHeader = () => {
  const { quizzId, subject, setSubject, questions, setQuestions } =
    useQuizzEditor()
  const { socket } = useSocket()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleChangeSubject = (e: ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value)
  }

  const handleSave = () => {
    const mismatchedIndices: number[] = []
    questions.forEach((q, index) => {
      if (
        q.correctSentence.trim() !== "" &&
        !isDerivationSuccessful(q.correctSentence, q.scrambledChunks)
      ) {
        mismatchedIndices.push(index + 1)
      }
    })

    if (mismatchedIndices.length > 0) {
      const confirmSave = window.confirm(
        t("quizz:saveMismatchConfirm", {
          questions: mismatchedIndices.join(", "),
        }),
      )
      if (!confirmSave) {
        return
      }
    }

    if (quizzId) {
      socket.emit(EVENTS.QUIZZ.UPDATE, { id: quizzId, subject, questions })
    } else {
      socket.emit(EVENTS.QUIZZ.SAVE, { subject, questions })
    }
  }

  const handleBulkImport = (
    importedSubject: string,
    importedQuestions: QuestionWithId[],
  ) => {
    setSubject(importedSubject)
    setQuestions(importedQuestions)

    const mismatchedIndices: number[] = []
    importedQuestions.forEach((q, index) => {
      if (
        q.correctSentence.trim() !== "" &&
        !isDerivationSuccessful(q.correctSentence, q.scrambledChunks)
      ) {
        mismatchedIndices.push(index + 1)
      }
    })

    toast.success(
      `${t("quizz:importedQuestions")}: ${importedQuestions.length}`,
    )

    if (mismatchedIndices.length > 0) {
      setTimeout(() => {
        toast.error(
          t("quizz:importMismatchWarning", {
            questions: mismatchedIndices.join(", "),
          }),
          { duration: 6000 },
        )
      }, 500)
    }
  }

  const handleStoryImport = (newQuestions: QuestionWithId[]) => {
    if (
      questions.length === 1 &&
      !questions[0].correctSentence.trim() &&
      !questions[0].prompt.trim()
    ) {
      setQuestions(newQuestions)
    } else {
      setQuestions([...questions, ...newQuestions])
    }

    toast.success(`${t("quizz:importedQuestions")}: ${newQuestions.length}`)
  }

  const handleExport = () => {
    const exportQuestions = questions.map(({ id: _id, ...q }) => q)
    const data = {
      subject,
      questions: exportQuestions,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const safeSubject = subject.toLowerCase().replace(/[^a-z0-9]+/gu, "-") || "quizz"
    link.download = `${safeSubject}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useEvent(EVENTS.QUIZZ.SAVE_SUCCESS, () => {
    toast.success(t("quizz:quizzSaved"))
    navigate({ to: "/manager/config" })
  })

  useEvent(EVENTS.QUIZZ.UPDATE_SUCCESS, (_data) => {
    toast.success(t("quizz:quizzUpdated"))
    navigate({ to: "/manager/config" })
  })

  useEvent(EVENTS.QUIZZ.ERROR, (message) => {
    toast.error(t(message))
  })

  return (
    <header className="z-20 flex h-14 items-center justify-between gap-4 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-6">
        <Input
          variant="sm"
          className="w-64"
          value={subject}
          onChange={handleChangeSubject}
          placeholder={t("quizz:titleQuizzPlaceholder")}
        />
      </div>

      <div className="flex gap-2">
        <StoryImportModal onImport={handleStoryImport} />
        <BulkImportModal onImport={handleBulkImport} />
        <Button
          className="text-md bg-gray-200 px-4 py-2 font-semibold text-gray-600"
          onClick={handleExport}
        >
          {t("quizz:exportQuizz")}
        </Button>
        <Button
          className="text-md bg-gray-200 px-4 py-2 font-semibold text-gray-600"
          onClick={() => navigate({ to: "/manager" })}
        >
          {t("common:exit")}
        </Button>
        <Button className="bg-primary text-md px-4 py-2" onClick={handleSave}>
          {t("common:save")}
        </Button>
      </div>
    </header>
  )
}

export default QuizzEditorHeader
