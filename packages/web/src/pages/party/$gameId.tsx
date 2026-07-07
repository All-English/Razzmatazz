import { EVENTS } from "@razzia/common/constants"
import { STATUS } from "@razzia/common/types/game/status"
import GameWrapper from "@razzia/web/features/game/components/GameWrapper"
import {
  socketClient,
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import { useQuestionStore } from "@razzia/web/features/game/stores/question"
import {
  GAME_STATE_COMPONENTS,
  isKeyOf,
} from "@razzia/web/features/game/utils/constants"
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router"
import { useEffect } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const PlayerGamePage = () => {
  const navigate = useNavigate()
  const { socket, isConnected } = useSocket()
  const { gameId: gameIdParam } = useParams({ from: "/party/$gameId" })
  const {
    status,
    setPlayer,
    setGameId,
    setInviteCode,
    setStatus,
    reset,
    resetPracticeStats,
  } = usePlayerStore()
  const { setQuestionStates } = useQuestionStore()
  const { t } = useTranslation()

  useEffect(() => {
    if (isConnected && gameIdParam) {
      socket.emit(EVENTS.PLAYER.RECONNECT, { gameId: gameIdParam })
    }
  }, [isConnected, gameIdParam, socket])

  useEvent("connect", () => {
    if (gameIdParam) {
      socket.emit(EVENTS.PLAYER.RECONNECT, { gameId: gameIdParam })
    }
  })

  useEvent(
    EVENTS.PLAYER.SUCCESS_RECONNECT,
    ({
      gameId: reconnectGameId,
      inviteCode,
      status: reconnectStatus,
      player,
      currentQuestion,
    }) => {
      setGameId(reconnectGameId)
      setInviteCode(inviteCode)
      setStatus(reconnectStatus.name, reconnectStatus.data)
      setPlayer(player)
      setQuestionStates(currentQuestion)
    },
  )

  useEvent(EVENTS.PLAYER.UPDATE, (updatedPlayer) => {
    setPlayer(updatedPlayer)
  })

  useEvent(EVENTS.GAME.STATUS, ({ name, data }) => {
    if (name in GAME_STATE_COMPONENTS) {
      setStatus(name, data)
    }
    // New game starting — reset practice stats from previous session
    if (name === STATUS.SHOW_START) {
      resetPracticeStats()
    }
  })

  useEvent(EVENTS.GAME.RESET, (message) => {
    localStorage.removeItem("game_pin")
    navigate({ to: "/" })
    reset()
    setQuestionStates(null)
    toast.error(t(message))
  })

  if (!gameIdParam) {
    return null
  }

  const CurrentComponent =
    status && isKeyOf(GAME_STATE_COMPONENTS, status.name)
      ? GAME_STATE_COMPONENTS[status.name]
      : null

  if (!status) {
    return null
  }

  return (
    <GameWrapper statusName={status.name}>
      {CurrentComponent && <CurrentComponent data={status.data as never} />}
    </GameWrapper>
  )
}

export const Route = createFileRoute("/party/$gameId")({
  component: PlayerGamePage,
  onLeave: ({ params: { gameId } }) => {
    socketClient.emit(EVENTS.PLAYER.LEAVE, { gameId })
  },
})
