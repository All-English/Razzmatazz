import { Copy, FolderInput, MoreVertical, Star, Trash2, Pencil, Rocket, Download } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

interface Props {
  isFavorite: boolean
  onFavorite: () => void
  onMove: () => void
  onDuplicate: () => void
  onDelete: () => void
  onHost: () => void
  onEdit: () => void
  onExport: () => void
}

const QuizKebabMenu = ({
  isFavorite,
  onFavorite,
  onDuplicate,
  onMove,
  onDelete,
  onHost,
  onEdit,
  onExport,
}: Props) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom")
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick)

      // Auto-flipping calculation
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const menuHeight = 210 // approximate compact dropdown height
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
          setPlacement("top")
        } else {
          setPlacement("bottom")
        }
      }
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="rounded-lg p-2 text-gray-500 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-700 dark:hover:text-zinc-200"
      >
        <MoreVertical className="size-4 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`animate-fade-in absolute right-0 z-30 w-44 divide-y divide-gray-50 dark:divide-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1 shadow-xl ${
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(false)
          }}
        >
          <div className="py-1">
            {/* Host */}
            <button
              onClick={onHost}
              className="hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
            >
              <Rocket className="size-4 shrink-0 text-gray-400 dark:text-zinc-550" />
              <span>{t("manager:quizz.host")}</span>
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className="hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
            >
              <Pencil className="size-4 shrink-0 text-gray-400 dark:text-zinc-550" />
              <span>{t("manager:quizz.edit")}</span>
            </button>

            <hr className="my-1 border-gray-100 dark:border-zinc-850" />

            {/* Favorite / Unfavorite */}
            <button
              onClick={onFavorite}
              className="hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
            >
              <Star
                className={`size-4 shrink-0 ${isFavorite ? "fill-primary text-primary" : "text-gray-400 dark:text-zinc-550"}`}
              />
              <span>
                {isFavorite
                  ? t("manager:quizz.unfavorite")
                  : t("manager:quizz.favorite")}
              </span>
            </button>

            {/* Move to folder */}
            <button
              onClick={onMove}
              className="hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
            >
              <FolderInput className="size-4 shrink-0 text-gray-400 dark:text-zinc-550" />
              <span>{t("manager:quizz.moveToFolder")}</span>
            </button>

            {/* Duplicate */}
            <button
              onClick={onDuplicate}
              className="hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
            >
              <Copy className="size-4 shrink-0 text-gray-400 dark:text-zinc-550" />
              <span>{t("manager:quizz.duplicate")}</span>
            </button>

            {/* Export as JSON */}
            <button
              onClick={onExport}
              className="hover:bg-primary/5 hover:text-primary dark:hover:bg-zinc-800 flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 transition-colors"
            >
              <Download className="size-4 shrink-0 text-gray-400 dark:text-zinc-550" />
              <span>{t("manager:quizz.export")}</span>
            </button>
          </div>

          {/* Delete */}
          <div className="py-1">
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="size-4 shrink-0 text-red-400" />
              <span>{t("common:delete")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuizKebabMenu
