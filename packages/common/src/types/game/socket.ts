import { EVENTS } from "@razzia/common/constants"
import type {
  GameMode,
  GameResult,
  GameUpdateQuestion,
  Player,
  QuizzWithId,
  PracticeProgress,
} from "@razzia/common/types/game"
import type { Status, StatusDataMap } from "@razzia/common/types/game/status"
import type { ManagerConfig } from "@razzia/common/types/manager"
import { Server as ServerIO, Socket as SocketIO } from "socket.io"

export type Server = ServerIO<ClientToServerEvents, ServerToClientEvents>

export type Socket = SocketIO<ClientToServerEvents, ServerToClientEvents>

export interface Message<K extends keyof StatusDataMap = keyof StatusDataMap> {
  gameId?: string
  status: K
  data: StatusDataMap[K]
}

export interface MessageWithoutStatus<T = unknown> {
  gameId?: string
  data: T
}

export interface MessageGameId {
  gameId?: string
}

export interface ServerToClientEvents {
  connect: () => void

  // Game events
  [EVENTS.GAME.STATUS]: (_data: {
    name: Status
    data: StatusDataMap[Status]
  }) => void
  [EVENTS.GAME.SUCCESS_ROOM]: (
    _data: string | { gameId: string; isRegistered: boolean },
  ) => void
  [EVENTS.GAME.SUCCESS_JOIN]: (_gameId: string) => void
  [EVENTS.GAME.TOTAL_PLAYERS]: (_count: number) => void
  [EVENTS.GAME.ERROR_MESSAGE]: (_message: string) => void
  [EVENTS.GAME.START_COOLDOWN]: () => void
  [EVENTS.GAME.COOLDOWN]: (_count: number) => void
  [EVENTS.GAME.RESET]: (_message: string) => void
  [EVENTS.GAME.UPDATE_QUESTION]: (
    _data: {
      current: number
      total: number
    } | null,
  ) => void
  [EVENTS.GAME.PLAYER_ANSWER]: (_count: number) => void
  [EVENTS.GAME.PRACTICE_WRONG]: () => void

  // Player events
  [EVENTS.PLAYER.CHECK_PIN_RESULT]: (_data: { valid: boolean }) => void
  [EVENTS.PLAYER.SUCCESS_RECONNECT]: (_data: {
    gameId: string
    inviteCode: string
    status: { name: Status; data: StatusDataMap[Status] }
    player: { username: string; points: number }
    currentQuestion: GameUpdateQuestion
  }) => void
  [EVENTS.PLAYER.UPDATE_LEADERBOARD]: (_data: { leaderboard: Player[] }) => void
  [EVENTS.PLAYER.UPDATE]: (_player: Player) => void

  // Manager events
  [EVENTS.MANAGER.SUCCESS_RECONNECT]: (_data: {
    gameId: string
    inviteCode: string
    status: { name: Status; data: StatusDataMap[Status] }
    players: Player[]
    currentQuestion: GameUpdateQuestion
    quizzId: string
  }) => void
  [EVENTS.MANAGER.CONFIG]: (_config: ManagerConfig) => void
  [EVENTS.QUIZZ.DATA]: (_quizz: QuizzWithId) => void
  [EVENTS.MANAGER.GAME_CREATED]: (_data: {
    gameId: string
    inviteCode: string
    quizzId: string
  }) => void
  [EVENTS.MANAGER.STATUS_UPDATE]: (_data: {
    status: Status
    data: StatusDataMap[Status]
  }) => void
  [EVENTS.MANAGER.NEW_PLAYER]: (_player: Player) => void
  [EVENTS.MANAGER.REMOVE_PLAYER]: (_playerId: string) => void
  [EVENTS.MANAGER.ERROR_MESSAGE]: (_message: string) => void
  [EVENTS.MANAGER.PLAYER_KICKED]: (_playerId: string) => void
  [EVENTS.MANAGER.UNAUTHORIZED]: () => void
  [EVENTS.MANAGER.PRACTICE_PROGRESS]: (_data: {
    students: PracticeProgress[]
    subject: string
  }) => void

  // Quizz events
  [EVENTS.QUIZZ.SAVE_SUCCESS]: (_data: { id: string }) => void
  [EVENTS.QUIZZ.UPDATE_SUCCESS]: (_data: { id: string }) => void
  [EVENTS.QUIZZ.ERROR]: (_message: string) => void

