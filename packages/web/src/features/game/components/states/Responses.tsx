import type { ManagerStatusDataMap } from "@razzia/common/types/game/status"
import QuestionMedia from "@razzia/web/components/QuestionMedia"
import { SFX } from "@razzia/web/features/game/utils/constants"
import { Check, X } from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"

interface Props {
  data: ManagerStatusDataMap["SHOW_RESPONSES"]
}

const Responses = ({
  data: {
    koreanPrompt,
    correctSentence,
    scrambledChunks,
    media,
    correctCount,
    totalCount,
  },
}: Props) => {
  const { t } = useTranslation()

  const [sfxResults] = useSound(SFX.RESULTS_SOUND, {
    volume: 0.2,
  })

  useEffect(() => {
    sfxResults()
  }, [sfxResults])

  const incorrectCount = totalCount - correctCount
  const correctPct =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  return (
    <div className="flex h-full flex-1 flex-col justify-between">
      <div className="mx-auto inline-flex h-full w-full max-w-7xl flex-1 flex-col items-center justify-center gap-10 px-4">
        {/* Korean Prompt */}
        <h2 className="text-center text-2xl leading-tight font-black text-white drop-shadow-2xl md:text-4xl lg:text-5xl">
          {koreanPrompt}
        </h2>

        <QuestionMedia media={media} alt={koreanPrompt} />

        {/* Correct Sentence Card */}
        <div className="rounded-[2.5rem] border-4 border-emerald-400/50 bg-emerald-500 p-1 shadow-2xl backdrop-blur-xl">
          <div className="rounded-[2.2rem] bg-black/10 px-12 py-8">
            <p className="text-center text-3xl font-black tracking-tight text-white drop-shadow-md md:text-5xl lg:text-6xl">
              {correctSentence}
            </p>
          </div>
        </div>

        {/* Scrambled Chunks (reference) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {scrambledChunks.map((chunk, i) => (
            <span
              key={i}
              className="rounded-2xl border border-white/5 bg-white/10 px-6 py-3 text-lg font-black text-white/50 backdrop-blur-md"
            >
              {chunk}
            </span>
          ))}
        </div>

        {/* Results Stats */}
        <div className="mt-6 w-full max-w-3xl">
          <div className="mb-4 flex justify-between px-2 text-2xl font-black text-white md:text-4xl">
            <div className="flex items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500 shadow-lg md:size-14">
                <Check className="size-6 text-white md:size-10" />
              </div>
              <span>
                {correctCount}{" "}
                <span className="text-emerald-400/80">{t("game:correct")}</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                {incorrectCount}{" "}
                <span className="text-red-400/80">{t("game:wrong")}</span>
              </span>
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500 shadow-lg md:size-14">
                <X className="size-6 text-white md:size-10" />
              </div>
            </div>
          </div>

          <div className="flex h-12 w-full overflow-hidden rounded-full border border-white/5 bg-black/40 p-1 shadow-inner">
            {correctCount > 0 && (
              <div
                className="flex items-center justify-center rounded-l-full bg-emerald-500 text-xl font-black text-white transition-all duration-700 md:text-2xl"
                style={{
                  width: `${correctPct}%`,
                  borderRight:
                    incorrectCount > 0 ? "4px solid rgba(0,0,0,0.2)" : "none",
                }}
              >
                {correctPct}%
              </div>
            )}
            {incorrectCount > 0 && (
              <div
                className="flex items-center justify-center rounded-r-full bg-red-500 text-xl font-black text-white transition-all duration-700 md:text-2xl"
                style={{ width: `${100 - correctPct}%` }}
              >
                {100 - correctPct}%
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-lg font-bold tracking-widest text-white/40 uppercase">
            {totalCount} {t("game:totalSubmissions")}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Responses
