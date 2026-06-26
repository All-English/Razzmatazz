import { Copy, FolderInput, MoreVertical, Star, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

interface Props {
  isFavorite: boolean
  onFavorite: () => void
  onMove: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const QuizKebabMenu = ({
  isFavorite,
  onFavorite,
  onDuplicate,
  onMove,
  onDelete,
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
        const menuHeight = 180 // approximate dropdown height
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
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <MoreVertical className="size-4 shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 z-30 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl animate-fade-in divide-y divide-gray-50 ${
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(false)
          }}
        >
          <div className="py-1">
            {/* Favorite / Unfavorite */}
            <button
              onClick={onFavorite}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <Star className={`size-4 shrink-0 ${isFavorite ? "fill-primary text-primary" : "text-gray-400"}`} />
              <span>{isFavorite ? t("manager:quizz.unfavorite") : t("manager:quizz.favorite")}</span>
            </button>

            {/* Move to folder */}
            <button
              onClick={onMove}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <FolderInput className="size-4 shrink-0 text-gray-400" />
              <span>{t("manager:quizz.moveToFolder")}</span>
            </button>

            {/* Duplicate */}
            <button
              onClick={onDuplicate}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <Copy className="size-4 shrink-0 text-gray-400" />
              <span>{t("manager:quizz.duplicate")}</span>
            </button>
          </div>

          {/* Delete */}
          <div className="py-1">
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
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
