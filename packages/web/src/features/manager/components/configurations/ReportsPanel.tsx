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
    <div className="flex h-full flex-1 flex-col bg-white p-8 overflow-y-auto select-none">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("manager:nav.reports")}</h1>
          <p className="text-sm text-gray-500">
            {t("manager:result.available", { count: results.length })}
          </p>
        </div>
      </div>

      {/* Reports Grid/List */}
      <div className="flex-1 space-y-3">
        {results.map((r) => (
          <div
            key={r.id}
            className="group flex w-full items-center justify-between rounded-xl border border-gray-150 bg-gray-50/30 px-6 py-4 transition-all duration-200 hover:border-primary/20 hover:bg-primary/5 hover:shadow-xs"
          >
            <button
              className="min-w-0 flex-1 text-left"
              onClick={handleOpen(r.id)}
            >
              <div className="flex items-center gap-3">
                <p className="truncate font-semibold text-gray-900 group-hover:text-primary transition-colors">
                  {r.subject}
                </p>
                {r.mode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                    {r.mode === "study" ? t("manager:result.studyMode") : t("manager:result.liveMode")}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {formatDate(r.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="size-3.5" />
                  {t("manager:result.playerCount", { count: r.playerCount })}
                </span>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpen(r.id)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-xs"
              >
                <Trophy className="size-3.5 text-primary" />
                <span>{t("manager:result.viewResults")}</span>
              </button>
              <AlertDialog
                trigger={
                  <button className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
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
            <Trophy className="size-12 text-gray-300 stroke-[1.5]" />
            <p className="mt-3 text-sm text-gray-500 font-medium">
              {t("manager:result.none")}
            </p>
            <p className="mt-1 text-xs text-gray-400">
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
