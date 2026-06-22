import { MEDIA_TYPES } from "@razzia/common/constants"
import { z } from "zod"

export const questionMediaValidator = z.object({
  type: z
    .enum([MEDIA_TYPES.IMAGE, MEDIA_TYPES.VIDEO, MEDIA_TYPES.AUDIO])
    .optional(),
  url: z.url("errors:quizz.invalidMediaUrl"),
})

const questionValidator = z.object({
  prompt: z.string().min(1, "errors:quizz.promptEmpty"),
  scrambledChunks: z
    .array(z.string().min(1, "errors:quizz.chunkEmpty"))
    .min(2, "errors:quizz.tooFewChunks"),
  correctChunks: z
    .array(z.string().min(1, "errors:quizz.chunkEmpty"))
    .min(2, "errors:quizz.tooFewChunks"),
  correctSentence: z.string().min(1, "errors:quizz.sentenceEmpty"),
  media: questionMediaValidator.optional(),
  cooldown: z.number().int().min(3).max(15),
  time: z.number().int().min(-1),
})

export const quizzValidator = z.object({
  subject: z.string().min(1, "errors:quizz.subjectEmpty"),
  questions: z.array(questionValidator).min(1, "errors:quizz.noQuestions"),
})

export type QuizzValidated = z.infer<typeof quizzValidator>
