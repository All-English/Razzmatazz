import { EVENTS } from "@razzia/common/constants"
import type { GameResult } from "@razzia/common/types/game"
import AlertDialog from "@razzia/web/components/AlertDialog"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import ResultModal from "@razzia/web/features/manager/components/ResultModal"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import { Calendar, Trash2, Trophy, Users } from "lucide-react"
import { useCallback, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

const ReportsPanel = () => {
  const { socket } = useSocket()
  const { results } = useConfig()
  const [selectedResult, setSelectedResult] = useState<GameResult | null>(null)
  const { t } = useTranslation()

  useEvent(
    EVENTS.RESULTS.DATA,
    useCallback((data) => setSelectedResult(data), []),
  )

  const handleOpen = (id: string) => () => {
    socket.emit(EVENTS.RESULTS.GET, id)
  }

  const handleDelete = (id: string) => () => {
    socket.emit(EVENTS.RESULTS.DELETE, id)
    toast.success(t("manager:result.deleted"))
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-white dark:bg-zinc-950 p-4 sm:p-8 select-none">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            {t("manager:nav.reports")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t("manager:result.available", { count: results.length })}
          </p>
        </div>
      </div>

      {/* Reports Grid/List */}
      <div className="flex-1 space-y-3">
        {results.map((r) => (
          <div
            key={r.id}
            className="group border-gray-150 dark:border-zinc-800 hover:border-primary/20 dark:hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 flex w-full items-start justify-between gap-3 rounded-xl border bg-gray-50/30 dark:bg-zinc-900/20 px-4 py-4 transition-all duration-200 hover:shadow-xs sm:items-center sm:px-6"
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={handleOpen(r.id)}
            >
              {/* Subject + Mode Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <p className="group-hover:text-primary font-semibold text-gray-900 dark:text-zinc-300 transition-colors">
                  {r.subject}
                </p>
                {r.mode && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gray-600 dark:text-zinc-350 uppercase">
                    {r.mode === "study"
                      ? t("manager:result.studyMode")
                      : t("manager:result.liveMode")}
                  </span>
                )}
              </div>
              {/* Date + Players */}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-450 dark:text-zinc-500">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5 shrink-0" />
                  {formatDate(r.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5 shrink-0" />
                  {t("manager:result.playerCount", { count: r.playerCount })}
                </span>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleOpen(r.id)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-300 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-850 hover:text-gray-900 dark:hover:text-zinc-100 sm:px-3.5"
              >
                <Trophy className="text-primary size-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  {t("manager:result.viewResults")}
                </span>
              </button>
              <AlertDialog
                trigger={
                  <button className="rounded-lg p-2 text-gray-400 dark:text-zinc-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 dark:hover:text-red-400">
                    <Trash2 className="size-4" />
                  </button>
                }
                title={t("manager:result.delete")}
                description={t("manager:result.deleteConfirm", {
                  name: r.subject,
                })}
                confirmLabel={t("common:delete")}
                onConfirm={handleDelete(r.id)}
              />
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Trophy className="size-12 stroke-[1.5] text-gray-300 dark:text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-zinc-400">
              {t("manager:result.none")}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-555">
              Complete a game to generate reports.
            </p>
          </div>
        )}
      </div>

      {selectedResult && (
        <ResultModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  )
}

export default ReportsPanel
