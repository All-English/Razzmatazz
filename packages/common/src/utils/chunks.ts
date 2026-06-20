/**
 * Helper to check if a character is a punctuation or symbol character.
 */
const isPunctuationOrSymbol = (char: string): boolean =>
  /[\p{P}\p{S}]/u.test(char)

/**
 * Normalizes a string by converting to lowercase, removing spaces, and selectively
 * stripping punctuation characters that are not in the allowed set.
 */
function normalizeForComparison(
  str: string,
  allowedPunctuation: Set<string>,
): string {
  const normalizedStr = str.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  const lower = normalizedStr.toLowerCase()
  let result = ""

  for (const char of lower) {
    if (/\s/u.test(char)) {
      continue
    }

    if (isPunctuationOrSymbol(char) && !allowedPunctuation.has(char)) {
      continue
    }

    result += char
  }

  return result
}

/**
 * Collects all punctuation characters present in the chunks list.
 */
function getChunksPunctuation(chunks: string[]): Set<string> {
  const punctuationRegex = /[\p{P}\p{S}]/gu
  const set = new Set<string>()

  for (const chunk of chunks) {
    const normalizedChunk = chunk.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    const matches = normalizedChunk.match(punctuationRegex)

    if (matches) {
      for (const char of matches) {
        set.add(char.toLowerCase())
      }
    }
  }

  return set
}

/**
 * Backtracking search to find a permutation of chunks that, when joined,
 * matches the correctSentence ignoring spacing and excluded punctuation.
 */
function findMatchingPermutation(
  sentence: string,
  chunks: string[],
): string[] | null {
  if (
    !sentence.trim() ||
    chunks.length === 0 ||
    chunks.some((c) => !c.trim())
  ) {
    return null
  }

  const allowedPunctuation = getChunksPunctuation(chunks)
  const target = normalizeForComparison(sentence, allowedPunctuation)

  function dfs(
    currentJoined: string,
    remainingChunks: string[],
    path: string[],
  ): string[] | null {
    const currentNormalized = normalizeForComparison(
      currentJoined,
      allowedPunctuation,
    )

    // If current path does not match the prefix of the target, prune the search
    if (!target.startsWith(currentNormalized)) {
      return null
    }

    if (remainingChunks.length === 0) {
      return currentNormalized === target ? path : null
    }

    for (let i = 0; i < remainingChunks.length; i += 1) {
      const nextChunk = remainingChunks[i]
      const nextRemaining = remainingChunks.filter((_, idx) => idx !== i)
      const result = dfs(currentJoined + nextChunk, nextRemaining, [
        ...path,
        nextChunk,
      ])

      if (result) {
        return result
      }
    }

    return null
  }

  return dfs("", chunks, [])
}

/**
 * Arranges scrambled chunks into the correct order based on the target sentence.
 * Uses a selective punctuation-matching, Unicode-safe backtracking approach.
 */
export function deriveCorrectChunks(
  sentence: string,
  chunks: string[],
): string[] {
  const matched = findMatchingPermutation(sentence, chunks)

  return matched ?? []
}

/**
 * Checks if the chunks can be successfully derived to match the target sentence.
 */
export function isDerivationSuccessful(
  sentence: string,
  chunks: string[],
): boolean {
  return findMatchingPermutation(sentence, chunks) !== null
}

/**
 * Checks if the correctChunks sequence actually reconstructs the correctSentence
 * under the same normalized comparison rules.
 */
export function isValidChunksOrder(
  sentence: string,
  correctChunks: string[],
): boolean {
  if (!sentence.trim() || correctChunks.length === 0) {
    return false
  }

  const allowedPunctuation = getChunksPunctuation(correctChunks)
  const normalizedJoined = normalizeForComparison(
    correctChunks.join(""),
    allowedPunctuation,
  )
  const normalizedSentence = normalizeForComparison(
    sentence,
    allowedPunctuation,
  )

  return normalizedJoined === normalizedSentence
}

