import * as Select from "@radix-ui/react-select"
import LanguageSwitcher from "@razzia/web/components/LanguageSwitcher"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { Globe, ShieldAlert, Wifi, SunMoon } from "lucide-react"
import { useTranslation } from "react-i18next"

interface Props {
  theme: "system" | "light" | "dark"
  onChangeTheme: (_theme: "system" | "light" | "dark") => void
}

const SettingsPanel = ({ theme, onChangeTheme }: Props) => {
  const { t } = useTranslation()
  const { socket } = useSocket()
  const isConnected = socket?.connected ?? false

  const THEMES = [
    { code: "system", label: t("manager:settings.themeOptions.system") },
    { code: "light", label: t("manager:settings.themeOptions.light") },
    { code: "dark", label: t("manager:settings.themeOptions.dark") },
  ]

  return (
    <div className="flex h-full flex-1 flex-col overflow-y-auto bg-white dark:bg-zinc-950 p-4 sm:p-8 select-none">
      {/* Header */}
      <div className="mb-6 border-b border-gray-100 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
          {t("manager:nav.settings")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          {t("manager:settings.subtitle")}
        </p>
      </div>

      {/* Settings Grid */}
      <div className="max-w-2xl space-y-6">
        {/* Language Switcher Setting */}
        <div className="border-gray-150 dark:border-zinc-800 flex items-center justify-between rounded-xl border bg-gray-50/30 dark:bg-zinc-900/20 p-5 transition-all">
          <div className="flex gap-3">
            <Globe className="mt-0.5 size-5 text-gray-400 dark:text-zinc-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-zinc-100">
                Language / 언어 / 言語
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                {t("manager:settings.selectLanguage")}
              </p>
            </div>
          </div>
          <div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Theme Setting */}
        <div className="border-gray-150 dark:border-zinc-800 flex items-center justify-between rounded-xl border bg-gray-50/30 dark:bg-zinc-900/20 p-5 transition-all">
          <div className="flex gap-3">
            <SunMoon className="mt-0.5 size-5 text-gray-400 dark:text-zinc-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-zinc-100">
                {t("manager:settings.theme")}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                {t("manager:settings.selectTheme")}
              </p>
            </div>
          </div>
          <div>
            <Select.Root
              value={theme}
              onValueChange={(val) => onChangeTheme(val as "system" | "light" | "dark")}
            >
              <Select.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-750 focus:outline-none">
                <SunMoon className="size-4 text-gray-500 dark:text-zinc-400" />
                <Select.Value />
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={4}
                  className="z-50 min-w-32 overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md"
                >
                  <Select.Viewport className="p-1">
                    {THEMES.map((t) => (
                      <Select.Item
                        key={t.code}
                        value={t.code}
                        className="flex cursor-pointer items-center rounded-sm px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 outline-none hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 data-[state=checked]:font-semibold"
                      >
                        <Select.ItemText>{t.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>

        {/* System Status Setting */}
        <div className="border-gray-150 dark:border-zinc-800 space-y-4 rounded-xl border bg-gray-50/30 dark:bg-zinc-900/20 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-zinc-100">
            <ShieldAlert className="size-4 text-gray-400 dark:text-zinc-500" />
            <span>{t("manager:settings.systemInfo")}</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-zinc-800 pt-3 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase">
                {t("manager:settings.serverConnection")}
              </span>
              <div className="flex items-center gap-2 font-medium">
                <Wifi
                  className={`size-4 ${isConnected ? "text-emerald-500" : "text-red-500"}`}
                />
                <span
                  className={isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                >
                  {isConnected
                    ? t("manager:settings.connected")
                    : t("manager:settings.disconnected")}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase">
                {t("manager:settings.appVersion")}
              </span>
              <div className="font-medium text-gray-700 dark:text-zinc-300">
                v{__APP_VERSION__}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
