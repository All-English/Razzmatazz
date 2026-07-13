import { EVENTS } from "@razzia/common/constants"
import type {
  GameMode,
  Player,
  Quizz,
  QuizzWithId,
  GameResult,
} from "@razzia/common/types/game"
import type { Server, Socket } from "@razzia/common/types/game/socket"
import {
  STATUS,
  type Status,
  type StatusDataMap,
} from "@razzia/common/types/game/status"
import { saveResult } from "@razzia/socket/services/config"
import { CooldownTimer } from "@razzia/socket/services/game/cooldown-timer"
import { PlayerManager } from "@razzia/socket/services/game/player-manager"
import { RoundManager } from "@razzia/socket/services/game/round-manager"
import Registry from "@razzia/socket/services/registry"
import { createInviteCode } from "@razzia/socket/utils/game"
import { v7 as uuid } from "uuid"

const registry = Registry.getInstance()

class Game {
  readonly gameId: string
  readonly inviteCode: string
  private quizzId: string

  private readonly io: Server
  private readonly _manager: {
    id: string
    clientId: string
    connected: boolean
  }
  private readonly quizz: Quizz
  private readonly playerManager: PlayerManager
  private readonly round: RoundManager
  private readonly cooldown: CooldownTimer

  private lastBroadcastStatus: {
    name: Status
    data: StatusDataMap[Status]
  } | null = null
  private managerStatus: {
    name: Status
    data: StatusDataMap[Status]
  } | null = null
  private playerStatus = new Map<
    string,
    { name: Status; data: StatusDataMap[Status] }
  >()
  private pendingLobbyLeaves = new Map<string, NodeJS.Timeout>()
  private pendingManagerLobbyLeave: NodeJS.Timeout | null = null

  constructor(io: Server, socket: Socket, quizz: Quizz) {
    const clientId = socket.handshake.auth.clientId as string

    this.io = io
    this.quizz = quizz
    this.gameId = uuid()
    this.quizzId = (quizz as QuizzWithId).id ?? ""

    let code = ""

    do {
      code = createInviteCode()
    } while (registry.getGameByInviteCode(code))

    this.inviteCode = code
    this._manager = {
      id: socket.id,
      clientId,
      connected: true,
    }

    this.cooldown = new CooldownTimer(io, this.gameId)

    this.playerManager = new PlayerManager(
      io,
      this.gameId,
      () => this._manager.id,
    )

    this.round = new RoundManager({
      quizz,
      players: this.playerManager,
      cooldown: this.cooldown,
      io,
      gameId: this.gameId,
      getManagerId: () => this._manager.id,
      broadcast: this.broadcastStatus.bind(this),
      send: this.sendStatus.bind(this),
      onNewQuestion: () => {
        this.playerStatus.clear()
        this.managerStatus = null
      },
      onGameFinished: saveResult,
    })

    socket.join(this.gameId)
    socket.emit(EVENTS.MANAGER.GAME_CREATED, {
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      quizzId: this.quizzId,
    })

    console.log(
      `New game created: ${this.inviteCode} subject: ${quizz.subject}`,
    )
  }

  get manager() {
    return this._manager
  }

  get players(): Player[] {
    return this.playerManager.getAll()
  }

  get started(): boolean {
    return this.round.isStarted()
  }

  get mode(): GameMode {
    return this.round.getMode()
  }

  // ── Status broadcasting ──────────────────────────────────────────────────

  private broadcastStatus<T extends Status>(status: T, data: StatusDataMap[T]) {
    const statusData = { name: status, data }
    this.lastBroadcastStatus = statusData
    this.io.to(this.gameId).emit(EVENTS.GAME.STATUS, statusData)
  }

  private sendStatus<T extends Status>(
    target: string,
    status: T,
    data: StatusDataMap[T],
  ) {
    const statusData = { name: status, data }

    if (this._manager.id === target) {
      this.managerStatus = statusData
    } else {
      this.playerStatus.set(target, statusData)
    }

    this.io.to(target).emit(EVENTS.GAME.STATUS, statusData)
  }

  // Player actions

