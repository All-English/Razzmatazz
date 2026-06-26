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
import { Maximize2, X, Check } from "lucide-react"
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
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [qrOpen, setQrOpen] = useState(false)
  const { mode: gameMode, setMode: setGameMode } = useGameModeStore()
  const qrContentRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Configuration options state
  const { quizz: quizzList } = useConfig()
  const [shuffle, setShuffle] = useState(false)
  const [isLimitEnabled, setIsLimitEnabled] = useState(false)
  const [startIndex, setStartIndex] = useState(1)
  const [endIndex, setEndIndex] = useState(1)
  const [changeQuizOpen, setChangeQuizOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

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

    const startOptions = isLimitEnabled
      ? { startIndex: startIndex - 1, endIndex: endIndex - 1, shuffle }
      : { shuffle }

    socket.emit(EVENTS.MANAGER.START_GAME, {
      gameId,
      mode: gameMode,
      options: startOptions,
    })
  }

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-start px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl items-start justify-center">
        
        {/* Left Column: Connection Instructions & Joined Players List */}
        <div className="flex flex-col gap-6 flex-1 w-full self-stretch">
          
          {/* Join Connection Panel */}
          <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row justify-center w-full max-w-2xl mx-auto">
            <div className="flex flex-col justify-center items-center text-center rounded-2xl bg-white/95 px-6 py-4 shadow-xl backdrop-blur-md flex-1">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("game:joinInstruction")}</p>
                <p className="text-lg font-bold text-gray-800 break-all mt-0.5">
                  {webUrl}
                </p>
              </div>

              <div className="my-3 h-0.5 w-full bg-gray-200" />

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("game:gamePinLabel")}</p>
                <p className="text-6xl md:text-7xl font-black text-primary tracking-widest mt-1 drop-shadow-sm">{inviteCode}</p>
              </div>
            </div>

            <AlertDialog.Root open={qrOpen} onOpenChange={setQrOpen}>
              <AlertDialog.Trigger asChild>
                <div className="group relative flex aspect-square shrink-0 cursor-pointer rounded-2xl bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all hover:scale-105 justify-center items-center">
                  <QRCodeSVG
                    className="h-full w-full"
                    value={`${webUrl}?pin=${inviteCode}`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl opacity-0 transition-opacity bg-black/45 group-hover:opacity-100">
                    <div className="rounded-xl bg-black/80 p-2 shadow-lg">
                      <Maximize2 className="size-5 text-white" />
                    </div>
                  </div>
                </div>
              </AlertDialog.Trigger>

              <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in" />
                <AlertDialog.Content
                  ref={qrContentRef}
                  className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-2xl animate-scale-in"
                >
                  <button
                    onClick={handleCloseQrCode}
                    className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow-lg hover:bg-gray-100 transition-colors"
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
          <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl backdrop-blur-md w-full flex-1 min-h-[350px]">
            <h2 className="mb-3 text-2xl font-bold text-white drop-shadow-lg">
              {t(text)}
            </h2>

            <div className="mb-4 flex items-center justify-center rounded-xl bg-black/40 px-4 py-2 border border-white/5 shadow-inner">
              <span className="text-base font-bold text-white drop-shadow-md">
                {t("game:playersJoined")} <span className="text-primary font-extrabold ml-1">{totalPlayers}</span>
              </span>
            </div>

            {/* Players Grid with Scrollbar */}
            <div className="flex flex-wrap gap-2.5 justify-center w-full overflow-y-auto max-h-[320px] p-3 bg-black/10 rounded-xl border border-white/5 scrollbar-thin">
              {playerList.map((player) => (
                <div
                  key={player.id}
                  className="bg-primary rounded-xl px-4 py-2 font-bold text-white shadow-md hover:bg-rose-500 hover:scale-95 transition-all cursor-pointer group"
                  onClick={handleKick(player.id)}
                  title={t("game:clickToKick", "Click to kick player")}
                >
                  <span className="text-xl drop-shadow-sm group-hover:line-through group-hover:decoration-2">
                    {player.username}
                  </span>
                </div>
              ))}
              {playerList.length === 0 && (
                <p className="text-white/40 text-sm py-8 font-medium animate-pulse">
                  {t("game:waitingForPlayersToJoin", "Waiting for players to connect...")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Compact Settings Dashboard */}
        <div className="w-full lg:w-96 shrink-0 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4 self-stretch lg:self-start">
          <h3 className="text-lg font-bold text-white text-center flex items-center justify-center gap-1.5 border-b border-white/10 pb-2">
            ⚙️ {t("game:lobbySettings", "Lobby Settings")}
          </h3>

          <div className="flex flex-col gap-4">
            {/* Active Quiz and Change Quiz Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-white/5 p-3 border border-white/10">
              <div className="text-center sm:text-left min-w-0 flex-1">
                <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">{t("manager:quizz.selected", "Active Quiz")}</p>
                <p className="text-sm font-bold text-white mt-0.5 leading-snug truncate" title={activeQuizName}>
                  {activeQuizName || t("manager:quizz.none")}
                </p>
              </div>
              <button
                onClick={() => setChangeQuizOpen(true)}
                className="w-full sm:w-auto rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 transition-all active:scale-95 border border-white/10 shrink-0"
              >
                🔄 {t("manager:changeQuizz", "Change")}
              </button>
            </div>

            {/* Game Mode Choice */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{t("game:gameModeLabel", "Game Mode")}</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setGameMode("competitive")}
                  className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                    gameMode === "competitive"
                      ? "bg-primary scale-[1.02] text-white shadow-lg shadow-primary/20"
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
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-white select-none hover:text-white/90">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(e) => setShuffle(e.target.checked)}
                  className="text-primary focus:ring-primary size-4.5 cursor-pointer rounded border-white/20 bg-white/10"
                />
                <span>{t("manager:quizz.shuffle")}</span>
              </label>

              <div className="flex flex-col gap-2.5">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-white select-none hover:text-white/90">
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
                    className="text-primary focus:ring-primary size-4.5 cursor-pointer rounded border-white/20 bg-white/10"
                  />
                  <span>{t("manager:quizz.limitRange")}</span>
                </label>

                {isLimitEnabled && (
                  <div className="flex items-center gap-1.5 pl-7 text-xs font-semibold text-white/95 animate-in fade-in slide-in-from-top-1 duration-200">
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
                      className="w-14 rounded-lg border border-white/20 bg-white/10 p-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-primary"
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
                      className="w-14 rounded-lg border border-white/20 bg-white/10 p-1 text-center text-white focus:outline-none focus:ring-1 focus:ring-primary"
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
            <div className="border-t border-white/10 pt-4 flex flex-col items-center">
              <button
                onClick={handleStartGame}
                disabled={isRangeInvalid}
                className={clsx(
                  "w-full py-3.5 text-lg font-extrabold text-white rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-1.5",
                  isRangeInvalid
                    ? "bg-white/10 text-white/30 cursor-not-allowed shadow-none"
                    : gameMode === "study"
                    ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                    : "bg-primary hover:brightness-110 shadow-primary/20",
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
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-all animate-fade-in" />
          <AlertDialog.Content
            ref={modalRef}
            className="fixed top-1/2 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col animate-scale-in"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
              <AlertDialog.Title className="text-2xl font-bold text-gray-900">
                📚 {t("manager:changeQuizz", "Change Quizz")}
              </AlertDialog.Title>
              <button
                onClick={() => setChangeQuizOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {[...quizzList]
                .sort((a, b) => a.subject.localeCompare(b.subject, undefined, { numeric: true, sensitivity: "base" }))
                .map((quizz) => {
                  const hasMismatch = Boolean(quizz.hasMismatch)
                  const isCurrentActive = quizz.id === activeQuizzId

                  return (
                    <div
                      key={quizz.id}
                      onClick={() => handleQuizChange(quizz.id)}
                      className={clsx(
                        "flex items-center justify-between rounded-xl p-4 border transition-all duration-200 cursor-pointer select-none",
                        hasMismatch
                          ? "bg-rose-50/50 border-rose-100 opacity-75 hover:opacity-100 hover:border-rose-300"
                          : isCurrentActive
                          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                          : "border-gray-200 bg-white hover:border-primary/50 hover:bg-gray-50",
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {quizz.subject}
                          </span>
                          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                            {t("manager:quizz.questionsCount", {
                              count: quizz.questionCount ?? 0,
                            })}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {t("common:current", "Active")}
                            </span>
                          )}
                        </div>
                        {hasMismatch && (
                          <span className="text-xs text-rose-600 font-medium mt-1">
                            ⚠️ {t("manager:quizz.mismatchBadge")} — {t("manager:quizz.mismatchTooltip")}
                          </span>
                        )}
                      </div>

                      <div
                        className={clsx(
                          "size-6 rounded-full flex items-center justify-center border transition-all duration-200",
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

              {quizzList.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>{t("manager:quizz.notFound")}</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4 flex justify-end">
              <AlertDialog.Cancel asChild>
                <button
                  onClick={() => setChangeQuizOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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
