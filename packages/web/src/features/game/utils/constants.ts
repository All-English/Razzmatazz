import { EVENTS } from "@razzia/common/constants"
import Leaderboard from "@razzia/web/features/game/components/states/Leaderboard"
import PlayerFinished from "@razzia/web/features/game/components/states/PlayerFinished"
import Podium from "@razzia/web/features/game/components/states/Podium"
import Question from "@razzia/web/features/game/components/states/Question"
import Responses from "@razzia/web/features/game/components/states/Responses"
import Result from "@razzia/web/features/game/components/states/Result"
import Room from "@razzia/web/features/game/components/states/Room"
import SentenceBuilder from "@razzia/web/features/game/components/states/SentenceBuilder"
import Start from "@razzia/web/features/game/components/states/Start"
import StudyDashboard from "@razzia/web/features/game/components/states/StudyDashboard"
import Wait from "@razzia/web/features/game/components/states/Wait"

import { STATUS } from "@razzia/common/types/game/status"

export const ANSWERS_COLORS = [
  "bg-[#E69F00] text-white",
  "bg-[#56B4E9] text-white",
  "bg-[#3DBFA0] text-white",
  "bg-[#CC79A7] text-white",
]

export const ANSWERS_LABELS = ["A", "B", "C", "D"]

export const GAME_STATES = {
  status: {
    name: STATUS.WAIT,
    data: { text: "Waiting for the players" },
  },
  question: {
    current: 1,
    total: null,
  },
}

export const GAME_STATE_COMPONENTS = {
  [STATUS.BUILD_SENTENCE]: SentenceBuilder,
  [STATUS.SHOW_QUESTION]: Question,
  [STATUS.WAIT]: Wait,
  [STATUS.SHOW_START]: Start,
  [STATUS.SHOW_RESULT]: Result,
  [STATUS.FINISHED]: PlayerFinished,
}

export const GAME_STATE_COMPONENTS_MANAGER = {
  ...GAME_STATE_COMPONENTS,
  [STATUS.SHOW_ROOM]: Room,
  [STATUS.SHOW_RESPONSES]: Responses,
  [STATUS.SHOW_LEADERBOARD]: Leaderboard,
  [STATUS.FINISHED]: Podium,
  [STATUS.STUDY_PROGRESS]: StudyDashboard,
}

export const SFX = {
  ANSWERS: {
    MUSIC: "/sounds/answersMusic.mp3",
    SOUND: "/sounds/answersSound.mp3",
  },
  PODIUM: {
    THREE: "/sounds/three.mp3",
    SECOND: "/sounds/second.mp3",
    FIRST: "/sounds/first.mp3",
    SNEAR_ROOL: "/sounds/snearRoll.mp3",
  },
  RESULTS_SOUND: "/sounds/results.mp3",
  SHOW_SOUND: "/sounds/show.mp3",
  BOUMP_SOUND: "/sounds/boump.mp3",
} as const

export const MANAGER_SKIP_EVENTS = {
  [STATUS.BUILD_SENTENCE]: EVENTS.MANAGER.ABORT_QUIZ,
  [STATUS.SHOW_RESPONSES]: EVENTS.MANAGER.SHOW_LEADERBOARD,
  [STATUS.SHOW_LEADERBOARD]: EVENTS.MANAGER.NEXT_QUESTION,
  [STATUS.FINISHED]: EVENTS.MANAGER.PLAY_AGAIN,
} as const satisfies Partial<
  Record<keyof typeof GAME_STATE_COMPONENTS_MANAGER, string>
>

export function isKeyOf<T extends object>(
  obj: T,
  key: string,
): key is keyof T & string {
  return key in obj
}

export const MANAGER_SKIP_BTN = {
  [STATUS.SHOW_ROOM]: null,
  [STATUS.SHOW_START]: null,
  [STATUS.SHOW_QUESTION]: null,
  [STATUS.BUILD_SENTENCE]: "common:skip",
  [STATUS.SHOW_RESULT]: null,
  [STATUS.SHOW_RESPONSES]: "common:next",
  [STATUS.SHOW_LEADERBOARD]: "common:next",
  [STATUS.FINISHED]: "game:playAgain",
  [STATUS.WAIT]: null,
  [STATUS.STUDY_PROGRESS]: null,
}
