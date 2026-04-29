import { useParams, Link } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  Diamond, ArrowLeft, ShieldCheck, CreditCard, Lock,
  Loader2, AlertCircle, Check, ExternalLink
} from 'lucide-react'

export default function Checkout() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  const listingId = parseInt(id || '0')
  const { data: listing, isLoading } = trpc.listings.getById.useQuery({ id: listingId })
  const { data: branding } = trpc.stripe.getBranding.useQuery()

  // Auto-redirect to Stripe checkout
  const createSession = trpc.stripe.createSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: () => {
      setIsProcessing(false)
    },
  })

  const handleCheckout = () => {
    setIsProcessing(true)
    const origin = window.location.origin
    createSession.mutate({
      listingId,
      successUrl: `${origin}/browse?success=true`,
      cancelUrl: `${origin}/listing/${listingId}?cancelled=true`,
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
        <Link to="/browse" className="text-[#C9A84C] text-xs tracking-[2px] uppercase hover:underline">
          Back to Browse
        </Link>
      </div>
    )
  }

  const commission = Number(listing.price) * (Number(listing.commissionRate) / 100)
  const total = Number(listing.price)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Link
          to={`/listing/${listingId}`}
          className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Item
        </Link>

        <div className="text-center mb-10">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">Secure Checkout</p>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px]">
            Complete Your Purchase
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        {/* Stripe Checkout Preview */}
        {branding && (
          <div className="mb-6 p-4 border border-[#C9A84C]/20 bg-[#161616] relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.buttonColor }} />
              <span className="text-[9px] tracking-[3px] uppercase text-[#C9A84C] font-cinzel font-semibold">
                Stripe Checkout &middot; The Vault Branded
              </span>
            </div>
            <div className="flex gap-3">
              {/* Mini preview of what Stripe will look like */}
              <div
                className="flex-1 h-16 rounded-lg flex items-center justify-center border"
                style={{
                  backgroundColor: branding.backgroundColor,
                  borderColor: branding.buttonColor + '40',
                }}
              >
                <span className="text-[10px] tracking-[2px] uppercase" style={{ color: branding.buttonColor }}>
                  {branding.displayName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A6E2F]">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Secure</span>
                <Check className="w-3 h-3 text-emerald-400 ml-1" />
                <span>PCI Compliant</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#161616] border border-[#C9A84C]/25 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {/* Item Summary */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">
              Order Summary
            </h3>
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-[#1E1E1E] border border-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
                <Diamond className="w-8 h-8 text-[#C9A84C]/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-cinzel text-xs font-semibold text-[#F5EED8] tracking-[1px] mb-1 truncate">
                  {listing.title}
                </p>
                <p className="text-[10px] text-[#8A6E2F] mb-1">{listing.category?.name}</p>
                <p className="font-cinzel text-base font-bold text-[#C9A84C]">
                  ${Number(listing.price).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">
              Price Breakdown
            </h3>
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
                <span className="text-[#C8BC98]">Processing Fee</span>
                <span className="text-[#F5EED8] font-cinzel">$0.00</span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-[#C9A84C]/15">
                <span className="text-[#F5EED8] font-medium">Total</span>
                <span className="font-cinzel text-xl font-bold text-[#FFD97A]">
                  ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-cinzel tracking-[2px] uppercase">Secure Payment</span>
            </div>
            <p className="text-[11px] text-[#C8BC98] leading-relaxed mb-4 font-light">
              Your payment is processed securely through Stripe's hosted checkout.
              We never store your card details. All transactions are encrypted with
              industry-standard TLS 1.3.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-[#C9A84C]" />
                <span className="text-[10px] text-[#C8BC98] tracking-[1px]">
                  Buyer Protection: Full refund if item is not as described
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ExternalLink className="w-3.5 h-3.5 text-[#8A6E2F]" />
                <span className="text-[10px] text-[#8A6E2F] tracking-[1px]">
                  You will be redirected to Stripe's secure, Vault-branded checkout
                </span>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="p-6 sm:p-8">
            {!isAuthenticated ? (
              <div className="text-center">
                <p className="text-sm text-[#C8BC98] mb-4">Please sign in to complete your purchase</p>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all"
                >
                  Sign In to Continue
                </Link>
              </div>
            ) : (
              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} with Stripe
                  </>
                )}
              </button>
            )}
            <p className="text-center text-[10px] text-[#8A6E2F] mt-3">
              Secured by Stripe. The Vault branded checkout experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
