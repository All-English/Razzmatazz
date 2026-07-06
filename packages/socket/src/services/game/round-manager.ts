// oxlint-disable typescript/no-unnecessary-condition
import { EVENTS, MEDIA_TYPES, NO_TIME_LIMIT, PRACTICE_MODE_TIME } from "@razzia/common/constants"
import type {
  Answer,
  GameMode,
  GameResult,
  Player,
  Question,
  QuestionResult,
  Quizz,
  PracticeProgress,
  PracticeRoundResult,
  PracticePlayerRoundResult,
} from "@razzia/common/types/game"
import type { Server, Socket } from "@razzia/common/types/game/socket"
import {
  type Status,
  STATUS,
  type StatusDataMap,
} from "@razzia/common/types/game/status"
import { CooldownTimer } from "@razzia/socket/services/game/cooldown-timer"
import { PlayerManager } from "@razzia/socket/services/game/player-manager"
import { orderToPoint, timeToPoint } from "@razzia/socket/utils/game"
import sleep from "@razzia/socket/utils/sleep"
import { nanoid } from "nanoid"

type BroadcastFn = <T extends Status>(
  _status: T,
  _data: StatusDataMap[T],
) => void
type SendFn = <T extends Status>(
  _target: string,
  _status: T,
  _data: StatusDataMap[T],
) => void

export interface RoundManagerOptions {
  quizz: Quizz
  players: PlayerManager
  cooldown: CooldownTimer
  io: Server
  gameId: string
  getManagerId: () => string
  broadcast: BroadcastFn
  send: SendFn
  onNewQuestion: () => void
  onGameFinished: (_result: GameResult) => void
}

export class RoundManager {
  private readonly opts: RoundManagerOptions
  private started = false
  private mode: GameMode = "practice"
  private easyMode = false
  private currentQuestion = 0
  private playersAnswers: Answer[] = []
  private startTime = 0
  private leaderboard: Player[] = []
  private tempOldLeaderboard: Player[] | null = null
  private questionsHistory: QuestionResult[] = []

  // Practice mode state
  private practiceProgress = new Map<string, number>() // username -> completed count
  private practiceStartTimes = new Map<string, number>() // username -> start timestamp
  private practiceErrors = new Map<string, number>() // username -> current question error count
  private practiceHistory = new Map<
    string,
    Array<{ round: number; score: number; time: number }>
  >() // username -> history
  private practiceTimeouts = new Set<any>()

  private originalQuizz: Quizz

  constructor(opts: RoundManagerOptions) {
    this.opts = opts
    this.originalQuizz = JSON.parse(JSON.stringify(opts.quizz))
  }

  updateQuizz(quizz: Quizz): void {
    this.originalQuizz = JSON.parse(JSON.stringify(quizz))
    this.opts.quizz = quizz
  }

  isStarted(): boolean {
    return this.started
  }

  getMode(): GameMode {
    return this.mode
  }

  getEasyMode(): boolean {
    return this.easyMode
  }

  getReconnectInfo(username?: string) {
    if (this.mode === "practice" && username) {
      return {
        current: (this.practiceProgress.get(username) ?? 0) + 1,
        total: this.opts.quizz.questions.length,
      }
    }
    return {
      current: this.currentQuestion + 1,
      total: this.opts.quizz.questions.length,
    }
  }

  reset(): void {
    this.started = false
    this.mode = "practice"
    this.easyMode = false
    this.currentQuestion = 0
    this.playersAnswers = []
    this.startTime = 0
    this.leaderboard = []
    this.tempOldLeaderboard = null
    this.questionsHistory = []

    this.practiceProgress.clear()
    this.practiceStartTimes.clear()
    this.practiceErrors.clear()
    this.practiceHistory.clear()
    
    for (const timeout of this.practiceTimeouts) {
      clearTimeout(timeout)
    }
    this.practiceTimeouts.clear()
  }

  async start(
    socket: Socket,
    mode: GameMode = "practice",
    options?: { shuffle?: boolean; startIndex?: number; endIndex?: number; easyMode?: boolean },
  ): Promise<void> {
    if (this.opts.getManagerId() !== socket.id) {
      return
    }

    if (this.started) {
      return
    }

    if (this.opts.players.count() === 0) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:game.noPlayersConnected")

      return
    }

