import { describe, it, expect } from "vitest"
import {
  deriveCorrectChunks,
  isDerivationSuccessful,
  isValidChunksOrder,
  splitIntoSentences,
  autoGenerateChunks,
} from "./chunks"

describe("Chunk Derivation Utilities", () => {
  describe("deriveCorrectChunks", () => {
    it("should arrange simple scrambled chunks into the correct sentence order", () => {
      const sentence = "It is a big ball of gas."
      const scrambled = ["of gas.", "It", "a big ball", "is"]

      const result = deriveCorrectChunks(sentence, scrambled)
      expect(result).toEqual(["It", "is", "a big ball", "of gas."])
    })

    it("should handle punctuation and case normalization", () => {
      const sentence = 'He said, "Hello!"'
      const scrambled = ['"hello!"', "he", "said,"]

      const result = deriveCorrectChunks(sentence, scrambled)
      expect(result).toEqual(["he", "said,", '"hello!"'])
    })

    it("should return empty array if matching permutation cannot be found", () => {
      const sentence = "This is a sentence."
      const scrambled = ["This", "is", "wrong", "chunks"]

      const result = deriveCorrectChunks(sentence, scrambled)
      expect(result).toEqual([])
    })
  })

  describe("isDerivationSuccessful", () => {
    it("should return true when a valid permutation exists", () => {
      expect(isDerivationSuccessful("Hello world", ["world", "Hello"])).toBe(true)
    })

    it("should return false when chunks cannot reconstruct the sentence", () => {
      expect(isDerivationSuccessful("Hello world", ["world", "wrong"])).toBe(false)
    })
  })

  describe("isValidChunksOrder", () => {
    it("should return true for correctly ordered chunks", () => {
      expect(isValidChunksOrder("I love coding", ["I", "love", "coding"])).toBe(true)
    })

    it("should return false for incorrectly ordered chunks", () => {
      expect(isValidChunksOrder("I love coding", ["love", "I", "coding"])).toBe(false)
    })
  })

  describe("splitIntoSentences", () => {
    it("should split standard paragraph into sentences", () => {
      const text = "Hello! This is Razzmatazz. Are you ready to play?"
      const result = splitIntoSentences(text)
      expect(result).toEqual([
        "Hello!",
        "This is Razzmatazz.",
        "Are you ready to play?",
      ])
    })

    it("should handle abbreviations and not split on them", () => {
      const text = "Dr. Smith went to the store. It cost $5.00 etc. or something."
      const result = splitIntoSentences(text)
      expect(result).toEqual([
        "Dr. Smith went to the store.",
        "It cost $5.00 etc. or something.",
      ])
    })

    it("should keep quotes attached to the sentence", () => {
      const text = 'She asked, "Are you ready?" "Yes," I replied.'
      const result = splitIntoSentences(text)
      expect(result).toEqual([
        'She asked, "Are you ready?"',
        '"Yes," I replied.',
      ])
    })

    it("should handle dialogue attribution correctly", () => {
      const text = '"I am ready," said John. "Me too," replied Sarah.'
      const result = splitIntoSentences(text)
      expect(result).toEqual([
        '"I am ready," said John.',
        '"Me too," replied Sarah.',
      ])
    })
  })

  describe("autoGenerateChunks", () => {
    it("should split short sentence word by word", () => {
      const sentence = "This is a cat."
      const chunks = autoGenerateChunks(sentence)
      // Expect all words to be in the result, shuffled
      expect(chunks.length).toBe(4)
      expect(chunks).toContain("This")
      expect(chunks).toContain("is")
      expect(chunks).toContain("a")
      expect(chunks).toContain("cat.")
    })

    it("should split longer sentences into phrases", () => {
      const sentence = "When the sun shines tomorrow, we will go to the park and have a nice picnic."
      const chunks = autoGenerateChunks(sentence)
      // Expect phrases of 2-3 words grouped
      expect(chunks.length).toBeGreaterThanOrEqual(4)
      expect(chunks.some((c) => c.split(/\s+/).length > 1)).toBe(true)
    })
  })
})
