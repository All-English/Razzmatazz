import QuestionEditor from "@razzia/web/features/quizz/components/QuestionEditor"
import QuizzEditorHeader from "@razzia/web/features/quizz/components/QuizzEditorHeader"
import QuizzEditorSidebar from "@razzia/web/features/quizz/components/QuizzEditorSidebar"
import { useQuizzEditor } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import { useBlocker } from "@tanstack/react-router"
import { useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"

const QuizzEditorContainer = () => {
  const { isDirty, hasSaved } = useQuizzEditor()
  const { t } = useTranslation()

  const shouldBlockFn = useCallback(() => {
    const confirm = window.confirm(t("quizz:unsavedChangesConfirm"))
    return !confirm // Return true to block, false to proceed
  }, [t])

  // Intercept in-app route transitions (Exit button, NavRail clicks)
  useBlocker({
    shouldBlockFn,
    disabled: !isDirty || hasSaved,
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

export default QuizzEditorContainer
