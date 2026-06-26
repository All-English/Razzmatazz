import * as AlertDialog from "@radix-ui/react-alert-dialog"
import type { QuestionWithId } from "@razzia/web/features/quizz/contexts/quizz-editor-context"
import {
  autoGenerateChunks,
  deriveCorrectChunks,
  splitIntoSentences,
} from "@razzia/web/features/quizz/utils/chunks"
import { BookOpen, X } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { v7 as uuid } from "uuid"

interface Props {
  onImport: (_questions: QuestionWithId[]) => void
}

interface ChatGPTResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  error?: {
    message?: string
  }
}

/* eslint-disable no-await-in-loop, no-loop-func, max-params */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries = 3,
  delayMs = 1500,
): Promise<Response> => {
  let attempt = 1
  const toastId = "translation-retry"
  let currentDelay = delayMs

  while (attempt <= maxRetries + 1) {
    try {
      const response = await fetch(url, options)

      if (response.status === 503 && attempt <= maxRetries) {
        toast.loading(
          `Service busy (${response.statusText}). Retrying in ${(currentDelay / 1000).toFixed(1)}s (Attempt ${attempt}/${maxRetries})...`,
          { id: toastId },
        )
        attempt += 1
        await new Promise<void>((resolve) => {
          setTimeout(resolve, currentDelay)
        })
        currentDelay *= 2

        continue
      }

      toast.dismiss(toastId)

      return response
    } catch (err) {
      if (attempt <= maxRetries) {
        toast.loading(
          `Network error. Retrying in ${(currentDelay / 1000).toFixed(1)}s (Attempt ${attempt}/${maxRetries})...`,
          { id: toastId },
        )
        attempt += 1
        await new Promise<void>((resolve) => {
          setTimeout(resolve, currentDelay)
        })
        currentDelay *= 2

        continue
      }

      toast.dismiss(toastId)
      throw err
    }
  }

  throw new Error("Translation request failed after maximum retries.")
}

