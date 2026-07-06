import type {
  Player,
  QuestionMedia,
  PracticeProgress,
} from "@razzia/common/types/game"

export const STATUS = {
  SHOW_ROOM: "SHOW_ROOM",
  SHOW_START: "SHOW_START",
  SHOW_QUESTION: "SHOW_QUESTION",
  BUILD_SENTENCE: "BUILD_SENTENCE",
  SHOW_RESULT: "SHOW_RESULT",
  SHOW_RESPONSES: "SHOW_RESPONSES",
  SHOW_LEADERBOARD: "SHOW_LEADERBOARD",
  FINISHED: "FINISHED",
  WAIT: "WAIT",
  PRACTICE_PROGRESS: "PRACTICE_PROGRESS",
} as const

export type Status = (typeof STATUS)[keyof typeof STATUS]

export interface CommonStatusDataMap {
  SHOW_START: { time: number; subject: string }
  SHOW_QUESTION: {
    prompt: string
    scrambledChunks: string[]
    media?: QuestionMedia
    cooldown: number
  }
  BUILD_SENTENCE: {
    prompt: string
    scrambledChunks: string[]
    media?: QuestionMedia
    time: number
    totalPlayer: number
    questionIndex: number
    correctChunks: string[]
    easyMode?: boolean
  }
  SHOW_RESULT: {
    correct: boolean
    message: string
    points: number
    myPoints: number
    rank: number
    aheadOfMe: string | null
    submittedChunks: string[]
    correctChunks: string[]
  }
  WAIT: { text: string; correctSentences?: string[] }
  FINISHED: {
    subject: string
    top: Player[]
    rank?: number
    practiceTime?: number
  }
}

interface ManagerExtraStatus {
  SHOW_ROOM: { text: string; inviteCode?: string }
  SHOW_RESPONSES: {
    prompt: string
    correctSentence: string
    scrambledChunks: string[]
    media?: QuestionMedia
    correctCount: number
    totalCount: number
  }
  SHOW_LEADERBOARD: { oldLeaderboard: Player[]; leaderboard: Player[] }
  PRACTICE_PROGRESS: { students: PracticeProgress[]; subject: string }
}

export type PlayerStatusDataMap = CommonStatusDataMap

export type ManagerStatusDataMap = CommonStatusDataMap & ManagerExtraStatus

export type StatusDataMap = PlayerStatusDataMap & ManagerExtraStatus
