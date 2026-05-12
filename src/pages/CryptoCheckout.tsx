import { useParams, Link } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  Diamond, ArrowLeft, Loader2, AlertCircle,
  ExternalLink, ShieldCheck, Wallet, Bitcoin, CreditCard
} from 'lucide-react'
import { FooterDisclaimer } from '@/components/LiabilityDisclaimer'

export default function CryptoCheckout() {
  const { id } = useParams<{ id: string }>()
  const listingId = parseInt(id || '0')
  const [isProcessing, setIsProcessing] = useState(false)

  const { data: listing, isLoading } = trpc.listings.getById.useQuery({ id: listingId })

  const createCoinbaseCharge = trpc.coinbase.createCharge.useMutation({
    onSuccess: (data) => {
      if (data.hostedUrl) {
        window.location.href = data.hostedUrl
      }
      setIsProcessing(false)
    },
    onError: () => {
      setIsProcessing(false)
    },
  })

  const handleCoinbaseCheckout = () => {
    setIsProcessing(true)
    const origin = window.location.origin
    createCoinbaseCharge.mutate({
      listingId,
      successUrl: `${origin}/browse?coinbase_success=true`,
      cancelUrl: `${origin}/listing/${listingId}?coinbase_cancelled=true`,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="font-cinzel text-lg text-[#C8BC98] tracking-[3px] uppercase mb-2">Listing Not Found</h2>
        <Link to="/browse" className="text-[#C9A84C] text-xs tracking-[2px] uppercase hover:underline">Back to Browse</Link>
      </div>
    )
  }

  const commission = Number(listing.price) * (Number(listing.commissionRate) / 100)
  const total = Number(listing.price)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Link to={`/listing/${listingId}`} className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Item
        </Link>

        <div className="text-center mb-10">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">Cryptocurrency Payment</p>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px]">Pay with Crypto</h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/25 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {/* Zero Funds Banner */}
          <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] tracking-[2px] text-emerald-400 uppercase font-cinzel font-semibold">Zero Funds Held Policy</span>
            </div>
            <p className="text-[10px] text-[#C8BC98]">
              The Vault never holds your funds. Crypto payments are processed through Coinbase Commerce and go directly to the seller. We act solely as a marketplace platform.
            </p>
          </div>

          {/* Item Summary */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Order Summary</h3>
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-[#1E1E1E] border border-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
                <Diamond className="w-8 h-8 text-[#C9A84C]/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-cinzel text-xs font-semibold text-[#F5EED8] tracking-[1px] mb-1 truncate">{listing.title}</p>
                <p className="text-[10px] text-[#8A6E2F] mb-1">{listing.category?.name}</p>
                <p className="font-cinzel text-base font-bold text-[#C9A84C]">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Price Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#C8BC98]">Item Price</span>
                <span className="text-[#F5EED8] font-cinzel">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#C8BC98]">Vault Commission ({listing.commissionRate}%)</span>
                <span className="text-[#C9A84C] font-cinzel">${commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#C8BC98]">Crypto Processing</span>
                <span className="text-[#F5EED8] font-cinzel">$0.00</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-[#C9A84C]/15">
                <span className="text-[#F5EED8] font-medium">Total</span>
                <span className="font-cinzel text-xl font-bold text-[#FFD97A]">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Coinbase Commerce Checkout */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <div className="flex items-center gap-3 mb-5">
              <Bitcoin className="w-5 h-5 text-[#C9A84C]" />
              <div>
                <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] font-cinzel font-semibold">Coinbase Commerce</h3>
                <p className="text-[10px] text-[#8A6E2F]">Accepts BTC, ETH, SOL, USDC, DOGE, LTC + more</p>
              </div>
            </div>

            <p className="text-[11px] text-[#C8BC98] leading-relaxed mb-5 font-light">
              You will be redirected to Coinbase Commerce, a secure hosted checkout that accepts
              all major cryptocurrencies. Pay with any wallet you prefer. The seller receives
              USD-equivalent payment directly. The Vault never touches your funds.
            </p>

            <button
              onClick={handleCoinbaseCheckout}
              disabled={isProcessing || listing.status === 'sold'}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Secure Checkout...
                </>
              ) : listing.status === 'sold' ? (
                'Sold'
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Pay ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} with Crypto
                </>
              )}
            </button>

            {/* Supported cryptos */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {['Bitcoin', 'Ethereum', 'Solana', 'USDC', 'Litecoin', 'Dogecoin'].map((coin) => (
                <span key={coin} className="px-2 py-1 bg-[#1E1E1E] border border-[#C9A84C]/10 text-[9px] text-[#8A6E2F] tracking-[1px]">{coin}</span>
              ))}
            </div>
          </div>

          {/* Alternative: Direct Wallet Transfer */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/10">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-[#8A6E2F]" />
              <h3 className="text-[9px] tracking-[3px] uppercase text-[#8A6E2F] font-cinzel font-semibold">Alternative: Direct Wallet Transfer</h3>
            </div>
            <p className="text-[10px] text-[#8A6E2F] leading-relaxed mb-3">
              Prefer to pay directly from your Phantom, Soul, or Robinhood wallet? Use our
              direct Solana transfer option instead.
            </p>
            <Link
              to={`/wallet-pay/${listingId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] tracking-[2px] uppercase font-cinzel font-semibold hover:border-[#C9A84C] hover:bg-[#C9A84C]/8 transition-all"
            >
              <Wallet className="w-3.5 h-3.5" /> Pay with Solana Wallet
            </Link>
          </div>

          {/* Card payment option */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-[#8A6E2F]" />
              <h3 className="text-[9px] tracking-[3px] uppercase text-[#8A6E2F] font-cinzel font-semibold">Prefer Card?</h3>
            </div>
            <Link
              to={`/checkout/${listingId}`}
              className="inline-flex items-center gap-2 text-[10px] tracking-[2px] uppercase text-[#C9A84C] font-cinzel font-semibold hover:text-[#E8CB7A] transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" /> Pay with Card via Stripe
            </Link>
          </div>
        </div>

        <FooterDisclaimer />
      </div>
    </div>
  )
}
