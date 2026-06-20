// oxlint-disable typescript/no-unnecessary-condition
import { EVENTS, MEDIA_TYPES, NO_TIME_LIMIT } from "@razzia/common/constants"
import type {
  Answer,
  GameMode,
  GameResult,
  Player,
  Question,
  QuestionResult,
  Quizz,
  StudyProgress,
  StudyRoundResult,
  StudyPlayerRoundResult,
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
  private mode: GameMode = "competitive"
  private currentQuestion = 0
  private playersAnswers: Answer[] = []
  private startTime = 0
  private leaderboard: Player[] = []
  private tempOldLeaderboard: Player[] | null = null
  private questionsHistory: QuestionResult[] = []

  // Study mode state
  private studyProgress = new Map<string, number>() // socketId -> completed count
  private studyStartTimes = new Map<string, number>() // socketId -> start timestamp
  private studyErrors = new Map<string, number>() // socketId -> current question error count
  private studyHistory = new Map<
    string,
    Array<{ round: number; score: number; time: number }>
  >() // username -> history

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

  getReconnectInfo() {
    return {
      current: this.currentQuestion + 1,
      total: this.opts.quizz.questions.length,
    }
  }

  reset(): void {
    this.started = false
    this.mode = "competitive"
    this.currentQuestion = 0
    this.playersAnswers = []
    this.startTime = 0
    this.leaderboard = []
    this.tempOldLeaderboard = null
    this.questionsHistory = []

    this.studyProgress.clear()
    this.studyStartTimes.clear()
    this.studyErrors.clear()
    this.studyHistory.clear()
  }

  async start(
    socket: Socket,
    mode: GameMode = "competitive",
    options?: { shuffle?: boolean; startIndex?: number; endIndex?: number },
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

    this.opts.broadcast(STATUS.SHOW_START, {
      time: 3,
      subject: this.opts.quizz.subject,
    })

    await sleep(3)

    if (mode === "study") {
      this.startStudyMode()
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
      koreanPrompt: question.koreanPrompt,
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
      koreanPrompt: question.koreanPrompt,
      scrambledChunks: question.scrambledChunks,
      media: question.media,
      time: question.time,
      totalPlayer: this.opts.players.count(),
      questionIndex: this.currentQuestion,
      correctChunks: question.correctChunks,
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
      koreanPrompt: question.koreanPrompt,
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

  // ── Study Mode ──────────────────────────────────────────────────────────

  private startStudyMode(): void {
    const players = this.opts.players.getAll()
    const total = this.opts.quizz.questions.length
    const startTime = Date.now()

    // Initialize progress for all players
    for (const player of players) {
      player.points = 0
      this.studyProgress.set(player.id, 0)
      this.studyStartTimes.set(player.id, startTime)
      this.studyErrors.set(player.id, 0)
    }

    // Send first question to all players
    const firstQuestion = this.opts.quizz.questions[0]

    this.opts.io.to(this.opts.gameId).emit(EVENTS.GAME.UPDATE_QUESTION, {
      current: 1,
      total,
    })

    // Send BUILD_SENTENCE to all players (no timer in study mode, but we use a large value)
    for (const player of players) {
      this.opts.send(player.id, STATUS.BUILD_SENTENCE, {
        koreanPrompt: firstQuestion.koreanPrompt,
        scrambledChunks: firstQuestion.scrambledChunks,
        media: firstQuestion.media,
        time: 9999,
        totalPlayer: players.length,
        questionIndex: 0,
        correctChunks: firstQuestion.correctChunks,
      })
    }

    // Send study progress to manager
    this.emitStudyProgress()
  }

  studyRestart(socket: Socket): void {
    if (this.mode !== "study") {
      return
    }

    const player = this.opts.players.findById(socket.id)

    if (!player) {
      return
    }

    // Increment player's round
    player.studyRound = (player.studyRound ?? 1) + 1
    player.points = 0

    // Reset their progress
    this.studyProgress.set(socket.id, 0)
    this.studyStartTimes.set(socket.id, Date.now())
    this.studyErrors.set(socket.id, 0)

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
        koreanPrompt: firstQuestion.koreanPrompt,
        scrambledChunks: firstQuestion.scrambledChunks,
        media: firstQuestion.media,
        time: 9999,
        totalPlayer: this.opts.players.count(),
        questionIndex: 0,
        correctChunks: firstQuestion.correctChunks,
      })
    }

    this.emitStudyProgress()
  }

  studySubmit(
    socket: Socket,
    questionIndex: number,
    submittedSentence: string,
    submittedChunks: string[],
  ): void {
    if (this.mode !== "study") {
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
    const currentCompleted = this.studyProgress.get(socket.id) ?? 0

    // Only advance if correct and this is their current question
    if (isCorrect && questionIndex === currentCompleted) {
      const newCompleted = currentCompleted + 1
      this.studyProgress.set(socket.id, newCompleted)

      const errors = this.studyErrors.get(socket.id) ?? 0
      const points = Math.max(200, 1000 - errors * 200)
      player.points += points
      this.studyErrors.set(socket.id, 0)

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
      setTimeout(() => {
        const nextQuestion = this.opts.quizz.questions[newCompleted]

        if (nextQuestion) {
          this.opts.io.to(socket.id).emit(EVENTS.GAME.UPDATE_QUESTION, {
            current: newCompleted + 1,
            total: this.opts.quizz.questions.length,
          })

          this.opts.send(socket.id, STATUS.BUILD_SENTENCE, {
            koreanPrompt: nextQuestion.koreanPrompt,
            scrambledChunks: nextQuestion.scrambledChunks,
            media: nextQuestion.media,
            time: 9999,
            totalPlayer: this.opts.players.count(),
            questionIndex: newCompleted,
            correctChunks: nextQuestion.correctChunks,
          })
        } else {
          // Player finished all questions
          const startTime = this.studyStartTimes.get(socket.id)
          const studyTime = startTime
            ? Math.round((Date.now() - startTime) / 1000)
            : undefined

          // Record completed round in history map
          const roundNum = player.studyRound ?? 1
          let history = this.studyHistory.get(player.username)
          if (!history) {
            history = []
            this.studyHistory.set(player.username, history)
          }
          if (!history.some((h) => h.round === roundNum)) {
            history.push({
              round: roundNum,
              score: player.points,
              time: studyTime ?? 0,
            })
          }

          this.opts.send(socket.id, STATUS.FINISHED, {
            subject: this.opts.quizz.subject,
            top: [],
            rank: 0,
            studyTime,
          })
        }

        this.emitStudyProgress()
      }, 2500)
    } else if (!isCorrect) {
      const errors = this.studyErrors.get(socket.id) ?? 0
      this.studyErrors.set(socket.id, errors + 1)
      // Emit a lightweight signal — no state transition, player stays on BUILD_SENTENCE to retry
      this.opts.io.to(socket.id).emit(EVENTS.GAME.STUDY_WRONG)
    }
  }

  playerJoinedMidGame(
    socket: Socket,
    lastBroadcastStatus: { name: Status; data: StatusDataMap[Status] } | null,
  ): void {
    if (!this.started) {
      return
    }

    if (this.mode === "study") {
      const player = this.opts.players.findById(socket.id)
      if (player) {
        player.points = 0
      }
      this.studyProgress.set(socket.id, 0)
      this.studyStartTimes.set(socket.id, Date.now())
      this.studyErrors.set(socket.id, 0)

      const firstQuestion = this.opts.quizz.questions[0]
      if (firstQuestion) {
        this.opts.io.to(socket.id).emit(EVENTS.GAME.UPDATE_QUESTION, {
          current: 1,
          total: this.opts.quizz.questions.length,
        })

        this.opts.send(socket.id, STATUS.BUILD_SENTENCE, {
          koreanPrompt: firstQuestion.koreanPrompt,
          scrambledChunks: firstQuestion.scrambledChunks,
          media: firstQuestion.media,
          time: 9999,
          totalPlayer: this.opts.players.count(),
          questionIndex: 0,
          correctChunks: firstQuestion.correctChunks,
        })

        this.emitStudyProgress()
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
    if (!this.started || this.mode !== "competitive") {
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

  private emitStudyProgress(): void {
    const players = this.opts.players.getAll()
    const total = this.opts.quizz.questions.length

    const students: StudyProgress[] = this.opts.players
      .getAll()
      .map((player) => ({
        playerId: player.id,
        username: player.username,
        completed: this.studyProgress.get(player.id) ?? 0,
        total,
        studyRound: player.studyRound ?? 1,
      }))

    // Send via STATUS machine so the manager enters/stays on StudyDashboard view
    this.opts.send(this.opts.getManagerId(), STATUS.STUDY_PROGRESS, {
      students,
      subject: this.opts.quizz.subject,
    })
    // Also emit as a side-channel event so StudyDashboard can update its local state without remounting
    this.opts.io
      .to(this.opts.getManagerId())
      .emit(EVENTS.MANAGER.STUDY_PROGRESS, {
        students,
        subject: this.opts.quizz.subject,
      })
  }

  getStudyResults(): StudyRoundResult[] {
    const roundsMap = new Map<number, StudyPlayerRoundResult[]>()

    for (const [username, runs] of this.studyHistory.entries()) {
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
}
