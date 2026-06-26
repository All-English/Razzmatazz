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

  const handleSelect = (folderName: string) => {
    onMove(folderName)
    onClose()
  }

  return (
    <RadixAlertDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-fade-in" />
        <RadixAlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl animate-show border border-gray-100">
          <div className="flex items-center justify-between border-b border-gray-150 pb-3">
            <RadixAlertDialog.Title className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Folder className="size-5 text-primary" />
              <span>{t("manager:quizz.moveToFolder")}</span>
            </RadixAlertDialog.Title>
            <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X className="size-5" />
            </button>
          </div>

          <div className="my-4 max-h-[300px] overflow-y-auto space-y-1 pr-1">
            {/* Root/No Folder Option */}
            <button
              onClick={() => handleSelect("")}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left font-medium"
            >
              <Home className="size-4 shrink-0 text-gray-500 group-hover:text-primary" />
              <span>{t("manager:quizz.noFolder")}</span>
            </button>

            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => handleSelect(folder)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 text-sm text-gray-700 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all text-left font-medium"
              >
                <Folder className="size-4 shrink-0 text-gray-500 group-hover:text-primary" />
                <span>{folder}</span>
              </button>
            ))}

            {folders.length === 0 && (
              <p className="text-center py-6 text-sm text-gray-400 italic">
                {t("manager:quizz.none")}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-150 pt-3">
            <RadixAlertDialog.Cancel asChild>
              <Button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200">
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
