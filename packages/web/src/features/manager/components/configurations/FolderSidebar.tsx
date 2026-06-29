import { EVENTS } from "@razzia/common/constants"
import AlertDialog from "@razzia/web/components/AlertDialog"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import {
  Folder,
  FolderHeart,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export type FolderSelection = "all" | "favorites" | "trash" | string

interface Props {
  selectedFolder: FolderSelection
  onSelectFolder: (_folder: FolderSelection) => void
}

const FolderSidebar = ({ selectedFolder, onSelectFolder }: Props) => {
  const { folders } = useConfig()
  const { socket } = useSocket()
  const { t } = useTranslation()

  // Folder creation state
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const createInputRef = useRef<HTMLInputElement>(null)

  // Folder renaming state
  const [editingFolderName, setEditingFolderName] = useState<string | null>(
    null,
  )
  const [renameValue, setRenameValue] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Menu popover state
  const [openMenuFolder, setOpenMenuFolder] = useState<string | null>(null)
  const [folderMenuPlacement, setFolderMenuPlacement] = useState<
    "bottom" | "top"
  >("bottom")
  const menuRef = useRef<HTMLDivElement>(null)

  // Folder to delete state
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus()
    }
  }, [isCreating])

  useEffect(() => {
    if (editingFolderName && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [editingFolderName])

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFolder(null)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  // Auto-flipping calculation for folder menu
  useEffect(() => {
    if (openMenuFolder && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuHeight = 100 // approximate height of folder menu (rename/delete)
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        setFolderMenuPlacement("top")
      } else {
        setFolderMenuPlacement("bottom")
      }
    }
  }, [openMenuFolder])

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newFolderName.trim()
    if (name) {
      socket.emit(EVENTS.MANAGER.CREATE_FOLDER, name)
      onSelectFolder(name) // automatically select the new folder
    }
    setNewFolderName("")
    setIsCreating(false)
  }

  const handleRenameFolder = (oldName: string) => (e: React.FormEvent) => {
    e.preventDefault()
    const newName = renameValue.trim()
    if (newName && newName !== oldName) {
      socket.emit(EVENTS.MANAGER.RENAME_FOLDER, { oldName, newName })
      if (selectedFolder === oldName) {
        onSelectFolder(newName)
      }
    }
    setEditingFolderName(null)
    setRenameValue("")
  }

  const handleDeleteFolder = (name: string) => {
    socket.emit(EVENTS.MANAGER.DELETE_FOLDER, name)
    if (selectedFolder === name) {
      onSelectFolder("all")
    }
    setOpenMenuFolder(null)
  }

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col justify-between border-r border-gray-200 bg-gray-100 p-4 select-none">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
        {/* Section Title */}
        <div className="flex items-center justify-between px-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
          <span>{t("manager:nav.library")}</span>
        </div>

        {/* Main List */}
        <div className="flex flex-col gap-1.5">
          {/* All Quizzes */}
          <button
            onClick={() => onSelectFolder("all")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              selectedFolder === "all"
                ? "border border-gray-200/50 bg-white font-semibold text-gray-900 shadow-xs"
                : "text-gray-700 hover:bg-gray-200/55"
            }`}
          >
            <FolderOpen
              className={`size-4 shrink-0 ${selectedFolder === "all" ? "text-primary" : "text-gray-500"}`}
            />
            <span className="truncate">{t("manager:sidebar.allQuizzes")}</span>
          </button>

          {/* Favorites */}
          <button
            onClick={() => onSelectFolder("favorites")}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
              selectedFolder === "favorites"
                ? "border border-gray-200/50 bg-white font-semibold text-gray-900 shadow-xs"
                : "text-gray-700 hover:bg-gray-200/55"
            }`}
          >
            <FolderHeart
              className={`size-4 shrink-0 ${selectedFolder === "favorites" ? "text-primary" : "text-gray-500"}`}
            />
            <span className="truncate">{t("manager:sidebar.favorites")}</span>
          </button>
        </div>

        {/* User Folders Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
            <span>{t("manager:sidebar.yourFolders")}</span>
            <button
              onClick={() => setIsCreating(true)}
              className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              title={t("manager:sidebar.newFolder")}
            >
              <FolderPlus className="size-4" />
            </button>
          </div>

          {/* Folder List */}
          <div className="flex flex-col gap-1">
            {isCreating && (
              <form onSubmit={handleCreateFolder} className="px-2 py-1">
                <input
                  ref={createInputRef}
                  type="text"
                  placeholder={t("manager:sidebar.newFolder") + "..."}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (!newFolderName.trim()) setIsCreating(false)
                    }, 200)
                  }}
                  className="focus:border-primary focus:ring-primary w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-1"
                />
              </form>
            )}

            {folders.map((folder) => {
              const isSelected = selectedFolder === folder
              const isEditing = editingFolderName === folder

              if (isEditing) {
                return (
                  <form
                    key={folder}
                    onSubmit={handleRenameFolder(folder)}
                    className="px-2 py-1"
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setEditingFolderName(null)}
                      className="focus:border-primary focus:ring-primary w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-1"
                    />
                  </form>
                )
              }

              return (
                <div
                  key={folder}
                  className={`group relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    isSelected
                      ? "border border-gray-200/50 bg-white font-semibold text-gray-900 shadow-xs"
                      : "text-gray-700 hover:bg-gray-200/55"
                  }`}
                >
                  <button
                    onClick={() => onSelectFolder(folder)}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <Folder
                      className={`size-4 shrink-0 ${isSelected ? "text-primary" : "text-gray-500"}`}
                    />
                    <span className="truncate pr-4 text-left">{folder}</span>
                  </button>

                  {/* Kebab Options */}
                  <div className="absolute top-1.5 right-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() =>
                        setOpenMenuFolder(
                          openMenuFolder === folder ? null : folder,
                        )
                      }
                      className="rounded-md p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {openMenuFolder === folder && (
                      <div
                        ref={menuRef}
                        className={`absolute right-0 z-20 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
                          folderMenuPlacement === "top"
                            ? "bottom-full mb-1"
                            : "top-full mt-1"
                        }`}
                      >
                        <button
                          onClick={() => {
                            setEditingFolderName(folder)
                            setRenameValue(folder)
                            setOpenMenuFolder(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Pencil className="size-3.5" />
                          <span>{t("manager:sidebar.renameFolder")}</span>
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button
                          onClick={() => {
                            setFolderToDelete(folder)
                            setOpenMenuFolder(null)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="size-3.5" />
                          <span>{t("manager:sidebar.deleteFolder")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {folders.length === 0 && !isCreating && (
              <p className="px-2 py-4 text-center text-xs text-gray-500 italic">
                {t("manager:quizz.none")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Trash */}
      <div className="mt-4 shrink-0 border-t border-gray-200/60 pt-4">
        <button
          onClick={() => onSelectFolder("trash")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
            selectedFolder === "trash"
              ? "border border-red-100 bg-red-50 font-semibold text-red-700 shadow-xs"
              : "text-gray-700 hover:bg-red-50/50 hover:text-red-600"
          }`}
        >
          <Trash2
            className={`size-4 shrink-0 ${selectedFolder === "trash" ? "text-red-500" : "text-gray-500"}`}
          />
          <span className="truncate">{t("manager:sidebar.trash")}</span>
        </button>
      </div>

      {folderToDelete && (
        <AlertDialog
          open={!!folderToDelete}
          onOpenChange={(open) => {
            if (!open) setFolderToDelete(null)
          }}
          title={t("manager:sidebar.deleteFolder")}
          description={t("manager:sidebar.deleteFolderConfirm", {
            name: folderToDelete,
          })}
          confirmLabel={t("common:delete")}
          onConfirm={() => {
            handleDeleteFolder(folderToDelete)
            setFolderToDelete(null)
          }}
        />
      )}
    </div>
  )
}

export default FolderSidebar
