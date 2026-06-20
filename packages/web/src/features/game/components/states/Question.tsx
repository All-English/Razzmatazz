import type { CommonStatusDataMap } from "@razzia/common/types/game/status"
import QuestionMedia from "@razzia/web/components/QuestionMedia"
import { SFX } from "@razzia/web/features/game/utils/constants"
import { useEffect } from "react"
import useSound from "use-sound"

interface Props {
  data: CommonStatusDataMap["SHOW_QUESTION"]
}

const CHUNK_PREVIEW_COLORS = [
  "bg-[#E69F00]/80",
  "bg-[#56B4E9]/80",
  "bg-[#3DBFA0]/80",
  "bg-[#CC79A7]/80",
  "bg-[#9B59B6]/80",
  "bg-[#E74C3C]/80",
  "bg-[#2ECC71]/80",
  "bg-[#F39C12]/80",
]

const Question = ({
  data: { koreanPrompt, scrambledChunks, media, cooldown },
}: Props) => {
  const [sfxShow] = useSound(SFX.SHOW_SOUND, { volume: 0.5 })

  useEffect(() => {
    sfxShow()
  }, [sfxShow])

  return (
    <section className="relative mx-auto flex h-full w-full max-w-7xl flex-1 flex-col items-center px-6">
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        {/* Korean Prompt */}
        <h2 className="anim-show text-center text-3xl leading-tight font-black text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] md:text-4xl lg:text-5xl">
          {koreanPrompt}
        </h2>

        <QuestionMedia media={media} alt={koreanPrompt} />

        {/* Scrambled chunks preview */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {scrambledChunks.map((chunk, i) => (
            <span
              key={i}
              className={`anim-show rounded-2xl border-b-4 border-black/20 px-6 py-4 text-lg font-black text-white shadow-2xl md:text-2xl lg:text-4xl ${CHUNK_PREVIEW_COLORS[i % CHUNK_PREVIEW_COLORS.length]}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {chunk}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-20 w-full px-4">
        <div
          className="bg-primary h-6 rounded-full border-2 border-white/20 shadow-lg"
          style={{ animation: `progressBar ${cooldown}s linear forwards` }}
        ></div>
      </div>
    </section>
  )
}

export default Question
