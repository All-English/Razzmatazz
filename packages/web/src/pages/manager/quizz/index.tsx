import QuestionEditor from "@razzia/web/features/quizz/components/QuestionEditor"
import QuizzEditorHeader from "@razzia/web/features/quizz/components/QuizzEditorHeader"
import QuizzEditorSidebar from "@razzia/web/features/quizz/components/QuizzEditorSidebar"
import { QuizzEditorProvider } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

const QuizzEditorPage = () => (
  <QuizzEditorProvider>
    <div className="relative flex h-svh flex-col bg-gray-50">
      <QuizzEditorHeader />
      <div className="flex flex-1 overflow-hidden">
        <QuizzEditorSidebar />
        <QuestionEditor />
      </div>
    </div>
  </QuizzEditorProvider>
)

const searchSchema = z.object({
  folder: z.string().optional(),
})

export const Route = createFileRoute("/manager/quizz/")({
  validateSearch: searchSchema,
  component: QuizzEditorPage,
})
