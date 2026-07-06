import { EVENTS, STUDY_MODE_TIME } from "@razzia/common/constants"
import type { QuestionMediaType } from "@razzia/common/types/game"
import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import QuestionMedia from "@razzia/web/components/QuestionMedia"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@razzia/web/features/game/stores/player"
import { SFX } from "@razzia/web/features/game/utils/constants"
import clsx from "clsx"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"

interface Props {
  data: CommonStatusDataMap["BUILD_SENTENCE"]
  manager?: boolean
}

interface ChunkItem {
  text: string
  originalIndex: number
}

// Colors used in competitive mode for the word bank
const COMPETITIVE_CHUNK_COLORS = [
  "bg-[#E69F00]",
  "bg-[#56B4E9]",
  "bg-[#3DBFA0]",
  "bg-[#CC79A7]",
  "bg-[#9B59B6]",
  "bg-[#E74C3C]",
  "bg-[#2ECC71]",
  "bg-[#F39C12]",
]

const DISABLED_MUSIC_MEDIA: QuestionMediaType[] = ["audio", "video"]

const SentenceBuilder = ({
  data: {
    prompt,
    scrambledChunks,
    media,
    time,
    totalPlayer,
    questionIndex,
    correctChunks,
    easyMode,
  },
  manager,
}: Props) => {
  const { socket } = useSocket()
  const { player, gameId } = usePlayerStore()
  const { t } = useTranslation()

  const isStudyMode = time === STUDY_MODE_TIME

  const [cooldown, setCooldown] = useState(time)
  const [totalAnswer, setTotalAnswer] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [showWrongFeedback, setShowWrongFeedback] = useState(false)
  const [wrongFeedbackMsg, setWrongFeedbackMsg] = useState("")

  // Static list of all chunks for the word bank
  const allChunks: ChunkItem[] = scrambledChunks.map((text, i) => ({
    text,
    originalIndex: i,
  }))
  // Chunks placed in the answer bar (in order)
  const [barChunks, setBarChunks] = useState<ChunkItem[]>([])

  // Ref to always have the latest barChunks in async callbacks (avoids stale closure)
  const barChunksRef = useRef(barChunks)
  useEffect(() => {
    barChunksRef.current = barChunks
  }, [barChunks])

  const [sfxPop] = useSound(SFX.ANSWERS.SOUND, { volume: 0.1 })
  const [sfxCorrect] = useSound(SFX.RESULTS_SOUND, { volume: 0.2 })
  const [playMusic, { stop: stopMusic }] = useSound(SFX.ANSWERS.MUSIC, {
    volume: 0.2,
    interrupt: true,
    loop: true,
  })

  useEffect(() => {
    if (!manager) {
      return
    }

    if (DISABLED_MUSIC_MEDIA.includes(media?.type)) {
      return
    }

    playMusic()

    return () => {
      stopMusic()
    }
    // oxlint-disable-next-line
  }, [playMusic])

  useEvent(EVENTS.GAME.COOLDOWN, (sec) => {
    setCooldown(sec)
  })

  useEvent(EVENTS.GAME.PLAYER_ANSWER, (count) => {
    setTotalAnswer(count)
    if (manager) {
      sfxPop()
    }
  })

  // Study mode: wrong answer — flash red for mismatches, then return all bar chunks to bank
  useEvent(EVENTS.GAME.STUDY_WRONG, () => {
    if (showWrongFeedback) return // Already handled locally!

    const list = t("game:wrongMessages", {
      returnObjects: true,
    }) as unknown as string[]
    if (Array.isArray(list) && list.length > 0) {
      const idx = Math.floor(Math.random() * list.length)
      setWrongFeedbackMsg(list[idx])
    } else {
      setWrongFeedbackMsg(t("game:studyTryAgain"))
    }
    setShowWrongFeedback(true)
    setIsShaking(true)

    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(200)
    }

    setTimeout(() => {
      setBarChunks([])
      setShowWrongFeedback(false)
      setIsShaking(false)
      setSubmitted(false)
    }, 3000)
  })

  // Move chunk from bank → bar
  const moveToBar = useCallback(
    (chunk: ChunkItem) => {
      if (submitted) return
      sfxPop()
      setBarChunks((prev) => [...prev, chunk])
    },
    [submitted, sfxPop],
  )

  // Move chunk from bar → bank
  const moveToBank = useCallback(
    (chunk: ChunkItem) => {
      if (submitted) return
      sfxPop()
      setBarChunks((prev) =>
        prev.filter((c) => c.originalIndex !== chunk.originalIndex),
      )
    },
    [submitted, sfxPop],
  )

  // Build the sentence from bar chunks and submit
  const handleSubmit = useCallback(() => {
    if (
      !player ||
      !gameId ||
      barChunks.length !== scrambledChunks.length ||
      submitted
    )
      return

    const sentence = barChunks.map((c) => c.text).join(" ")
    const chunks = barChunks.map((c) => c.text)

    const isCorrect =
      correctChunks && correctChunks.length > 0
        ? JSON.stringify(chunks) === JSON.stringify(correctChunks)
        : false

    if (isStudyMode || easyMode) {
      if (isCorrect) {
        sfxCorrect()
      } else {
        // Wrong answer: trigger feedback and vibration instantly under the user gesture
        const list = t("game:wrongMessages", {
          returnObjects: true,
        }) as unknown as string[]
        if (Array.isArray(list) && list.length > 0) {
          const idx = Math.floor(Math.random() * list.length)
          setWrongFeedbackMsg(list[idx])
        } else {
          setWrongFeedbackMsg(t("game:studyTryAgain"))
        }
        setShowWrongFeedback(true)
        setIsShaking(true)

        if (typeof window !== "undefined" && navigator.vibrate) {
          navigator.vibrate(200)
        }

        setTimeout(() => {
          setBarChunks([])
          setShowWrongFeedback(false)
          setIsShaking(false)
          setSubmitted(false)
        }, 3000)
      }
    }

    if (isStudyMode) {
      socket.emit(EVENTS.PLAYER.STUDY_SUBMIT, {
        gameId,
        data: {
          questionIndex,
          submittedSentence: sentence,
          submittedChunks: chunks,
        },
      })
    } else {
      socket.emit(EVENTS.PLAYER.SUBMIT_SENTENCE, {
        gameId,
        data: { submittedSentence: sentence, submittedChunks: chunks },
      })
    }

    setSubmitted(true)
    sfxPop()
  }, [
    player,
    gameId,
    barChunks,
    submitted,
    socket,
    sfxPop,
    sfxCorrect,
    isStudyMode,
    easyMode,
    questionIndex,
    correctChunks,
    scrambledChunks.length,
    t,
  ])

  return (
    <div className="flex h-full flex-1 flex-col justify-between overflow-hidden">
      {/* Manager HUD at Top */}
      {manager && !isStudyMode && (
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-4 md:gap-6 px-4 md:px-6 pt-6 md:pt-8">
          {/* Timer */}
          <div className="flex flex-1 min-w-0 md:min-w-[240px] flex-col items-center rounded-2xl md:rounded-3xl border border-white/10 bg-black/40 py-4 px-3 md:p-8 shadow-2xl backdrop-blur-xl transition-all">
            <span className="mb-1 md:mb-2 text-xs md:text-xl font-black tracking-wider md:tracking-[0.2em] text-white/50 uppercase">
              {t("game:hud.time")}
            </span>
            <span className="text-5xl md:text-8xl leading-none font-black text-white tabular-nums drop-shadow-md">
              {cooldown}
            </span>
          </div>

          {/* Submissions */}
          <div className="flex flex-1 min-w-0 md:min-w-[240px] flex-col items-center rounded-2xl md:rounded-3xl border border-white/10 bg-black/40 py-4 px-3 md:p-8 shadow-2xl backdrop-blur-xl transition-all">
            <span className="mb-1 md:mb-2 text-xs md:text-xl font-black tracking-wider md:tracking-[0.2em] text-white/50 uppercase">
              {t("game:hud.answers")}
            </span>
            <div className="flex items-baseline gap-1 md:gap-3">
              <span className="text-5xl md:text-8xl leading-none font-black text-white tabular-nums drop-shadow-md">
                {totalAnswer}
              </span>
              <span className="text-xl md:text-4xl font-black tracking-tight text-white/30">
                / {totalPlayer}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto inline-flex h-full w-full max-w-7xl flex-1 flex-col items-center justify-center gap-8 px-4 py-6">
        {/* Prompt */}
        <h2 className="text-center text-3xl leading-tight font-bold text-white drop-shadow-2xl md:text-4xl lg:text-5xl">
          {prompt}
        </h2>

        <QuestionMedia media={media} alt={prompt} />

        {/* Promoted Scrambled Chunks for Managers */}
        {manager && (
          <div className="w-full max-w-5xl">
            <div className="flex flex-wrap items-center justify-center gap-4 rounded-[2rem] border border-white/5 bg-black/20 p-8 shadow-inner backdrop-blur-md">
              {allChunks.map((chunk) => (
                <div
                  key={chunk.originalIndex}
                  className={clsx(
                    "rounded-2xl border-b-4 border-black/20 px-8 py-5 text-xl font-black text-white shadow-xl transition-all",
                    isStudyMode
                      ? "bg-[#3DBFA0]"
                      : COMPETITIVE_CHUNK_COLORS[
                          chunk.originalIndex % COMPETITIVE_CHUNK_COLORS.length
                        ],
                  )}
                >
                  {chunk.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Interactive Section */}
        {!manager && (
          <div className="flex w-full max-w-3xl flex-col gap-6">
            {/* Answer Bar - Hidden for Managers */}
            <div className="w-full">
              <p className="mb-2 text-sm font-semibold tracking-wider text-white/70 uppercase">
                {t("game:answerBar")}
              </p>
              <div
                className={clsx(
                  "flex min-h-[80px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-white/40 bg-black/20 p-3 backdrop-blur-sm transition-all",
                  isShaking && "animate-shake border-red-400",
                )}
              >
                {barChunks.length === 0 && (
                  <span className="text-sm text-white/40 italic">
                    {t("game:tapChunksHint")}
                  </span>
                )}
                {barChunks.map((chunk, i) => {
                  const isWrong =
                    showWrongFeedback && chunk.text !== correctChunks[i]

                  return (
                    <button
                      key={chunk.originalIndex}
                      onClick={() => moveToBank(chunk)}
                      disabled={submitted}
                      className={clsx(
                        "rounded-xl px-4 py-3 text-base font-bold text-white shadow-md transition-all duration-200 sm:text-lg md:text-xl",
                        "hover:scale-105 active:scale-95",
                        isStudyMode || easyMode
                          ? isWrong
                            ? "scale-95 bg-red-500"
                            : "bg-[#3DBFA0]"
                          : COMPETITIVE_CHUNK_COLORS[
                              chunk.originalIndex %
                                COMPETITIVE_CHUNK_COLORS.length
                            ],
                      )}
                    >
                      {chunk.text}
                    </button>
                  )
                })}
              </div>

              <p
                className={clsx(
                  "mt-2 text-center text-lg font-bold tracking-wide text-red-300 transition-all duration-300 min-h-[28px]",
                  showWrongFeedback
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-95 pointer-events-none select-none",
                )}
              >
                {showWrongFeedback ? wrongFeedbackMsg : "\u00A0"}
              </p>
            </div>

            {/* Timer & answer count (hidden in study mode) */}
            {time < 9000 && (
              <div className="flex w-full justify-between gap-1 text-lg font-bold text-white">
                <div className="flex flex-col items-center rounded-lg bg-black/40 px-4 text-lg font-bold">
                  <span className="translate-y-1 text-sm">
                    {t("game:hud.time")}
                  </span>
                  <span>{cooldown}</span>
                </div>
                <div className="flex flex-col items-center rounded-lg bg-black/40 px-4 text-lg font-bold">
                  <span className="translate-y-1 text-sm">
                    {t("game:hud.answers")}
                  </span>
                  <span>
                    {totalAnswer}/{totalPlayer}
                  </span>
                </div>
              </div>
            )}

            {/* Word Bank */}
            <div className="w-full">
              <p className="mb-2 text-sm font-semibold tracking-wider text-white/70 uppercase">
                {t("game:wordBank")}
              </p>
              <div className="flex min-h-[60px] flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/30 p-3 backdrop-blur-sm">
                {allChunks.map((chunk) => {
                  // Check if this specific chunk is currently in the answer bar
                  const isUsed = barChunks.some(
                    (c) => c.originalIndex === chunk.originalIndex,
                  )
                  const isDisabled = submitted || isUsed

                  return (
                    <button
                      key={chunk.originalIndex}
                      onClick={() => moveToBar(chunk)}
                      disabled={isDisabled}
                      className={clsx(
                        "rounded-xl px-4 py-3 text-base font-bold text-white shadow-md transition-all sm:text-lg md:text-xl",
                        !isDisabled && "hover:scale-105 active:scale-95",
                        isStudyMode
                          ? "bg-[#3DBFA0]"
                          : COMPETITIVE_CHUNK_COLORS[
                              chunk.originalIndex %
                                COMPETITIVE_CHUNK_COLORS.length
                            ],
                        isDisabled &&
                          "cursor-not-allowed opacity-40 shadow-none grayscale",
                      )}
                    >
                      {chunk.text}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit Button */}
            {!submitted && (
              <div className="w-full">
                <button
                  onClick={handleSubmit}
                  disabled={
                    barChunks.length !== scrambledChunks.length || submitted
                  }
                  className={clsx(
                    "w-full rounded-2xl px-6 py-4 text-lg font-bold text-white shadow-lg transition-all",
                    barChunks.length === scrambledChunks.length
                      ? "bg-primary hover:bg-[#e68a00] active:scale-[0.98]"
                      : "cursor-not-allowed bg-gray-500 opacity-60",
                  )}
                >
                  {t("game:submit")}
                </button>
              </div>
            )}

            {/* "Waiting" message only shown in competitive mode after submitting */}
            {submitted && !isStudyMode && (
              <div className="w-full">
                <div className="w-full rounded-2xl bg-white/20 px-6 py-4 text-center text-lg font-bold text-white backdrop-blur-sm">
                  {t("game:waitingForAnswers")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SentenceBuilder
