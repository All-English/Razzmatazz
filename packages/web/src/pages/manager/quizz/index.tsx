import QuizzEditorContainer from "@razzia/web/features/quizz/components/QuizzEditorContainer"
import { QuizzEditorProvider } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

const QuizzEditorPage = () => (
  <QuizzEditorProvider>
    <QuizzEditorContainer />
  </QuizzEditorProvider>
)

const searchSchema = z.object({
  folder: z.string().optional(),
})

export const Route = createFileRoute("/manager/quizz/")({
  validateSearch: searchSchema,
  component: QuizzEditorPage,
})
