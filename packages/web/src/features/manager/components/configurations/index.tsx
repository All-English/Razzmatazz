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
      <div className="font-display flex h-svh w-screen flex-col md:flex-row overflow-hidden bg-white">
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

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer Content */}
            <div className="relative flex w-64 max-w-[80vw] h-full flex-col justify-between bg-secondary p-4 text-gray-400 select-none shadow-2xl animate-show">
              <div className="flex w-full flex-col gap-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="font-display text-lg font-bold text-white">Razzia</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-white"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <nav className="flex w-full flex-col gap-2">
                  <button
                    onClick={() => {
                      handleSectionChange("library")
                      setIsMobileMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      section === "library"
                        ? "text-primary bg-white/10"
                        : "hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Library className="size-5 shrink-0" />
                    <span>{t("manager:nav.library")}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleSectionChange("reports")
                      setIsMobileMenuOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      section === "reports"
                        ? "text-primary bg-white/10"
                        : "hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <BarChart3 className="size-5 shrink-0" />
                    <span>{t("manager:nav.reports")}</span>
                  </button>
                </nav>
              </div>

              <div className="flex w-full flex-col gap-2 border-t border-white/10 pt-4">
                <button
                  onClick={() => {
                    handleSectionChange("settings")
                    setIsMobileMenuOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    section === "settings"
                      ? "text-primary bg-white/10"
                      : "hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Settings className="size-5 shrink-0" />
                  <span>{t("manager:nav.settings")}</span>
                </button>

                <button
                  onClick={() => {
                    handleLogout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="size-5 shrink-0" />
                  <span>{t("manager:logout")}</span>
                </button>
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
        {section === "settings" && <SettingsPanel />}
      </div>
    </ConfigProvider>
  )
}

export default Configurations
