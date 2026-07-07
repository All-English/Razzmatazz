import * as Select from "@radix-ui/react-select"
import { Check, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
]

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation()
  const normalizedLanguage = i18n.language.slice(0, 2)

  return (
    <Select.Root
      value={normalizedLanguage}
      onValueChange={(lang) => i18n.changeLanguage(lang)}
    >
      <Select.Trigger className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm font-semibold text-gray-600 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-700 focus:outline-none">
        <Globe className="size-4 text-gray-500 dark:text-zinc-400" />
        <Select.Value />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          className="z-50 min-w-32 overflow-hidden rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md"
        >
          <Select.Viewport className="p-1">
            {LANGUAGES.map((l) => (
              <Select.Item
                key={l.code}
                value={l.code}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-1.5 text-sm text-gray-700 dark:text-zinc-300 outline-none hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 data-[state=checked]:font-semibold"
              >
                <Select.ItemText>{l.label} — {t(`common:language.${l.code}`)}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check className="size-3.5 text-gray-500" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export default LanguageSwitcher
