import { EVENTS } from "@razzia/common/constants"
import type { GameMode } from "@razzia/common/types/game"
import { inviteCodeValidator } from "@razzia/common/validators/auth"
import type { SocketContext } from "@razzia/socket/handlers/types"
import { getQuizz } from "@razzia/socket/services/config"
import Game from "@razzia/socket/services/game"
import Registry from "@razzia/socket/services/registry"
import { withGame } from "@razzia/socket/utils/game"
import { isDerivationSuccessful } from "@razzia/common/utils/chunks"

export const gameSocketHandlers = ({ io, socket }: SocketContext) => {
  const registry = Registry.getInstance()
  const clientId = socket.handshake.auth.clientId as string

  const handleManagerLeave = (game: Game) => {
    game.setManagerDisconnected()
    registry.markGameAsEmpty(game)

    if (!game.started) {
      game.abortCooldown()
      io.to(game.gameId).emit(
        EVENTS.GAME.RESET,
        "errors:game.managerDisconnected",
      )
      registry.removeGame(game.gameId)
    }
  }

  const handlePlayerLeave = (game: Game) => {
    if (!game.started) {
      const player = game.removePlayer(socket.id)

      if (player) {
        console.log(`Player ${player.username} left game ${game.gameId}`)
      }

      return
    }

    game.setPlayerDisconnected(socket.id)
  }

  socket.on(EVENTS.PLAYER.RECONNECT, ({ gameId }) => {
    const game = registry.getPlayerGame(gameId, clientId)

    if (game) {
      game.reconnectPlayer(socket)

      return
    }

    socket.emit(EVENTS.GAME.RESET, "errors:game.notFound")
  })

  socket.on(EVENTS.MANAGER.RECONNECT, ({ gameId }) => {
    const game = registry.getManagerGame(gameId, clientId)

    if (game) {
      game.reconnectManager(socket)

      return
    }

    socket.emit(EVENTS.GAME.RESET, "errors:game.expired")
  })

  socket.on(EVENTS.GAME.CREATE, (quizzId) => {
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

    const isRegistered = game.players.some((p) => p.clientId === clientId)

    socket.emit(EVENTS.GAME.SUCCESS_ROOM, { gameId: game.gameId, isRegistered })
  })

  socket.on(EVENTS.PLAYER.LOGIN, ({ gameId, data }) =>
    withGame(gameId, socket, (game) => game.join(socket, data.username)),
  )

  socket.on(EVENTS.MANAGER.KICK_PLAYER, ({ gameId, playerId }) =>
    withGame(gameId, socket, (game) => game.kickPlayer(socket, playerId)),
  )

  socket.on(EVENTS.MANAGER.START_GAME, ({ gameId, mode, options }) =>
    withGame(gameId, socket, (game) =>
      game.start(socket, (mode as GameMode) || "competitive", options),
    ),
  )

  socket.on(EVENTS.PLAYER.SUBMIT_SENTENCE, ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.submitSentence(socket, data.submittedSentence, data.submittedChunks),
    ),
  )

  socket.on(EVENTS.PLAYER.STUDY_SUBMIT, ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.studySubmit(
        socket,
        data.questionIndex,
        data.submittedSentence,
        data.submittedChunks,
      ),
    ),
  )

  socket.on(EVENTS.PLAYER.STUDY_RESTART, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.studyRestart(socket)),
  )

  socket.on(EVENTS.MANAGER.ABORT_QUIZ, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.abortRound(socket)),
  )

  socket.on(EVENTS.MANAGER.NEXT_QUESTION, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.nextRound(socket)),
  )

  socket.on(EVENTS.MANAGER.SHOW_LEADERBOARD, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.showLeaderboard()),
  )

  socket.on(EVENTS.MANAGER.END_GAME_EARLY, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.endGameEarly(socket)),
  )

  socket.on(EVENTS.MANAGER.PLAY_AGAIN, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.playAgain(socket)),
  )

  socket.on(EVENTS.MANAGER.CHANGE_QUIZ, ({ gameId, quizzId }) =>
    withGame(gameId, socket, (game) => {
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
