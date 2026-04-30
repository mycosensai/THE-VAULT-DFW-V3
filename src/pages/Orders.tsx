import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import {
  Diamond, ArrowLeft, Loader2, Package, Clock, CheckCircle,
  XCircle, Truck, AlertCircle
} from 'lucide-react'

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: 'text-emerald-400', label: 'Confirmed' },
  shipped: { icon: Truck, color: 'text-blue-400', label: 'Shipped' },
  delivered: { icon: CheckCircle, color: 'text-emerald-400', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'text-red-400', label: 'Cancelled' },
  refunded: { icon: AlertCircle, color: 'text-orange-400', label: 'Refunded' },
}

export default function Orders() {
  const { isAuthenticated } = useAuth()
  const { data: orderList, isLoading } = trpc.orders.list.useQuery(undefined, {
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-xl font-bold text-[#F5EED8] tracking-[4px] mb-4">MY ORDERS</h1>
          <p className="text-sm text-[#C8BC98] mb-6">Sign in to view your order history.</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/browse" className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-[#F5EED8] tracking-[4px]">MY ORDERS</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
          </div>
        ) : !orderList || orderList.length === 0 ? (
          <div className="bg-[#161616] border border-[#C9A84C]/15 p-12 text-center">
            <Package className="w-10 h-10 text-[#C9A84C]/30 mx-auto mb-4" />
            <p className="text-sm text-[#C8BC98] mb-2">No orders yet</p>
            <p className="text-xs text-[#8A6E2F] mb-6">Your purchase history will appear here.</p>
            <Link to="/browse" className="inline-flex items-center gap-2 px-6 py-3 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C] hover:text-[#080808] transition-all">
              Start Browsing
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orderList.map((order: any) => {
              const status = statusConfig[order.orderStatus] || statusConfig.pending
              const StatusIcon = status.icon
              return (
                <div key={order.id} className="bg-[#161616] border border-[#C9A84C]/15 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] tracking-[2px] uppercase text-[#8A6E2F]">Order #{order.id}</span>
                        <span className={`flex items-center gap-1.5 text-[10px] ${status.color}`}>
                          <StatusIcon className="w-3 h-3" /> {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#C8BC98]">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-cinzel text-lg font-bold text-[#FFD97A]">${Number(order.amount).toLocaleString()}</div>
                      <div className="text-[10px] text-[#8A6E2F] tracking-[1px] capitalize">{order.paymentMethod?.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    {order.listingImage ? (
                      <img src={order.listingImage} alt="" className="w-16 h-16 object-cover border border-[#C9A84C]/20" />
                    ) : (
                      <div className="w-16 h-16 bg-[#1E1E1E] border border-[#C9A84C]/20 flex items-center justify-center">
                        <Package className="w-6 h-6 text-[#C9A84C]/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-[#F5EED8] font-medium truncate">{order.listingTitle}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] text-[#8A6E2F]">Payment: <span className={order.paymentStatus === 'completed' ? 'text-emerald-400' : 'text-yellow-400'}>{order.paymentStatus}</span></span>
                        {order.trackingNumber && (
                          <span className="text-[10px] text-[#8A6E2F]">Tracking: <span className="text-[#C9A84C]">{order.trackingNumber}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
