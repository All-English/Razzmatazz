import { EVENTS } from "@razzia/common/constants"
import type { SocketContext } from "@razzia/socket/handlers/types"
import {
  deleteQuizz,
  getQuizzById,
  saveQuizz,
  updateQuizz,
  moveQuizz,
  toggleFavorite,
  softDeleteQuizz,
  restoreQuizz,
  permanentDeleteQuizz,
  duplicateQuizz,
  combineQuizzes,
} from "@razzia/socket/services/config"
import manager, { emitConfig } from "@razzia/socket/services/manager"

export const quizzSocketHandlers = ({ socket }: SocketContext) => {
  socket.on(
    EVENTS.QUIZZ.GET,
    manager.withAuth(socket, (id) => {
      try {
        const quizz = getQuizzById(id)

        socket.emit(EVENTS.QUIZZ.DATA, quizz)
      } catch (error) {
        console.error("Failed to get quiz:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.notFound")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.SAVE,
    manager.withAuth(socket, (data) => {
      try {
        const { id } = saveQuizz(data)

        socket.emit(EVENTS.QUIZZ.SAVE_SUCCESS, { id })
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to save quiz:", error)
        const message =
          error instanceof Error ? error.message : "errors:quizz.failedToSave"
        socket.emit(EVENTS.QUIZZ.ERROR, message)
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.DELETE,
    manager.withAuth(socket, (id) => {
      try {
        deleteQuizz(id)

        emitConfig(socket)
      } catch (error) {
        console.error("Failed to delete quiz:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.failedToDelete")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.UPDATE,
    manager.withAuth(socket, ({ id, ...data }) => {
      try {
        const { id: newId } = updateQuizz(id, data)

        socket.emit(EVENTS.QUIZZ.UPDATE_SUCCESS, { id: newId })
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to update quiz:", error)
        const message =
          error instanceof Error ? error.message : "errors:quizz.failedToUpdate"
        socket.emit(EVENTS.QUIZZ.ERROR, message)
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.MOVE,
    manager.withAuth(socket, ({ ids, folder }) => {
      try {
        moveQuizz(ids, folder)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to move quiz:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.failedToMove")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.TOGGLE_FAVORITE,
    manager.withAuth(socket, (ids) => {
      try {
        toggleFavorite(ids)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to toggle favorite:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.failedToFavorite")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.SOFT_DELETE,
    manager.withAuth(socket, (ids) => {
      try {
        softDeleteQuizz(ids)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to soft delete quiz:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.failedToDelete")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.RESTORE,
    manager.withAuth(socket, (ids) => {
      try {
        restoreQuizz(ids)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to restore quiz:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.failedToRestore")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.PERMANENT_DELETE,
    manager.withAuth(socket, (ids) => {
      try {
        permanentDeleteQuizz(ids)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to permanently delete quiz:", error)
        socket.emit(EVENTS.QUIZZ.ERROR, "errors:quizz.failedToDelete")
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.DUPLICATE,
    manager.withAuth(socket, (id) => {
      try {
        duplicateQuizz(id)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to duplicate quiz:", error)
        const message =
          error instanceof Error
            ? error.message
            : "errors:quizz.failedToDuplicate"
        socket.emit(EVENTS.QUIZZ.ERROR, message)
      }
    }),
  )

  socket.on(
    EVENTS.QUIZZ.COMBINE,
    manager.withAuth(socket, ({ ids, subject, folder }) => {
      try {
        combineQuizzes(ids, subject, folder)
        emitConfig(socket)
      } catch (error) {
        console.error("Failed to combine quizzes:", error)
        const message =
          error instanceof Error
            ? error.message
            : "errors:quizz.failedToCombine"
        socket.emit(EVENTS.QUIZZ.ERROR, message)
      }
    }),
  )
}
