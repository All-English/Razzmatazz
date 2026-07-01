import { EVENTS } from "@razzia/common/constants"
import { STATUS } from "@razzia/common/types/game/status"
import GameWrapper from "@razzia/web/features/game/components/GameWrapper"
import {
  socketClient,
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useGameModeStore } from "@razzia/web/features/game/stores/gameMode"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { useQuestionStore } from "@razzia/web/features/game/stores/question"
import {
  GAME_STATE_COMPONENTS_MANAGER,
  MANAGER_SKIP_EVENTS,
  isKeyOf,
} from "@razzia/web/features/game/utils/constants"
import { ConfigProvider } from "@razzia/web/features/manager/contexts/config-context"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { useEffect } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const ManagerGamePage = () => {
  const navigate = useNavigate()
  const { gameId: gameIdParam } = useParams({ from: "/party/manager/$gameId" })
  const { socket } = useSocket()
  const {
    gameId,
    status,
    setGameId,
    setInviteCode,
    setStatus,
    setPlayers,
    reset,
    config,
    setConfig,
    setActiveQuizzId,
  } = useManagerStore()
  const { setQuestionStates } = useQuestionStore()
  const { mode, setMode } = useGameModeStore()
  const { t } = useTranslation()

  useEvent(EVENTS.GAME.STATUS, ({ name, data }) => {
    if (name in GAME_STATE_COMPONENTS_MANAGER) {
      setStatus(name, data)
    }
  })

  useEvent("connect", () => {
    if (gameIdParam) {
      socket.emit(EVENTS.MANAGER.RECONNECT, { gameId: gameIdParam })
    }
  })

  useEffect(() => {
    if (socket) {
      if (socket.connected && gameIdParam) {
        socket.emit(EVENTS.MANAGER.RECONNECT, { gameId: gameIdParam })
      }
      socket.emit(EVENTS.MANAGER.GET_CONFIG)
    }
  }, [socket, gameIdParam])

  useEvent(EVENTS.MANAGER.CONFIG, (configData) => {
    setConfig(configData)
  })

  useEvent(
    EVENTS.MANAGER.SUCCESS_RECONNECT,
    ({
      gameId: reconnectGameId,
      inviteCode,
      status: reconnectStatus,
      players,
      currentQuestion,
      quizzId,
      mode: reconnectMode,
    }) => {
      setGameId(reconnectGameId)
      setInviteCode(inviteCode)
      setStatus(reconnectStatus.name, reconnectStatus.data)
      setPlayers(players)
      setQuestionStates(currentQuestion)
      setActiveQuizzId(quizzId)
      if (reconnectMode) {
        setMode(reconnectMode)
      }
    },
  )

  useEvent(EVENTS.GAME.RESET, (message) => {
    navigate({ to: "/manager/config" })
    reset()
    setQuestionStates(null)
    toast.error(t(message))
  })

  const handleSkip = () => {
    if (!status || !gameId) {
      return
    }

    if (isKeyOf(MANAGER_SKIP_EVENTS, status.name)) {
      socket.emit(MANAGER_SKIP_EVENTS[status.name], { gameId })
    }
  }

  const handleExit = () => {
    if (gameId) socket.emit(EVENTS.MANAGER.EXIT_GAME, { gameId })
    navigate({ to: "/manager/config" })
    reset()
    setQuestionStates(null)
  }

  const handleBack = () => {
    if (gameId) socket.emit(EVENTS.MANAGER.EXIT_GAME, { gameId })
    navigate({ to: "/manager/config" })
    reset()
    setQuestionStates(null)
  }

  const handleEndEarly = () => {
    if (gameId) {
      socket.emit(EVENTS.MANAGER.END_GAME_EARLY, { gameId })
    }
  }

  const CurrentComponent =
    status && isKeyOf(GAME_STATE_COMPONENTS_MANAGER, status.name)
      ? GAME_STATE_COMPONENTS_MANAGER[status.name]
      : null

  if (!status) {
    return null
  }

  const defaultMockConfig = { quizz: [], results: [], folders: [], trash: [] }

  return (
    <ConfigProvider data={config ?? defaultMockConfig}>
      <GameWrapper
        statusName={status.name}
        onNext={handleSkip}
        onBack={
          status.name === STATUS.SHOW_ROOM ||
          status.name === STATUS.STUDY_PROGRESS
            ? handleBack
            : undefined
        }
        onExit={status.name === STATUS.FINISHED ? handleExit : undefined}
        onEndEarly={
          mode === "competitive" &&
          status.name !== STATUS.FINISHED &&
          status.name !== STATUS.SHOW_ROOM &&
          status.name !== STATUS.STUDY_PROGRESS
            ? handleEndEarly
            : undefined
        }
        manager
      >
        {CurrentComponent && (
          <CurrentComponent data={status.data as never} manager />
        )}
      </GameWrapper>
    </ConfigProvider>
  )
}

export const Route = createFileRoute("/party/manager/$gameId")({
  component: ManagerGamePage,
  onLeave: ({ params: { gameId } }) => {
    socketClient.emit(EVENTS.MANAGER.LEAVE, { gameId })
  },
})
