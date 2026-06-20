import { EVENTS } from "@razzia/common/constants"
import { quizzValidator } from "@razzia/common/validators/quizz"
import AlertDialog from "@razzia/web/components/AlertDialog"
import Button from "@razzia/web/components/Button"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import {
  isDerivationSuccessful,
  deriveCorrectChunks,
  isValidChunksOrder,
} from "@razzia/web/features/quizz/utils/chunks"
import type { Question } from "@razzia/common/types/game"
import { useNavigate } from "@tanstack/react-router"
import { SquarePen, Trash2, Upload } from "lucide-react"
import { type ChangeEvent, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const ConfigManageQuizz = () => {
  const { quizz } = useConfig()
  const { socket } = useSocket()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingMismatchedSubjects = useRef<string[]>([])
  const { t } = useTranslation()

  useEffect(() => {
    if (pendingMismatchedSubjects.current.length === 0) {
      return
    }

    const match = quizz.find((q) =>
      pendingMismatchedSubjects.current.includes(
        q.subject.toLowerCase().trim(),
      ),
    )

    if (match) {
      const matchSubject = match.subject.toLowerCase().trim()
      pendingMismatchedSubjects.current =
        pendingMismatchedSubjects.current.filter((s) => s !== matchSubject)

      navigate({
        to: "/manager/quizz/$quizzId",
        params: { quizzId: match.id },
      })
    }
  }, [quizz, navigate])

  useEvent(EVENTS.QUIZZ.ERROR, (message) => {
    toast.error(t(message))
  })

  const handleDelete = (id: string) => () => {
    socket.emit(EVENTS.QUIZZ.DELETE, id)
    toast.success(t("manager:quizz.deleted"))
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target

    if (!files || files.length === 0) {
      return
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader()

      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as { questions?: Array<Partial<Question>>; subject?: string }

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
            toast.error(
              `${file.name}: ${result.error.issues
                .map((i) => t(i.message))
                .join(", ")}`,
            )

            return
          }

          // Check for sentence-to-chunk mismatches
          const mismatchedIndices: number[] = []
          result.data.questions.forEach((q, index) => {
            if (
              q.correctSentence.trim() !== "" &&
              !isDerivationSuccessful(q.correctSentence, q.scrambledChunks)
            ) {
              mismatchedIndices.push(index + 1)
            }
          })

          if (mismatchedIndices.length > 0) {
            pendingMismatchedSubjects.current.push(
              result.data.subject.toLowerCase().trim(),
            )
          }

          socket.emit(EVENTS.QUIZZ.SAVE, result.data)

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
        } catch {
          toast.error(`Invalid JSON file: ${file.name}`)
        }
      }

      reader.readAsText(file)
    })

    e.target.value = ""
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 gap-2">
        <Button
          className="flex-1"
          onClick={() => navigate({ to: "/manager/quizz" })}
        >
          {t("manager:quizz.create")}
        </Button>
        <Button
          className="aspect-square bg-gray-200 px-3 text-gray-600"
          onClick={() => fileInputRef.current?.click()}
          title={t("manager:quizz.import")}
        >
          <Upload className="size-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-0.5">
        {[...quizz]
          .sort((a, b) => a.subject.localeCompare(b.subject))
          .map((q) => (
            <div
              key={q.id}
              className="flex h-12 w-full items-center justify-between rounded-md pr-1.5 pl-3 outline outline-gray-300"
            >
              <p className="truncate">{q.subject}</p>
              <div className="flex gap-0.5">
                <button
                  className="rounded-sm p-2 text-gray-600 hover:bg-gray-600/10"
                  onClick={() =>
                    navigate({
                      to: "/manager/quizz/$quizzId",
                      params: { quizzId: q.id },
                    })
                  }
                >
                  <SquarePen className="size-4" />
                </button>

                <AlertDialog
                  trigger={
                    <button className="rounded-sm p-2 hover:bg-red-600/10">
                      <Trash2 className="size-4 stroke-red-500" />
                    </button>
                  }
                  title={t("manager:quizz.delete")}
                  description={t("manager:quizz.deleteConfirm", {
                    name: q.subject,
                  })}
                  confirmLabel={t("common:delete")}
                  onConfirm={handleDelete(q.id)}
                />
              </div>
            </div>
          ))}
        {quizz.length === 0 && (
          <p className="my-8 text-center text-gray-500">
            {t("manager:quizz.none")}
          </p>
        )}
      </div>
    </div>
  )
}

export default ConfigManageQuizz
