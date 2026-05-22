import { useParams, Link } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  Diamond, ArrowLeft, Loader2, AlertCircle,
  Bitcoin, ShieldCheck, Wallet
} from 'lucide-react'
import { FooterDisclaimer } from '@/components/LiabilityDisclaimer'

export default function WalletPay() {
  const { id } = useParams<{ id: string }>()
  const listingId = parseInt(id || '0')
  const [walletAddress, setWalletAddress] = useState('')
  const [paymentCreated, setPaymentCreated] = useState(false)

  const { data: listing, isLoading } = trpc.listings.getById.useQuery({ id: listingId })
  const { data: rate } = trpc.crypto.getRate.useQuery()

  const createPayment = trpc.crypto.createPayment.useMutation({
    onSuccess: () => setPaymentCreated(true)
  })

  const submitTx = trpc.crypto.submitTx.useMutation()

  const [txHash, setTxHash] = useState('')

  const handleCreatePayment = () => {
    if (walletAddress.length < 32) return

    createPayment.mutate({
      listingId,
      buyerAddress: walletAddress,
      currency: 'SOL'
    })
  }

  const handleSubmitTx = () => {
    if (!txHash || txHash.length < 43) return

    submitTx.mutate({
      paymentId: createPayment.data?.paymentId || 0,
      txHash
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

        <h2 className="font-cinzel text-lg text-[#C8BC98] tracking-[3px] uppercase mb-2">
          Listing Not Found
        </h2>

        <Link
          to="/browse"
          className="text-[#C9A84C] text-xs tracking-[2px] uppercase hover:underline"
        >
          Back to Browse
        </Link>
      </div>
    )
  }

  // ===== SAFE NULL-CHECK FIX =====
  const solPrice =
  rate?.solUsd != null
    ? (Number(listing.price) / rate.solUsd).toFixed(6)
    : '...'
  // ===============================

  const paymentData = createPayment.data

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        <Link
          to={`/crypto-checkout/${listingId}`}
          className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        <div className="text-center mb-10">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">
            Direct Wallet Transfer
          </p>

          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px]">
            Pay with Solana
          </h1>

          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />

            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />

            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>

          <p className="font-cormorant italic text-sm text-[#C8BC98] mt-4">
            Send SOL directly from your Phantom, Soul, or Robinhood wallet.
            Wallet-to-wallet only.
          </p>
        </div>

        {/* KEEP REST OF FILE EXACTLY AS YOU ALREADY HAVE IT */}

      </div>
    </div>
  )
}
