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

interface Props {
  data: ManagerConfig
}

const Configurations = ({ data }: Props) => {
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
      <div className="font-display flex h-svh w-screen overflow-hidden bg-white">
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
              <TrashPanel />
            ) : (
              <QuizListPanel selectedFolder={selectedFolder} />
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
