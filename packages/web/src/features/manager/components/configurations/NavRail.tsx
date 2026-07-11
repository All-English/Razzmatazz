import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { EVENTS } from "@razzia/common/constants"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { BarChart3, Library, LogOut, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"

export type SectionType = "library" | "reports" | "settings"

interface Props {
  activeSection: SectionType
  onSectionChange: (_section: SectionType) => void
}

const NavRail = ({ activeSection, onSectionChange }: Props) => {
  const { t } = useTranslation()
  const { reset } = useManagerStore()
  const { socket } = useSocket()

  const handleLogout = () => {
    socket.emit(EVENTS.MANAGER.LOGOUT)
    reset()
  }

  const items = [
    {
      id: "library" as SectionType,
      label: t("manager:nav.library"),
      icon: Library,
    },
    {
      id: "reports" as SectionType,
      label: t("manager:nav.reports"),
      icon: BarChart3,
    },
  ]

  return (
    <div className="bg-secondary hidden h-full w-[72px] shrink-0 flex-col items-center justify-between border-r border-gray-200 py-4 text-gray-400 transition-all duration-300 select-none md:flex lg:w-56 dark:border-zinc-800">
      {/* Top: Logo & Navigation Items */}
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full items-center justify-center gap-3 lg:justify-start lg:px-4">
          <div className="bg-primary font-display shadow-primary/20 flex size-10 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-lg">
            R
          </div>
          <span className="font-display hidden text-xl font-bold tracking-wide text-white lg:inline">
            Razzmatazz
          </span>
        </div>

        <nav className="flex w-full flex-col items-center gap-3 px-2">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`group flex w-full flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition-all duration-200 hover:text-white lg:flex-row lg:justify-start lg:gap-3 lg:px-4 ${
                  isActive
                    ? "text-primary bg-white/10 font-medium"
                    : "hover:bg-white/5"
                }`}
                title={item.label}
              >
                <Icon
                  className={`size-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? "text-primary" : ""}`}
                />
                <span className="mt-1 text-[10px] leading-none tracking-wide lg:mt-0 lg:text-sm lg:font-semibold">
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom: Settings & Logout */}
      <div className="flex w-full flex-col items-center gap-3 px-2">
        <button
          onClick={() => onSectionChange("settings")}
          className={`group flex w-full flex-col items-center justify-center gap-1 rounded-xl py-2.5 transition-all duration-200 hover:text-white lg:flex-row lg:justify-start lg:gap-3 lg:px-4 ${
            activeSection === "settings"
              ? "text-primary bg-white/10 font-medium"
              : "hover:bg-white/5"
          }`}
          title={t("manager:nav.settings")}
        >
          <Settings
            className={`size-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${activeSection === "settings" ? "text-primary" : ""}`}
          />
          <span className="mt-1 text-[10px] leading-none tracking-wide lg:mt-0 lg:text-sm lg:font-semibold">
            {t("manager:nav.settings")}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="group flex w-full flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300 lg:flex-row lg:justify-start lg:gap-3 lg:px-4"
          title={t("manager:logout")}
        >
          <LogOut
            className={`size-5 shrink-0 transition-transform duration-200 group-hover:scale-105`}
          />
          <span className="mt-1 text-[10px] leading-none tracking-wide lg:mt-0 lg:text-sm lg:font-semibold">
            {t("manager:logout")}
          </span>
        </button>
      </div>
    </div>
  )
}

export default NavRail
