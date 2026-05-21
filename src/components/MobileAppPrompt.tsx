import { useEffect, useMemo, useState } from 'react'

const IOS_APP_STORE_URL = 'https://apps.apple.com/us/app/YOUR_APP_ID'
const ANDROID_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME'
const APP_DEEP_LINK = 'thevault://open'

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export default function MobileAppPrompt() {
  const [isVisible, setIsVisible] = useState(false)

  const storeUrl = useMemo(() => {
    return isIosDevice() ? IOS_APP_STORE_URL : ANDROID_PLAY_STORE_URL
  }, [])

  useEffect(() => {
    if (!isMobileDevice()) {
      return
    }

    const hasDismissedPrompt = sessionStorage.getItem('vault_mobile_prompt_dismissed')

    if (!hasDismissedPrompt) {
      setIsVisible(true)
    }
  }, [])

  const handleContinueInBrowser = () => {
    sessionStorage.setItem('vault_mobile_prompt_dismissed', 'true')
    setIsVisible(false)
  }

  const handleOpenApp = () => {
    window.location.href = APP_DEEP_LINK

    setTimeout(() => {
      window.location.href = storeUrl
    }, 1500)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#C9A84C]/40 bg-[#080808] p-8 text-white shadow-2xl">
        <div className="mb-5 inline-flex rounded-full border border-[#C9A84C]/50 px-4 py-1 text-xs uppercase tracking-[3px] text-[#C9A84C]">
          Mobile Experience
        </div>

        <h2 className="mb-3 text-3xl font-semibold text-white">
          Open The Vault App
        </h2>

        <p className="mb-8 text-sm leading-6 text-zinc-300">
          Get the fastest experience, push notifications, wallet integrations, and mobile checkout directly inside the app.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleOpenApp}
            className="rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Open App
          </button>

          <button
            type="button"
            onClick={handleContinueInBrowser}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            Continue in Browser
          </button>
        </div>
      </div>
    </div>
  )
}
