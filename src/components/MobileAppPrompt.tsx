import { useEffect, useState, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export default function MobileAppPrompt() {
  const [isVisible, setIsVisible] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Already installed as PWA — don't show prompt
    if (isStandalone()) {
      setIsInstalled(true)
      return
    }

    if (!isMobileDevice()) return

    const hasDismissed = sessionStorage.getItem('vault_pwa_dismissed')
    const hasPermanentlyDismissed = localStorage.getItem('vault_pwa_dismissed_perm')
    if (hasDismissed || hasPermanentlyDismissed) {
      setDismissed(true)
      return
    }

    // Listen for the PWA install prompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setInstallPrompt(e)
      // Show the prompt after a short delay
      setTimeout(() => setIsVisible(true), 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall as EventListener)

    // For iOS, show a prompt explaining how to add to home screen
    if (isIOS()) {
      // Check if already installed
      const timer = setTimeout(() => {
        if (!isStandalone()) {
          setIsVisible(true)
        }
      }, 3000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall as EventListener)
      }
    }

    // For Android without install prompt support, show after a delay
    const timer = setTimeout(() => {
      if (!isStandalone() && !installPrompt) {
        // Only show generic prompt if we haven't gotten the install event
        // (some browsers auto-trigger it, some don't)
      }
    }, 5000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall as EventListener)
    }
  }, [installPrompt])

  const handleInstall = useCallback(async () => {
    if (installPrompt) {
      installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsVisible(false)
      }
    } else if (isIOS()) {
      // On iOS, guide the user to use Share > Add to Home Screen
      // The prompt already shows these instructions
      handleDismiss(true)
    }
  }, [installPrompt])

  const handleDismiss = useCallback((permanent = false) => {
    setIsVisible(false)
    setDismissed(true)
    sessionStorage.setItem('vault_pwa_dismissed', 'true')
    if (permanent) {
      localStorage.setItem('vault_pwa_dismissed_perm', 'true')
    }
  }, [])

  // Don't show anything if installed, dismissed, or not mobile
  if (!isVisible || isInstalled || dismissed) return null

  // iOS gets a special prompt since it doesn't support the install API
  if (isIOS() && !installPrompt) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-[#C9A84C]/40 bg-[#080808] p-8 text-white shadow-2xl">
          <div className="mb-5 inline-flex rounded-full border border-[#C9A84C]/50 px-4 py-1 text-xs uppercase tracking-[3px] text-[#C9A84C]">
            Install App
          </div>

          <h2 className="mb-3 text-3xl font-semibold text-white">
            Install The Vault
          </h2>

          <p className="mb-6 text-sm leading-6 text-zinc-300">
            Get the fastest experience with push notifications, wallet integrations, and mobile checkout.
          </p>

          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-medium text-[#C9A84C] mb-2 tracking-wider uppercase">How to install on iPhone:</p>
            <ol className="text-xs text-zinc-300 space-y-2">
              <li>1. Tap the <strong className="text-white">Share</strong> button <span className="inline-block text-sm">⎙</span> in Safari</li>
              <li>2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong></li>
              <li>3. Tap <strong className="text-white">Add</strong> in the top-right corner</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleDismiss(true)}
              className="rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Got it — I'll install later
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(false)}
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-200 transition hover:border-zinc-500"
            >
              Continue in Browser
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Android / Desktop with install prompt support
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#C9A84C]/40 bg-[#080808] p-8 text-white shadow-2xl">
        <div className="mb-5 inline-flex rounded-full border border-[#C9A84C]/50 px-4 py-1 text-xs uppercase tracking-[3px] text-[#C9A84C]">
          Mobile App
        </div>

        <h2 className="mb-3 text-3xl font-semibold text-white">
          Install The Vault App
        </h2>

        <p className="mb-8 text-sm leading-6 text-zinc-300">
          Get push notifications, faster checkout, wallet integrations, and the best mobile experience.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleInstall}
            className="rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Install App
          </button>

          <button
            type="button"
            onClick={() => handleDismiss(false)}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            Continue in Browser
          </button>
        </div>
      </div>
    </div>
  )
}