  join(socket: Socket, username: string) {
    this.playerManager.join(socket, username)

    if (this.started) {
      this.round.playerJoinedMidGame(socket, this.lastBroadcastStatus)
    }
  }

  kickPlayer(socket: Socket, playerId: string) {
    if (this.playerManager.kick(socket, playerId)) {
      this.playerStatus.delete(playerId)
    }
  }

  // Reconnect

  reconnectManager(socket: Socket) {
    this.clearManagerLobbyTimeout()

    if (this._manager.connected) {
      if (this._manager.id === socket.id) {
        const status =
          this.managerStatus ??
          this.lastBroadcastStatus ??
          (!this.started
            ? {
                name: STATUS.SHOW_ROOM,
                data: {
                  text: "game:waitingForPlayers",
                  inviteCode: this.inviteCode,
                },
              }
            : {
                name: STATUS.WAIT,
                data: { text: "game:waitingForPlayers" },
              })

        socket.emit(EVENTS.MANAGER.SUCCESS_RECONNECT, {
          gameId: this.gameId,
          inviteCode: this.inviteCode,
          currentQuestion: this.round.getReconnectInfo(),
          status,
          players: this.playerManager.getAll(),
          quizzId: this.quizzId,
          mode: this.mode,
        })
        socket.emit(EVENTS.GAME.TOTAL_PLAYERS, this.playerManager.count())

        return
      }

      const oldManagerId = this._manager.id
      this.io
        .to(oldManagerId)
        .emit(EVENTS.GAME.RESET, "errors:game.managerAlreadyConnected")
      this.io.in(oldManagerId).socketsLeave(this.gameId)
    }

    socket.join(this.gameId)
    this._manager.id = socket.id
    this._manager.connected = true

    const status =
      this.managerStatus ??
      this.lastBroadcastStatus ??
      (!this.started
        ? {
            name: STATUS.SHOW_ROOM,
            data: {
              text: "game:waitingForPlayers",
              inviteCode: this.inviteCode,
            },
          }
        : {
            name: STATUS.WAIT,
            data: { text: "game:waitingForPlayers" },
          })

    socket.emit(EVENTS.MANAGER.SUCCESS_RECONNECT, {
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      currentQuestion: this.round.getReconnectInfo(),
      status,
      players: this.playerManager.getAll(),
      quizzId: this.quizzId,
      mode: this.mode,
    })
    socket.emit(EVENTS.GAME.TOTAL_PLAYERS, this.playerManager.count())

    registry.reactivateGame(this.gameId)
    console.log(`Manager reconnected to game ${this.inviteCode}`)
  }

