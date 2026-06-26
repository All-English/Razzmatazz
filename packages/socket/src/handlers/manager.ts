import { EVENTS } from "@razzia/common/constants"
import type { SocketContext } from "@razzia/socket/handlers/types"
import {
  getGameConfig,
  createFolder,
  deleteFolder,
  renameFolder,
} from "@razzia/socket/services/config"
import manager, { emitConfig } from "@razzia/socket/services/manager"

export const managerSocketHandlers = ({ socket }: SocketContext) => {
  socket.on(
    EVENTS.MANAGER.GET_CONFIG,
    manager.withAuth(socket, () => {
      emitConfig(socket)
    }),
  )

  socket.on(EVENTS.MANAGER.LOGOUT, () => {
    manager.logout(socket)
  })

  socket.on(EVENTS.MANAGER.AUTH, (password) => {
    try {
      const config = getGameConfig()

      if (config.managerPassword === "PASSWORD") {
        socket.emit(
          EVENTS.MANAGER.ERROR_MESSAGE,
          "errors:manager.passwordNotConfigured",
        )

        return
      }

      if (password !== config.managerPassword) {
        socket.emit(
          EVENTS.MANAGER.ERROR_MESSAGE,
          "errors:manager.invalidPassword",
        )

        return
      }

      manager.login(socket)
      emitConfig(socket)
    } catch (error) {
      console.error("Failed to read game config:", error)
      socket.emit(EVENTS.MANAGER.ERROR_MESSAGE, "errors:failedToReadConfig")
    }
  })

  socket.on(
    EVENTS.MANAGER.CREATE_FOLDER,
    manager.withAuth(socket, (name) => {
      try {
        createFolder(name)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to create folder:", error)
        socket.emit(EVENTS.MANAGER.ERROR_MESSAGE, "errors:manager.failedToCreateFolder")
      }
    }),
  )

  socket.on(
    EVENTS.MANAGER.DELETE_FOLDER,
    manager.withAuth(socket, (name) => {
      try {
        deleteFolder(name)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to delete folder:", error)
        socket.emit(EVENTS.MANAGER.ERROR_MESSAGE, "errors:manager.failedToDeleteFolder")
      }
    }),
  )

  socket.on(
    EVENTS.MANAGER.RENAME_FOLDER,
    manager.withAuth(socket, ({ oldName, newName }) => {
      try {
        renameFolder(oldName, newName)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to rename folder:", error)
        socket.emit(EVENTS.MANAGER.ERROR_MESSAGE, "errors:manager.failedToRenameFolder")
      }
    }),
  )
}
