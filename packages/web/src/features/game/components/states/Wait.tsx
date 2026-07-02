import type { PlayerStatusDataMap } from "@razzia/common/types/game/status"
import Loader from "@razzia/web/components/Loader"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface Props {
  data: PlayerStatusDataMap["WAIT"]
}

const Wait = ({ data: { text, correctSentences } }: Props) => {
  const { t } = useTranslation()
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [fadeState, setFadeState] = useState<"in" | "out">("in")

  useEffect(() => {
    if (!correctSentences || correctSentences.length === 0) return

    const interval = setInterval(() => {
      // Start fade out
      setFadeState("out")

      // Wait for fade out animation to complete, then change sentence and fade back in
      const timeout = setTimeout(() => {
        setCurrentSentenceIndex((prev) => (prev + 1) % correctSentences.length)
        setFadeState("in")
      }, 500) // matches transition duration

      return () => clearTimeout(timeout)
    }, 4500) // change every 4.5 seconds

    return () => clearInterval(interval)
  }, [correctSentences])

  return (
    <section className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center p-6 text-white select-none">
      {correctSentences && correctSentences.length > 0 ? (
        <div className="flex flex-col items-center gap-8 text-center max-w-2xl w-full">
          {/* Pulsing indicator */}
          <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 shadow-lg shadow-primary/20">
            <span className="absolute size-4 rounded-full bg-primary animate-ping opacity-75" />
            <span className="relative size-3 rounded-full bg-primary shadow-inner" />
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black md:text-5xl tracking-tight drop-shadow-md text-white" style={{ textWrap: "balance" }}>
              {t("game:waitingForGameToStart", "Waiting for the game to start.")}
            </h2>
            <p className="text-white/60 text-sm md:text-base font-medium">
              {t("game:getReadyHint", "Here are some sentences you will see in the game:")}
            </p>
          </div>

          {/* Sentence Card with transition */}
          <div className="relative w-full overflow-hidden min-h-[120px] md:min-h-[145px] flex items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
            <p
              className={`text-xl md:text-2xl lg:text-3xl font-black leading-relaxed tracking-wide text-primary transition-all duration-500 ease-in-out ${
                fadeState === "in"
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 translate-y-2 blur-xs"
              }`}
            >
              {correctSentences[currentSentenceIndex]}
            </p>
          </div>

          {/* Bullet indicators */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {correctSentences.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSentenceIndex ? "w-6 bg-primary" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <Loader className="h-30" />
          <h2 className="mt-5 text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
            {t(text)}
          </h2>
        </>
      )}
    </section>
  )
}

export default Wait
