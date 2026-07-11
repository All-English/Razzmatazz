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
    <div className="border-gray-150 bg-secondary animate-fade-in fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 flex-col items-center gap-3 rounded-2xl border px-4 py-3 text-white shadow-2xl select-none sm:w-auto sm:max-w-none sm:flex-row sm:gap-6 sm:rounded-full sm:px-6">
      {/* Selected Count */}
      <div className="flex w-full items-center justify-between gap-2 border-b border-white/10 pb-2.5 sm:w-auto sm:justify-start sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
          <span className="text-sm font-semibold tracking-wide whitespace-nowrap">
            {t("manager:quizz.selectedCount", { count: selectedCount })}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
        {/* Favorite */}
        <button
          onClick={onFavorite}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-200 transition-colors hover:bg-white/10 hover:text-white sm:px-3.5 sm:py-2"
          title={t("manager:quizz.favorite")}
        >
          <Star className="size-4 shrink-0 text-gray-300" />
          <span>{t("manager:quizz.favorite")}</span>
        </button>

        {/* Move to folder */}
        <button
          onClick={onMove}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-200 transition-colors hover:bg-white/10 hover:text-white sm:px-3.5 sm:py-2"
          title={t("manager:quizz.moveToFolder")}
        >
          <FolderInput className="size-4 shrink-0 text-gray-300" />
          <span>{t("manager:quizz.moveToFolder")}</span>
        </button>

        {/* Duplicate */}
        <button
          onClick={onDuplicate}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-200 transition-colors hover:bg-white/10 hover:text-white sm:px-3.5 sm:py-2"
          title={t("manager:quizz.duplicate")}
        >
          <Copy className="size-4 shrink-0 text-gray-300" />
          <span>{t("manager:quizz.duplicate")}</span>
        </button>

        {/* Combine (only if >=2 selected) */}
        {selectedCount >= 2 && (
          <>
            <button
              onClick={() => setCombineOpen(true)}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-gray-200 transition-colors hover:bg-white/10 hover:text-white sm:px-3.5 sm:py-2"
              title={t("manager:quizz.combine")}
            >
              <Merge className="size-4 shrink-0 text-gray-300" />
              <span>{t("manager:quizz.combine")}</span>
            </button>

            {/* Combine Modal */}
            <RadixAlertDialog.Root
              open={combineOpen}
              onOpenChange={setCombineOpen}
            >
              <RadixAlertDialog.Portal>
                <RadixAlertDialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
                <RadixAlertDialog.Content className="animate-show fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-100 bg-white p-6 text-gray-900 shadow-xl">
                  <form onSubmit={handleCombineSubmit}>
                    <RadixAlertDialog.Title className="flex items-center gap-2 text-lg font-bold text-gray-900">
                      <Merge className="text-primary size-5" />
                      <span>{t("manager:quizz.combine")}</span>
                    </RadixAlertDialog.Title>
                    <RadixAlertDialog.Description className="mt-2 text-sm text-gray-500">
                      Combine the {selectedCount} selected quizzes into a new
                      quiz.
                    </RadixAlertDialog.Description>

                    <div className="my-4">
                      <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500 uppercase">
                        {t("manager:quizz.combineTitle")}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t("manager:quizz.combineTitle") + "..."}
                        value={combineTitle}
                        onChange={(e) => setCombineTitle(e.target.value)}
                        className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-1"
                      />
                    </div>

                    <div className="border-gray-150 flex justify-end gap-2 border-t pt-3">
                      <RadixAlertDialog.Cancel asChild>
                        <Button
                          type="button"
                          onClick={() => setCombineOpen(false)}
                          className="border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
                        >
                          {t("common:cancel")}
                        </Button>
                      </RadixAlertDialog.Cancel>
                      <Button
                        type="submit"
                        className="bg-primary hover:bg-primary/95 px-4 py-2 text-sm font-semibold text-white"
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
          className="flex items-center gap-2 rounded-full bg-red-600/90 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-sm transition-colors hover:bg-red-600 sm:px-4 sm:py-2"
          title={t("common:delete")}
        >
          <Trash2 className="size-4 shrink-0" />
          <span>{t("common:delete")}</span>
        </button>
      </div>
    </div>
  )
}

export default BulkActionBar
