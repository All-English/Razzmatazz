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
        <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xl max-w-md w-full flex flex-col items-center justify-center">
          <div className="bg-primary/10 text-primary mb-6 flex size-16 items-center justify-center rounded-2xl animate-bounce">
            <Tablet className="size-8" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 leading-snug">
            {t("manager:editor.unsupportedScreenTitle")}
          </h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            {t("manager:editor.unsupportedScreenDesc")}
          </p>
          <Button
            onClick={() => navigate({ to: "/manager/config" })}
            className="mt-6 w-full bg-primary hover:bg-primary/95 px-5 py-3 text-sm font-semibold text-white shadow-md"
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