  reconnectPlayer(socket: Socket) {
    const clientId = socket.handshake.auth.clientId as string
    const player = this.playerManager.findByClientId(clientId)

    if (!player) {
      return
    }

    const pendingLeave = this.pendingLobbyLeaves.get(clientId)
    if (pendingLeave) {
      clearTimeout(pendingLeave)
      this.pendingLobbyLeaves.delete(clientId)
    }

    if (player.connected) {
      if (player.id === socket.id) {
        let status = this.playerStatus.get(socket.id) ??
          this.lastBroadcastStatus ?? {
            name: STATUS.WAIT,
            data: { text: "game:waitingForPlayers" },
          }

        // Clone to avoid mutating shared state reference
        status = JSON.parse(JSON.stringify(status))

        if (this.mode === "practice" && status.name === STATUS.SHOW_RESULT) {
          status = this.round.getPracticeNextQuestionStatus(player.username)
          this.playerStatus.set(socket.id, status)
        }

        if (status.name === STATUS.WAIT && !this.started) {
          status.data = {
            ...status.data,
            correctSentences: this.quizz.questions.map(
              (q) => q.correctSentence,
            ),
          }
        }

        socket.emit(EVENTS.PLAYER.SUCCESS_RECONNECT, {
          gameId: this.gameId,
          inviteCode: this.inviteCode,
          currentQuestion: this.round.getReconnectInfo(player.username),
          status,
          player: { username: player.username, points: player.points },
        })
        socket.emit(EVENTS.GAME.TOTAL_PLAYERS, this.playerManager.count())

        return
      }

      const oldPlayerId = player.id
      this.io
        .to(oldPlayerId)
        .emit(EVENTS.GAME.RESET, "errors:game.playerAlreadyConnected")
      this.io.in(oldPlayerId).socketsLeave(this.gameId)
    }

    socket.join(this.gameId)

    const oldSocketId = player.id
    this.playerManager.updateSocketId(oldSocketId, socket.id)
    player.connected = true

    let status = this.playerStatus.get(oldSocketId) ??
      this.lastBroadcastStatus ?? {
        name: STATUS.WAIT,
        data: { text: "game:waitingForPlayers" },
      }

    // Clone to avoid mutating shared state reference
    status = JSON.parse(JSON.stringify(status))

    if (this.mode === "practice" && status.name === STATUS.SHOW_RESULT) {
      status = this.round.getPracticeNextQuestionStatus(player.username)
      if (this.playerStatus.has(oldSocketId)) {
        this.playerStatus.set(oldSocketId, status)
      }
    }

    if (status.name === STATUS.WAIT && !this.started) {
      status.data = {
        ...status.data,
        correctSentences: this.quizz.questions.map((q) => q.correctSentence),
      }
    }

    const oldStatus = this.playerStatus.get(oldSocketId)

    if (oldStatus) {
      this.playerStatus.delete(oldSocketId)
      this.playerStatus.set(socket.id, oldStatus)
    }

    socket.emit(EVENTS.PLAYER.SUCCESS_RECONNECT, {
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      currentQuestion: this.round.getReconnectInfo(player.username),
      status,
      player: { username: player.username, points: player.points },
    })
    socket.emit(EVENTS.GAME.TOTAL_PLAYERS, this.playerManager.count())

    console.log(
      `Player ${player.username} reconnected to game ${this.inviteCode}`,
    )
  }

  // Disconnect helpers

  setManagerDisconnected() {
    this._manager.connected = false
  }

  setManagerLobbyTimeout(timeout: NodeJS.Timeout) {
    this.clearManagerLobbyTimeout()
    this.pendingManagerLobbyLeave = timeout
  }

  clearManagerLobbyTimeout() {
    if (this.pendingManagerLobbyLeave) {
      clearTimeout(this.pendingManagerLobbyLeave)
      this.pendingManagerLobbyLeave = null
    }
  }

  removePlayer(socketId: string): Player | undefined {
    const player = this.playerManager.findById(socketId)
    if (!player) return undefined

    const clientId = player.clientId

    const existing = this.pendingLobbyLeaves.get(clientId)
    if (existing) {
      clearTimeout(existing)
      this.pendingLobbyLeaves.delete(clientId)
    }

    const timeout = setTimeout(() => {
      this.pendingLobbyLeaves.delete(clientId)
      const removedPlayer = this.playerManager.removeByClientId(clientId)
      if (removedPlayer) {
        this.io
          .to(this._manager.id)
          .emit(EVENTS.MANAGER.REMOVE_PLAYER, removedPlayer.id)
        this.playerManager.broadcastCount()
        console.log(
          `Player ${removedPlayer.username} left game ${this.gameId} after grace period`,
        )
      }
    }, 2500)

    this.pendingLobbyLeaves.set(clientId, timeout)

    return player
  }

  setPlayerDisconnected(socketId: string) {
    this.playerManager.setDisconnected(socketId)
    this.playerManager.broadcastCount()
  }

  // Game flow

  abortCooldown() {
    this.cooldown.abort()
  }

  updateQuiz(quizz: Quizz) {
    this.quizz = quizz
    this.quizzId = (quizz as QuizzWithId).id ?? ""
    this.round.updateQuizz(quizz)

    // Broadcast the new correctSentences to all players in the lobby
    const players = this.playerManager.getAll()
    for (const player of players) {
      this.sendStatus(player.id, STATUS.WAIT, {
        text: "game:waitingForPlayers",
        correctSentences: quizz.questions.map((q) => q.correctSentence),
      })
    }
  }

