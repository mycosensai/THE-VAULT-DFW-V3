import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft, Loader2, Heart, Trash2,
  ShoppingBag
} from 'lucide-react'

export default function Wishlist() {
  const utils = trpc.useUtils()
  const { data: items, isLoading } = trpc.wishlist.list.useQuery(undefined, {
    staleTime: 1000 * 30,
  })

  const toggleMutation = trpc.wishlist.toggle.useMutation({
    onSuccess: () => {
      utils.wishlist.list.invalidate()
    },
  })

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/browse" className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-[#F5EED8] tracking-[4px]">WISHLIST</h1>
          {items && items.length > 0 && (
            <span className="text-[10px] tracking-[2px] uppercase text-[#8A6E2F]">({items.length} items)</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
          </div>
        ) : !items || items.length === 0 ? (
          <div className="bg-[#161616] border border-[#C9A84C]/15 p-12 text-center">
            <Heart className="w-10 h-10 text-[#C9A84C]/30 mx-auto mb-4" />
            <p className="text-sm text-[#C8BC98] mb-2">Your wishlist is empty</p>
            <p className="text-xs text-[#8A6E2F] mb-6">Save items you love to revisit them later.</p>
            <Link to="/browse" className="inline-flex items-center gap-2 px-6 py-3 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C] hover:text-[#080808] transition-all">
              Browse Items
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item: any) => (
              <div key={item.id} className="bg-[#161616] border border-[#C9A84C]/15 overflow-hidden group">
                <Link to={`/listing/${item.listing.id}`} className="block">
                  <div className="aspect-[4/3] bg-[#1E1E1E] overflow-hidden">
                    {item.listing.images?.[0] ? (
                      <img src={item.listing.images[0]} alt={item.listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-[#C9A84C]/20" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link to={`/listing/${item.listing.id}`}>
                        <h3 className="text-sm text-[#F5EED8] font-medium truncate hover:text-[#C9A84C] transition-colors">{item.listing.title}</h3>
                      </Link>
                      <p className="font-cinzel text-base font-bold text-[#FFD97A] mt-1">${Number(item.listing.price).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate({ listingId: item.listing.id })}
                      className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