const StoryImportModal = ({ onImport }: Props) => {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")

  const [useAi, setUseAi] = useState<boolean>(
    () => localStorage.getItem("razzia_ai_enabled") === "true",
  )
  const [provider, setProvider] = useState<"chatgpt" | "gemini">(() => {
    const saved = localStorage.getItem("razzia_ai_provider")

    return saved === "chatgpt" || saved === "gemini" ? saved : "gemini"
  })
  const [openAiKey, setOpenAiKey] = useState<string>(
    () => localStorage.getItem("razzia_openai_key") ?? "",
  )
  const [geminiKey, setGeminiKey] = useState<string>(
    () => localStorage.getItem("razzia_gemini_key") ?? "",
  )
  const [sourceLanguage, setSourceLanguage] = useState<string>("Auto-Detect")
  const [targetLanguage, setTargetLanguage] = useState<string>(() => {
    const code = i18n.language?.slice(0, 2)
    switch (code) {
      case "de": return "German"
      case "es": return "Spanish"
      case "fr": return "French"
      case "it": return "Italian"
      case "ja": return "Japanese"
      case "ko": return "Korean"
      case "en":
      default:
        return "English"
    }
  })
  const [isTranslating, setIsTranslating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [openaiModels, setOpenaiModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("razzia_openai_models")

      return saved ? (JSON.parse(saved) as string[]) : []
    } catch {
      return []
    }
  })
  const [geminiModels, setGeminiModels] = useState<
    Array<{ name: string; displayName: string }>
  >(() => {
    try {
      const saved = localStorage.getItem("razzia_gemini_models")

      return saved ? (JSON.parse(saved) as Array<{ name: string; displayName: string }>) : []
    } catch {
      return []
    }
  })
  const [selectedOpenaiModel, setSelectedOpenaiModel] = useState<string>(
    () => localStorage.getItem("razzia_openai_model") ?? "gpt-5.4-mini",
  )
  const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>(
    () => localStorage.getItem("razzia_gemini_model") ?? "gemini-flash-latest",
  )
  const [openaiTestStatus, setOpenaiTestStatus] = useState<
    "idle" | "success" | "error"
  >(
    () =>
      (localStorage.getItem("razzia_openai_test_status") ?? "idle") as
        | "idle"
        | "success"
        | "error",
  )
  const [geminiTestStatus, setGeminiTestStatus] = useState<
    "idle" | "success" | "error"
  >(
    () =>
      (localStorage.getItem("razzia_gemini_test_status") ?? "idle") as
        | "idle"
        | "success"
        | "error",
  )
  const [openaiTestError, setOpenaiTestError] = useState<string | null>(() =>
    localStorage.getItem("razzia_openai_test_error"),
  )
  const [geminiTestError, setGeminiTestError] = useState<string | null>(() =>
    localStorage.getItem("razzia_gemini_test_error"),
  )
  const [isTestingKey, setIsTestingKey] = useState(false)

  // LocalStorage Helper setters
  const updateUseAi = (val: boolean) => {
    setUseAi(val)
    localStorage.setItem("razzia_ai_enabled", String(val))
  }
  const updateProvider = (val: "chatgpt" | "gemini") => {
    setProvider(val)
    localStorage.setItem("razzia_ai_provider", val)
  }
  const updateOpenAiKey = (val: string) => {
    setOpenAiKey(val)
    localStorage.setItem("razzia_openai_key", val)
    setOpenaiTestStatus("idle")
    localStorage.setItem("razzia_openai_test_status", "idle")
    setOpenaiTestError(null)
    localStorage.removeItem("razzia_openai_test_error")
  }
  const updateGeminiKey = (val: string) => {
    setGeminiKey(val)
    localStorage.setItem("razzia_gemini_key", val)
    setGeminiTestStatus("idle")
    localStorage.setItem("razzia_gemini_test_status", "idle")
    setGeminiTestError(null)
    localStorage.removeItem("razzia_gemini_test_error")
  }
  const updateSelectedOpenaiModel = (val: string) => {
    setSelectedOpenaiModel(val)
    localStorage.setItem("razzia_openai_model", val)
  }
  const updateSelectedGeminiModel = (val: string) => {
    setSelectedGeminiModel(val)
    localStorage.setItem("razzia_gemini_model", val)
  }

  // Auto-detection logic checking for Hangul characters
  // const detectIsKorean = (input: string) =>
  //   /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/u.test(input)

  const testApiKeyAndFetchModels = async () => {
    const apiKey = provider === "chatgpt" ? openAiKey : geminiKey

    if (!apiKey) {
      if (provider === "chatgpt") {
        setOpenaiTestStatus("error")
        localStorage.setItem("razzia_openai_test_status", "error")
        setOpenaiTestError("Please enter an API key first.")
        localStorage.setItem(
          "razzia_openai_test_error",
          "Please enter an API key first.",
        )
      } else {
        setGeminiTestStatus("error")
        localStorage.setItem("razzia_gemini_test_status", "error")
        setGeminiTestError("Please enter an API key first.")
        localStorage.setItem(
          "razzia_gemini_test_error",
          "Please enter an API key first.",
        )
      }

      return
    }

    setIsTestingKey(true)

    if (provider === "chatgpt") {
      setOpenaiTestStatus("idle")
      localStorage.setItem("razzia_openai_test_status", "idle")
      setOpenaiTestError(null)
      localStorage.removeItem("razzia_openai_test_error")
    } else {
      setGeminiTestStatus("idle")
      localStorage.setItem("razzia_gemini_test_status", "idle")
      setGeminiTestError(null)
      localStorage.removeItem("razzia_gemini_test_error")
    }

    try {
      if (provider === "chatgpt") {
        const response = await fetchWithRetry(
          "https://api.openai.com/v1/models",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        )

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: { message?: string }
          }

          throw new Error(
            errData.error?.message ?? `API error: ${response.statusText}`,
          )
        }

        const data = (await response.json()) as {
          data?: Array<{ id: string }>
        }

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid response format from OpenAI.")
        }

        const filtered = data.data
          .map((m) => m.id)
          .filter((id) => {
            const idLower = id.toLowerCase()

            const startsWithAllowed =
              idLower.startsWith("gpt-") ||
              idLower.startsWith("o1-") ||
              idLower.startsWith("o3-")

            if (!startsWithAllowed) {
              return false
            }

            if (/\d{4}-\d{2}-\d{2}/.test(idLower)) {
              return false
            }

            if (/-\d{4}$/.test(idLower)) {
              return false
            }

            if (/-\d+k$/i.test(idLower)) {
              return false
            }

            const excludedKeywords = [
              "pro",
              "realtime",
              "audio",
              "instruct",
              "search",
              "image",
              "nano",
              "codex",
              "transcribe",
              "diarize",
              "tts",
              "latest",
              "preview",
            ]

            const hasExcluded = excludedKeywords.some((kw) =>
              idLower.includes(kw),
            )

            if (hasExcluded) {
              return false
            }

            return true
          })

        if (filtered.length === 0) {
          throw new Error(
            "No compatible ChatGPT translation models found in your account.",
          )
        }

        filtered.sort().reverse()

        setOpenaiModels(filtered)
        localStorage.setItem("razzia_openai_models", JSON.stringify(filtered))

        if (!filtered.includes(selectedOpenaiModel)) {
          const defaultModel = filtered.includes("gpt-5.4-mini")
            ? "gpt-5.4-mini"
            : filtered[0]

          updateSelectedOpenaiModel(defaultModel)
        }
      } else {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        const response = await fetchWithRetry(url, {
          method: "GET",
        })

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as {
            error?: { message?: string }
          }

          throw new Error(
            errData.error?.message ?? `API error: ${response.statusText}`,
          )
        }

        const data = (await response.json()) as {
          models?: Array<{ name: string; displayName?: string }>
        }

        if (!data.models || !Array.isArray(data.models)) {
          throw new Error("Invalid response format from Gemini.")
        }

        const filtered = data.models
          .filter((m) => {
            const name = m.name.startsWith("models/") ? m.name.substring(7) : m.name
            const nameLower = name.toLowerCase()

            return (
              (nameLower.includes("flash") || nameLower.includes("pro")) &&
              (!nameLower.includes("preview") || nameLower === "gemini-3.1-pro-preview") &&
              !nameLower.includes("image") &&
              !nameLower.includes("2.0")
            )
          })
          .map((m) => ({
            name: m.name.startsWith("models/") ? m.name.substring(7) : m.name,
            displayName: m.displayName || (m.name.startsWith("models/") ? m.name.substring(7) : m.name),
          }))

        if (filtered.length === 0) {
          throw new Error(
            "No compatible Gemini Flash or Pro models found in your account.",
          )
        }

        filtered.sort((a, b) => b.name.localeCompare(a.name))

        setGeminiModels(filtered)
        localStorage.setItem("razzia_gemini_models", JSON.stringify(filtered))

        const modelNames = filtered.map((m) => m.name)
        if (!modelNames.includes(selectedGeminiModel)) {
          const defaultModel = modelNames.includes("gemini-flash-latest")
            ? "gemini-flash-latest"
            : modelNames[0]

          updateSelectedGeminiModel(defaultModel)
        }
      }

      if (provider === "chatgpt") {
        setOpenaiTestStatus("success")
        localStorage.setItem("razzia_openai_test_status", "success")
      } else {
        setGeminiTestStatus("success")
        localStorage.setItem("razzia_gemini_test_status", "success")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      if (provider === "chatgpt") {
        setOpenaiTestStatus("error")
        localStorage.setItem("razzia_openai_test_status", "error")
        setOpenaiTestError(msg)
        localStorage.setItem("razzia_openai_test_error", msg)
      } else {
        setGeminiTestStatus("error")
        localStorage.setItem("razzia_gemini_test_status", "error")
        setGeminiTestError(msg)
        localStorage.setItem("razzia_gemini_test_error", msg)
      }
    } finally {
      setIsTestingKey(false)
    }
  }

  const currentTestStatus =
    provider === "chatgpt" ? openaiTestStatus : geminiTestStatus
  const currentTestError =
    provider === "chatgpt" ? openaiTestError : geminiTestError

  // AI Translation API caller
  const translateSentences = async (
    sentences: string[],
    sourceLang: string,
    targetLang: string,
  ): Promise<string[]> => {
    const sourceLangText = sourceLang === "Auto-Detect" ? "its detected language" : sourceLang
    const apiKey = provider === "chatgpt" ? openAiKey : geminiKey

    if (!apiKey) {
      throw new Error(
        `API key for ${provider === "chatgpt" ? "ChatGPT" : "Gemini"} is missing.`,
      )
    }

    if (provider === "chatgpt") {
      const response = await fetchWithRetry(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: selectedOpenaiModel || "gpt-5.4-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are a professional translator. Translate the input list of sentences from ${sourceLangText} to ${targetLang}. Return a JSON object with a "translations" key containing the translated sentences array in the exact same order as the input list. Do not include any other keys in the JSON object.`,
              },
              {
                role: "user",
                content: `Translate these sentences:\n\n${JSON.stringify(sentences)}`,
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as ChatGPTResponse
        throw new Error(
          errorData.error?.message ??
            `ChatGPT API error: ${response.statusText}`,
        )
      }

      const data = (await response.json()) as ChatGPTResponse
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error("No response content from ChatGPT API.")
      }

      const parsed = JSON.parse(content) as { translations?: unknown } | null

      if (!parsed || !Array.isArray(parsed.translations)) {
        throw new Error("Invalid response format from ChatGPT API.")
      }

      return parsed.translations as string[]
    }

    // Gemini API call
    const model = selectedGeminiModel || "gemini-flash-latest"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a professional translator. Translate the following input list of sentences from ${sourceLangText} to ${targetLang}. Return a JSON object with a "translations" key containing the translated sentences array in the exact same order. Do not include any other text.\n\nInput sentences:\n${JSON.stringify(sentences)}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              translations: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: ["translations"],
          },
        },
      }),
    })

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as GeminiResponse
      throw new Error(
        errorData.error?.message ?? `Gemini API error: ${response.statusText}`,
      )
    }

    const data = (await response.json()) as GeminiResponse
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error("No response content from Gemini API.")
    }

    const parsed = JSON.parse(content) as { translations?: unknown } | null

    if (!parsed || !Array.isArray(parsed.translations)) {
      throw new Error("Invalid response format from Gemini API.")
    }

    return parsed.translations as string[]
  }

  const handleImport = async () => {
    const sentences = splitIntoSentences(text)

    if (sentences.length === 0) {
      return
    }

    let translations: string[] = []

    if (useAi) {
      try {
        setIsTranslating(true)
        setErrorMsg(null)
        translations = await translateSentences(sentences, sourceLanguage, targetLanguage)

        if (translations.length !== sentences.length) {
          throw new Error(
            "The translation API returned a different number of sentences than inputted.",
          )
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setErrorMsg(message)
        setIsTranslating(false)

        return
      }
    }

    const singleChunkIndices: number[] = []

    const newQuestions: QuestionWithId[] = sentences.map((sentence, idx) => {
      const correctSentence = sentence
      const prompt = useAi && translations[idx] ? translations[idx] : ""

      const generatedChunks = autoGenerateChunks(correctSentence)
      if (generatedChunks.length <= 1) {
        singleChunkIndices.push(idx + 1)
      }

      const correctChunks = deriveCorrectChunks(
        correctSentence,
        generatedChunks,
      )

      return {
        id: uuid(),
        prompt,
        scrambledChunks: generatedChunks,
        correctChunks,
        correctSentence,
        cooldown: 5,
        time: 30,
      }
    })

    if (newQuestions.length > 0) {
      onImport(newQuestions)
      setOpen(false)
      setText("")
      setIsTranslating(false)
      setErrorMsg(null)

      if (singleChunkIndices.length > 0) {
        toast(
          t("quizz:importSingleChunkWarning", {
            indices: singleChunkIndices.join(", "),
          }),
          {
            icon: "⚠️",
            duration: 7000,
          },
        )
      }
    }
  }

  const handleClose = () => {
    if (isTranslating) {
      return
    }

    setOpen(false)
    setText("")
    setErrorMsg(null)
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(val) => !isTranslating && setOpen(val)}
    >
      <AlertDialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95">
          <BookOpen className="size-4" />
          {t("quizz:storyImport")}
        </button>
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <AlertDialog.Title className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <BookOpen className="size-5 text-indigo-600" />
              {t("quizz:storyImportTitle")}
            </AlertDialog.Title>
            <AlertDialog.Cancel asChild>
              <button
                onClick={handleClose}
                disabled={isTranslating}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
              >
                <X className="size-5" />
              </button>
            </AlertDialog.Cancel>
          </div>

          <AlertDialog.Description className="mb-4 text-sm leading-relaxed text-gray-500">
            {t("quizz:storyImportDescription")}
          </AlertDialog.Description>

          {/* Text Area Input */}
          <div className="mb-4">
            <textarea
              className="w-full resize-none rounded-xl border border-gray-200 p-4 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              rows={6}
              disabled={isTranslating}
              placeholder={t("quizz:storyImportPlaceholder")}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* AI Settings Section */}
          <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  disabled={isTranslating}
                  checked={useAi}
                  onChange={(e) => updateUseAi(e.target.checked)}
                  className="size-4 cursor-pointer rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                />
                Translate story sentences with AI
              </label>
            </div>

            {useAi && (
              <div className="animate-fadeIn mt-4 space-y-4">
                {/* Provider Selector */}
                <div>
                  <span className="mb-2 block text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    AI Provider
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={() => updateProvider("gemini")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                        provider === "gemini"
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      } disabled:opacity-50`}
                    >
                      Google Gemini
                    </button>
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={() => updateProvider("chatgpt")}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                        provider === "chatgpt"
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      } disabled:opacity-50`}
                    >
                      OpenAI ChatGPT
                    </button>
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500 uppercase">
                    {provider === "chatgpt"
                      ? "OpenAI API Key"
                      : "Gemini API Key"}
                  </label>
                  <input
                    type="password"
                    disabled={isTranslating}
                    placeholder={
                      provider === "chatgpt" ? "sk-..." : "AIzaSy..."
                    }
                    value={provider === "chatgpt" ? openAiKey : geminiKey}
                    onChange={(e) =>
                      provider === "chatgpt"
                        ? updateOpenAiKey(e.target.value)
                        : updateGeminiKey(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <p className="mt-1 text-[11px] leading-normal text-gray-400">
                    Stored securely in your local browser storage.
                  </p>
                </div>

                {/* API Key verification & Model selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        isTranslating ||
                        isTestingKey ||
                        !(provider === "chatgpt" ? openAiKey : geminiKey)
                      }
                      onClick={testApiKeyAndFetchModels}
                      className="flex items-center gap-1.5 rounded-xl border border-indigo-600 px-3 py-1.5 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-50 disabled:opacity-40"
                    >
                      {isTestingKey ? (
                        <>
                          <span className="size-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                          Testing Key...
                        </>
                      ) : (
                        "Test Key & Get Models"
                      )}
                    </button>

                    <span className="text-[11px] font-medium text-gray-500">
                      {currentTestStatus === "success" && (
                        <span className="font-semibold text-green-600">
                          ✓ Verified!{" "}
                          {
                            (provider === "chatgpt"
                              ? openaiModels
                              : geminiModels
                            ).length
                          }{" "}
                          models found.
                        </span>
                      )}

                      {currentTestStatus === "error" && (
                        <span className="font-semibold text-red-600">
                          ✗ Verification failed.
                        </span>
                      )}

                      {currentTestStatus === "idle" && "Key not verified yet."}
                    </span>
                  </div>

                  {currentTestError && (
                    <p className="text-[11px] leading-tight font-semibold text-red-500">
                      {currentTestError}
                    </p>
                  )}

                  {(provider === "chatgpt" ? openaiModels : geminiModels)
                    .length > 0 && (
                    <div className="animate-fadeIn">
                      <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500 uppercase">
                        Model Version
                      </label>
                      <select
                        disabled={isTranslating || isTestingKey}
                        value={
                          provider === "chatgpt"
                            ? selectedOpenaiModel
                            : selectedGeminiModel
                        }
                        onChange={(e) => {
                          if (provider === "chatgpt") {
                            updateSelectedOpenaiModel(e.target.value)
                          } else {
                            updateSelectedGeminiModel(e.target.value)
                          }
                        }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {provider === "chatgpt"
                          ? openaiModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))
                          : geminiModels.map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.displayName}
                              </option>
                            ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Source & Target Language Selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Source Language
                    </label>
                    <select
                      disabled={isTranslating}
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="Auto-Detect">Auto-Detect</option>
                      <option value="English">English</option>
                      <option value="Korean">Korean</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Italian">Italian</option>
                      <option value="German">German</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Target Language
                    </label>
                    <select
                      disabled={isTranslating}
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="English">English</option>
                      <option value="Korean">Korean</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Italian">Italian</option>
                      <option value="German">German</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                onClick={handleClose}
                disabled={isTranslating}
                className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-300 disabled:opacity-40"
              >
                {t("common:cancel")}
              </button>
            </AlertDialog.Cancel>
            <button
              onClick={handleImport}
              disabled={
                !text.trim() ||
                isTranslating ||
                (useAi && !(provider === "chatgpt" ? openAiKey : geminiKey))
              }
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              {isTranslating ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Translating...
                </>
              ) : (
                t("quizz:importStoryButton")
              )}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

export default StoryImportModal
