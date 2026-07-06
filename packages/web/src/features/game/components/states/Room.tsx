import * as AlertDialog from "@radix-ui/react-alert-dialog"
import { EVENTS } from "@razzia/common/constants"
import type { Player } from "@razzia/common/types/game"
import type { ManagerStatusDataMap } from "@razzia/common/types/game/status"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useGameModeStore } from "@razzia/web/features/game/stores/gameMode"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { useOnClickOutside } from "@razzia/web/hooks/useOnClickOutside"
import { useConfig } from "@razzia/web/features/manager/contexts/config-context"
import { buildFolderTree, type FolderNode } from "@razzia/web/features/manager/components/configurations/FolderSidebar"
import { Maximize2, X, Check, Folder, FolderHeart, FolderOpen, Search } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"
import { SFX } from "@razzia/web/features/game/utils/constants"
import toast from "react-hot-toast"
import clsx from "clsx"

interface Props {
  data: ManagerStatusDataMap["SHOW_ROOM"]
}

const Room = ({ data: { text, inviteCode } }: Props) => {
  const { gameId, players, activeQuizzId, setActiveQuizzId } = useManagerStore()
  const { socket } = useSocket()
  const webUrl = window.location.origin
  const [playerList, setPlayerList] = useState<Player[]>(players)
  const [totalPlayers, setTotalPlayers] = useState(players.length)
  const [qrOpen, setQrOpen] = useState(false)
  const { mode: gameMode, setMode: setGameMode } = useGameModeStore()
  const qrContentRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation(["game", "manager", "common", "errors"])

  useEffect(() => {
    setPlayerList(players)
    setTotalPlayers(players.length)
  }, [players])

  // Configuration options state
  const { quizz: quizzList, folders } = useConfig()
  const [shuffle, setShuffle] = useState(false)
  const [easyMode, setEasyMode] = useState(false)
  const [isLimitEnabled, setIsLimitEnabled] = useState(false)
  const [startIndex, setStartIndex] = useState(1)
  const [endIndex, setEndIndex] = useState(1)
  const [changeQuizOpen, setChangeQuizOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!changeQuizOpen) {
      setSearchQuery("")
      setSelectedFolder("all")
    }
  }, [changeQuizOpen])

  const filteredQuizzes = [...quizzList]
    .filter((q) => {
      if (selectedFolder === "favorites") {
        if (!q.favorite) return false
      } else if (selectedFolder !== "all") {
        if (q.folder !== selectedFolder) return false
      }

      if (searchQuery.trim()) {
        return q.subject.toLowerCase().includes(searchQuery.toLowerCase())
      }

      return true
    })
    .sort((a, b) =>
      a.subject.localeCompare(b.subject, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )

  const activeQuiz = quizzList.find((q) => q.id === activeQuizzId)
  const activeQuizName = activeQuiz?.subject ?? ""
  const activeQuizQuestionCount = activeQuiz?.questionCount ?? 0

  useEffect(() => {
    if (activeQuizQuestionCount) {
      setEndIndex((prev) =>
        prev === 1 || prev > activeQuizQuestionCount
          ? activeQuizQuestionCount
          : prev,
      )
    }
  }, [activeQuizQuestionCount])

  const isRangeInvalid =
    isLimitEnabled &&
    (!startIndex ||
      !endIndex ||
      startIndex < 1 ||
      endIndex < startIndex ||
      endIndex > activeQuizQuestionCount)

  const renderFolderButton = (node: FolderNode, depth: number) => {
    const isSelected = selectedFolder === node.path
    return (
      <div key={node.path}>
        <button
          onClick={() => setSelectedFolder(node.path)}
          className={clsx(
            "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all duration-200 mb-1",
            isSelected
              ? "border-primary bg-primary/5 text-primary font-bold"
              : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          )}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
          <Folder className="size-4 shrink-0" />
          <span className="truncate text-left">{node.name}</span>
        </button>
        {node.children.map((child) => renderFolderButton(child, depth + 1))}
      </div>
    )
  }

  const [playMusic, { stop: stopMusic }] = useSound(SFX.ANSWERS.MUSIC, {
    volume: 0.2,
    interrupt: true,
    loop: true,
  })

  useEffect(() => {
    playMusic()

    return () => {
      stopMusic()
    }
  }, [playMusic, stopMusic])

  useOnClickOutside({ ref: qrContentRef, handler: () => setQrOpen(false) })

  useEvent(EVENTS.MANAGER.NEW_PLAYER, (player) => {
    setPlayerList([...playerList, player])
  })

  useEvent(EVENTS.MANAGER.REMOVE_PLAYER, (playerId) => {
    setPlayerList(playerList.filter((p) => p.id !== playerId))
  })

  useEvent(EVENTS.MANAGER.PLAYER_KICKED, (playerId) => {
    setPlayerList(playerList.filter((p) => p.id !== playerId))
  })

  useEvent(EVENTS.GAME.TOTAL_PLAYERS, (total) => {
    setTotalPlayers(total)
  })

  const handleKick = (playerId: string) => () => {
    if (!gameId) {
      return
    }

    socket.emit(EVENTS.MANAGER.KICK_PLAYER, {
      gameId,
      playerId,
    })
  }

  const handleCloseQrCode = () => setQrOpen(false)

  const handleQuizChange = (quizId: string) => {
    if (!gameId) return

    const selectedQuizz = quizzList.find((q) => q.id === quizId)
    if (selectedQuizz?.hasMismatch) {
      toast.error(t("manager:quizz.hasMismatchError"))
      return
    }

    socket.emit(EVENTS.MANAGER.CHANGE_QUIZ, { gameId, quizzId: quizId })
    setActiveQuizzId(quizId)

    // Automatically adjust range values for the newly chosen quiz
    const qCount = selectedQuizz?.questionCount ?? 0
    setStartIndex(1)
    setEndIndex(qCount || 1)
    setIsLimitEnabled(false)

    setChangeQuizOpen(false)
  }

  const handleStartGame = () => {
    if (!gameId) return

    if (activeQuiz?.hasMismatch) {
      toast.error(t("manager:quizz.hasMismatchError"))
      return
    }

    if (isRangeInvalid) {
      toast.error(t("errors:game.invalidRange"))
      return
    }

    const startOptions = {
      shuffle,
      easyMode,
      ...(isLimitEnabled ? { startIndex: startIndex - 1, endIndex: endIndex - 1 } : {}),
    }

    socket.emit(EVENTS.MANAGER.START_GAME, {
      gameId,
      mode: gameMode,
      options: startOptions,
    })
  }

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-start px-4 py-6">
      <div className="flex w-full max-w-6xl flex-col items-start justify-center gap-6 lg:flex-row">
        {/* Left Column: Connection Instructions & Joined Players List */}
        <div className="flex w-full flex-1 flex-col gap-6 self-stretch">
          {/* Join Connection Panel */}
          <div className="mx-auto flex w-full max-w-2xl flex-col-reverse items-stretch justify-center gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-white/95 px-6 py-4 text-center shadow-xl backdrop-blur-md">
              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  {t("game:joinInstruction")}
                </p>
                <p className="mt-0.5 text-lg font-bold break-all text-gray-800">
                  {webUrl}
                </p>
              </div>

              <div className="my-3 h-0.5 w-full bg-gray-200" />

              <div>
                <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  {t("game:gamePinLabel")}
                </p>
                <p className="text-primary mt-1 text-6xl font-black tracking-widest drop-shadow-sm md:text-7xl">
                  {inviteCode}
                </p>
              </div>
            </div>

            <AlertDialog.Root open={qrOpen} onOpenChange={setQrOpen}>
              <AlertDialog.Trigger asChild>
                <div className="group relative flex aspect-square shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all hover:scale-105">
                  <QRCodeSVG
                    className="h-full w-full"
                    value={`${webUrl}?pin=${inviteCode}`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="rounded-xl bg-black/80 p-2 shadow-lg">
                      <Maximize2 className="size-5 text-white" />
                    </div>
                  </div>
                </div>
              </AlertDialog.Trigger>

              <AlertDialog.Portal>
                <AlertDialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                <AlertDialog.Content
                  ref={qrContentRef}
                  className="animate-scale-in fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl"
                >
                  <button
                    onClick={handleCloseQrCode}
                    className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-100"
                  >
                    <X className="size-6 text-gray-700" />
                  </button>
                  <QRCodeSVG
                    className="size-64 md:size-80 lg:size-[400px]"
                    value={`${webUrl}?pin=${inviteCode}`}
                  />
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>

          {/* Joined Players Monitor Box */}
          <div className="flex min-h-[350px] w-full flex-1 flex-col items-center rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur-md">
            <h2 className="mb-3 text-2xl font-bold text-white drop-shadow-lg">
              {t(text)}
            </h2>

            <div className="mb-4 flex items-center justify-center rounded-xl border border-white/5 bg-black/40 px-4 py-2 shadow-inner">
              <span className="text-base font-bold text-white drop-shadow-md">
                {t("game:playersJoined")}{" "}
                <span className="text-primary ml-1 font-extrabold">
                  {totalPlayers}
                </span>
              </span>
            </div>

            {/* Players Grid with Scrollbar */}
            <div className="flex max-h-[320px] w-full scrollbar-thin flex-wrap justify-center gap-2.5 overflow-y-auto rounded-xl border border-white/5 bg-black/10 p-3">
              {playerList.map((player) => (
                <div
                  key={player.id}
                  className="bg-primary group cursor-pointer rounded-xl px-4 py-2 font-bold text-white shadow-md transition-all hover:scale-95 hover:bg-rose-500"
                  onClick={handleKick(player.id)}
                  title={t("game:clickToKick", "Click to kick player")}
                >
                  <span className="text-xl drop-shadow-sm group-hover:line-through group-hover:decoration-2">
                    {player.username}
                  </span>
                </div>
              ))}
              {playerList.length === 0 && (
                <p className="animate-pulse py-8 text-sm font-medium text-white/40">
                  {t(
                    "game:waitingForPlayersToJoin",
                    "Waiting for players to connect...",
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Compact Settings Dashboard */}
        <div className="flex w-full shrink-0 flex-col gap-4 self-stretch rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md lg:w-96 lg:self-start">
          <h3 className="flex items-center justify-center gap-1.5 border-b border-white/10 pb-2 text-center text-lg font-bold text-white">
            ⚙️ {t("game:lobbySettings", "Lobby Settings")}
          </h3>

          <div className="flex flex-col gap-4">
            {/* Active Quiz and Change Quiz Button */}
            <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:flex-row">
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                  {t("manager:quizz.selected", "Active Quiz")}
                </p>
                <p
                  className="mt-0.5 truncate text-sm leading-snug font-bold text-white"
                  title={activeQuizName}
                >
                  {activeQuizName || t("manager:quizz.none")}
                </p>
              </div>
              <button
                onClick={() => setChangeQuizOpen(true)}
                className="w-full shrink-0 rounded-lg border border-white/10 bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-white/30 active:scale-95 sm:w-auto"
              >
                🔄 {t("common:change", "Change")}
              </button>
            </div>

            {/* Game Mode Choice */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wider text-white/60 uppercase">
                {t("game:gameModeLabel", "Game Mode")}
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setGameMode("competitive")}
                  className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                    gameMode === "competitive"
                      ? "bg-primary shadow-primary/20 scale-[1.02] text-white shadow-lg"
                      : "bg-white/10 text-white/70 hover:bg-white/15"
                  }`}
                >
                  ⚔️ {t("game:competitiveMode")}
                </button>
                <button
                  onClick={() => setGameMode("study")}
                  className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                    gameMode === "study"
                      ? "scale-[1.02] bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                      : "bg-white/10 text-white/70 hover:bg-white/15"
                  }`}
                >
                  📖 {t("game:studyMode")}
                </button>
              </div>
            </div>

            {/* Shuffle & Limit Range Options */}
            <div className="flex flex-col gap-3.5 border-t border-white/10 pt-3.5">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-white select-none hover:text-white/90">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={shuffle}
                    onChange={(e) => setShuffle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="h-5 w-9 rounded-full bg-white/10 border border-white/20 transition-all duration-200 peer-checked:bg-primary peer-checked:border-primary" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200 peer-checked:translate-x-4 shadow" />
                </div>
                <span>{t("manager:quizz.shuffle")}</span>
              </label>

              {gameMode === "competitive" && (
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-white select-none hover:text-white/90">
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      checked={easyMode}
                      onChange={(e) => setEasyMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="h-5 w-9 rounded-full bg-white/10 border border-white/20 transition-all duration-200 peer-checked:bg-primary peer-checked:border-primary" />
                    <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200 peer-checked:translate-x-4 shadow" />
                  </div>
                  <span>{t("manager:quizz.easyMode", "Easy Mode (Allow Multiple Attempts)")}</span>
                </label>
              )}

              <div className="flex flex-col gap-2.5">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-white select-none hover:text-white/90">
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      checked={isLimitEnabled}
                      onChange={(e) => {
                        setIsLimitEnabled(e.target.checked)
                        if (e.target.checked) {
                          setStartIndex(1)
                          setEndIndex(activeQuizQuestionCount || 1)
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="h-5 w-9 rounded-full bg-white/10 border border-white/20 transition-all duration-200 peer-checked:bg-primary peer-checked:border-primary" />
                    <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-all duration-200 peer-checked:translate-x-4 shadow" />
                  </div>
                  <span>{t("manager:quizz.limitRange")}</span>
                </label>

                {isLimitEnabled && (
                  <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-1.5 pl-12 text-xs font-semibold text-white/95 duration-200">
                    <span>{t("manager:quizz.fromQuestion")}</span>
                    <input
                      type="number"
                      value={startIndex === 0 ? "" : startIndex}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "") {
                          setStartIndex(0)
                          return
                        }
                        const num = parseInt(val, 10)
                        setStartIndex(num)
                      }}
                      onBlur={() => {
                        const max = activeQuizQuestionCount || 1
                        let start = Math.max(1, Math.min(startIndex || 1, max))
                        if (start > endIndex && endIndex > 0) {
                          start = endIndex
                        }
                        setStartIndex(start)
                      }}
                      className="focus:ring-primary w-14 rounded-lg border border-white/20 bg-white/10 p-1 text-center text-white focus:ring-1 focus:outline-none"
                      min={1}
                      max={activeQuizQuestionCount || 1}
                    />
                    <span>{t("manager:quizz.toQuestion")}</span>
                    <input
                      type="number"
                      value={endIndex === 0 ? "" : endIndex}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === "") {
                          setEndIndex(0)
                          return
                        }
                        const num = parseInt(val, 10)
                        setEndIndex(num)
                      }}
                      onBlur={() => {
                        const max = activeQuizQuestionCount || 1
                        let end = Math.max(1, Math.min(endIndex || max, max))
                        if (end < startIndex) {
                          end = startIndex
                        }
                        setEndIndex(end)
                      }}
                      className="focus:ring-primary w-14 rounded-lg border border-white/20 bg-white/10 p-1 text-center text-white focus:ring-1 focus:outline-none"
                      min={1}
                      max={activeQuizQuestionCount || 1}
                    />
                    <span className="text-[10px] font-normal text-white/50">
                      (max {activeQuizQuestionCount || 0})
                    </span>
                  </div>
                )}
                {isLimitEnabled && isRangeInvalid && (
                  <p className="mt-0.5 pl-7 text-[11px] font-semibold text-rose-400">
                    {t("errors:game.invalidRange")}
                  </p>
                )}
              </div>
            </div>

            {/* Start Game Action */}
            <div className="flex flex-col items-center border-t border-white/10 pt-4">
              <button
                onClick={handleStartGame}
                disabled={isRangeInvalid}
                className={clsx(
                  "flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5 text-lg font-extrabold text-white shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-95",
                  isRangeInvalid
                    ? "cursor-not-allowed bg-white/10 text-white/30 shadow-none"
                    : gameMode === "study"
                      ? "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-600"
                      : "bg-primary shadow-primary/20 hover:brightness-110",
                )}
              >
                🚀 {t("manager:quizz.startGame")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Quiz Modal */}
      <AlertDialog.Root open={changeQuizOpen} onOpenChange={setChangeQuizOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-all" />
          <AlertDialog.Content
            ref={modalRef}
            className="animate-scale-in fixed top-1/2 left-1/2 z-50 flex h-[600px] max-h-[85vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <AlertDialog.Title className="text-2xl font-bold text-gray-900">
                📚 {t("manager:quizz.changeQuizz", "Change Quiz")}
              </AlertDialog.Title>
              <button
                onClick={() => setChangeQuizOpen(false)}
                className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
              {/* Folder Sidebar */}
              <div className="flex w-52 shrink-0 flex-col gap-4 border-r border-gray-100 pr-4 select-none overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setSelectedFolder("all")}
                    className={clsx(
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all duration-200",
                      selectedFolder === "all"
                        ? "border-primary bg-primary/5 text-primary font-bold"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <FolderOpen className="size-4 shrink-0" />
                    <span className="truncate">{t("manager:sidebar.allQuizzes")}</span>
                  </button>

                  <button
                    onClick={() => setSelectedFolder("favorites")}
                    className={clsx(
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all duration-200",
                      selectedFolder === "favorites"
                        ? "border-primary bg-primary/5 text-primary font-bold"
                        : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    )}
                  >
                    <FolderHeart className="size-4 shrink-0" />
                    <span className="truncate">{t("manager:sidebar.favorites")}</span>
                  </button>
                </div>

                {folders.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="px-3 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      {t("manager:sidebar.yourFolders")}
                    </div>
                    <div className="flex flex-col gap-1">
                      {buildFolderTree(folders).map((node) => renderFolderButton(node, 0))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quiz List & Search */}
              <div className="flex flex-1 flex-col min-w-0 min-h-0">
                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("manager:quizz.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-10 pl-9.5 text-sm placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Quizzes List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 min-h-0">
                  {filteredQuizzes.map((quizz) => {
                    const hasMismatch = Boolean(quizz.hasMismatch)
                    const isCurrentActive = quizz.id === activeQuizzId

                    return (
                      <div
                        key={quizz.id}
                        onClick={() => handleQuizChange(quizz.id)}
                        className={clsx(
                          "flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all duration-200 select-none",
                          hasMismatch
                            ? "border-rose-100 bg-rose-50/50 opacity-75 hover:border-rose-300 hover:opacity-100"
                            : isCurrentActive
                              ? "border-primary bg-primary/5 ring-primary shadow-sm ring-1"
                              : "hover:border-primary/50 border-gray-200 bg-white hover:bg-gray-50",
                        )}
                      >
                        <div className="flex flex-col gap-1 min-w-0 flex-1 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900 truncate">
                              {quizz.subject}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 shrink-0">
                              {t("manager:quizz.questionsCount", {
                                count: quizz.questionCount ?? 0,
                              })}
                            </span>
                            {isCurrentActive && (
                              <span className="bg-primary rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shrink-0">
                                {t("common:active", "Active")}
                              </span>
                            )}
                          </div>
                          {hasMismatch && (
                            <span className="mt-1 text-xs font-medium text-rose-600">
                              ⚠️ {t("manager:quizz.mismatchBadge")} —{" "}
                              {t("manager:quizz.mismatchTooltip")}
                            </span>
                          )}
                        </div>

                        <div
                          className={clsx(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                            isCurrentActive
                              ? "bg-primary border-primary"
                              : "border-gray-300",
                          )}
                        >
                          {isCurrentActive && (
                            <Check className="size-4 stroke-[3.5] text-white" />
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {filteredQuizzes.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      <p className="text-sm font-medium">{t("manager:quizz.notFound")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
              <AlertDialog.Cancel asChild>
                <button
                  onClick={() => setChangeQuizOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t("common:close", "Close")}
                </button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}

export default Room
