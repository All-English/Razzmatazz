import { quizzValidator } from "@razzia/common/validators/quizz"
import {
  deriveCorrectChunks,
  isValidChunksOrder,
} from "@razzia/web/features/quizz/utils/chunks"
import type { Question } from "@razzia/common/types/game"
import type { QuestionWithId } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { v7 as uuid } from "uuid"

interface Props {
  onImport: (_subject: string, _questions: QuestionWithId[]) => void
}

const BulkImportModal = ({ onImport }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    fileCount: number
    totalQuestions: number
  } | null>(null)
  const [parsedData, setParsedData] = useState<{
    subject: string
    questions: QuestionWithId[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    setPreview(null)
    setParsedData(null)

    const files = e.target.files

    if (!files || files.length === 0) return

    const allQuestions: QuestionWithId[] = []
    let firstSubject = ""

    const fileList = Array.from(files)

    for (const file of fileList) {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as { questions?: Array<Partial<Question>>; subject?: string }

        // Auto-heal incorrect correctChunks
        if (parsed.questions && Array.isArray(parsed.questions)) {
          parsed.questions = parsed.questions.map((q) => {
            if (
              q.correctSentence &&
              q.scrambledChunks &&
              q.correctChunks &&
              (!isValidChunksOrder(q.correctSentence, q.correctChunks) ||
                q.correctChunks.length !== q.scrambledChunks.length)
            ) {
              const healed = deriveCorrectChunks(q.correctSentence, q.scrambledChunks)
              if (healed.length > 0) {
                return { ...q, correctChunks: healed }
              }
            }
            return q
          })
        }

        const result = quizzValidator.safeParse(parsed)

        if (!result.success) {
          setError(
            `${file.name}: ${result.error.issues.map((i) => t(i.message)).join(", ")}`,
          )

          return
        }

        if (!firstSubject) {
          firstSubject = result.data.subject
        }

        const questions: QuestionWithId[] = result.data.questions.map((q) => ({
          ...q,
          id: uuid(),
        }))

        allQuestions.push(...questions)
      } catch {
        setError(`${t("quizz:importInvalidJson")} (${file.name})`)

        return
      }
    }

    if (allQuestions.length > 0) {
      setParsedData({ subject: firstSubject, questions: allQuestions })
      setPreview({
        fileCount: fileList.length,
        totalQuestions: allQuestions.length,
      })
    }
  }

  const handleImport = () => {
    if (parsedData) {
      onImport(parsedData.subject, parsedData.questions)
      setOpen(false)
      setPreview(null)
      setParsedData(null)
      setError(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setPreview(null)
    setParsedData(null)
    setError(null)
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">
          <Upload className="size-4" />
          {t("quizz:bulkImport")}
        </button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <AlertDialog.Title className="text-lg font-bold text-gray-800">
              {t("quizz:bulkImportTitle")}
            </AlertDialog.Title>
            <AlertDialog.Cancel asChild>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="size-5" />
              </button>
            </AlertDialog.Cancel>
          </div>

          <AlertDialog.Description className="mb-4 text-sm text-gray-500">
            {t("quizz:bulkImportDescription")}
          </AlertDialog.Description>

          {/* File Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mb-4 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50"
          >
            <Upload className="mx-auto mb-2 size-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              {t("quizz:clickToUpload")}
            </p>
            <p className="mt-1 text-xs text-gray-400">.json</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mb-4 rounded-lg bg-emerald-50 p-3">
              <p className="font-semibold text-emerald-700">
                ✅ {preview.fileCount} {t("quizz:filesReady")}
              </p>
              <p className="text-sm text-emerald-600">
                {preview.totalQuestions} {t("quizz:questionsFound")}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                onClick={handleClose}
                className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-300"
              >
                {t("common:cancel")}
              </button>
            </AlertDialog.Cancel>
            <button
              onClick={handleImport}
              disabled={!parsedData}
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
            >
              {t("quizz:importButton")}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export default BulkImportModal
