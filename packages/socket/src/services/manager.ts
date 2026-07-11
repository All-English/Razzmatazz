import { EVENTS } from "@razzia/common/constants"
import type { Socket } from "@razzia/common/types/game/socket"
import type { SocketContext } from "@razzia/socket/handlers/types"
import {
  getQuizzMeta,
  getResultsMeta,
  getFolders,
  getTrashMeta,
} from "@razzia/socket/services/config"

import Registry from "@razzia/socket/services/registry"

const getClientId = (socket: SocketContext["socket"]) =>
  socket.handshake.auth.clientId as string

export const emitConfig = (socket: SocketContext["socket"]) => {
  const clientId = getClientId(socket)
  const registry = Registry.getInstance()
  const activeGame = registry
    .getAllGames()
    .find((g) => g.manager.clientId === clientId)

  socket.emit(EVENTS.MANAGER.CONFIG, {
    quizz: getQuizzMeta(),
    results: getResultsMeta(),
    folders: getFolders(),
    trash: getTrashMeta(),
    activeGameId: activeGame?.gameId,
  })
}

class Manager {
  private loggedClients = new Set()

  isLogged(socket: Socket) {
    return this.loggedClients.has(getClientId(socket))
  }

  login(socket: Socket) {
    this.loggedClients.add(getClientId(socket))
  }

  logout(socket: Socket) {
    this.loggedClients.delete(getClientId(socket))
  }

  withAuth<T extends unknown[]>(
    socket: Socket,
    handler: (..._args: T) => void,
  ) {
    return (..._args: T) => {
      if (!this.isLogged(socket)) {
        socket.emit(EVENTS.MANAGER.UNAUTHORIZED)

        return
      }

      handler(..._args)
    }
  }
}

export default new Manager()
