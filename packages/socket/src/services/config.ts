import { EXAMPLE_QUIZZ } from "@razzia/common/constants"
import type {
  GameResult,
  GameResultMeta,
  QuizzWithId,
  Question,
  QuizzMeta,
} from "@razzia/common/types/game"
import { quizzValidator } from "@razzia/common/validators/quizz"
import {
  isDerivationSuccessful,
  deriveCorrectChunks,
  isValidChunksOrder,
} from "@razzia/common/utils/chunks"
import { normalizeFilename } from "@razzia/socket/utils/game"
import fs from "fs"
import { resolve } from "path"

interface GameConfig {
  managerPassword: string
}

const inContainerPath = process.env.CONFIG_PATH

const getPath = (path = "") =>
  inContainerPath
    ? resolve(inContainerPath, path)
    : resolve(process.cwd(), "../../config", path)

export const assertSafeId = (id: string): void => {
  if (typeof id !== "string" || /[\/\\]|\.\./.test(id) || id.startsWith(".")) {
    throw new Error("Invalid ID: Path traversal attempt detected")
  }
}

export interface QuizzMetaEntry {
  folder?: string
  favorite?: boolean
  deletedAt?: string | null
}

export interface QuizzMetaStore {
  [id: string]: QuizzMetaEntry
}

export const initConfig = () => {
  const isConfigFolderExists = fs.existsSync(getPath())

  if (!isConfigFolderExists) {
    fs.mkdirSync(getPath())
  }

  const isGameConfigExists = fs.existsSync(getPath("game.json"))

  if (!isGameConfigExists) {
    fs.writeFileSync(
      getPath("game.json"),
      JSON.stringify(
        {
          managerPassword: "PASSWORD",
        },
        null,
        2,
      ),
    )
  }

  const isQuizzExists = fs.existsSync(getPath("quizz"))

  if (!isQuizzExists) {
    fs.mkdirSync(getPath("quizz"))

    fs.writeFileSync(
      getPath("quizz/example.json"),
      JSON.stringify(EXAMPLE_QUIZZ, null, 2),
    )
  }

  const isQuizzMetaExists = fs.existsSync(getPath("quizz-meta.json"))
  if (!isQuizzMetaExists) {
    fs.writeFileSync(getPath("quizz-meta.json"), JSON.stringify({}, null, 2))
  }

  const isFoldersExists = fs.existsSync(getPath("folders.json"))
  if (!isFoldersExists) {
    fs.writeFileSync(
      getPath("folders.json"),
      JSON.stringify({ folders: [] }, null, 2),
    )
  }
}

export const getGameConfig = (): GameConfig => {
  const isExists = fs.existsSync(getPath("game.json"))

  let fileConfig: Partial<GameConfig> = {}
  if (isExists) {
    try {
      const config = fs.readFileSync(getPath("game.json"), "utf-8")
      fileConfig = JSON.parse(config) as GameConfig
    } catch (error) {
      console.error("Failed to read/parse game config:", error)
      throw new Error("Game config file is corrupted")
    }
  }

  const managerPassword =
    process.env.MANAGER_PASSWORD || fileConfig.managerPassword || "PASSWORD"

  return {
    managerPassword,
  }
}

export const getQuizzMetaStore = (): QuizzMetaStore => {
  const filePath = getPath("quizz-meta.json")
  if (!fs.existsSync(filePath)) {
    return {}
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  } catch (error) {
    console.error("Failed to parse quizz-meta.json:", error)
    return {}
  }
}

export const saveQuizzMetaStore = (store: QuizzMetaStore) => {
  try {
    fs.writeFileSync(getPath("quizz-meta.json"), JSON.stringify(store, null, 2))
  } catch (error) {
    console.error("Failed to save quizz-meta.json:", error)
  }
}

export const getQuizzMeta = () => {
  const store = getQuizzMetaStore()
  return getQuizz(false).map(({ id, subject, questions }) => {
    const hasMismatch = questions.some(
      (q) =>
        q.correctSentence.trim() !== "" &&
        !isDerivationSuccessful(q.correctSentence, q.scrambledChunks),
    )

    const filePath = getPath(`quizz/${id}.json`)
    let lastModified = ""
    try {
      lastModified = fs.statSync(filePath).mtime.toISOString()
    } catch {
      lastModified = new Date().toISOString()
    }

    const entry = store[id]

    return {
      id,
      subject,
      hasMismatch,
      questionCount: questions.length,
      lastModified,
      folder: entry?.folder ?? "",
      favorite: entry?.favorite ?? false,
      deletedAt: entry?.deletedAt ?? undefined,
    }
  })
}

