import { EVENTS } from "@razzia/common/constants"
import Button from "@razzia/web/components/Button"
import Card from "@razzia/web/components/Card"
import Input from "@razzia/web/components/Input"
import { useEvent } from "@razzia/web/features/game/contexts/socket-context"
import { Link } from "@tanstack/react-router"
import { type KeyboardEvent, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

interface Props {
  onSubmit: (_password: string) => void
}

const ManagerPassword = ({ onSubmit }: Props) => {
  const [password, setPassword] = useState("")
  const { t } = useTranslation()

  const handleSubmit = () => {
    onSubmit(password)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSubmit()
    }
  }

  useEvent(EVENTS.MANAGER.ERROR_MESSAGE, (message) => {
    toast.error(t(message))
  })

  return (
    <div className="flex w-full max-w-80 flex-col items-center">
      <Card>
        <Input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("manager:passwordPlaceholder")}
        />
        <Button className="mt-4" onClick={handleSubmit}>
          {t("common:submit")}
        </Button>
      </Card>

      <Link
        to="/"
        className="mt-6 text-sm font-bold text-white/50 transition-colors hover:text-white/80 underline underline-offset-4"
      >
        {t("manager:enterGamePin", "Enter Game PIN Code")}
      </Link>
    </div>
  )
}

export default ManagerPassword
