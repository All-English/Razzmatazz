import { EVENTS } from "@razzia/common/constants"
import type { QuizzWithId } from "@razzia/common/types/game"
import Loader from "@razzia/web/components/Loader"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import QuestionEditor from "@razzia/web/features/quizz/components/QuestionEditor"
import QuizzEditorHeader from "@razzia/web/features/quizz/components/QuizzEditorHeader"
import QuizzEditorSidebar from "@razzia/web/features/quizz/components/QuizzEditorSidebar"
import {
  QuizzEditorProvider,
  useQuizzEditor,
} from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import { createFileRoute, useBlocker } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

const QuizzEditorContainer = () => {
  const { isDirty, hasSaved } = useQuizzEditor()
  const { t } = useTranslation()

  // Intercept in-app route transitions (Exit button, NavRail clicks)
  useBlocker({
    blockerFn: () => {
      const confirm = window.confirm(t("quizz:unsavedChangesConfirm"))
      return !confirm // Return true to block (cancelled confirm), false to proceed
    },
    condition: isDirty && !hasSaved,
  })

  // Intercept browser window close/refresh events
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !hasSaved) {
        e.preventDefault()
        e.returnValue = "" // Modern browsers will display their native confirmation dialog
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isDirty, hasSaved])

  return (
    <div className="relative flex h-svh flex-col bg-gray-50">
      <QuizzEditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <QuizzEditorSidebar />
        <QuestionEditor />
      </div>
    </div>
  )
}

const QuizzEditPage = () => {
  const { quizzId } = Route.useParams()
  const { socket } = useSocket()
  const [quizz, setQuizz] = useState<QuizzWithId | null>(null)

  useEffect(() => {
    socket.emit(EVENTS.QUIZZ.GET, quizzId)
  }, [socket, quizzId])

  useEvent(EVENTS.QUIZZ.DATA, (data) => {
    if (data.id === quizzId) {
      setQuizz(data)
    }
  })

  if (!quizz) {
    return (
      <div className="flex h-svh items-center justify-center bg-gray-50">
        <Loader className="text-background max-h-23" />
      </div>
    )
  }

  return (
    <QuizzEditorProvider initialData={quizz}>
      <QuizzEditorContainer />
    </QuizzEditorProvider>
  )
}

export const Route = createFileRoute("/manager/quizz/$quizzId")({
  component: QuizzEditPage,
})