const healQuizz = (
  parsed: { questions?: Array<Partial<Question>> },
  filePath: string,
  identifier: string,
): boolean => {
  const questionsBefore = parsed.questions
    ? JSON.stringify(parsed.questions)
    : ""
  if (parsed.questions && Array.isArray(parsed.questions)) {
    parsed.questions = parsed.questions.map((q) => {
      if (
        q.correctSentence &&
        q.scrambledChunks &&
        (!q.correctChunks ||
          !isValidChunksOrder(q.correctSentence, q.correctChunks) ||
          q.correctChunks.length !== q.scrambledChunks.length)
      ) {
        const healed = deriveCorrectChunks(q.correctSentence, q.scrambledChunks)
        if (healed.length > 0) {
          return { ...q, correctChunks: healed }
        }
      }
      return q
    })
  }

  const modified = parsed.questions
    ? JSON.stringify(parsed.questions) !== questionsBefore
    : false

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2))
    console.info(
      `Auto-healed invalid correctChunks in quizz config "${identifier}"`,
    )
  }
  return modified
}

export const getQuizzById = (id: string) => {
  assertSafeId(id)
  const filePath = getPath(`quizz/${id}.json`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Quizz "${id}" not found`)
  }

  const data = fs.readFileSync(filePath, "utf-8")
  const parsed = JSON.parse(data) as { questions?: Array<Partial<Question>> }

  healQuizz(parsed, filePath, `${id}.json`)

  const result = quizzValidator.safeParse(parsed)

  if (!result.success) {
    throw new Error(`Invalid quizz "${id}"`)
  }

  return { id, ...result.data }
}

export const getQuizz = (includeDeleted = false) => {
  const isExists = fs.existsSync(getPath("quizz"))

  if (!isExists) {
    return []
  }

  try {
    const files = fs
      .readdirSync(getPath("quizz"))
      .filter((file) => file.endsWith(".json"))

    const metaStore = getQuizzMetaStore()

    const quizz: QuizzWithId[] = files.flatMap((file) => {
      const id = file.replace(".json", "")

      if (!includeDeleted && metaStore[id]?.deletedAt) {
        return []
      }

      const filePath = getPath(`quizz/${file}`)
      const data = fs.readFileSync(filePath, "utf-8")
      const parsed = JSON.parse(data) as {
        questions?: Array<Partial<Question>>
      }

      healQuizz(parsed, filePath, file)

      const result = quizzValidator.safeParse(parsed)

      if (!result.success) {
        console.warn(`Invalid quizz config "${file}":`, result.error.issues)

        return []
      }

      return [{ id, ...result.data }]
    })

    return quizz.sort((a, b) =>
      a.subject.localeCompare(b.subject, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    )
  } catch (error) {
    console.error("Failed to read quizz config:", error)

    return []
  }
}

export const updateQuizz = (id: string, data: unknown): { id: string } => {
  assertSafeId(id)
  const result = quizzValidator.safeParse(data)

  if (!result.success) {
    throw new Error(result.error.issues[0].message)
  }

  // Check for duplicate title (excluding itself)
  const existing = getQuizz()
  const isDuplicate = existing.some(
    (q) =>
      q.id !== id &&
      q.subject.toLowerCase().trim() ===
        result.data.subject.toLowerCase().trim(),
  )

  if (isDuplicate) {
    throw new Error("errors:quizz.duplicateTitle")
  }

  const oldPath = getPath(`quizz/${id}.json`)

  if (!fs.existsSync(oldPath)) {
    throw new Error(`Quizz "${id}" not found`)
  }

  fs.writeFileSync(oldPath, JSON.stringify(result.data, null, 2))

  return { id }
}

export const deleteQuizz = (id: string): void => {
  assertSafeId(id)
  const filePath = getPath(`quizz/${id}.json`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Quizz "${id}" not found`)
  }

  fs.unlinkSync(filePath)
}

export const saveResult = (data: GameResult): void => {
  try {
    assertSafeId(data.id)
    const resultsPath = getPath("results")

    if (!fs.existsSync(resultsPath)) {
      fs.mkdirSync(resultsPath)
    }

    fs.writeFileSync(
      getPath(`results/${data.id}.json`),
      JSON.stringify(data, null, 2),
    )

    console.log(`Saved result for "${data.subject}"`)
  } catch (error) {
    console.error("Failed to save result:", error)
  }
}

