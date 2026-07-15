import { EVENTS } from "@razzia/common/constants"
import type { PracticeProgress } from "@razzia/common/types/game"
import type { ManagerStatusDataMap } from "@razzia/common/types/game/status"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { SFX } from "@razzia/web/features/game/utils/constants"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"

interface Props {
  data: ManagerStatusDataMap["PRACTICE_PROGRESS"]
}

const PracticeDashboard = ({
  data: { students: initialStudents, subject },
}: Props) => {
  const { t } = useTranslation()
  const { socket } = useSocket()
  const { gameId } = useManagerStore()
  const [students, setStudents] = useState<PracticeProgress[]>(initialStudents)

  const [showProgress, setShowProgress] = useState<boolean>(
    () => localStorage.getItem("razzia_show_practice_progress") !== "false",
  )

  const toggleShowProgress = () => {
    const nextVal = !showProgress

    setShowProgress(nextVal)
    localStorage.setItem("razzia_show_practice_progress", String(nextVal))
  }

  const [playMusic, { stop: stopMusic }] = useSound(SFX.ANSWERS.MUSIC, {
    volume: 0.2,
    interrupt: true,
    loop: true,
  })

  useEffect(() => {
    playMusic()
  }, [playMusic])

  const stopMusicRef = useRef(stopMusic)
  useEffect(() => {
    stopMusicRef.current = stopMusic
  }, [stopMusic])

  useEffect(() => {
    return () => {
      stopMusicRef.current()
    }
  }, [])

  useEvent(EVENTS.MANAGER.PRACTICE_PROGRESS, ({ students: updated }) => {
    setStudents(updated)
  })

  const allComplete = students.every((s) => s.completed === s.total)

  return (
    <section className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-start px-4 py-8">
      <h1 className="mb-2 text-center text-4xl font-black text-white drop-shadow-md md:text-5xl">
        {subject}
      </h1>
      <h2 className="mb-2 text-2xl font-bold text-white/90 drop-shadow-lg md:text-3xl">
        📖 {t("game:practiceMode")}
      </h2>
      <p className="mb-8 text-lg text-white/70">
        {t("game:practiceModeDescription")}
      </p>

      {/* Visibility Toggle Button */}
      <div className="mb-4 flex w-full justify-end">
        <button
          type="button"
          onClick={toggleShowProgress}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition-all active:scale-95 ${
            showProgress
              ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
              : "border-white/20 bg-white/10 text-white/80"
          }`}
        >
          <span>
            {showProgress
              ? `👁️ ${t("game:progressVisible", "Progress: Visible")}`
              : `🙈 ${t("game:progressHidden", "Progress: Hidden")}`}
          </span>
        </button>
      </div>

      <div className="w-full space-y-3">
        {students.map((student) => {
          const pct =
            student.total > 0
              ? Math.round((student.completed / student.total) * 100)
              : 0
          const isComplete = student.completed === student.total

          return (
            <div
              key={student.playerId}
              className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm"
            >
              <div className="flex min-w-[120px] items-center gap-2">
                <p className="text-lg font-bold text-white">
                  {student.username}
                </p>
                {showProgress && student.practiceRound > 1 && (
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-bold tracking-wider text-blue-200 uppercase">
                    Round {student.practiceRound}
                  </span>
                )}
              </div>

              <div className="flex-1">
                {showProgress ? (
                  <div className="h-4 w-full overflow-hidden rounded-full bg-black/30">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isComplete ? "bg-emerald-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 italic">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                    </span>
                    {t("game:studentActive", "Active")}
                  </div>
                )}
              </div>

              {showProgress && (
                <>
                  <div className="min-w-[60px] text-right">
                    <span
                      className={`text-lg font-bold ${
                        isComplete ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {student.completed}/{student.total}
                    </span>
                  </div>

                  {isComplete && (
                    <span className="text-2xl" title="Complete">
                      ✅
                    </span>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {allComplete && students.length > 0 && (
        <div className="mt-8 rounded-2xl bg-emerald-500/30 px-8 py-4 text-center backdrop-blur-sm">
          <p className="text-2xl font-bold text-white">
            🎉 {t("game:allStudentsComplete")}
          </p>
        </div>
      )}

      {/* Play Again — always available so manager can switch modes at any time */}
      <div className="mt-8 flex w-full justify-center">
        <button
          type="button"
          onClick={() => {
            if (gameId) socket.emit(EVENTS.MANAGER.PLAY_AGAIN, { gameId })
          }}
          className={`rounded-2xl border px-8 py-3 text-lg font-black shadow-lg transition-all active:scale-95 ${
            allComplete && students.length > 0
              ? "border-white/30 bg-white text-black hover:bg-gray-100"
              : "border-white/20 bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          🏠 {t("game:backToLobby")}
        </button>
      </div>
    </section>
  )
}

export default PracticeDashboard