  // Results events
  [EVENTS.RESULTS.DATA]: (_result: GameResult) => void
}

export interface ClientToServerEvents {
  // Manager actions
  [EVENTS.GAME.CREATE]: (_quizzId: string) => void
  [EVENTS.MANAGER.AUTH]: (_password: string) => void
  [EVENTS.MANAGER.RECONNECT]: (_message: { gameId: string }) => void
  [EVENTS.MANAGER.LEAVE]: (_message: { gameId: string }) => void
  [EVENTS.MANAGER.KICK_PLAYER]: (_message: {
    gameId: string
    playerId: string
  }) => void
  [EVENTS.MANAGER.START_GAME]: (
    _message: MessageGameId & {
      mode?: GameMode
      options?: {
        startIndex?: number
        endIndex?: number
        shuffle?: boolean
      }
    },
  ) => void
  [EVENTS.MANAGER.ABORT_QUIZ]: (_message: MessageGameId) => void
  [EVENTS.MANAGER.NEXT_QUESTION]: (_message: MessageGameId) => void
  [EVENTS.MANAGER.SHOW_LEADERBOARD]: (_message: MessageGameId) => void
  [EVENTS.MANAGER.GET_CONFIG]: () => void
  [EVENTS.MANAGER.LOGOUT]: () => void
  [EVENTS.MANAGER.EXIT_GAME]: (_message: { gameId: string }) => void
  [EVENTS.MANAGER.END_GAME_EARLY]: (_message: { gameId: string }) => void
  [EVENTS.MANAGER.PLAY_AGAIN]: (_message: { gameId: string }) => void
  [EVENTS.MANAGER.CHANGE_QUIZ]: (
    _message: MessageGameId & { quizzId: string },
  ) => void

  // Quizz actions
  [EVENTS.QUIZZ.GET]: (_id: string) => void
  [EVENTS.QUIZZ.SAVE]: (_quizz: unknown) => void
  [EVENTS.QUIZZ.UPDATE]: (_data: QuizzWithId) => void
  [EVENTS.QUIZZ.DELETE]: (_id: string) => void
  [EVENTS.QUIZZ.MOVE]: (_data: { ids: string[]; folder: string }) => void
  [EVENTS.QUIZZ.TOGGLE_FAVORITE]: (_ids: string[]) => void
  [EVENTS.QUIZZ.SOFT_DELETE]: (_ids: string[]) => void
  [EVENTS.QUIZZ.RESTORE]: (_ids: string[]) => void
  [EVENTS.QUIZZ.PERMANENT_DELETE]: (_ids: string[]) => void
  [EVENTS.QUIZZ.DUPLICATE]: (_id: string) => void
  [EVENTS.QUIZZ.COMBINE]: (_data: {
    ids: string[]
    subject: string
    folder?: string
  }) => void

  // Manager actions (Folders)
  [EVENTS.MANAGER.CREATE_FOLDER]: (_name: string) => void
  [EVENTS.MANAGER.DELETE_FOLDER]: (_name: string) => void
  [EVENTS.MANAGER.RENAME_FOLDER]: (_data: {
    oldName: string
    newName: string
  }) => void

  // Player actions
  [EVENTS.PLAYER.CHECK_PIN]: (_inviteCode: string) => void
  [EVENTS.PLAYER.JOIN]: (_inviteCode: string) => void
  [EVENTS.PLAYER.LOGIN]: (
    _message: MessageWithoutStatus<{ username: string }>,
  ) => void
  [EVENTS.PLAYER.RECONNECT]: (_message: { gameId: string }) => void
  [EVENTS.PLAYER.LEAVE]: (_message: { gameId: string }) => void
  [EVENTS.PLAYER.SUBMIT_SENTENCE]: (
    _message: MessageWithoutStatus<{
      submittedSentence: string
      submittedChunks: string[]
    }>,
  ) => void
  [EVENTS.PLAYER.PRACTICE_SUBMIT]: (
    _message: MessageWithoutStatus<{
      questionIndex: number
      submittedSentence: string
      submittedChunks: string[]
    }>,
  ) => void
  [EVENTS.PLAYER.PRACTICE_RESTART]: (_message: { gameId: string }) => void

  // Results actions
  [EVENTS.RESULTS.GET]: (_id: string) => void
  [EVENTS.RESULTS.DELETE]: (_id: string) => void

  // Common
  disconnect: () => void
}
