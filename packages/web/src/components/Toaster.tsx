import { X } from "lucide-react"
import toast, { ToastBar, Toaster as ToasterRaw } from "react-hot-toast"

const Toaster = () => (
  <ToasterRaw>
    {(t) => (
      <ToastBar
        toast={t}
        style={{
          ...t.style,
          fontWeight: 700,
        }}
      >
        {({ icon, message }) => (
          <>
            {icon}
            {message}
            {t.type !== "loading" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toast.dismiss(t.id)
                }}
                className="ml-2 flex items-center justify-center rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                aria-label="Dismiss toast"
              >
                <X className="size-3.5" />
              </button>
            )}
          </>
        )}
      </ToastBar>
    )}
  </ToasterRaw>
)

export default Toaster
