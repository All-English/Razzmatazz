import { EVENTS } from "@razzia/common/constants"
import { STATUS } from "@razzia/common/types/game/status"
import Background from "@razzia/web/components/Background"
import Loader from "@razzia/web/components/Loader"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import Configurations from "@razzia/web/features/manager/components/configurations"
import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router"

const ManagerConfigPage = () => {
  const { isConnected } = useSocket()
  const {
    setGameId,
    setStatus,
    setConfig,
    config,
    setInviteCode,
    setActiveQuizzId,
  } = useManagerStore()
  const navigate = useNavigate()

  useEvent(EVENTS.MANAGER.CONFIG, (data) => {
    setConfig(data)
  })

  useEvent(EVENTS.MANAGER.GAME_CREATED, ({ gameId, inviteCode, quizzId }) => {
    setGameId(gameId)
    setInviteCode(inviteCode)
    setActiveQuizzId(quizzId)
    setStatus(STATUS.SHOW_ROOM, {
      text: "game:waitingForPlayers",
      inviteCode,
    })
    navigate({ to: "/party/manager/$gameId", params: { gameId } })
  })

  if (!isConnected) {
    return (
      <Background>
        <Loader className="h-23" />
      </Background>
    )
  }

  if (!config) {
    return <Navigate to="/manager" />
  }

  return <Configurations data={config} />
}

export const Route = createFileRoute("/manager/config")({
  component: ManagerConfigPage,
})
