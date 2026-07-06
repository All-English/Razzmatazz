import type { StatusDataMap } from "@razzia/common/types/game/status"
import {
  createStatus,
  type Status,
} from "@razzia/web/features/game/utils/createStatus"
import { create } from "zustand"

interface PlayerState {
  username?: string
  points?: number
  practiceRound?: number
}

interface PlayerStore<T> {
  gameId: string | null
  inviteCode: string | null
  player: PlayerState | null
  status: Status<T> | null
  bestPracticeTime: number | null
  bestPracticeScore: number | null
  practiceHistory: Array<{ round: number; score: number; time: number }>

  setGameId: (gameId: string | null) => void
  setInviteCode: (inviteCode: string | null) => void

  setPlayer: (state: PlayerState) => void
  login: (username: string) => void
  join: (gameId: string) => void
  updatePoints: (points: number) => void

  setStatus: <K extends keyof T>(name: K, data: T[K]) => void
  setBestPracticeTime: (bestPracticeTime: number | null) => void
  setBestPracticeScore: (bestPracticeScore: number | null) => void
  addPracticeRun: (run: { round: number; score: number; time: number }) => void
  resetPracticeStats: () => void

  reset: () => void
}

const initialState = {
  gameId: null,
  inviteCode: null,
  player: null,
  status: null,
  bestPracticeTime: null,
  bestPracticeScore: null,
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
  setBestPracticeTime: (bestPracticeTime) => set({ bestPracticeTime }),
  setBestPracticeScore: (bestPracticeScore) => set({ bestPracticeScore }),
  addPracticeRun: (run) =>
    set((state) => ({
      practiceHistory: [...state.practiceHistory, run],
    })),

  resetPracticeStats: () =>
    set({
      practiceHistory: [],
      bestPracticeTime: null,
      bestPracticeScore: null,
    }),

  reset: () => set(initialState),
}))
