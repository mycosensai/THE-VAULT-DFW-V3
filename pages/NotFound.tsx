import { Link } from 'react-router'
import { Diamond, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 border border-[#C9A84C]/20 rotate-45 flex items-center justify-center mx-auto mb-8">
          <Diamond className="w-8 h-8 text-[#C9A84C]/30 -rotate-45" />
        </div>
        <h1 className="font-cinzel text-6xl font-black text-[#C9A84C] tracking-[8px] mb-4">404</h1>
        <p className="font-cinzel text-sm tracking-[4px] text-[#C8BC98] uppercase mb-6">Page Not Found</p>
        <p className="font-cormorant italic text-base text-[#8A6E2F] mb-8">
          The treasure you seek is not in this vault.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to The Vault
        </Link>
      </div>
    </div>
  )
}
