import type { GameMode } from "@razzia/common/types/game"
import { create } from "zustand"

interface GameModeStore {
  mode: GameMode
  setMode: (_mode: GameMode) => void
}

export const useGameModeStore = create<GameModeStore>((set) => ({
  mode: "study",
  setMode: (mode) => set({ mode }),
}))