/**
 * Helper to shuffle an array using Fisher-Yates algorithm.
 */
function shuffleArray<T>(array: T[]): T[] {
  const next = [...array]

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = next[i]
    next[i] = next[j]
    next[j] = temp
  }

  return next
}

const abbreviations = new Set([
  "mr.",
  "mrs.",
  "dr.",
  "ms.",
  "vs.",
  "e.g.",
  "i.e.",
])

const splitBeforeWords = new Set([
  // Conjunctions
  "and",
  "but",
  "or",
  "because",
  "so",
  "although",
  "while",
  "since",
  "unless",
  "until",
  "if",
  "when",
  "yet",
  // Articles
  "a",
  "an",
  "the",
  // Demonstratives
  "this",
  "that",
  "these",
  "those",
  // Possessive Determiners
  // "my", "your", "his", "her", "its", "our", "their",
  // Prepositions
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "by",
  "from",
  "about",
  "of",
  "into",
  "onto",
  "through",
  "during",
  "before",
  "after",
  // Quantifiers & Distributives
  "some",
  "any",
  "many",
  "few",
  "all",
  "each",
  "every",
  "both",
  "either",
  "neither",
])

/**
 * Splits a correct sentence into scrambled chunks.
 * If sentence has 5 words or fewer, splits word-by-word.
 * If it has more than 5 words, splits into phrases of 2-3 words,
 * respecting natural pause marks and clause conjunction boundaries.
 */
