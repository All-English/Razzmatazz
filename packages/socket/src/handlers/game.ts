import { EVENTS } from "@razzia/common/constants"
import type { GameMode } from "@razzia/common/types/game"
import { inviteCodeValidator } from "@razzia/common/validators/auth"
import type { SocketContext } from "@razzia/socket/handlers/types"
import { getQuizz } from "@razzia/socket/services/config"
import Game from "@razzia/socket/services/game"
import manager from "@razzia/socket/services/manager"
import Registry from "@razzia/socket/services/registry"
import { withGame } from "@razzia/socket/utils/game"
import { isDerivationSuccessful } from "@razzia/common/utils/chunks"

export const gameSocketHandlers = ({ io, socket }: SocketContext) => {
  const registry = Registry.getInstance()
  const clientId = socket.handshake.auth.clientId as string

  const withManagerGame = (
    gameId: string | undefined,
    callback: (_game: Game) => void | Promise<void>,
  ): void => {
    withGame(gameId, socket, (game) => {
      if (game.manager.clientId !== clientId) {
        socket.emit(EVENTS.MANAGER.ERROR_MESSAGE, "errors:manager.unauthorized")
        return
      }
      callback(game)
    })
  }

  const handleManagerLeave = (game: Game) => {
    game.setManagerDisconnected()
    registry.markGameAsEmpty(game)

    if (!game.started) {
      game.abortCooldown()

      const timeout = setTimeout(() => {
        io.to(game.gameId).emit(
          EVENTS.GAME.RESET,
          "errors:game.managerDisconnected",
        )
        registry.removeGame(game.gameId)
      }, 60_000)

      game.setManagerLobbyTimeout(timeout)
    }
  }

  const handlePlayerLeave = (game: Game) => {
    const player = game.playerManager.findById(socket.id)
    if (player) {
      console.log(
        `Player ${player.username} disconnected from game ${game.gameId}`,
      )
      player.connected = false

      game.playerManager.broadcastCount()

      // Give 60 seconds to reconnect before leaving the lobby
      const timeout = setTimeout(() => {
        game.pendingLobbyLeaves.delete(player.clientId)
        const removed = game.removePlayer(socket.id)
        if (removed) {
          console.log(
            `Player ${removed.username} timed out from game ${game.gameId}`,
          )
          game.playerManager.broadcastCount()
          game.playerManager.emitPlayerList()
        }
      }, 60_000)

      game.pendingLobbyLeaves.set(player.clientId, timeout)
    }
  }


  socket.on(EVENTS.MANAGER.RECONNECT, ({ gameId }) =>
    withManagerGame(gameId, (game) => game.reconnectManager(socket)),
  )

  socket.on(EVENTS.PLAYER.RECONNECT, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.reconnectPlayer(socket)),
  )

  socket.on(EVENTS.MANAGER.LEAVE, ({ gameId }) =>
    withManagerGame(gameId, (game) => {
      handleManagerLeave(game)
      registry.removeGame(game.gameId)
    }),
  )

  socket.on("game:playerLeave", ({ gameId }) => {
    withGame(gameId, socket, (game) => {
      handlePlayerLeave(game)
    })
  })

  socket.on(EVENTS.GAME.RESET, () => {
    socket.emit(EVENTS.GAME.RESET, "errors:game.expired")
  })

  socket.on(
    EVENTS.GAME.CREATE,
    manager.withAuth(socket, (quizzId: string) => {
      const quizzList = getQuizz()
      const quizz = quizzList.find((q) => q.id === quizzId)

      if (!quizz) {
        socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:quizz.notFound")

        return
      }

      const hasMismatch = quizz.questions.some(
        (q) =>
          q.correctSentence.trim() !== "" &&
          !isDerivationSuccessful(q.correctSentence, q.scrambledChunks),
      )

      if (hasMismatch) {
        socket.emit(EVENTS.GAME.ERROR_MESSAGE, "manager:quizz.hasMismatchError")

        return
      }

      // Clone the quizz to prevent mutating any cached copy in memory
      const quizzCopy = JSON.parse(JSON.stringify(quizz)) as typeof quizz

      const game = new Game(io, socket, quizzCopy)
      registry.addGame(game)
    }),
  )

  socket.on(EVENTS.PLAYER.CHECK_PIN, (inviteCode) => {
    const game = registry.getGameByInviteCode(inviteCode)

    socket.emit(EVENTS.PLAYER.CHECK_PIN_RESULT, { valid: Boolean(game) })
  })

  socket.on(EVENTS.PLAYER.JOIN, (inviteCode) => {
    const result = inviteCodeValidator.safeParse(inviteCode)

    if (result.error) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, result.error.issues[0].message)

      return
    }

    const game = registry.getGameByInviteCode(inviteCode)

    if (!game) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:game.notFound")

      return
    }

    if (game.players.some((p) => p.clientId === clientId)) {
      game.reconnectPlayer(socket)

      return
    }

    const isRegistered = false

    socket.emit(EVENTS.GAME.SUCCESS_ROOM, { gameId: game.gameId, isRegistered })
  })

  socket.on(EVENTS.PLAYER.LOGIN, ({ gameId, data }) =>
    withGame(gameId, socket, (game) => game.join(socket, data.username)),
  )

  socket.on(EVENTS.MANAGER.KICK_PLAYER, ({ gameId, playerId }) =>
    withManagerGame(gameId, (game) => game.kickPlayer(socket, playerId)),
  )

  socket.on(EVENTS.MANAGER.START_GAME, ({ gameId, mode, options }) =>
    withManagerGame(gameId, (game) =>
      game.start(socket, (mode as GameMode) || "versus", options),
    ),
  )

  socket.on(EVENTS.PLAYER.SUBMIT_SENTENCE, ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.submitSentence(socket, data.submittedSentence, data.submittedChunks),
    ),
  )

  socket.on(EVENTS.PLAYER.PRACTICE_SUBMIT, ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.practiceSubmit(
        socket,
        data.questionIndex,
        data.submittedSentence,
        data.submittedChunks,
      ),
    ),
  )

  socket.on(EVENTS.PLAYER.PRACTICE_RESTART, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.practiceRestart(socket)),
  )

  socket.on(EVENTS.MANAGER.ABORT_QUIZ, ({ gameId }) =>
    withManagerGame(gameId, (game) => game.abortRound(socket)),
  )

  socket.on(EVENTS.MANAGER.NEXT_QUESTION, ({ gameId }) =>
    withManagerGame(gameId, (game) => game.nextRound(socket)),
  )

  socket.on(EVENTS.MANAGER.SHOW_LEADERBOARD, ({ gameId }) =>
    withManagerGame(gameId, (game) => game.showLeaderboard()),
  )

  socket.on(EVENTS.MANAGER.END_GAME_EARLY, ({ gameId }) =>
    withManagerGame(gameId, (game) => game.endGameEarly(socket)),
  )

  socket.on(EVENTS.MANAGER.PLAY_AGAIN, ({ gameId }) =>
    withManagerGame(gameId, (game) => game.playAgain(socket)),
  )

  socket.on(EVENTS.MANAGER.CHANGE_QUIZ, ({ gameId, quizzId }) =>
    withManagerGame(gameId, (game) => {
      const quizzList = getQuizz()
      const quizz = quizzList.find((q) => q.id === quizzId)

      if (!quizz) {
        socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:quizz.notFound")

        return
      }

      const hasMismatch = quizz.questions.some(
        (q) =>
          q.correctSentence.trim() !== "" &&
          !isDerivationSuccessful(q.correctSentence, q.scrambledChunks),
      )

      if (hasMismatch) {
        socket.emit(EVENTS.GAME.ERROR_MESSAGE, "manager:quizz.hasMismatchError")

        return
      }

      game.updateQuiz(quizz)
    }),
  )

  socket.on(EVENTS.MANAGER.LEAVE, ({ gameId }) => {
    const game = registry.getManagerGame(gameId, clientId)

    if (game) {
      console.log(`Manager left game ${game.inviteCode}`)
      handleManagerLeave(game)
    }
  })

  socket.on(EVENTS.MANAGER.EXIT_GAME, ({ gameId }: { gameId: string }) => {
    const game = registry.getManagerGame(gameId, clientId)

    if (game) {
      console.log(`Manager explicitly exited game ${game.inviteCode}`)
      io.to(game.gameId).emit(EVENTS.GAME.RESET, "game:waitingForPlayers")
      registry.removeGame(game.gameId)
    }
  })

  socket.on(EVENTS.PLAYER.LEAVE, ({ gameId }) => {
    const game = registry.getPlayerGame(gameId, clientId)

    if (game) {
      handlePlayerLeave(game)
    }
  })

  socket.on("disconnect", () => {
    console.log(`A user disconnected : ${socket.id}`)

    const managerGame = registry.getGameByManagerSocketId(socket.id)

    if (managerGame) {
      console.log(`Manager disconnected from game ${managerGame.inviteCode}`)
      handleManagerLeave(managerGame)

      return
    }

    const playerGame = registry.getGameByPlayerSocketId(socket.id)

    if (playerGame) {
      handlePlayerLeave(playerGame)
    }
  })
}
