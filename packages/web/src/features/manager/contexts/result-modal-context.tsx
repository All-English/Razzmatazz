import type {
  GameResult,
  QuestionResult,
  StudyRoundResult,
} from "@razzia/common/types/game"
import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react"

interface ResultModalContextType {
  result: GameResult
  questionResult?: QuestionResult
  roundResult?: StudyRoundResult
  questionIndex: number
  total: number
  totalPlayers: number
  answeredCount: number
  correctCount: number
  correctPct: number
  getPlayerPoints: (name: string) => number
  goNext: () => void
  goPrev: () => void
  onClose: () => void
}

const ResultModalContext = createContext<ResultModalContextType | null>(null)

type Props = PropsWithChildren<{
  result: GameResult
  onClose: () => void
}>

export const ResultModalProvider = ({ children, result, onClose }: Props) => {
  const [questionIndex, setQuestionIndex] = useState(0)

  const isStudy = result.mode === "study"
  const total = isStudy ? (result.rounds?.length ?? 0) : result.questions.length
  const totalPlayers = result.players.length

  const questionResult = !isStudy ? result.questions[questionIndex] : undefined
  const roundResult = isStudy ? result.rounds?.[questionIndex] : undefined

  const answeredCount = questionResult
    ? questionResult.playerAnswers.filter((pa) => pa.submittedSentence !== null)
        .length
    : 0

  const cleanStr = (s: string) =>
    s.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "")
  const correctCount = questionResult
    ? questionResult.playerAnswers.filter(
        (pa) =>
          pa.submittedSentence !== null &&
          cleanStr(pa.submittedSentence) ===
            cleanStr(questionResult.correctSentence),
      ).length
    : 0

  const correctPct =
    totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0

  const getPlayerPoints = (name: string) =>
    result.players.find((p) => p.username === name)?.points ?? 0

  const goNext = () => setQuestionIndex((i) => Math.min(i + 1, total - 1))

  const goPrev = () => setQuestionIndex((i) => Math.max(i - 1, 0))

  return (
    <ResultModalContext.Provider
      value={{
        result,
        questionResult,
        roundResult,
        questionIndex,
        total,
        totalPlayers,
        answeredCount,
        correctCount,
        correctPct,
        getPlayerPoints,
        goNext,
        goPrev,
        onClose,
      }}
    >
      {children}
    </ResultModalContext.Provider>
  )
}

export const useResultModal = () => {
  const ctx = useContext(ResultModalContext)

  if (!ctx) {
    throw new Error("useResultModal must be used inside ResultModalProvider")
  }

  return ctx
}
