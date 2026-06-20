import type { StatusDataMap } from "@razzia/common/types/game/status"
import {
  createStatus,
  type Status,
} from "@razzia/web/features/game/utils/createStatus"
import { create } from "zustand"

interface PlayerState {
  username?: string
  points?: number
  studyRound?: number
}

interface PlayerStore<T> {
  gameId: string | null
  inviteCode: string | null
  player: PlayerState | null
  status: Status<T> | null
  bestStudyTime: number | null
  bestStudyScore: number | null
  practiceHistory: Array<{ round: number; score: number; time: number }>

  setGameId: (gameId: string | null) => void
  setInviteCode: (inviteCode: string | null) => void

  setPlayer: (state: PlayerState) => void
  login: (username: string) => void
  join: (gameId: string) => void
  updatePoints: (points: number) => void

  setStatus: <K extends keyof T>(name: K, data: T[K]) => void
  setBestStudyTime: (bestStudyTime: number | null) => void
  setBestStudyScore: (bestStudyScore: number | null) => void
  addPracticeRun: (run: { round: number; score: number; time: number }) => void
  resetStudyStats: () => void

  reset: () => void
}

const initialState = {
  gameId: null,
  inviteCode: null,
  player: null,
  status: null,
  bestStudyTime: null,
  bestStudyScore: null,
  practiceHistory: [],
}

export const usePlayerStore = create<PlayerStore<StatusDataMap>>((set) => ({
  ...initialState,

  setGameId: (gameId) => set({ gameId }),
  setInviteCode: (inviteCode) => set({ inviteCode }),

  setPlayer: (player: PlayerState) => set({ player }),
  login: (username) =>
    set((state) => ({
      player: { ...state.player, username },
    })),

  join: (gameId) => {
    set((state) => ({
      gameId,
      player: { ...state.player, points: 0 },
    }))
  },

  updatePoints: (points) =>
    set((state) => ({
      player: { ...state.player, points },
    })),

  setStatus: (name, data) => set({ status: createStatus(name, data) }),
  setBestStudyTime: (bestStudyTime) => set({ bestStudyTime }),
  setBestStudyScore: (bestStudyScore) => set({ bestStudyScore }),
  addPracticeRun: (run) =>
    set((state) => ({
      practiceHistory: [...state.practiceHistory, run],
    })),

  resetStudyStats: () =>
    set({
      practiceHistory: [],
      bestStudyTime: null,
      bestStudyScore: null,
    }),

  reset: () => set(initialState),
}))
