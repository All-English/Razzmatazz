import { EVENTS } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import clsx from "clsx"
import { Check } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const ConfigSelectQuizz = () => {
  const { socket } = useSocket()
  const { quizz: quizzList } = useConfig()
  const [selected, setSelected] = useState<string | null>(null)
  const { t } = useTranslation()

  const handleSelect = (id: string) => () => {
    if (selected === id) {
      setSelected(null)
    } else {
      setSelected(id)
    }
  }

  const handleSubmit = () => {
    if (!selected) {
      toast.error(t("manager:quizz.pleaseSelect"))

      return
    }

    const selectedQuizz = quizzList.find((q) => q.id === selected)

    if (selectedQuizz?.hasMismatch) {
      toast.error(t("manager:quizz.hasMismatchError"))

      return
    }

    socket.emit(EVENTS.GAME.CREATE, selected)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {quizzList.length > 0 && (
        <Button
          className="mb-4 shrink-0"
          onClick={handleSubmit}
          disabled={!selected}
        >
          {t("manager:quizz.startGame")}
        </Button>
      )}
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-0.5">
        {[...quizzList]
          .sort((a, b) => a.subject.localeCompare(b.subject))
          .map((quizz) => {
            const hasMismatch = Boolean(quizz.hasMismatch)
            const isCurrentSelected = selected === quizz.id

            return (
              <div
                key={quizz.id}
                className={clsx(
                  "flex flex-col rounded-md p-3 outline outline-gray-300 transition-all duration-200",
                  hasMismatch && "bg-red-50/50 outline-red-200",
                  isCurrentSelected &&
                    "outline-primary bg-primary/5 shadow-sm outline-2",
                )}
              >
                <div
                  className="flex w-full cursor-pointer items-center justify-between"
                  onClick={handleSelect(quizz.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {quizz.subject}
                    </span>
                    <span className="text-xs text-gray-400">
                      (
                      {t("manager:quizz.questionsCount", {
                        count: quizz.questionCount ?? 0,
                      })}
                      )
                    </span>
                    {hasMismatch && (
                      <span
                        className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700"
                        title={t("manager:quizz.mismatchTooltip")}
                      >
                        ⚠️ {t("manager:quizz.mismatchBadge")}
                      </span>
                    )}
                  </div>

                  <div
                    className={clsx(
                      "size-5 rounded p-0.5 outline outline-offset-3 outline-gray-300 transition-all duration-200",
                      isCurrentSelected &&
                        "bg-primary border-primary/80 outline-primary",
                    )}
                  >
                    {isCurrentSelected && (
                      <Check className="size-full stroke-4 text-white" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        {!quizzList.length && (
          <div className="my-8 text-center text-gray-500">
            <p>{t("manager:quizz.notFound")}</p>
            <p className="text-sm">{t("manager:quizz.pleaseCreate")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfigSelectQuizz
