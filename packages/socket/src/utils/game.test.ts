import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  orderToPoint,
  timeToPoint,
  createInviteCode,
  normalizeFilename,
} from "./game"

describe("Game Utilities", () => {
  describe("orderToPoint", () => {
    it("should award 1000 points if there is only 1 player", () => {
      expect(orderToPoint(0, 1)).toBe(1000)
    })

    it("should calculate correct points for multiple players based on rank", () => {
      // 5 players total:
      // index 0 (1st): 1000 points
      // index 1 (2nd): 875 points
      // index 2 (3rd): 750 points
      // index 3 (4th): 625 points
      // index 4 (5th): 500 points
      expect(orderToPoint(0, 5)).toBe(1000)
      expect(orderToPoint(1, 5)).toBe(875)
      expect(orderToPoint(2, 5)).toBe(750)
      expect(orderToPoint(3, 5)).toBe(625)
      expect(orderToPoint(4, 5)).toBe(500)
    })
  })

  describe("timeToPoint", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("should award max points (1000) if no time has passed", () => {
      const startTime = Date.now()
      const score = timeToPoint(startTime, 30)
      expect(score).toBe(1000)
    })

    it("should decay score linearly over elapsed time", () => {
      const startTime = Date.now()
      // Advance time by 15 seconds (exactly half of 30 second limit)
      vi.advanceTimersByTime(15000)
      const score = timeToPoint(startTime, 30)
      // Expect score to decay by half (to 500)
      expect(score).toBeCloseTo(500)
    })

    it("should not return points below zero if time limit exceeded", () => {
      const startTime = Date.now()
      // Advance time past the 30 second limit
      vi.advanceTimersByTime(45000)
      const score = timeToPoint(startTime, 30)
      expect(score).toBe(0)
    })
  })

  describe("createInviteCode", () => {
    it("should generate a 4-digit code by default", () => {
      const code = createInviteCode()
      expect(code).toMatch(/^\d{4}$/)
    })

    it("should generate a code of arbitrary length", () => {
      const code = createInviteCode(6)
      expect(code).toMatch(/^\d{6}$/)
    })
  })

  describe("normalizeFilename", () => {
    it("should slugify and normalize strings correctly", () => {
      const subject = "ESL Quiz #1: Sentence Builder!"
      const filename = normalizeFilename(subject)

      // Expected slug output before nanoid append: "esl-quiz-1" (up to 10 chars)
      expect(filename.startsWith("esl-quiz-1")).toBe(true)
      // Total length should be: 10 chars (slug) + 1 (hyphen) + 8 (nanoid) = 19 chars
      expect(filename.length).toBe(19)
    })

    it("should strip unicode accents and marks", () => {
      const subject = "Café Crème"
      const filename = normalizeFilename(subject)

      expect(filename.startsWith("cafe-creme")).toBe(true)
    })
  })
})