  async start(
    socket: Socket,
    mode: GameMode = "practice",
    options?: {
      shuffle?: boolean
      startIndex?: number
      endIndex?: number
      easyMode?: boolean
    },
  ) {
    await this.round.start(socket, mode, options)
  }

  submitSentence(
    socket: Socket,
    submittedSentence: string,
    submittedChunks: string[],
  ) {
    this.round.submitSentence(socket, submittedSentence, submittedChunks)
  }

  practiceSubmit(
    socket: Socket,
    questionIndex: number,
    submittedSentence: string,
    submittedChunks: string[],
  ): void {
    this.round.practiceSubmit(
      socket,
      questionIndex,
      submittedSentence,
      submittedChunks,
    )
  }

  practiceRestart(socket: Socket): void {
    this.round.practiceRestart(socket)
  }

  nextRound(socket: Socket) {
    this.round.nextQuestion(socket)
  }

  abortRound(socket: Socket) {
    this.round.abortQuestion(socket)
  }

  showLeaderboard() {
    this.round.showLeaderboard()
  }

  endGameEarly(socket: Socket) {
    this.round.endGameEarly(socket)
  }

  playAgain(socket: Socket) {
    if (this._manager.id !== socket.id) {
      return
    }

    // Stop any running cooldown (e.g. if called mid-practice-mode)
    this.cooldown.abort()

    // Save practice results if in practice mode before resetting state
    this.savePracticeResults()

    // Reset all round + player state
    this.round.reset()
    this.playerManager.resetScores()

    for (const timeout of this.pendingLobbyLeaves.values()) {
      clearTimeout(timeout)
    }
    this.pendingLobbyLeaves.clear()

    // Clear status caches so reconnects get a clean slate
    this.lastBroadcastStatus = null
    this.managerStatus = null
    this.playerStatus.clear()

    const players = this.playerManager.getAll()
    const roomStatus = {
      name: STATUS.SHOW_ROOM,
      data: { text: "game:waitingForPlayers", inviteCode: this.inviteCode },
    } as const

    // Send players to a waiting screen (WAIT is already in their component map)
    for (const player of players) {
      this.sendStatus(player.id, STATUS.WAIT, {
        text: "game:waitingForNextGame",
        correctSentences: this.quizz.questions.map((q) => q.correctSentence),
      })
      this.io.to(player.id).emit(EVENTS.PLAYER.UPDATE, player)
    }

    // Send the manager back to the lobby with the full fresh player list
    this.sendStatus(this._manager.id, STATUS.SHOW_ROOM, {
      text: "game:waitingForPlayers",
      inviteCode: this.inviteCode,
    })
    this.io.to(this._manager.id).emit(EVENTS.MANAGER.SUCCESS_RECONNECT, {
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      currentQuestion: this.round.getReconnectInfo(),
      status: roomStatus,
      players,
      quizzId: this.quizzId,
      mode: this.mode,
    })

    // Refresh counts for everyone
    this.io.to(this.gameId).emit(EVENTS.GAME.TOTAL_PLAYERS, players.length)
    this.io.to(this.gameId).emit(EVENTS.GAME.UPDATE_QUESTION, null)

    console.log(`Game ${this.inviteCode} reset for a new round`)
  }

  savePracticeResults(): void {
    if (this.mode !== "practice") {
      return
    }
    const practiceResults = this.round.getPracticeResults()
    if (practiceResults.length === 0) {
      return
    }

    const resultData: GameResult = {
      id: `${Date.now()}-${uuid().substring(0, 8)}`,
      subject: this.round.getQuizzSubject(),
      date: new Date().toISOString(),
      mode: "practice",
      players: this.players.map((p) => ({
        username: p.username,
        points: p.points,
        rank: 0,
      })),
      questions: [],
      rounds: practiceResults,
    }
    saveResult(resultData)
  }

  destroy() {
    this.savePracticeResults()
    this.cooldown.abort()
    this.round.reset()
    this.clearManagerLobbyTimeout()
    for (const timeout of this.pendingLobbyLeaves.values()) {
      clearTimeout(timeout)
    }
    this.pendingLobbyLeaves.clear()
  }
}

export default Game
