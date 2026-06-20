import type { MEDIA_TYPES } from "@razzia/common/constants"

export interface Player {
  id: string
  clientId: string
  connected: boolean
  username: string
  points: number
  streak: number
  studyRound?: number
}

export interface Answer {
  playerId: string
  submittedSentence: string
  submittedChunks: string[]
  points: number
}

export type QuestionMediaType =
  | (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES]
  | undefined

export interface QuestionMedia {
  type?: QuestionMediaType
  url: string
}

export interface Question {
  koreanPrompt: string
  scrambledChunks: string[]
  correctChunks: string[]
  correctSentence: string
  media?: QuestionMedia
  cooldown: number
  time: number
}

export interface Quizz {
  subject: string
  questions: Question[]
}

export type QuizzWithId = Quizz & { id: string }

export interface QuizzMeta {
  id: string
  subject: string
  hasMismatch?: boolean
  questionCount?: number
}

export interface GameUpdateQuestion {
  current: number
  total: number
}

export interface PlayerAnswerRecord {
  playerName: string
  submittedSentence: string | null
}

export type QuestionResult = Question & {
  playerAnswers: PlayerAnswerRecord[]
}

export interface GameResultPlayer {
  username: string
  points: number
  rank: number
}

export interface StudyPlayerRoundResult {
  playerName: string
  score: number
  time: number
}

export interface StudyRoundResult {
  round: number
  playerResults: StudyPlayerRoundResult[]
}

export interface GameResult {
  id: string
  subject: string
  date: string
  mode?: GameMode
  players: GameResultPlayer[]
  questions: QuestionResult[]
  rounds?: StudyRoundResult[]
}

export interface GameResultMeta {
  id: string
  subject: string
  date: string
  playerCount: number
  mode?: GameMode
}

export type GameMode = "competitive" | "study"

export interface StudyProgress {
  playerId: string
  username: string
  completed: number
  total: number
  studyRound: number
}
