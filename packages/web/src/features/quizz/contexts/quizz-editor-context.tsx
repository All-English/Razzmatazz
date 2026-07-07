import type { Question, QuizzWithId } from "@razzia/common/types/game"
import {
  deriveCorrectChunks,
  isValidChunksOrder,
} from "@razzia/web/features/quizz/utils/chunks"
import {
  createContext,
  useContext,
  useState,
  useMemo,
  type PropsWithChildren,
} from "react"
import { v7 as uuid } from "uuid"

export type QuestionWithId = Question & {
  id: string
}

interface QuizzEditorContextType {
  quizzId: string | null
  subject: string
  setSubject: (_subject: string) => void
  questions: QuestionWithId[]
  currentIndex: number
  currentQuestion: QuestionWithId
  setCurrentIndex: (_index: number) => void
  addQuestion: () => void
  duplicateQuestion: (index: number) => void
  removeQuestion: (_index: number) => void
  reorderQuestions: (_from: number, _to: number) => void
  updateQuestion: (_index: number, _updates: Partial<QuestionWithId>) => void
  setQuestions: (_questions: QuestionWithId[]) => void
  isDirty: boolean
  hasSaved: boolean
  setHasSaved: (_val: boolean) => void
}

const QuizzEditorContext = createContext<QuizzEditorContextType | null>(null)

const defaultQuestion = (): QuestionWithId => ({
  id: uuid(),
  prompt: "",
  scrambledChunks: ["", ""],
  correctChunks: ["", ""],
  correctSentence: "",
  cooldown: 5,
  time: 30,
})

const clampIndex = (index: number, array: unknown[]) =>
  Math.max(0, Math.min(index, array.length - 1))

const toQuestionWithId = (q: Question): QuestionWithId => {
  const correctChunks =
    q.correctChunks.length === q.scrambledChunks.length &&
    isValidChunksOrder(q.correctSentence, q.correctChunks)
      ? q.correctChunks
      : deriveCorrectChunks(q.correctSentence, q.scrambledChunks)

  return {
    ...q,
    id: uuid(),
    correctChunks,
  }
}

type QuizzEditorProviderProps = PropsWithChildren<{
  initialData?: QuizzWithId
}>

export const QuizzEditorProvider = ({
  children,
  initialData,
}: QuizzEditorProviderProps) => {
  const [subject, setSubject] = useState(
    initialData?.subject ?? "Untitled Quiz",
  )
  const [questions, setQuestions] = useState<QuestionWithId[]>(
    initialData
      ? initialData.questions.map(toQuestionWithId)
      : [defaultQuestion()],
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentQuestion = questions[clampIndex(currentIndex, questions)]
  const [hasSaved, setHasSaved] = useState(false)

  // Track the initial normalized state to determine if the editor is dirty
  const initialNormalizedSubject = useMemo(() => {
    return initialData?.subject ?? "Untitled Quiz"
  }, [initialData])

  const initialNormalizedQuestions = useMemo(() => {
    const sourceQuestions = initialData
      ? initialData.questions
      : [
          {
            prompt: "",
            scrambledChunks: ["", ""],
            correctChunks: ["", ""],
            correctSentence: "",
            cooldown: 5,
            time: 30,
          },
        ]

    return sourceQuestions.map((q) => ({
      prompt: q.prompt,
      scrambledChunks: q.scrambledChunks,
      correctChunks: q.correctChunks,
      correctSentence: q.correctSentence,
      cooldown: q.cooldown,
      time: q.time,
      media: q.media,
    }))
  }, [initialData])

  const isDirty = useMemo(() => {
    if (subject !== initialNormalizedSubject) return true
    if (questions.length !== initialNormalizedQuestions.length) return true

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const initQ = initialNormalizedQuestions[i]

      if (
        q.prompt !== initQ.prompt ||
        q.correctSentence !== initQ.correctSentence ||
        q.cooldown !== initQ.cooldown ||
        q.time !== initQ.time ||
        JSON.stringify(q.scrambledChunks) !==
          JSON.stringify(initQ.scrambledChunks) ||
        JSON.stringify(q.correctChunks) !==
          JSON.stringify(initQ.correctChunks) ||
        JSON.stringify(q.media) !== JSON.stringify(initQ.media)
      ) {
        return true
      }
    }

    return false
  }, [subject, initialNormalizedSubject, questions, initialNormalizedQuestions])

  const addQuestion = () => {
    setQuestions((prev) => [...prev, defaultQuestion()])
    setCurrentIndex(questions.length)
  }

  const duplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const copy = {
        ...JSON.parse(JSON.stringify(prev[index])),
        id: uuid(),
      }
      const next = [...prev]
      next.splice(index + 1, 0, copy)
      return next
    })
    setCurrentIndex(index + 1)
  }

  const removeQuestion = (index: number) => {
    const next = questions.filter((_, i) => i !== index)
    setQuestions(next)
    setCurrentIndex((current) => {
      if (current < index) {
        return current
      }
      if (current > index) {
        return current - 1
      }
      return clampIndex(current, next)
    })
  }

  const reorderQuestions = (from: number, to: number) => {
    setQuestions((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)

      return next
    })
    setCurrentIndex(to)
  }

  const updateQuestion = (index: number, updates: Partial<QuestionWithId>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q

        const next = { ...q, ...updates }

        // If the sentence or scrambled chunks changed, re-derive the correct order in the background
        if (
          updates.correctSentence !== undefined ||
          updates.scrambledChunks !== undefined
        ) {
          next.correctChunks = deriveCorrectChunks(
            next.correctSentence,
            next.scrambledChunks,
          )
        }

        return next
      }),
    )
  }

  return (
    <QuizzEditorContext.Provider
      value={{
        quizzId: initialData?.id ?? null,
        subject,
        setSubject,
        questions,
        currentIndex,
        currentQuestion,
        setCurrentIndex,
        addQuestion,
        duplicateQuestion,
        removeQuestion,
        reorderQuestions,
        updateQuestion,
        setQuestions,
        isDirty,
        hasSaved,
        setHasSaved,
      }}
    >
      {children}
    </QuizzEditorContext.Provider>
  )
}

export const useQuizzEditor = () => {
  const ctx = useContext(QuizzEditorContext)

  if (!ctx) {
    throw new Error("useQuizzEditor must be used inside QuizzEditorProvider")
  }

  return ctx
}