export function autoGenerateChunks(sentence: string): string[] {
  const cleanSentence = sentence.trim()

  if (!cleanSentence) {
    return []
  }

  const words = cleanSentence.split(/\s+/u)

  if (words.length <= 5) {
    return shuffleArray(words)
  }

  const chunks: string[] = []
  let currentChunkWords: string[] = []

  for (let idx = 0; idx < words.length; idx += 1) {
    const word = words[idx]
    currentChunkWords.push(word)

    const nextWord = words[idx + 1]
    const lastChar = word.slice(-1)
    const isAbbreviation = abbreviations.has(word.toLowerCase())
    const isPause = /[.,;:!?”"’']/u.test(lastChar) && !isAbbreviation

    const isNextSplitWord =
      nextWord &&
      splitBeforeWords.has(nextWord.toLowerCase().replace(/[^\p{L}]/gu, ""))

    const shouldSplit =
      idx === words.length - 1 ||
      isPause ||
      isNextSplitWord ||
      currentChunkWords.length >= 3

    if (shouldSplit) {
      chunks.push(currentChunkWords.join(" "))
      currentChunkWords = []
    }
  }

  // Enforce a minimum of 4 chunks for phrase-based chunking
  while (chunks.length < 4) {
    let maxWordsIndex = -1
    let maxWordsCount = 0

    for (let j = 0; j < chunks.length; j += 1) {
      const wordCount = chunks[j].split(/\s+/u).length

      if (wordCount > maxWordsCount) {
        maxWordsCount = wordCount
        maxWordsIndex = j
      }
    }

    if (maxWordsCount <= 1) {
      break
    }

    const chunkToSplit = chunks[maxWordsIndex]
    const wordsInChunk = chunkToSplit.split(/\s+/u)
    const mid = Math.ceil(wordsInChunk.length / 2)
    const part1 = wordsInChunk.slice(0, mid).join(" ")
    const part2 = wordsInChunk.slice(mid).join(" ")

    chunks.splice(maxWordsIndex, 1, part1, part2)
  }

  return shuffleArray(chunks)
}

const speechVerbs = new Set([
  "said",
  "says",
  "asked",
  "asks",
  "replied",
  "replies",
  "whispered",
  "whispers",
  "shouted",
  "shouts",
  "yelled",
  "yells",
  "cried",
  "cries",
  "thought",
  "thinks",
  "explained",
  "explains",
  "added",
  "adds",
  "called",
  "calls",
  "wrote",
  "writes",
  "stated",
  "states",
  "responded",
  "responds",
  "sighed",
  "sighs",
  "mumbled",
  "mumbles",
  "gasped",
  "gasps",
  "screamed",
  "screams",
])

/**
 * Splits a paragraph or story into individual sentences.
 * Respects abbreviations and keeps quotes attached to sentences.
 */
export function splitIntoSentences(text: string): string[] {
  const result: string[] = []
  let currentSentence = ""

  const cleanText = text.replace(/\r\n/g, "\n").trim()

  if (!cleanText) {
    return []
  }

  const paragraphs = cleanText.split(/\n+/g)

  for (const para of paragraphs) {
    const trimmedPara = para.trim()

    if (!trimmedPara) {
      continue
    }

    let i = 0
    let quoteCount = 0

    while (i < trimmedPara.length) {
      const char = trimmedPara[i]
      currentSentence += char

      if (char === '"' || char === "“" || char === "”") {
        quoteCount += 1
      }

      const isEndPunctuation = char === "." || char === "!" || char === "?"

      if (isEndPunctuation) {
        let nextIndex = i + 1

        while (
          nextIndex < trimmedPara.length &&
          (trimmedPara[nextIndex] === '"' ||
            trimmedPara[nextIndex] === "”" ||
            trimmedPara[nextIndex] === "’" ||
            trimmedPara[nextIndex] === "'")
        ) {
          const nextChar = trimmedPara[nextIndex]

          currentSentence += nextChar

          if (nextChar === '"' || nextChar === "“" || nextChar === "”") {
            quoteCount += 1
          }

          i = nextIndex

          nextIndex += 1
        }

        const words = currentSentence.trim().split(/\s+/)
        const lastWord = words[words.length - 1]?.toLowerCase() || ""
        const lastWordClean = lastWord.replace(/["'”’()]/g, "")
        const isAbbr =
          abbreviations.has(lastWord) || abbreviations.has(lastWordClean)

        // Dialogue attribution detection to prevent splitting dialog tags
        let isDialogueAttribution = false
        let nextWordStart = nextIndex

        while (
          nextWordStart < trimmedPara.length &&
          /\s/.test(trimmedPara[nextWordStart])
        ) {
          nextWordStart += 1
        }

        let nextWord = ""
        let tempIdx = nextWordStart

        while (
          tempIdx < trimmedPara.length &&
          /[\p{L}]/u.test(trimmedPara[tempIdx])
        ) {
          nextWord += trimmedPara[tempIdx]
          tempIdx += 1
        }

        let secondWordStart = tempIdx

        while (
          secondWordStart < trimmedPara.length &&
          /\s/.test(trimmedPara[secondWordStart])
        ) {
          secondWordStart += 1
        }

        let secondWord = ""
        tempIdx = secondWordStart

        while (
          tempIdx < trimmedPara.length &&
          /[\p{L}]/u.test(trimmedPara[tempIdx])
        ) {
          secondWord += trimmedPara[tempIdx]
          tempIdx += 1
        }

        const nextWordLower = nextWord.toLowerCase()
        const secondWordLower = secondWord.toLowerCase()
        const firstChar = nextWord.charAt(0)
        const isNextWordLowercase =
          nextWord.length > 0 &&
          nextWord.startsWith(firstChar.toLowerCase()) &&
          !nextWord.startsWith(firstChar.toUpperCase())

        isDialogueAttribution =
          isNextWordLowercase ||
          speechVerbs.has(nextWordLower) ||
          speechVerbs.has(secondWordLower)

        const isEnd =
          nextIndex >= trimmedPara.length || /\s/.test(trimmedPara[nextIndex])
        const insideQuotes = quoteCount % 2 !== 0

        if (!isAbbr && isEnd && !isDialogueAttribution && !insideQuotes) {
          result.push(currentSentence.trim())
          currentSentence = ""
        }
      }

      i += 1
    }

    if (currentSentence.trim()) {
      result.push(currentSentence.trim())
      currentSentence = ""
    }
  }

  return result.filter((s) => s.length > 0)
}
