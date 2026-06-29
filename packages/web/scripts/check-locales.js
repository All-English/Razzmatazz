import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const localesDir = path.resolve(__dirname, "../src/locales")
const sourceLang = "en"
const targetLangs = ["de", "es", "fr", "it", "ja", "ko"]
const files = [
  "common.json",
  "errors.json",
  "game.json",
  "manager.json",
  "quizz.json",
]

// Helper to recursively collect all keys/paths from an object
function getKeys(obj, prefix = "") {
  let keys = []
  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys = keys.concat(getKeys(obj[key], fullPath))
    } else {
      keys.push(fullPath)
    }
  }
  return keys
}

let hasErrors = false

for (const file of files) {
  const sourcePath = path.join(localesDir, sourceLang, file)
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source English file not found: ${sourcePath}`)
    process.exit(1)
  }

  const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf8"))
  const sourceKeys = getKeys(sourceData)

  for (const lang of targetLangs) {
    const targetPath = path.join(localesDir, lang, file)
    if (!fs.existsSync(targetPath)) {
      console.error(`❌ Missing locale file: ${targetPath}`)
      hasErrors = true
      continue
    }

    try {
      const targetData = JSON.parse(fs.readFileSync(targetPath, "utf8"))
      const targetKeys = new Set(getKeys(targetData))

      const missing = sourceKeys.filter((k) => !targetKeys.has(k))
      if (missing.length > 0) {
        console.error(`❌ [${lang}] ${file} is missing keys:`)
        missing.forEach((key) => console.error(`   - ${key}`))
        hasErrors = true
      }
    } catch (e) {
      console.error(`❌ Error parsing JSON file: ${targetPath}`)
      console.error(e)
      hasErrors = true
    }
  }
}

if (hasErrors) {
  console.error(
    "\n❌ Localization check failed: some translation keys are missing.",
  )
  process.exit(1)
} else {
  console.log("✅ Localization check passed: all languages are fully aligned.")
  process.exit(0)
}