    // Reset/Prepare quizz for this round from originalQuizz
    const quizzCopy = JSON.parse(JSON.stringify(this.originalQuizz)) as Quizz
    let questions = quizzCopy.questions

    if (options) {
      const { startIndex, endIndex, shuffle } = options
      if (typeof startIndex === "number" || typeof endIndex === "number") {
        const total = questions.length
        const start =
          typeof startIndex === "number"
            ? Math.max(0, Math.min(startIndex, total - 1))
            : 0
        const end =
          typeof endIndex === "number"
            ? Math.max(start, Math.min(endIndex, total - 1))
            : total - 1
        questions = questions.slice(start, end + 1)
      }

      if (shuffle) {
        // Durstenfeld shuffle
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          const temp = questions[i]
          questions[i] = questions[j]
          questions[j] = temp
        }
      }
    }

    quizzCopy.questions = questions
    this.opts.quizz = quizzCopy

    this.started = true
    this.mode = mode
    this.easyMode = options?.easyMode ?? false

    this.opts.broadcast(STATUS.SHOW_START, {
      time: 3,
      subject: this.opts.quizz.subject,
    })

    await sleep(3)

    if (mode === "practice") {
      this.startPracticeMode()
    } else {
      this.opts.io.to(this.opts.gameId).emit(EVENTS.GAME.START_COOLDOWN)
      await this.opts.cooldown.start(3)

      void this.newQuestion()
    }
  }

  // ── Competitive Mode ──────────────────────────────────────────────────────

  async newQuestion(): Promise<void> {
    if (!this.started) {
      return
    }

    const question = this.opts.quizz.questions[this.currentQuestion]

    this.opts.onNewQuestion()

    this.opts.io.to(this.opts.gameId).emit(EVENTS.GAME.UPDATE_QUESTION, {
      current: this.currentQuestion + 1,
      total: this.opts.quizz.questions.length,
    })

    const imageMedia =
      question.media?.type === MEDIA_TYPES.IMAGE ? question.media : undefined

    this.opts.broadcast(STATUS.SHOW_QUESTION, {
      prompt: question.prompt,
      scrambledChunks: question.scrambledChunks,
      media: imageMedia,
      cooldown: question.cooldown,
    })

    await sleep(question.cooldown)

    if (!this.started) {
      return
    }

    this.startTime = Date.now()

    this.opts.broadcast(STATUS.BUILD_SENTENCE, {
      prompt: question.prompt,
      scrambledChunks: question.scrambledChunks,
      media: question.media,
      time: question.time,
      totalPlayer: this.opts.players.count(),
      questionIndex: this.currentQuestion,
      correctChunks: question.correctChunks,
      easyMode: this.easyMode,
    })

    await this.opts.cooldown.start(question.time)

    if (!this.started) {
      return
    }

    this.showResults(question)
  }

  private showResults(question: Question): void {
    const currentPlayers = this.opts.players.getAll()

    const oldLeaderboard = (() => {
      if (this.leaderboard.length === 0) {
        return currentPlayers.map((p) => ({ ...p }))
      }

      return this.leaderboard.map((p) => ({ ...p }))
    })()

    let correctCount = 0
    const totalCount = this.playersAnswers.length

    const sortedPlayers = currentPlayers
      .map((player) => {
        const playerAnswer = this.playersAnswers.find(
          (a) => a.playerId === player.id,
        )

        const cleanStr = (s: string) =>
          s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "")
        const isCorrect = playerAnswer
          ? playerAnswer.submittedChunks &&
            playerAnswer.submittedChunks.length > 0
            ? JSON.stringify(playerAnswer.submittedChunks) ===
              JSON.stringify(question.correctChunks)
            : cleanStr(playerAnswer.submittedSentence) ===
              cleanStr(question.correctSentence)
          : false

        if (isCorrect) {
          correctCount++
        }

        const points =
          playerAnswer && isCorrect ? Math.round(playerAnswer.points) : 0

        player.points += points
        player.streak = isCorrect ? player.streak + 1 : 0

        return {
          ...player,
          lastCorrect: isCorrect,
          lastPoints: points,
          lastChunks: playerAnswer?.submittedChunks ?? [],
        }
      })
      .sort((a, b) => b.points - a.points)

    this.opts.players.replace(sortedPlayers)

    sortedPlayers.forEach((player, index) => {
      const rank = index + 1
      const aheadPlayer = sortedPlayers[index - 1]

      this.opts.send(player.id, STATUS.SHOW_RESULT, {
        correct: player.lastCorrect,
        message: player.lastCorrect ? "game:correct" : "game:wrong",
        points: player.lastPoints,
        myPoints: player.points,
        rank,
        aheadOfMe: aheadPlayer ? aheadPlayer.username : null,
        submittedChunks: player.lastChunks,
        correctChunks: question.correctChunks,
      })
    })

    this.opts.send(this.opts.getManagerId(), STATUS.SHOW_RESPONSES, {
      prompt: question.prompt,
      correctSentence: question.correctSentence,
      scrambledChunks: question.scrambledChunks,
      media: question.media,
      correctCount,
      totalCount,
    })

    this.questionsHistory.push({
      ...question,
      playerAnswers: currentPlayers.map((player) => ({
        playerName: player.username,
        submittedSentence:
          this.playersAnswers.find((a) => a.playerId === player.id)
            ?.submittedSentence ?? null,
      })),
    })

    this.leaderboard = sortedPlayers
    this.tempOldLeaderboard = oldLeaderboard
    this.playersAnswers = []
  }

  submitSentence(
    socket: Socket,
    submittedSentence: string,
    submittedChunks: string[],
  ): void {
    const player = this.opts.players.findById(socket.id)
    const question = this.opts.quizz.questions[this.currentQuestion]

    if (!player) {
      return
    }

    if (this.playersAnswers.find((a) => a.playerId === socket.id)) {
      return
    }

    if (this.easyMode) {
      const cleanStr = (s: string) =>
        s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "")
      const isCorrect = submittedChunks && submittedChunks.length > 0
        ? JSON.stringify(submittedChunks) === JSON.stringify(question.correctChunks)
        : cleanStr(submittedSentence) === cleanStr(question.correctSentence)

      if (!isCorrect) {
        socket.emit(EVENTS.GAME.PRACTICE_WRONG)
        return
      }
    }

    const points = (() => {
      if (question.time === NO_TIME_LIMIT) {
        return orderToPoint(
          this.playersAnswers.length,
          this.opts.players.count(),
        )
      }

      return timeToPoint(this.startTime, question.time)
    })()

    this.playersAnswers.push({
      playerId: player.id,
      submittedSentence,
      submittedChunks,
      points,
    })

    this.opts.send(socket.id, STATUS.WAIT, {
      text: "game:waitingForAnswers",
    })

    socket
      .to(this.opts.gameId)
      .emit(EVENTS.GAME.PLAYER_ANSWER, this.playersAnswers.length)
    this.opts.players.broadcastCount()

    if (this.playersAnswers.length === this.opts.players.count()) {
      this.opts.cooldown.abort()
    }
  }

  nextQuestion(socket: Socket): void {
    if (!this.started) {
      return
    }

    if (socket.id !== this.opts.getManagerId()) {
      return
    }

    if (!this.opts.quizz.questions[this.currentQuestion + 1]) {
      return
    }

    this.currentQuestion += 1
    void this.newQuestion()
  }

  abortQuestion(socket: Socket): void {
    if (!this.started) {
      return
    }

    if (socket.id !== this.opts.getManagerId()) {
      return
    }

    this.opts.cooldown.abort()
  }

  showLeaderboard(): void {
    const isLastRound =
      this.currentQuestion + 1 === this.opts.quizz.questions.length

    if (isLastRound) {
      this.started = false

      const top = this.leaderboard.slice(0, 3)

      this.opts.onGameFinished({
        id: `${Date.now()}-${nanoid(8)}`,
        subject: this.opts.quizz.subject,
        date: new Date().toISOString(),
        players: this.leaderboard.map((player, index) => ({
          username: player.username,
          points: player.points,
          rank: index + 1,
        })),
        questions: this.questionsHistory,
      })

      this.opts.send(this.opts.getManagerId(), STATUS.FINISHED, {
        subject: this.opts.quizz.subject,
        top,
      })

      this.leaderboard.forEach((player, index) => {
        this.opts.send(player.id, STATUS.FINISHED, {
          subject: this.opts.quizz.subject,
          top,
          rank: index + 1,
        })
      })

      return
    }

    const oldLeaderboard = this.tempOldLeaderboard ?? this.leaderboard

    this.opts.send(this.opts.getManagerId(), STATUS.SHOW_LEADERBOARD, {
      oldLeaderboard: oldLeaderboard.slice(0, 5),
      leaderboard: this.leaderboard.slice(0, 5),
    })

    this.tempOldLeaderboard = null
  }

  // ── Practice Mode ──────────────────────────────────────────────────────────

  private startPracticeMode(): void {
    const players = this.opts.players.getAll()
    const total = this.opts.quizz.questions.length
    const startTime = Date.now()

    // Initialize progress for all players
    for (const player of players) {
      player.points = 0
      this.practiceProgress.set(player.username, 0)
      this.practiceStartTimes.set(player.username, startTime)
      this.practiceErrors.set(player.username, 0)
    }

    // Send first question to all players
    const firstQuestion = this.opts.quizz.questions[0]

    this.opts.io.to(this.opts.gameId).emit(EVENTS.GAME.UPDATE_QUESTION, {
      current: 1,
      total,
    })

    // Send BUILD_SENTENCE to all players (no timer in practice mode, but we use a large value)
    for (const player of players) {
      this.opts.send(player.id, STATUS.BUILD_SENTENCE, {
        prompt: firstQuestion.prompt,
        scrambledChunks: firstQuestion.scrambledChunks,
        media: firstQuestion.media,
        time: PRACTICE_MODE_TIME,
        totalPlayer: players.length,
        questionIndex: 0,
        correctChunks: firstQuestion.correctChunks,
      })
    }

    // Send practice progress to manager
    this.emitPracticeProgress()
  }

  practiceRestart(socket: Socket): void {
    if (this.mode !== "practice") {
      return
    }

    const player = this.opts.players.findById(socket.id)

    if (!player) {
      return
    }

    // Increment player's round
    player.practiceRound = (player.practiceRound ?? 1) + 1
    player.points = 0

    // Reset their progress
    this.practiceProgress.set(player.username, 0)
    this.practiceStartTimes.set(player.username, Date.now())
    this.practiceErrors.set(player.username, 0)

    // Send updated player object back to the player
    this.opts.io.to(socket.id).emit(EVENTS.PLAYER.UPDATE, player)

    // Re-send the first question
    const firstQuestion = this.opts.quizz.questions[0]

    if (firstQuestion) {
      this.opts.io.to(socket.id).emit(EVENTS.GAME.UPDATE_QUESTION, {
        current: 1,
        total: this.opts.quizz.questions.length,
      })

      this.opts.send(socket.id, STATUS.BUILD_SENTENCE, {
        prompt: firstQuestion.prompt,
        scrambledChunks: firstQuestion.scrambledChunks,
        media: firstQuestion.media,
        time: PRACTICE_MODE_TIME,
        totalPlayer: this.opts.players.count(),
        questionIndex: 0,
        correctChunks: firstQuestion.correctChunks,
      })
    }

    this.emitPracticeProgress()
  }

  practiceSubmit(
    socket: Socket,
    questionIndex: number,
    submittedSentence: string,
    submittedChunks: string[],
  ): void {
    if (this.mode !== "practice") {
      return
    }

    const player = this.opts.players.findById(socket.id)

    if (!player) {
      return
    }

    const question = this.opts.quizz.questions[questionIndex]

    if (!question) {
      return
    }

    const cleanStr = (s: string) =>
      s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "")
    const isCorrect =
      submittedChunks && submittedChunks.length > 0
        ? JSON.stringify(submittedChunks) ===
          JSON.stringify(question.correctChunks)
        : cleanStr(submittedSentence) === cleanStr(question.correctSentence)
    const currentCompleted = this.practiceProgress.get(player.username) ?? 0

    // Only advance if correct and this is their current question
    if (isCorrect && questionIndex === currentCompleted) {
      const newCompleted = currentCompleted + 1
      this.practiceProgress.set(player.username, newCompleted)

      const errors = this.practiceErrors.get(player.username) ?? 0
      const points = Math.max(200, 1000 - errors * 200)
      player.points += points
      this.practiceErrors.set(player.username, 0)

      // Send result feedback
      this.opts.send(socket.id, STATUS.SHOW_RESULT, {
        correct: true,
        message: "game:correct",
        points,
        myPoints: player.points,
        rank: 0,
        aheadOfMe: null,
        submittedChunks,
        correctChunks: question.correctChunks,
      })

      // After a brief delay, send next question or finish
      const timeout = setTimeout(() => {
        this.practiceTimeouts.delete(timeout)
        const nextQuestion = this.opts.quizz.questions[newCompleted]

        if (nextQuestion) {
          this.opts.io.to(socket.id).emit(EVENTS.GAME.UPDATE_QUESTION, {
            current: newCompleted + 1,
            total: this.opts.quizz.questions.length,
          })

          this.opts.send(socket.id, STATUS.BUILD_SENTENCE, {
            prompt: nextQuestion.prompt,
            scrambledChunks: nextQuestion.scrambledChunks,
            media: nextQuestion.media,
            time: PRACTICE_MODE_TIME,
            totalPlayer: this.opts.players.count(),
            questionIndex: newCompleted,
            correctChunks: nextQuestion.correctChunks,
          })
        } else {
          // Player finished all questions
          const startTime = this.practiceStartTimes.get(player.username)
          const practiceTime = startTime
            ? Math.round((Date.now() - startTime) / 1000)
            : undefined

          // Record completed round in history map
          const roundNum = player.practiceRound ?? 1
          let history = this.practiceHistory.get(player.username)
          if (!history) {
            history = []
            this.practiceHistory.set(player.username, history)
          }
          if (!history.some((h) => h.round === roundNum)) {
            history.push({
              round: roundNum,
              score: player.points,
              time: practiceTime ?? 0,
            })
          }

          this.opts.send(socket.id, STATUS.FINISHED, {
            subject: this.opts.quizz.subject,
            top: [],
            rank: 0,
            practiceTime,
          })
        }

        this.emitPracticeProgress()
      }, 2500)
      this.practiceTimeouts.add(timeout)
    } else if (!isCorrect) {
      const errors = this.practiceErrors.get(player.username) ?? 0
      this.practiceErrors.set(player.username, errors + 1)
      // Emit a lightweight signal — no state transition, player stays on BUILD_SENTENCE to retry
      this.opts.io.to(socket.id).emit(EVENTS.GAME.PRACTICE_WRONG)
    }
  }

  playerJoinedMidGame(
    socket: Socket,
    lastBroadcastStatus: { name: Status; data: StatusDataMap[Status] } | null,
  ): void {
    if (!this.started) {
      return
    }

    if (this.mode === "practice") {
      const player = this.opts.players.findById(socket.id)
      if (player) {
        player.points = 0
        this.practiceProgress.set(player.username, 0)
        this.practiceStartTimes.set(player.username, Date.now())
        this.practiceErrors.set(player.username, 0)
      }

      const firstQuestion = this.opts.quizz.questions[0]
      if (firstQuestion) {
        this.opts.io.to(socket.id).emit(EVENTS.GAME.UPDATE_QUESTION, {
          current: 1,
          total: this.opts.quizz.questions.length,
        })

        this.opts.send(socket.id, STATUS.BUILD_SENTENCE, {
          prompt: firstQuestion.prompt,
          scrambledChunks: firstQuestion.scrambledChunks,
          media: firstQuestion.media,
          time: PRACTICE_MODE_TIME,
          totalPlayer: this.opts.players.count(),
          questionIndex: 0,
          correctChunks: firstQuestion.correctChunks,
        })

        this.emitPracticeProgress()
      }
    } else {
      this.opts.io.to(socket.id).emit(EVENTS.GAME.UPDATE_QUESTION, {
        current: this.currentQuestion + 1,
        total: this.opts.quizz.questions.length,
      })

      if (lastBroadcastStatus) {
        // Broadcast the last state directly to the new player to sync them
        this.opts.send(
          socket.id,
          lastBroadcastStatus.name,
          lastBroadcastStatus.data,
        )
      }
    }
  }

  public endGameEarly(socket: Socket): void {
    if (!this.started || this.mode !== "versus") {
      return
    }

    if (socket.id !== this.opts.getManagerId()) {
      return
    }

    this.started = false
    this.opts.cooldown.abort()

    const top = this.leaderboard.slice(0, 3)

    this.opts.onGameFinished({
      id: `${Date.now()}-${nanoid(8)}`,
      subject: this.opts.quizz.subject,
      date: new Date().toISOString(),
      players: this.leaderboard.map((player, index) => ({
        username: player.username,
        points: player.points,
        rank: index + 1,
      })),
      questions: this.questionsHistory,
    })

    this.opts.send(this.opts.getManagerId(), STATUS.FINISHED, {
      subject: this.opts.quizz.subject,
      top,
    })

    this.leaderboard.forEach((player, index) => {
      this.opts.send(player.id, STATUS.FINISHED, {
        subject: this.opts.quizz.subject,
        top,
        rank: index + 1,
      })
    })
  }

  private emitPracticeProgress(): void {
    const players = this.opts.players.getAll()
    const total = this.opts.quizz.questions.length

    const students: PracticeProgress[] = players.map((player) => ({
      playerId: player.id,
      username: player.username,
      completed: this.practiceProgress.get(player.username) ?? 0,
      total,
      practiceRound: player.practiceRound ?? 1,
    }))

    // Send via STATUS machine so the manager enters/stays on PracticeDashboard view
    this.opts.send(this.opts.getManagerId(), STATUS.PRACTICE_PROGRESS, {
      students,
      subject: this.opts.quizz.subject,
    })
    // Also emit as a side-channel event so PracticeDashboard can update its local state without remounting
    this.opts.io
      .to(this.opts.getManagerId())
      .emit(EVENTS.MANAGER.PRACTICE_PROGRESS, {
        students,
        subject: this.opts.quizz.subject,
      })
  }

  getPracticeResults(): PracticeRoundResult[] {
    const roundsMap = new Map<number, PracticePlayerRoundResult[]>()

    for (const [username, runs] of this.practiceHistory.entries()) {
      for (const run of runs) {
        let roundResults = roundsMap.get(run.round)
        if (!roundResults) {
          roundResults = []
          roundsMap.set(run.round, roundResults)
        }
        roundResults.push({
          playerName: username,
          score: run.score,
          time: run.time,
        })
      }
    }

    return Array.from(roundsMap.entries())
      .map(([round, playerResults]) => ({
        round,
        playerResults: playerResults.sort(
          (a, b) => b.score - a.score || a.time - b.time,
        ),
      }))
      .sort((a, b) => a.round - b.round)
  }

  getQuizzSubject(): string {
    return this.opts.quizz.subject
  }

  getPracticeNextQuestionStatus(username: string): { name: Status; data: any } {
    const completed = this.practiceProgress.get(username) ?? 0
    const nextQuestion = this.opts.quizz.questions[completed]

    if (nextQuestion) {
      return {
        name: STATUS.BUILD_SENTENCE,
        data: {
          prompt: nextQuestion.prompt,
          scrambledChunks: nextQuestion.scrambledChunks,
          media: nextQuestion.media,
          time: PRACTICE_MODE_TIME,
          totalPlayer: this.opts.players.count(),
          questionIndex: completed,
          correctChunks: nextQuestion.correctChunks,
        },
      }
    } else {
      // Completed all questions
      const startTime = this.practiceStartTimes.get(username)
      const practiceTime = startTime
        ? Math.round((Date.now() - startTime) / 1000)
        : undefined

      // Record in history if not already present
      const player = this.opts.players.getAll().find((p) => p.username === username)
      if (player) {
        const roundNum = player.practiceRound ?? 1
        let history = this.practiceHistory.get(username)
        if (!history) {
          history = []
          this.practiceHistory.set(username, history)
        }
        if (!history.some((h) => h.round === roundNum)) {
          history.push({
            round: roundNum,
            score: player.points,
            time: practiceTime ?? 0,
          })
        }
      }

      return {
        name: STATUS.FINISHED,
        data: {
          subject: this.opts.quizz.subject,
          top: [],
          rank: 0,
          practiceTime,
        },
      }
    }
  }
}
