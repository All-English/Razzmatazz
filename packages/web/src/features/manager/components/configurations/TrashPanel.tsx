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
    <div className="relative flex h-full flex-1 flex-col overflow-y-auto bg-white p-8 select-none">
      {/* Header */}
      <div className="border-gray-150 mb-6 border-b pb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("manager:trash.title")}
        </h1>
        <p className="mt-2 inline-block rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-600">
          ⚠️ {t("manager:trash.autoDeleteNotice")}
        </p>
      </div>

      {/* Trash Table */}
      <div className="min-w-full flex-1">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-gray-150 border-b text-xs font-semibold tracking-wider text-gray-400 uppercase">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="text-primary focus:ring-primary size-4 rounded-sm border-gray-300"
                />
              </th>
              <th className="px-4 py-3">Title</th>
              <th className="w-32 px-4 py-3">Questions</th>
              <th className="w-52 px-4 py-3">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  <span>{t("manager:trash.deletedOn")}</span>
                </div>
              </th>
              <th className="w-44 px-4 py-3 text-right">Actions</th>
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
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleSelectOne(q.id, e.target.checked)}
                      className="text-primary focus:ring-primary size-4 rounded-sm border-gray-300"
                    />
                  </td>
                  <td className="max-w-[300px] truncate px-4 py-3.5 font-medium text-gray-900">
                    {q.subject}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                      {q.questionCount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {formatDate(q.deletedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Restore */}
                      <button
                        onClick={() => handleRestore(q.id)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:bg-gray-50 hover:text-gray-900"
                      >
                        <Undo2 className="text-primary size-3.5" />
                        <span>{t("manager:trash.restore")}</span>
                      </button>

                      {/* Permanent Delete */}
                      <AlertDialog
                        trigger={
                          <button
                            className="border-gray-250 rounded-lg border bg-white p-1.5 text-red-500 shadow-xs transition-colors hover:border-red-200 hover:bg-red-50"
                            title={t("manager:trash.permanentDelete")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        }
                        title={t("manager:trash.permanentDelete")}
                        description={t("manager:trash.permanentDeleteConfirm", {
                          name: q.subject,
                        })}
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
                <td
                  colSpan={5}
                  className="py-12 text-center text-gray-500 italic"
                >
                  {t("manager:quizz.none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk actions bar for Trash */}
      {selectedIds.length > 0 && (
        <div className="border-gray-150 bg-secondary animate-fade-in fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-6 rounded-full border px-6 py-3 text-white shadow-2xl select-none">
          <div className="flex items-center gap-2 border-r border-white/10 pr-6">
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
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
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15"
            >
              <Undo2 className="size-4" />
              <span>{t("manager:trash.restore")}</span>
            </button>

            {/* Permanent delete selected */}
            <AlertDialog
              trigger={
                <button
                  className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                  title={t("manager:trash.permanentDelete")}
                >
                  <Trash2 className="size-4" />
                  <span>{t("manager:trash.permanentDelete")}</span>
                </button>
              }
              title={t("manager:trash.permanentDelete")}
              description={t("manager:trash.permanentDeleteConfirm", {
                name: `${selectedIds.length} selected quizzes`,
              })}
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
