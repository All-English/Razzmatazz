import * as RadixAlertDialog from "@radix-ui/react-alert-dialog"
import Button from "@razzia/web/components/Button"
import { Copy, FolderInput, Merge, Star, Trash2, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

interface Props {
  selectedCount: number
  onClear: () => void
  onMove: () => void
  onDelete: () => void
  onFavorite: () => void
  onDuplicate: () => void
  onCombine: (_title: string) => void
}

const BulkActionBar = ({
  selectedCount,
  onClear,
  onMove,
  onDelete,
  onFavorite,
  onDuplicate,
  onCombine,
}: Props) => {
  const { t } = useTranslation()
  const [combineOpen, setCombineOpen] = useState(false)
  const [combineTitle, setCombineTitle] = useState("")

  const handleCombineSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const title = combineTitle.trim()
    if (title) {
      onCombine(title)
      setCombineTitle("")
      setCombineOpen(false)
    }
  }

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-6 rounded-full border border-gray-150 bg-secondary px-6 py-3 shadow-2xl animate-fade-in text-white select-none">
      {/* Selected Count */}
      <div className="flex items-center gap-2 border-r border-white/10 pr-6">
        <button
          onClick={onClear}
          className="rounded-full p-1 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="size-4" />
        </button>
        <span className="text-sm font-semibold tracking-wide">
          {t("manager:quizz.selectedCount", { count: selectedCount })}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Favorite */}
        <button
          onClick={onFavorite}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 text-gray-200 hover:text-white transition-colors"
          title={t("manager:quizz.favorite")}
        >
          <Star className="size-4 text-gray-300" />
          <span>{t("manager:quizz.favorite")}</span>
        </button>

        {/* Move to folder */}
        <button
          onClick={onMove}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 text-gray-200 hover:text-white transition-colors"
          title={t("manager:quizz.moveToFolder")}
        >
          <FolderInput className="size-4 text-gray-300" />
          <span>{t("manager:quizz.moveToFolder")}</span>
        </button>

        {/* Duplicate */}
        <button
          onClick={onDuplicate}
          className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 text-gray-200 hover:text-white transition-colors"
          title={t("manager:quizz.duplicate")}
        >
          <Copy className="size-4 text-gray-300" />
          <span>{t("manager:quizz.duplicate")}</span>
        </button>

        {/* Combine (only if >=2 selected) */}
        {selectedCount >= 2 && (
          <>
            <button
              onClick={() => setCombineOpen(true)}
              className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold hover:bg-white/10 text-gray-200 hover:text-white transition-colors"
              title={t("manager:quizz.combine")}
            >
              <Merge className="size-4 text-gray-300" />
              <span>{t("manager:quizz.combine")}</span>
            </button>

            {/* Combine Modal */}
            <RadixAlertDialog.Root open={combineOpen} onOpenChange={setCombineOpen}>
              <RadixAlertDialog.Portal>
                <RadixAlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-fade-in" />
                <RadixAlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl animate-show border border-gray-100 text-gray-900">
                  <form onSubmit={handleCombineSubmit}>
                    <RadixAlertDialog.Title className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Merge className="size-5 text-primary" />
                      <span>{t("manager:quizz.combine")}</span>
                    </RadixAlertDialog.Title>
                    <RadixAlertDialog.Description className="mt-2 text-sm text-gray-500">
                      Combine the {selectedCount} selected quizzes into a new quiz.
                    </RadixAlertDialog.Description>

                    <div className="my-4">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        {t("manager:quizz.combineTitle")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t("manager:quizz.combineTitle") + "..."}
                        value={combineTitle}
                        onChange={(e) => setCombineTitle(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-150 pt-3">
                      <RadixAlertDialog.Cancel asChild>
                        <Button
                          type="button"
                          onClick={() => setCombineOpen(false)}
                          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200"
                        >
                          {t("common:cancel")}
                        </Button>
                      </RadixAlertDialog.Cancel>
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/95 text-white px-4 py-2 text-sm font-semibold"
                      >
                        {t("manager:quizz.combine")}
                      </Button>
                    </div>
                  </form>
                </RadixAlertDialog.Content>
              </RadixAlertDialog.Portal>
            </RadixAlertDialog.Root>
          </>
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="flex items-center gap-2 rounded-full bg-red-600/90 hover:bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm"
          title={t("common:delete")}
        >
          <Trash2 className="size-4" />
          <span>{t("common:delete")}</span>
        </button>
      </div>
    </div>
  )
}

export default BulkActionBar
