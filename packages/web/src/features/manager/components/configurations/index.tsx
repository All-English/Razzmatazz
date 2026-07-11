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
import {
  BarChart3,
  Library,
  LogOut,
  Menu,
  Settings,
  X,
  Play,
} from "lucide-react"
import { useNavigate } from "@tanstack/react-router"

interface Props {
  data: ManagerConfig
}

const Configurations = ({ data }: Props) => {
  const { t } = useTranslation()
  const { socket } = useSocket()
  const { reset } = useManagerStore()
  const navigate = useNavigate()
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
      <div
        className={`font-display flex h-svh w-screen flex-col overflow-hidden bg-white text-gray-900 dark:bg-zinc-950 dark:text-zinc-50 ${resolvedDark ? "dark" : ""}`}
      >
        {data.activeGameId && (
          <div className="bg-primary z-20 flex shrink-0 items-center justify-between gap-4 px-4 py-2.5 text-white shadow-md md:justify-center">
            <span className="hidden text-sm font-semibold sm:inline md:text-base">
              {t(
                "manager:activeGameBanner",
                "You have an active game in progress",
              )}
            </span>
            <span className="text-sm font-semibold sm:hidden">
              {t("manager:activeGameBannerMobile", "Active game")}
            </span>
            <button
              onClick={() =>
                navigate({
                  to: "/party/manager/$gameId",
                  params: { gameId: data.activeGameId! },
                })
              }
              className="text-primary flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-bold shadow transition-all hover:scale-105 active:scale-95"
            >
              <Play className="size-4 fill-current" />
              {t("manager:returnToGame", "Return to Game")}
            </button>
          </div>
        )}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Mobile Header Bar */}
          <div className="bg-secondary flex h-14 w-full shrink-0 items-center justify-between px-4 text-white select-none md:hidden">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-1 text-white hover:bg-white/10"
              >
                <Menu className="size-6" />
              </button>
              <span className="font-display text-lg font-bold">Razzmatazz</span>
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
                className="bg-secondary animate-in slide-in-from-left absolute top-0 bottom-0 left-0 w-64 p-6 shadow-2xl duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="font-display text-xl font-bold text-white">
                    Razzmatazz
                  </span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg p-1 text-white/75 hover:bg-white/10"
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
                    className={`flex w-full items-center gap-3 rounded-xl p-3 font-semibold transition-all ${
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
                    className={`flex w-full items-center gap-3 rounded-xl p-3 font-semibold transition-all ${
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
                    className={`flex w-full items-center gap-3 rounded-xl p-3 font-semibold transition-all ${
                      section === "settings"
                        ? "bg-primary text-secondary"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <Settings className="size-5" />
                    <span>{t("manager:nav.settings")}</span>
                  </button>

                  <div className="my-4 border-t border-white/10 pt-4">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl p-3 font-semibold text-red-400 transition-all hover:bg-red-500/10"
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
      </div>
    </ConfigProvider>
  )
}

export default Configurations