export const getResultsMeta = (): GameResultMeta[] => {
  const resultsPath = getPath("results")

  if (!fs.existsSync(resultsPath)) {
    return []
  }

  const readMeta = (file: string): GameResultMeta | null => {
    try {
      const data = fs.readFileSync(getPath(`results/${file}`), "utf-8")
      const result = JSON.parse(data) as GameResult

      return {
        id: result.id,
        subject: result.subject,
        date: result.date,
        playerCount: result.players.length,
        mode: result.mode ?? "versus",
      }
    } catch {
      return null
    }
  }

  try {
    return fs
      .readdirSync(resultsPath)
      .filter((file) => file.endsWith(".json"))
      .map(readMeta)
      .filter((meta): meta is GameResultMeta => meta !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch {
    return []
  }
}

export const getResultById = (id: string): GameResult => {
  assertSafeId(id)
  const filePath = getPath(`results/${id}.json`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Result "${id}" not found`)
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as GameResult
}

export const deleteResult = (id: string): void => {
  assertSafeId(id)
  const filePath = getPath(`results/${id}.json`)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Result "${id}" not found`)
  }

  fs.unlinkSync(filePath)
}

export const saveQuizz = (data: unknown): { id: string } => {
  const result = quizzValidator.safeParse(data)

  if (!result.success) {
    throw new Error(result.error.issues[0].message)
  }

  // Check for duplicate title
  const existing = getQuizz()
  const isDuplicate = existing.some(
    (q) =>
      q.subject.toLowerCase().trim() ===
      result.data.subject.toLowerCase().trim(),
  )

  if (isDuplicate) {
    throw new Error("errors:quizz.duplicateTitle")
  }

  const id = normalizeFilename(result.data.subject)
  const filePath = getPath(`quizz/${id}.json`)

  fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2))

  // Extract folder from raw data if present
  let folder = ""
  if (
    data &&
    typeof data === "object" &&
    "folder" in data &&
    typeof data.folder === "string"
  ) {
    folder = data.folder
  }

  // Initialize metadata in store
  const store = getQuizzMetaStore()
  store[id] = { folder, favorite: false, deletedAt: null }
  saveQuizzMetaStore(store)

  return { id }
}

export const getTrashMeta = (): QuizzMeta[] => {
  const store = getQuizzMetaStore()
  const deletedIds = Object.keys(store).filter((id) => store[id]?.deletedAt)

  return deletedIds
    .map((id): QuizzMeta | null => {
      try {
        const filePath = getPath(`quizz/${id}.json`)
        if (!fs.existsSync(filePath)) return null
        const data = fs.readFileSync(filePath, "utf-8")
        const parsed = JSON.parse(data)
        const entry = store[id]
        return {
          id,
          subject: parsed.subject || "Untitled",
          questionCount: parsed.questions?.length || 0,
          deletedAt: entry.deletedAt || undefined,
          folder: entry.folder || "",
          favorite: entry.favorite || false,
        }
      } catch {
        return null
      }
    })
    .filter((x): x is QuizzMeta => x !== null)
}

export const getFolders = (): string[] => {
  const filePath = getPath("folders.json")
  if (!fs.existsSync(filePath)) {
    return []
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    return data.folders || []
  } catch (error) {
    console.error("Failed to parse folders.json:", error)
    return []
  }
}

export const saveFolders = (folders: string[]): void => {
  try {
    fs.writeFileSync(
      getPath("folders.json"),
      JSON.stringify({ folders }, null, 2),
    )
  } catch (error) {
    console.error("Failed to save folders.json:", error)
  }
}

export const createFolder = (name: string): void => {
  const folders = getFolders()
  if (!folders.includes(name)) {
    folders.push(name)
    saveFolders(folders)
  }
}

export const deleteFolder = (name: string): void => {
  const folders = getFolders()
  const updated = folders.filter((f) => f !== name && !f.startsWith(name + "/"))
  saveFolders(updated)

  const store = getQuizzMetaStore()
  const now = new Date().toISOString()
  let modified = false
  for (const [, entry] of Object.entries(store)) {
    if (
      entry.folder === name ||
      (entry.folder && entry.folder.startsWith(name + "/"))
    ) {
      entry.deletedAt = now
      entry.folder = ""
      modified = true
    }
  }
  if (modified) {
    saveQuizzMetaStore(store)
  }
}

export const renameFolder = (oldName: string, newName: string): void => {
  const folders = getFolders()
  const updatedFolders = folders.map((f) => {
    if (f === oldName) return newName
    if (f.startsWith(oldName + "/")) {
      return newName + f.slice(oldName.length)
    }
    return f
  })
  saveFolders(updatedFolders)

  const store = getQuizzMetaStore()
  let modified = false
  for (const [, entry] of Object.entries(store)) {
    if (entry.folder === oldName) {
      entry.folder = newName
      modified = true
    } else if (entry.folder && entry.folder.startsWith(oldName + "/")) {
      entry.folder = newName + entry.folder.slice(oldName.length)
      modified = true
    }
  }
  if (modified) {
    saveQuizzMetaStore(store)
  }
}

export const moveQuizz = (ids: string[], folder: string): void => {
  ids.forEach(assertSafeId)
  const store = getQuizzMetaStore()
  for (const id of ids) {
    if (!store[id]) {
      store[id] = {}
    }
    store[id].folder = folder
  }
  saveQuizzMetaStore(store)
}

