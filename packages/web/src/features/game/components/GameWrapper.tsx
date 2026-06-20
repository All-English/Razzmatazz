import { EVENTS } from "@razzia/common/constants"
import { type Status, STATUS } from "@razzia/common/types/game/status"
import background from "@razzia/web/assets/background.png"
import Button from "@razzia/web/components/Button"
import { Flag } from "lucide-react"
import Loader from "@razzia/web/components/Loader"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { useQuestionStore } from "@razzia/web/features/game/stores/question"
import { MANAGER_SKIP_BTN } from "@razzia/web/features/game/utils/constants"
import clsx from "clsx"
import { type PropsWithChildren, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

type Props = PropsWithChildren & {
  statusName: Status | undefined
  onNext?: () => void
  onBack?: () => void
  onEndEarly?: () => void
  onExit?: () => void
  manager?: boolean
}

const GameWrapper = ({
  children,
  statusName,
  onNext,
  onBack,
  onEndEarly,
  onExit,
  manager,
}: Props) => {
  const { isConnected } = useSocket()
  const { player, inviteCode: playerInviteCode } = usePlayerStore()
  const { inviteCode: managerInviteCode } = useManagerStore()
  const { questionStates, setQuestionStates } = useQuestionStore()
  const { t } = useTranslation()
  const [isDisabled, setIsDisabled] = useState(false)
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false)
  const next = statusName ? MANAGER_SKIP_BTN[statusName] : null

  const inviteCode = manager ? managerInviteCode : playerInviteCode

  useEvent(EVENTS.GAME.UPDATE_QUESTION, (payload) => {
    if (!payload) {
      setQuestionStates(null)
      return
    }
    const { current, total } = payload as { current: number; total: number }
    setQuestionStates({
      current,
      total,
    })
  })

  useEvent(EVENTS.GAME.ERROR_MESSAGE, (message) => {
    toast.error(t(message))
    console.log(t(message))
    setIsDisabled(false)
  })

  useEffect(() => {
    setIsDisabled(false)
    setIsConfirmingEnd(false)
  }, [statusName])

  useEffect(() => {
    if (!manager || !next) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowDown") {
        // Don't fire if the user is typing in an input/textarea
        const tag = (e.target as HTMLElement).tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

        e.preventDefault()
        if (!isDisabled) {
          handleNext()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [manager, next, isDisabled])

  const handleNext = () => {
    setIsDisabled(true)
    onNext?.()
  }

  return (
    <section className="relative flex min-h-dvh">
      <div className="fixed top-0 left-0 h-full w-full">
        <img
          className="pointer-events-none h-full w-full object-cover select-none"
          src={background}
          alt="background"
        />
      </div>

      <div className="z-10 flex w-full flex-1 flex-col justify-between">
        {!isConnected && !statusName ? (
          <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
            <Loader className="h-30" />
            <h1 className="text-4xl font-bold text-white">
              {t("common:connecting")}
            </h1>
          </div>
        ) : (
          <>
            <div className="flex w-full justify-between p-4">
              <div className="flex gap-2">
                {questionStates &&
                  statusName !== STATUS.SHOW_ROOM &&
                  statusName !== STATUS.WAIT &&
                  (!manager || statusName !== STATUS.STUDY_PROGRESS) && (
                    <div className="flex items-center rounded-md bg-white p-2 px-4 text-lg font-bold text-black shadow-md">
                      {`${questionStates.current} / ${questionStates.total}`}
                    </div>
                  )}

                {inviteCode && manager && statusName !== STATUS.SHOW_ROOM && (
                  <div className="flex items-center rounded-md border border-white/20 bg-white/90 p-2 px-4 text-lg font-bold text-black shadow-md backdrop-blur-md">
                    {t("game:pinLabel")}:{" "}
                    <span className="ml-1 tracking-widest">{inviteCode}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {manager && next && (
                  <Button
                    className={clsx(
                      "bg-white px-4 text-black shadow-md hover:bg-gray-200",
                      {
                        "pointer-events-none": isDisabled,
                      },
                    )}
                    onClick={handleNext}
                  >
                    {t(next)}
                  </Button>
                )}

                {/* Exit button shown alongside Play Again on the FINISHED screen */}
                {manager && statusName === STATUS.FINISHED && onExit && (
                  <Button
                    className="border border-white/20 bg-white/10 px-4 text-white shadow-md backdrop-blur-md hover:bg-white/20"
                    onClick={onExit}
                  >
                    {t("common:exit")}
                  </Button>
                )}
              </div>

              {manager && onBack && (
                <Button
                  onClick={onBack}
                  className="bg-white px-4 text-black shadow-md hover:bg-gray-200"
                >
                  {t("common:exit")}
                </Button>
              )}
            </div>

            {children}

            {/* Manager: Fixed End Game Button at Bottom Right */}
            {manager && onEndEarly && (
              <div className="fixed right-4 bottom-4 z-[100]">
                {isConfirmingEnd ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/60 p-2 px-4 shadow-2xl backdrop-blur-xl duration-300">
                    <span className="mr-2 text-xs font-black tracking-wider text-white/80 uppercase">
                      {t("game:endEarlyConfirm")}
                    </span>
                    <Button
                      className="bg-red-600 px-4 py-2 text-sm font-black text-white shadow-lg hover:bg-red-700"
                      onClick={onEndEarly}
                    >
                      {t("game:endEarlyYes")}
                    </Button>
                    <Button
                      className="border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20"
                      onClick={() => setIsConfirmingEnd(false)}
                    >
                      {t("game:cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="border border-white/10 bg-red-500/80 px-4 py-2 font-black text-white shadow-xl backdrop-blur-md hover:bg-red-600"
                    onClick={() => setIsConfirmingEnd(true)}
                  >
                    <Flag className="mr-2 inline-block size-5" />
                    {t("game:endGame")}
                  </Button>
                )}
              </div>
            )}

            {!manager && (
              <div className="z-50 flex items-center justify-between bg-white px-4 py-2 text-lg font-bold text-white">
                <div className="flex items-center gap-3 text-gray-800">
                  <p>{player?.username}</p>
                  {player?.studyRound && player.studyRound > 1 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold tracking-wider text-blue-800 uppercase">
                      Round {player.studyRound}
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-gray-800 px-3 py-1 text-lg">
                  {player?.points}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default GameWrapper
