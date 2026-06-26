import LanguageSwitcher from "@razzia/web/components/LanguageSwitcher"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { Globe, ShieldAlert, Wifi } from "lucide-react"
import { useTranslation } from "react-i18next"

const SettingsPanel = () => {
  const { t } = useTranslation()
  const { socket } = useSocket()
  const isConnected = socket?.connected ?? false

  return (
    <div className="flex h-full flex-1 flex-col bg-white p-8 overflow-y-auto select-none">
      {/* Header */}
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t("manager:nav.settings")}</h1>
        <p className="text-sm text-gray-500">{t("manager:settings.subtitle")}</p>
      </div>

      {/* Settings Grid */}
      <div className="max-w-2xl space-y-6">
        {/* Language Switcher Setting */}
        <div className="flex items-center justify-between rounded-xl border border-gray-150 bg-gray-50/30 p-5 transition-all hover:border-gray-250">
          <div className="flex gap-3">
            <Globe className="size-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Language / 언어 / 言語</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("manager:settings.selectLanguage")}</p>
            </div>
          </div>
          <div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* System Status Setting */}
        <div className="rounded-xl border border-gray-150 bg-gray-50/30 p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="size-4 text-gray-400" />
            <span>{t("manager:settings.systemInfo")}</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("manager:settings.serverConnection")}</span>
              <div className="flex items-center gap-2 font-medium">
                <Wifi className={`size-4 ${isConnected ? "text-emerald-500" : "text-red-500"}`} />
                <span className={isConnected ? "text-emerald-600" : "text-red-600"}>
                  {isConnected ? t("manager:settings.connected") : t("manager:settings.disconnected")}
                </span>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("manager:settings.appVersion")}</span>
              <div className="font-medium text-gray-700">v{__APP_VERSION__}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
