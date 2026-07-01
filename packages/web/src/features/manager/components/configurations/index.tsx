import { ConfigProvider } from "@razzia/web/features/manager/contexts/config-context"
import NavRail, {
  type SectionType,
} from "@razzia/web/features/manager/components/configurations/NavRail"
import FolderSidebar, {
  type FolderSelection,
} from "@razzia/web/features/manager/components/configurations/FolderSidebar"
import QuizListPanel from "@razzia/web/features/manager/components/configurations/QuizListPanel"
import TrashPanel from "@razzia/web/features/manager/components/configurations/TrashPanel"
import ReportsPanel from "@razzia/web/features/manager/components/configurations/ReportsPanel"
import SettingsPanel from "@razzia/web/features/manager/components/configurations/SettingsPanel"
import type { ManagerConfig } from "@razzia/common/types/manager"
import { useEffect, useState } from "react"
import { useSocket } from "@razzia/web/features/game/contexts/socket-context"
import { useManagerStore } from "@razzia/web/features/game/stores/manager"
import { EVENTS } from "@razzia/common/constants"
import { useTranslation } from "react-i18next"
import { BarChart3, Library, LogOut, Menu, Settings, X } from "lucide-react"

interface Props {
  data: ManagerConfig
}

const Configurations = ({ data }: Props) => {
  const { t } = useTranslation()
  const { socket } = useSocket()
  const { reset } = useManagerStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    socket.emit(EVENTS.MANAGER.LOGOUT)
    reset()
  }

  const [section, setSection] = useState<SectionType>(() => {
    const saved = localStorage.getItem("razzia_active_section") as SectionType
    return ["library", "reports", "settings"].includes(saved)
      ? saved
      : "library"
  })

  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>(() => {
    const saved = localStorage.getItem("razzia_selected_folder")
    if (saved === "all" || saved === "favorites" || saved === "trash") {
      return saved
    }
    if (saved && data.folders.includes(saved)) {
      return saved
    }
    return "all"
  })

  // Synchronously update localStorage on changes
  const handleSectionChange = (sec: SectionType) => {
    setSection(sec)
    localStorage.setItem("razzia_active_section", sec)
  }

  const handleSelectFolder = (folder: FolderSelection) => {
    setSelectedFolder(folder)
    localStorage.setItem("razzia_selected_folder", folder)
  }

  const [theme, setTheme] = useState<"system" | "light" | "dark">(() => {
    const saved = localStorage.getItem("razzia_manager_theme")
    return saved === "light" || saved === "dark" || saved === "system"
      ? (saved as "system" | "light" | "dark")
      : "system"
  })

  const [resolvedDark, setResolvedDark] = useState(false)

  useEffect(() => {
    if (theme === "dark") {
      setResolvedDark(true)
    } else if (theme === "light") {
      setResolvedDark(false)
    } else {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      setResolvedDark(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => {
        setResolvedDark(e.matches)
      }
      mediaQuery.addEventListener("change", handler)
      return () => mediaQuery.removeEventListener("change", handler)
    }
  }, [theme])

  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme)
    localStorage.setItem("razzia_manager_theme", newTheme)
  }

  // Validate that the folder exists in data.folders
  useEffect(() => {
    if (
      selectedFolder !== "all" &&
      selectedFolder !== "favorites" &&
      selectedFolder !== "trash"
    ) {
      if (!data.folders.includes(selectedFolder)) {
        setSelectedFolder("all")
        localStorage.setItem("razzia_selected_folder", "all")
      }
    }
  }, [data.folders, selectedFolder])

  return (
    <ConfigProvider data={data}>
      <div className={`font-display flex h-svh w-screen flex-col md:flex-row overflow-hidden bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-50 ${resolvedDark ? "dark" : ""}`}>
        {/* Mobile Header Bar */}
        <div className="md:hidden flex h-14 w-full shrink-0 items-center justify-between bg-secondary px-4 text-white select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1 hover:bg-white/10 rounded-lg text-white"
            >
              <Menu className="size-6" />
            </button>
            <span className="font-display text-lg font-bold">Razzia</span>
          </div>
        </div>

        {/* Mobile menu modal backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {/* Drawer */}
            <div
              className="absolute left-0 top-0 bottom-0 w-64 bg-secondary p-6 shadow-2xl animate-in slide-in-from-left duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <span className="font-display text-xl font-bold text-white">
                  Razzia
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-white/75 hover:bg-white/10 rounded-lg"
                >
                  <X className="size-6" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    handleSectionChange("library")
                    setIsMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all ${
                    section === "library"
                      ? "bg-primary text-secondary"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Library className="size-5" />
                  <span>{t("manager:nav.library")}</span>
                </button>

                <button
                  onClick={() => {
                    handleSectionChange("reports")
                    setIsMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all ${
                    section === "reports"
                      ? "bg-primary text-secondary"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <BarChart3 className="size-5" />
                  <span>{t("manager:nav.reports")}</span>
                </button>

                <button
                  onClick={() => {
                    handleSectionChange("settings")
                    setIsMobileMenuOpen(false)
                  }}
                  className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all ${
                    section === "settings"
                      ? "bg-primary text-secondary"
                      : "text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Settings className="size-5" />
                  <span>{t("manager:nav.settings")}</span>
                </button>

                <div className="border-t border-white/10 my-4 pt-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full p-3 rounded-xl font-semibold text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="size-5" />
                    <span>{t("common:logout")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Rail */}
        <NavRail
          activeSection={section}
          onSectionChange={handleSectionChange}
        />

        {/* Library Section */}
        {section === "library" && (
          <>
            {/* Sidebar */}
            <FolderSidebar
              selectedFolder={selectedFolder}
              onSelectFolder={handleSelectFolder}
            />

            {/* Main Content Area */}
            {selectedFolder === "trash" ? (
              <TrashPanel onSelectFolder={handleSelectFolder} />
            ) : (
              <QuizListPanel
                selectedFolder={selectedFolder}
                onSelectFolder={handleSelectFolder}
              />
            )}
          </>
        )}

        {/* Reports Section */}
        {section === "reports" && <ReportsPanel />}

        {/* Settings Section */}
        {section === "settings" && (
          <SettingsPanel theme={theme} onChangeTheme={handleThemeChange} />
        )}
      </div>
    </ConfigProvider>
  )
}

export default Configurations
