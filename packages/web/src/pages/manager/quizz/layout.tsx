import { EVENTS } from "@razzia/common/constants"
import Loader from "@razzia/web/components/Loader"
import Button from "@razzia/web/components/Button"
import { Tablet } from "lucide-react"
import {
  useEvent,
  useSocket,
} from "@razzia/web/features/game/contexts/socket-context"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

export const Route = createFileRoute("/manager/quizz")({
  component: RouteComponent,
})

function RouteComponent() {
  const { socket, isConnected } = useSocket()
  const { config, setConfig } = useManagerStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [isUnsupportedScreen, setIsUnsupportedScreen] = useState(false)

  useEffect(() => {
    const checkScreen = () => {
      const isPortrait = window.innerHeight > window.innerWidth
      const isNarrow = window.innerWidth < 1024
      setIsUnsupportedScreen(isNarrow || isPortrait)
    }

    checkScreen()
    window.addEventListener("resize", checkScreen)
    return () => window.removeEventListener("resize", checkScreen)
  }, [])

  useEffect(() => {
    if (isConnected && !config) {
      socket.emit(EVENTS.MANAGER.GET_CONFIG)
    }
  }, [isConnected, config, socket])

  useEvent(EVENTS.MANAGER.CONFIG, (data) => {
    setConfig(data)
  })

  useEvent(EVENTS.MANAGER.UNAUTHORIZED, () => {
    navigate({ to: "/manager" })
  })

  if (isUnsupportedScreen) {
    return (
      <div className="flex h-svh w-screen flex-col items-center justify-center bg-gray-50 px-6 text-center select-none">
        <div className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
          <div className="bg-primary/10 text-primary mb-6 flex size-16 animate-bounce items-center justify-center rounded-2xl">
            <Tablet className="size-8" />
          </div>
          <h1 className="text-xl leading-snug font-bold text-gray-900">
            {t("manager:editor.unsupportedScreenTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            {t("manager:editor.unsupportedScreenDesc")}
          </p>
          <Button
            onClick={() => navigate({ to: "/manager/config" })}
            className="bg-primary hover:bg-primary/95 mt-6 w-full px-5 py-3 text-sm font-semibold text-white shadow-md"
          >
            {t("common:goBack")}
          </Button>
        </div>
      </div>
    )
  }

  if (!isConnected || !config) {
    return (
      <div className="flex h-svh items-center justify-center bg-gray-50">
        <Loader className="text-background max-h-23" />
      </div>
    )
  }

  return <Outlet />
}
