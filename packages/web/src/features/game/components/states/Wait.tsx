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
        <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
          {/* Pulsing indicator */}
          <div className="bg-primary/10 shadow-primary/20 relative flex h-6 w-6 items-center justify-center rounded-full shadow-lg">
            <span className="bg-primary absolute size-4 animate-ping rounded-full opacity-75" />
            <span className="bg-primary relative size-3 rounded-full shadow-inner" />
          </div>

          <div className="space-y-3">
            <h2
              className="text-3xl font-black tracking-tight text-white drop-shadow-md md:text-5xl"
              style={{ textWrap: "balance" }}
            >
              {t(
                "game:waitingForGameToStart",
                "Waiting for the game to start.",
              )}
            </h2>
            <p className="text-sm font-medium text-white/60 md:text-base">
              {t(
                "game:getReadyHint",
                "Here are some sentences you will see in the game:",
              )}
            </p>
          </div>

          {/* Sentence Card with transition */}
          <div className="relative flex min-h-[120px] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl backdrop-blur-xl md:min-h-[145px] md:p-8">
            <p
              className={`text-primary text-xl leading-relaxed font-black tracking-wide transition-all duration-500 ease-in-out md:text-2xl lg:text-3xl ${
                fadeState === "in"
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-2 scale-95 opacity-0 blur-xs"
              }`}
            >
              {correctSentences[currentSentenceIndex]}
            </p>
          </div>

          {/* Bullet indicators */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {correctSentences.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSentenceIndex
                    ? "bg-primary w-6"
                    : "w-1.5 bg-white/20"
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
