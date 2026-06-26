import { EVENTS } from "@razzia/common/constants"
import AlertDialog from "@razzia/web/components/AlertDialog"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import { Calendar, Trash2, Undo2, X } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const formatDate = (isoString?: string) => {
  if (!isoString) return "-"
  const d = new Date(isoString)
  return `${d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

const TrashPanel = () => {
  const { trash } = useConfig()
  const { socket } = useSocket()
  const { t } = useTranslation()

  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(trash.map((q) => q.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // Row actions
  const handleRestore = (id: string) => {
    socket.emit(EVENTS.QUIZZ.RESTORE, [id])
    toast.success(t("manager:trash.restored"))
    setSelectedIds((prev) => prev.filter((item) => item !== id))
  }

  const handlePermanentDelete = (id: string) => {
    socket.emit(EVENTS.QUIZZ.PERMANENT_DELETE, [id])
    toast.success(t("manager:quizz.deleted"))
    setSelectedIds((prev) => prev.filter((item) => item !== id))
  }

  // Bulk actions
  const handleBulkRestore = () => {
    socket.emit(EVENTS.QUIZZ.RESTORE, selectedIds)
    toast.success(t("manager:trash.restored"))
    setSelectedIds([])
  }

  const handleBulkPermanentDelete = () => {
    socket.emit(EVENTS.QUIZZ.PERMANENT_DELETE, selectedIds)
    toast.success(t("manager:quizz.deleted"))
    setSelectedIds([])
  }

  const isAllSelected = trash.length > 0 && selectedIds.length === trash.length

  return (
    <div className="flex h-full flex-1 flex-col bg-white p-8 overflow-y-auto select-none relative">
      {/* Header */}
      <div className="mb-6 border-b border-gray-150 pb-5">
        <h1 className="text-2xl font-bold text-gray-900">{t("manager:trash.title")}</h1>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100 font-medium inline-block mt-2">
          ⚠️ {t("manager:trash.autoDeleteNotice")}
        </p>
      </div>

      {/* Trash Table */}
      <div className="flex-1 min-w-full">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-150 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded-sm border-gray-300 text-primary focus:ring-primary size-4"
                />
              </th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4 w-32">Questions</th>
              <th className="py-3 px-4 w-52">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  <span>{t("manager:trash.deletedOn")}</span>
                </div>
              </th>
              <th className="py-3 px-4 w-44 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trash.map((q) => {
              const isChecked = selectedIds.includes(q.id)
              return (
                <tr
                  key={q.id}
                  className={`group transition-colors hover:bg-gray-50/50 ${
                    isChecked ? "bg-red-50/20" : ""
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleSelectOne(q.id, e.target.checked)}
                      className="rounded-sm border-gray-300 text-primary focus:ring-primary size-4"
                    />
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-900 truncate max-w-[300px]">
                    {q.subject}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                      {q.questionCount ?? 0}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 text-xs">
                    {formatDate(q.deletedAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Restore */}
                      <button
                        onClick={() => handleRestore(q.id)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-xs"
                      >
                        <Undo2 className="size-3.5 text-primary" />
                        <span>{t("manager:trash.restore")}</span>
                      </button>

                      {/* Permanent Delete */}
                      <AlertDialog
                        trigger={
                          <button
                            className="rounded-lg border border-gray-250 bg-white p-1.5 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors shadow-xs"
                            title={t("manager:trash.permanentDelete")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        }
                        title={t("manager:trash.permanentDelete")}
                        description={t("manager:trash.permanentDeleteConfirm", { name: q.subject })}
                        confirmLabel={t("manager:trash.permanentDelete")}
                        onConfirm={() => handlePermanentDelete(q.id)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}

            {trash.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-500 italic">
                  {t("manager:quizz.none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk actions bar for Trash */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-6 rounded-full border border-gray-150 bg-secondary px-6 py-3 shadow-2xl animate-fade-in text-white select-none">
          <div className="flex items-center gap-2 border-r border-white/10 pr-6">
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-full p-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
            <span className="text-sm font-semibold tracking-wide">
              {t("manager:quizz.selectedCount", { count: selectedIds.length })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Restore selected */}
            <button
              onClick={handleBulkRestore}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
            >
              <Undo2 className="size-4" />
              <span>{t("manager:trash.restore")}</span>
            </button>

            {/* Permanent delete selected */}
            <AlertDialog
              trigger={
                <button
                  className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
                  title={t("manager:trash.permanentDelete")}
                >
                  <Trash2 className="size-4" />
                  <span>{t("manager:trash.permanentDelete")}</span>
                </button>
              }
              title={t("manager:trash.permanentDelete")}
              description={t("manager:trash.permanentDeleteConfirm", { name: `${selectedIds.length} selected quizzes` })}
              confirmLabel={t("manager:trash.permanentDelete")}
              onConfirm={handleBulkPermanentDelete}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TrashPanel