export const toggleFavorite = (ids: string[]): void => {
  ids.forEach(assertSafeId)
  const store = getQuizzMetaStore()
  for (const id of ids) {
    if (!store[id]) {
      store[id] = {}
    }
    store[id].favorite = !store[id].favorite
  }
  saveQuizzMetaStore(store)
}

export const softDeleteQuizz = (ids: string[]): void => {
  ids.forEach(assertSafeId)
  const store = getQuizzMetaStore()
  const now = new Date().toISOString()
  for (const id of ids) {
    if (!store[id]) {
      store[id] = {}
    }
    store[id].deletedAt = now
  }
  saveQuizzMetaStore(store)
}

export const restoreQuizz = (ids: string[]): void => {
  ids.forEach(assertSafeId)
  const store = getQuizzMetaStore()
  for (const id of ids) {
    if (store[id]) {
      store[id].deletedAt = null
    }
  }
  saveQuizzMetaStore(store)
}

export const permanentDeleteQuizz = (ids: string[]): void => {
  ids.forEach(assertSafeId)
  const store = getQuizzMetaStore()
  for (const id of ids) {
    const filePath = getPath(`quizz/${id}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    delete store[id]
  }
  saveQuizzMetaStore(store)
}

export const duplicateQuizz = (id: string): { id: string } => {
  assertSafeId(id)
  const filePath = getPath(`quizz/${id}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Quizz "${id}" not found`)
  }
  const data = fs.readFileSync(filePath, "utf-8")
  const parsed = JSON.parse(data)

  const baseSubject = parsed.subject || "Untitled"
  let newSubject = `Copy of ${baseSubject}`

  const existing = getQuizz(true) // check all including soft deleted to avoid duplicate filename/id issues
  let count = 1
  while (
    existing.some(
      (q) => q.subject.toLowerCase().trim() === newSubject.toLowerCase().trim(),
    )
  ) {
    newSubject = `Copy of ${baseSubject} (${count})`
    count++
  }

  parsed.subject = newSubject

  const newId = normalizeFilename(newSubject)
  const newFilePath = getPath(`quizz/${newId}.json`)
  fs.writeFileSync(newFilePath, JSON.stringify(parsed, null, 2))

  const store = getQuizzMetaStore()
  const oldEntry = store[id] || {}
  store[newId] = {
    folder: oldEntry.folder || "",
    favorite: oldEntry.favorite || false,
    deletedAt: null,
  }
  saveQuizzMetaStore(store)

  return { id: newId }
}

export const combineQuizzes = (
  ids: string[],
  subject: string,
  folder?: string,
): { id: string } => {
  ids.forEach(assertSafeId)
  const existing = getQuizz(true)
  const isDuplicate = existing.some(
    (q) => q.subject.toLowerCase().trim() === subject.toLowerCase().trim(),
  )
  if (isDuplicate) {
    throw new Error("errors:quizz.duplicateTitle")
  }

  const questions: Question[] = []
  for (const id of ids) {
    try {
      const q = getQuizzById(id)
      if (q && q.questions) {
        questions.push(...q.questions)
      }
    } catch (err) {
      console.error(`Failed to load quiz ${id} for combining:`, err)
    }
  }

  const combinedData = {
    subject,
    questions,
  }

  const newId = normalizeFilename(subject)
  const filePath = getPath(`quizz/${newId}.json`)
  fs.writeFileSync(filePath, JSON.stringify(combinedData, null, 2))

  const store = getQuizzMetaStore()

  // Determine if a folder is explicitly provided, or if all source quizzes are in the same folder
  let targetFolder = folder || ""
  if (!targetFolder && ids.length > 0) {
    const firstId = ids[0]
    const firstFolder = store[firstId]?.folder || ""
    const allSameFolder = ids.every(
      (id) => (store[id]?.folder || "") === firstFolder,
    )
    if (allSameFolder) {
      targetFolder = firstFolder
    }
  }

  store[newId] = { folder: targetFolder, favorite: false, deletedAt: null }
  saveQuizzMetaStore(store)

  return { id: newId }
}

export const purgeExpiredTrash = (): void => {
  const store = getQuizzMetaStore()
  const now = new Date()
  const expiredIds: string[] = []

  for (const [id, entry] of Object.entries(store)) {
    if (entry.deletedAt) {
      const deletedDate = new Date(entry.deletedAt)
      const diffTime = Math.abs(now.getTime() - deletedDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays > 30) {
        expiredIds.push(id)
      }
    }
  }

  if (expiredIds.length > 0) {
    console.info(
      `Purging ${expiredIds.length} expired quizzes from Trash:`,
      expiredIds,
    )
    permanentDeleteQuizz(expiredIds)
  }
}
