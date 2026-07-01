import { EVENTS } from "@razzia/common/constants"
import { quizzValidator } from "@razzia/common/validators/quizz"
import Button from "@razzia/web/components/Button"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import {
  isDerivationSuccessful,
  deriveCorrectChunks,
  isValidChunksOrder,
} from "@razzia/web/features/quizz/utils/chunks"
import type { Question } from "@razzia/common/types/game"
import AlertDialog from "@razzia/web/components/AlertDialog"
import QuizKebabMenu from "@razzia/web/features/manager/components/configurations/QuizKebabMenu"
import MoveToFolderModal from "@razzia/web/features/manager/components/configurations/MoveToFolderModal"
import BulkActionBar from "@razzia/web/features/manager/components/configurations/BulkActionBar"
import { useNavigate } from "@tanstack/react-router"
import {
  Calendar,
  Hash,
  Pencil,
  Plus,
  Rocket,
  Search,
  Star,
  Upload,
} from "lucide-react"
import { type ChangeEvent, useEffect, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

interface Props {
  selectedFolder: string
}

const formatRelativeTime = (isoString?: string, t?: any) => {
  if (!isoString) return "-"
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (!t) return "-"

  if (diffMins < 1) return t("manager:quizz.relativeTime.justNow", "Just now")
  if (diffMins < 60)
    return t("manager:quizz.relativeTime.minsAgo", "{{count}}m ago", {
      count: diffMins,
    })
  if (diffHours < 24)
    return t("manager:quizz.relativeTime.hoursAgo", "{{count}}h ago", {
      count: diffHours,
    })
  if (diffDays === 1)
    return t("manager:quizz.relativeTime.yesterday", "Yesterday")
  if (diffDays < 30)
    return t("manager:quizz.relativeTime.daysAgo", "{{count}}d ago", {
      count: diffDays,
    })

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const QuizListPanel = ({ selectedFolder }: Props) => {
  const { quizz } = useConfig()
  const { socket } = useSocket()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingMismatchedSubjects = useRef<string[]>([])

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Clear checkboxes when folder changes
  useEffect(() => {
    setSelectedIds([])
  }, [selectedFolder])

  // Modals state
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false)
  const [activeMoveQuizId, setActiveMoveQuizId] = useState<string | null>(null)
  const [quizzToDelete, setQuizzToDelete] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Redirect to mismatched quiz once saved and loaded
  useEffect(() => {
    if (pendingMismatchedSubjects.current.length === 0) {
      return
    }

    const match = quizz.find((q) =>
      pendingMismatchedSubjects.current.includes(
        q.subject.toLowerCase().trim(),
      ),
    )

    if (match) {
      const matchSubject = match.subject.toLowerCase().trim()
      pendingMismatchedSubjects.current =
        pendingMismatchedSubjects.current.filter((s) => s !== matchSubject)

      navigate({
        to: "/manager/quizz/$quizzId",
        params: { quizzId: match.id },
      })
    }
  }, [quizz, navigate])

  useEvent(EVENTS.QUIZZ.ERROR, (message) => {
    toast.error(t(message))
  })

  // Filter quizzes based on selected folder and search query
  const filteredQuizzes = quizz.filter((q) => {
    // 1. Folder filter
    if (selectedFolder === "favorites") {
      if (!q.favorite) return false
    } else if (selectedFolder !== "all") {
      if (q.folder !== selectedFolder) return false
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      return q.subject.toLowerCase().includes(searchQuery.toLowerCase())
    }

    return true
  })

  // Sort "All Quizzes" by last modified instead of title
  if (selectedFolder === "all") {
    filteredQuizzes.sort((a, b) => {
      const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0
      const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0
      return bTime - aTime
    })
  }

  // Multi-select helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredQuizzes.map((q) => q.id))
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

  // Row operations
  const handleHostGame = (id: string) => {
    socket.emit(EVENTS.GAME.CREATE, id)
  }

  const handleToggleFavorite = (id: string) => {
    socket.emit(EVENTS.QUIZZ.TOGGLE_FAVORITE, [id])
  }

  const handleDuplicate = (id: string) => {
    socket.emit(EVENTS.QUIZZ.DUPLICATE, id)
    toast.success(t("manager:quizz.duplicated"))
  }

  const handleMoveSingle = (folder: string) => {
    if (activeMoveQuizId) {
      socket.emit(EVENTS.QUIZZ.MOVE, { ids: [activeMoveQuizId], folder })
      toast.success(
        folder
          ? t("manager:quizz.movedToFolder", { folder })
          : t("manager:quizz.movedToRoot"),
      )
      setActiveMoveQuizId(null)
    }
  }

  const handleSoftDelete = (id: string) => {
    socket.emit(EVENTS.QUIZZ.SOFT_DELETE, [id])
    toast.success(t("manager:quizz.deleted"))
    setSelectedIds((prev) => prev.filter((item) => item !== id))
  }

  // Bulk operations
  const handleBulkMove = (folder: string) => {
    socket.emit(EVENTS.QUIZZ.MOVE, { ids: selectedIds, folder })
    toast.success(
      folder
        ? t("manager:quizz.movedToFolder", { folder })
        : t("manager:quizz.movedToRoot"),
    )
    setSelectedIds([])
  }

  const handleBulkFavorite = () => {
    socket.emit(EVENTS.QUIZZ.TOGGLE_FAVORITE, selectedIds)
    setSelectedIds([])
  }

  const handleBulkDuplicate = () => {
    selectedIds.forEach((id) => socket.emit(EVENTS.QUIZZ.DUPLICATE, id))
    toast.success(t("manager:quizz.duplicated"))
    setSelectedIds([])
  }

  const handleBulkSoftDelete = () => {
    socket.emit(EVENTS.QUIZZ.SOFT_DELETE, selectedIds)
    toast.success(t("manager:quizz.deleted"))
    setSelectedIds([])
  }

  const handleBulkCombine = (subject: string) => {
    const activeFolder =
      selectedFolder !== "all" &&
      selectedFolder !== "favorites" &&
      selectedFolder !== "trash"
        ? selectedFolder
        : undefined
    socket.emit(EVENTS.QUIZZ.COMBINE, {
      ids: selectedIds,
      subject,
      folder: activeFolder,
    })
    toast.success(t("manager:quizz.combined"))
    setSelectedIds([])
  }

  // JSON Import
  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target
    if (!files || files.length === 0) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as {
            questions?: Array<Partial<Question>>
            subject?: string
          }

          // Auto-heal correctChunks & scramble correct-order chunks
          if (parsed.questions && Array.isArray(parsed.questions)) {
            parsed.questions = parsed.questions.map((q) => {
              if (!q.correctSentence || !q.scrambledChunks) {
                return q
              }

              let nextScrambled = [...q.scrambledChunks]
              let nextCorrect = q.correctChunks

              if (isValidChunksOrder(q.correctSentence, nextScrambled)) {
                const shuffle = (arr: string[]) => {
                  const next = [...arr]
                  for (let i = next.length - 1; i > 0; i -= 1) {
                    const j = Math.floor(Math.random() * (i + 1))
                    const temp = next[i]
                    next[i] = next[j]
                    next[j] = temp
                  }
                  return next
                }

                let attempts = 0
                let shuffled = shuffle(nextScrambled)
                while (attempts < 10 && isValidChunksOrder(q.correctSentence, shuffled)) {
                  shuffled = shuffle(nextScrambled)
                  attempts += 1
                }
                nextScrambled = shuffled
                nextCorrect = deriveCorrectChunks(q.correctSentence, nextScrambled)
              } else if (
                !nextCorrect ||
                !isValidChunksOrder(q.correctSentence, nextCorrect) ||
                nextCorrect.length !== nextScrambled.length
              ) {
                const healed = deriveCorrectChunks(
                  q.correctSentence,
                  nextScrambled,
                )
                if (healed.length > 0) {
                  nextCorrect = healed
                }
              }

              return {
                ...q,
                scrambledChunks: nextScrambled,
                correctChunks: nextCorrect,
              }
            })
          }

          const result = quizzValidator.safeParse(parsed)
          if (!result.success) {
            toast.error(
              `${file.name}: ${result.error.issues
                .map((i) => t(i.message))
                .join(", ")}`,
            )
            return
          }

          // Check for mismatch
          const mismatchedIndices: number[] = []
          result.data.questions.forEach((q, index) => {
            if (
              q.correctSentence.trim() !== "" &&
              !isDerivationSuccessful(q.correctSentence, q.scrambledChunks)
            ) {
              mismatchedIndices.push(index + 1)
            }
          })

          if (mismatchedIndices.length > 0 && files.length === 1) {
            pendingMismatchedSubjects.current.push(
              result.data.subject.toLowerCase().trim(),
            )
          }

          const activeFolder =
            selectedFolder !== "all" &&
            selectedFolder !== "favorites" &&
            selectedFolder !== "trash"
              ? selectedFolder
              : undefined
          socket.emit(EVENTS.QUIZZ.SAVE, {
            ...result.data,
            folder: activeFolder,
          })

          if (mismatchedIndices.length > 0) {
            setTimeout(() => {
              toast.error(
                t("quizz:importMismatchWarning", {
                  subject: result.data.subject,
                  questions: mismatchedIndices.join(", "),
                }),
                { duration: 6000 },
              )
            }, 500)
          }
        } catch {
          toast.error(`Invalid JSON file: ${file.name}`)
        }
      }
      reader.readAsText(file)
    })

    e.target.value = ""
  }

  const isAllSelected =
    filteredQuizzes.length > 0 && selectedIds.length === filteredQuizzes.length

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-y-auto bg-white p-8 select-none">
      {/* Top Action Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-2.5 left-3 size-4.5 text-gray-400" />
          <input
            type="text"
            placeholder={t("manager:quizz.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pr-4 pl-10 text-sm outline-none focus:ring-1"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              const activeFolder =
                selectedFolder !== "all" &&
                selectedFolder !== "favorites" &&
                selectedFolder !== "trash"
                  ? selectedFolder
                  : undefined
              navigate({
                to: "/manager/quizz",
                search: activeFolder ? { folder: activeFolder } : undefined,
              })
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
          >
            <Plus className="size-4" />
            <span>{t("manager:quizz.create")}</span>
          </Button>

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            title={t("manager:quizz.import")}
          >
            <Upload className="size-4" />
            <span>{t("manager:quizz.importShort")}</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Quiz Table */}
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
              <th className="px-4 py-3">{t("manager:quizz.title")}</th>
              <th className="w-32 px-4 py-3">
                <div className="flex items-center gap-1">
                  <Hash className="size-3.5" />
                  <span>{t("manager:quizz.questions")}</span>
                </div>
              </th>
              <th className="w-48 px-4 py-3">
                <div className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  <span>{t("manager:quizz.lastModified")}</span>
                </div>
              </th>
              <th className="w-16 px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredQuizzes.map((q) => {
              const isChecked = selectedIds.includes(q.id)
              return (
                <tr
                  key={q.id}
                  className={`group transition-colors hover:bg-gray-100/70 ${
                    isChecked ? "bg-primary/5" : ""
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
                  <td className="px-4 py-3.5 font-medium text-gray-900">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-[300px] truncate md:max-w-[400px]">
                        {q.subject}
                      </span>
                      {q.favorite && (
                        <Star className="fill-primary text-primary size-4 shrink-0" />
                      )}
                      {q.hasMismatch && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 border border-rose-100 shrink-0"
                          title={t("manager:quizz.mismatchTooltip")}
                        >
                          ⚠️ {t("manager:quizz.mismatchBadge")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                      {q.questionCount ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-500 w-48">
                    <div className="flex items-center group-hover:hidden h-[30px]">
                      {formatRelativeTime(q.lastModified, t)}
                    </div>
                    <div className="hidden items-center gap-1.5 group-hover:flex h-[30px]">
                      {/* Host */}
                      <button
                        onClick={() => handleHostGame(q.id)}
                        className="bg-primary hover:bg-primary/95 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-xs"
                      >
                        <Rocket className="size-3.5" />
                        <span>{t("manager:quizz.host")}</span>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() =>
                          navigate({
                            to: "/manager/quizz/$quizzId",
                            params: { quizzId: q.id },
                          })
                        }
                        className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-700 shadow-xs transition-colors hover:bg-gray-50 hover:text-gray-900 flex items-center gap-1 text-xs font-semibold"
                        title={t("manager:quizz.edit")}
                      >
                        <Pencil className="size-3.5" />
                        <span>{t("manager:quizz.edit")}</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right w-16">
                    <div className="flex items-center justify-end">
                      {/* Kebab Dropdown Options */}
                      <QuizKebabMenu
                        isFavorite={!!q.favorite}
                        onFavorite={() => handleToggleFavorite(q.id)}
                        onDuplicate={() => handleDuplicate(q.id)}
                        onMove={() => {
                          setActiveMoveQuizId(q.id)
                          setMoveModalOpen(true)
                        }}
                        onDelete={() => setQuizzToDelete(q.id)}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}

            {filteredQuizzes.length === 0 && (
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

      {/* Move To Folder Modal (Single Quiz) */}
      <MoveToFolderModal
        isOpen={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false)
          setActiveMoveQuizId(null)
        }}
        onMove={handleMoveSingle}
      />

      {/* Move To Folder Modal (Bulk Quizzes) */}
      <MoveToFolderModal
        isOpen={bulkMoveModalOpen}
        onClose={() => setBulkMoveModalOpen(false)}
        onMove={handleBulkMove}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onMove={() => setBulkMoveModalOpen(true)}
        onFavorite={handleBulkFavorite}
        onDuplicate={handleBulkDuplicate}
        onCombine={handleBulkCombine}
        onDelete={() => setBulkDeleteOpen(true)}
      />

      {quizzToDelete && (
        <AlertDialog
          open={!!quizzToDelete}
          onOpenChange={(open) => {
            if (!open) setQuizzToDelete(null)
          }}
          title={t("manager:quizz.delete")}
          description={t("manager:quizz.deleteConfirm", {
            name: quizz.find((q) => q.id === quizzToDelete)?.subject ?? "",
          })}
          confirmLabel={t("common:delete")}
          onConfirm={() => {
            handleSoftDelete(quizzToDelete)
            setQuizzToDelete(null)
          }}
        />
      )}

      {bulkDeleteOpen && (
        <AlertDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          title={t("manager:quizz.delete")}
          description={t("manager:quizz.deleteConfirm", {
            name: `${selectedIds.length} selected quizzes`,
          })}
          confirmLabel={t("common:delete")}
          onConfirm={() => {
            handleBulkSoftDelete()
            setBulkDeleteOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default QuizListPanel
