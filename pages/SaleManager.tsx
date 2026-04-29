/**
 * SaleManager Page
 * Manages the full sale lifecycle:
 * - Create sale from social lead
 * - Buyer payment via Stripe
 * - Shipping with tracking
 * - Mark delivered
 * - Complete sale & receive payout
 */

import { Link, useParams } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  ArrowLeft, Loader2, CheckCircle2, Truck, Package,
  DollarSign, Shield, ChevronRight,
  Box, CheckCheck
} from 'lucide-react'

export default function SaleManager() {
  const { id } = useParams()
  const saleId = Number(id)
  const { isAuthenticated } = useAuth()

  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState<'fedex' | 'ups' | 'usps' | 'dhl'>('usps')

  const { data: saleData } = trpc.sale.getSale.useQuery(
    { id: saleId },
    { enabled: !!saleId && !isNaN(saleId) }
  )

  const { data: mySales } = trpc.sale.mySales.useQuery(undefined, {
    enabled: isAuthenticated,
  })

  const utils = trpc.useUtils()

  const markShipped = trpc.sale.markShipped.useMutation({
    onSuccess: () => {
      utils.sale.getSale.invalidate({ id: saleId })
      utils.sale.mySales.invalidate()
    },
  })

  const markDelivered = trpc.sale.markDelivered.useMutation({
    onSuccess: () => {
      utils.sale.getSale.invalidate({ id: saleId })
      utils.sale.mySales.invalidate()
    },
  })

  const completeSale = trpc.sale.completeSale.useMutation({
    onSuccess: () => {
      utils.sale.getSale.invalidate({ id: saleId })
      utils.sale.mySales.invalidate()
    },
  })

  // const handleCreateSale = (listingId: number) => {
  //   const price = parseFloat(salePrice)
  //   if (!buyerEmail || !buyerName || !price || price <= 0) return
  //   createSale.mutate({
  //     listingId,
  //     buyerEmail,
  //     buyerName,
  //     salePrice: price,
  //   })
  // }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center p-8 border border-[#C9A84C]/20">
          <Shield className="w-8 h-8 text-[#C9A84C] mx-auto mb-4" />
          <p className="text-sm text-[#F5EED8] mb-3">Sign in to manage sales</p>
          <Link to="/login" className="text-[#C9A84C] text-xs hover:underline">Sign In</Link>
        </div>
      </div>
    )
  }

  // Show specific sale
  if (saleId && !isNaN(saleId) && saleData) {
    const sale = saleData.sale
    const listing = saleData.listing

    const steps = [
      { label: 'Sale Created', done: true, icon: CheckCircle2 },
      { label: 'Payment Received', done: sale.status !== 'pending', icon: DollarSign },
      { label: 'Shipped', done: sale.status === 'shipped' || sale.status === 'delivered' || sale.status === 'completed', icon: Truck },
      { label: 'Delivered', done: sale.status === 'delivered' || sale.status === 'completed', icon: Package },
      { label: 'Completed', done: sale.status === 'completed', icon: CheckCheck },
    ]

    return (
      <div className="min-h-screen bg-[#080808] pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/sale" className="flex items-center gap-2 text-[#8A6E2F] hover:text-[#C9A84C] text-xs mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Sales
          </Link>

          <h1 className="font-cinzel text-xl tracking-[6px] text-[#F5EED8] uppercase mb-2">
            Sale #{sale.id}
          </h1>
          <p className="text-[10px] text-[#8A6E2F] mb-8">
            {listing?.title || 'Item Sold'}
          </p>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-10 overflow-x-auto">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-2 ${step.done ? 'bg-[#C9A84C]/15 border border-[#C9A84C]/30' : 'bg-[#161616] border border-[#C9A84C]/10'}`}>
                  <step.icon className={`w-3.5 h-3.5 ${step.done ? 'text-[#C9A84C]' : 'text-[#8A6E2F]'}`} />
                  <span className={`text-[9px] tracking-[2px] uppercase ${step.done ? 'text-[#C9A84C]' : 'text-[#8A6E2F]'}`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-[#8A6E2F] flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Sale Details */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-5 border border-[#C9A84C]/15 bg-[#161616]">
              <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase mb-1">Sale Price</p>
              <p className="text-xl font-cinzel text-[#C9A84C]">${Number(sale.salePrice).toLocaleString()}</p>
            </div>
            <div className="p-5 border border-[#C9A84C]/15 bg-[#161616]">
              <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase mb-1">Your Payout</p>
              <p className="text-xl font-cinzel text-emerald-400">${Number(sale.sellerPayout).toLocaleString()}</p>
            </div>
            <div className="p-5 border border-[#C9A84C]/15 bg-[#161616]">
              <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase mb-1">Commission ({sale.commissionRate}%)</p>
              <p className="text-lg font-cinzel text-[#C8BC98]">${Number(sale.commissionAmount).toLocaleString()}</p>
            </div>
            <div className="p-5 border border-[#C9A84C]/15 bg-[#161616]">
              <p className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase mb-1">Buyer</p>
              <p className="text-sm text-[#F5EED8]">{sale.buyerName}</p>
              <p className="text-[10px] text-[#8A6E2F]">{sale.buyerEmail}</p>
            </div>
          </div>

          {/* Shipping Info */}
          {sale.shippingCarrier && (
            <div className="p-5 border border-[#C9A84C]/15 bg-[#161616] mb-6">
              <p className="text-[9px] text-[#C9A84C] tracking-[2px] uppercase mb-2">Shipping Details</p>
              <p className="text-sm text-[#F5EED8]">
                {sale.shippingCarrier.toUpperCase()} — {sale.shippingTrackingNumber}
              </p>
              {sale.shippedAt && (
                <p className="text-[10px] text-[#8A6E2F] mt-1">
                  Shipped on {new Date(sale.shippedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {sale.status === 'pending' && (
              <div className="p-5 border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-center">
                <p className="text-sm text-[#F5EED8] mb-2">Waiting for buyer payment</p>
                <p className="text-[10px] text-[#8A6E2F] mb-4">
                  Share this sale link with {sale.buyerName} to collect payment.
                </p>
              </div>
            )}

            {sale.status === 'payment_received' && (
              <div className="p-5 border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-sm text-emerald-400 mb-3">Payment received! Ready to ship.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase block mb-1">Carrier</label>
                    <select
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value as any)}
                      className="w-full bg-[#080808] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] focus:border-[#C9A84C] outline-none"
                    >
                      <option value="usps">USPS</option>
                      <option value="ups">UPS</option>
                      <option value="fedex">FedEx</option>
                      <option value="dhl">DHL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase block mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full bg-[#080808] border border-[#C9A84C]/20 px-3 py-2 text-xs text-[#F5EED8] focus:border-[#C9A84C] outline-none"
                      placeholder="1Z999..."
                    />
                  </div>
                </div>
                <button
                  onClick={() => markShipped.mutate({ saleId: sale.id, carrier, trackingNumber })}
                  disabled={markShipped.isPending || !trackingNumber}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold disabled:opacity-50"
                >
                  {markShipped.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Truck className="w-4 h-4" /> Mark as Shipped</>}
                </button>
              </div>
            )}

            {sale.status === 'shipped' && (
              <div className="p-5 border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-center">
                <p className="text-sm text-[#F5EED8] mb-3">Item has been shipped.</p>
                <button
                  onClick={() => markDelivered.mutate({ saleId: sale.id })}
                  disabled={markDelivered.isPending}
                  className="px-6 py-2 bg-emerald-500/10 text-emerald-400 font-cinzel text-[10px] tracking-[3px] uppercase hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {markDelivered.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><CheckCheck className="w-4 h-4 inline mr-1" /> Mark as Delivered</>}
                </button>
              </div>
            )}

            {sale.status === 'delivered' && (
              <div className="p-5 border border-emerald-500/20 bg-emerald-500/5 text-center">
                <p className="text-sm text-emerald-400 mb-3">Item delivered! Complete the sale to receive payout.</p>
                <button
                  onClick={() => completeSale.mutate({ saleId: sale.id })}
                  disabled={completeSale.isPending}
                  className="px-8 py-3 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 text-emerald-400 font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50"
                >
                  {completeSale.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><DollarSign className="w-4 h-4 inline mr-1" /> Complete Sale & Release Payout</>}
                </button>
              </div>
            )}

            {sale.status === 'completed' && (
              <div className="p-5 border border-emerald-500/30 bg-emerald-500/10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-emerald-400 font-semibold">Sale Complete!</p>
                <p className="text-[10px] text-[#8A6E2F] mt-2">
                  Payout of ${Number(sale.sellerPayout).toFixed(2)} will be processed to your account.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Show my sales list
  return (
    <div className="min-h-screen bg-[#080808] pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="font-cinzel text-xl tracking-[6px] text-[#F5EED8] uppercase mb-2">
          My Sales
        </h1>
        <p className="text-[10px] text-[#8A6E2F] mb-8">
          Manage your sales from lead to payout
        </p>

        {/* Sales List */}
        <div className="space-y-3">
          {mySales?.map((sale: any) => (
            <Link
              key={sale.id}
              to={`/sale/${sale.id}`}
              className="flex items-center justify-between p-4 border border-[#C9A84C]/15 bg-[#161616] hover:border-[#C9A84C]/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#C9A84C]/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#C9A84C]" />
                </div>
                <div>
                  <p className="text-sm text-[#F5EED8] font-semibold">Sale #{sale.id}</p>
                  <p className="text-[10px] text-[#8A6E2F]">
                    {sale.buyerName} — ${Number(sale.salePrice).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={sale.status} />
                <ChevronRight className="w-4 h-4 text-[#8A6E2F]" />
              </div>
            </Link>
          ))}
        </div>

        {(!mySales || mySales.length === 0) && (
          <div className="text-center py-16 border border-[#C9A84C]/20">
            <Box className="w-10 h-10 text-[#C9A84C] mx-auto mb-4" />
            <p className="text-sm text-[#F5EED8] mb-2">No sales yet</p>
            <p className="text-[10px] text-[#8A6E2F] max-w-sm mx-auto">
              When a buyer is interested in your item, create a sale here to track payment, shipping, and payout.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { text: string; class: string }> = {
    pending: { text: 'Pending', class: 'bg-[#C9A84C]/10 text-[#C9A84C]' },
    payment_received: { text: 'Paid', class: 'bg-emerald-500/10 text-emerald-400' },
    shipped: { text: 'Shipped', class: 'bg-blue-500/10 text-blue-400' },
    delivered: { text: 'Delivered', class: 'bg-purple-500/10 text-purple-400' },
    completed: { text: 'Complete', class: 'bg-emerald-500/20 text-emerald-400' },
  }
  const style = map[status] || map.pending
  return (
    <span className={`px-2 py-1 text-[9px] tracking-[2px] uppercase ${style.class}`}>
      {style.text}
    </span>
  )
}
