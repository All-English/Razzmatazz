import * as RadixAlertDialog from "@radix-ui/react-alert-dialog"
import Button from "@razzia/web/components/Button"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import { Folder, Home, X } from "lucide-react"
import { useTranslation } from "react-i18next"

interface Props {
  isOpen: boolean
  onClose: () => void
  onMove: (_folder: string) => void
}

const MoveToFolderModal = ({ isOpen, onClose, onMove }: Props) => {
  const { folders } = useConfig()
  const { t } = useTranslation()

  const sortedFolders = [...folders].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  )

  const handleSelect = (folderName: string) => {
    onMove(folderName)
    onClose()
  }

  return (
    <RadixAlertDialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/40 backdrop-blur-xs" />
        <RadixAlertDialog.Content className="animate-show fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-100 bg-white p-6 shadow-xl">
          <div className="border-gray-150 flex items-center justify-between border-b pb-3">
            <RadixAlertDialog.Title className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Folder className="text-primary size-5" />
              <span>{t("manager:quizz.moveToFolder")}</span>
            </RadixAlertDialog.Title>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="my-4 max-h-[300px] space-y-1 overflow-y-auto pr-1">
            {/* Root/No Folder Option */}
            <button
              onClick={() => handleSelect("")}
              className="hover:bg-primary/5 hover:border-primary/20 hover:text-primary flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-all"
            >
              <Home className="group-hover:text-primary size-4 shrink-0 text-gray-500" />
              <span>{t("manager:quizz.noFolder")}</span>
            </button>

            {sortedFolders.map((folder) => (
              <button
                key={folder}
                onClick={() => handleSelect(folder)}
                className="hover:bg-primary/5 hover:border-primary/20 hover:text-primary flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 text-left text-sm font-medium text-gray-700 transition-all"
              >
                <Folder className="group-hover:text-primary size-4 shrink-0 text-gray-500" />
                <span>{folder}</span>
              </button>
            ))}

            {folders.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400 italic">
                {t("manager:quizz.none")}
              </p>
            )}
          </div>

          <div className="border-gray-150 flex justify-end gap-2 border-t pt-3">
            <RadixAlertDialog.Cancel asChild>
              <Button
                onClick={onClose}
                className="border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200"
              >
                {t("common:cancel")}
              </Button>
            </RadixAlertDialog.Cancel>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  )
}

export default MoveToFolderModal
