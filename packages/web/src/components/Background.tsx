import logo from "@razzia/web/assets/logo.svg"
import GithubIcon from "@razzia/web/components/GithubIcon"
import { Link } from "@tanstack/react-router"
import type { PropsWithChildren } from "react"

interface BackgroundProps extends PropsWithChildren {
  showFooter?: boolean
}

const Background = ({ children, showFooter = false }: BackgroundProps) => (
  <section className="relative flex min-h-dvh flex-col items-center justify-center">
    <div className="pointer-events-none absolute h-full max-h-svh w-full overflow-hidden">
      <div className="bg-primary/15 absolute top-[-70vmin] left-[-50vmin] min-h-[120vmin] min-w-[120vmin] rotate-20 rounded-4xl" />
      <div className="bg-primary/15 absolute right-[-10vmin] bottom-[-45vmin] min-h-[75vmin] min-w-[75vmin] rotate-20 rounded-4xl" />
    </div>

    <Link to="/manager" className="relative z-10 cursor-pointer">
      <img src={logo} className="mb-10 h-20" alt="logo" />
    </Link>
    {children}

    {showFooter && (
      <a
        href="https://github.com/All-English/Razzmatazz"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-sm font-semibold text-white/50 transition-colors hover:text-white/80"
      >
        <GithubIcon size={14} />
        {/* oxlint-disable-next-line no-undef */}
        Razzmatazz - v{__APP_VERSION__}
      </a>
    )}
  </section>
)

export default Background
