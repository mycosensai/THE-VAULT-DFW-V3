import { Link, useSearchParams } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  Diamond, Search, LayoutGrid, List,
  Gem, Coins, Landmark, Palette, Watch, Trophy, BookOpen, Loader2
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  'Fine Jewelry': <Gem className="w-12 h-12" />,
  'Rare Coins': <Coins className="w-12 h-12" />,
  'Luxury Watches': <Watch className="w-12 h-12" />,
  'Fine Art': <Palette className="w-12 h-12" />,
  'Antiques': <Landmark className="w-12 h-12" />,
  'Sports Memorabilia': <Trophy className="w-12 h-12" />,
  'Estate Jewelry': <Diamond className="w-12 h-12" />,
  'Rare Books': <BookOpen className="w-12 h-12" />,
}

const badgeStyles: Record<string, string> = {
  verified: 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10',
  new: 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  hot: 'border-red-500 text-red-400 bg-red-500/10',
  offer: 'border-orange-500 text-orange-400 bg-orange-500/10',
}

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export default function Storefront() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || undefined
  const paymentSuccess = searchParams.get('success') === 'true' || searchParams.get('coinbase_success') === 'true'
  const paymentCancelled = searchParams.get('cancelled') === 'true' || searchParams.get('coinbase_cancelled') === 'true'

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('newest')
  const [showSuccess, setShowSuccess] = useState(paymentSuccess)
  const [showCancelled, setShowCancelled] = useState(paymentCancelled)

  const { data: listings, isLoading } = trpc.listings.list.useQuery({
    category: selectedCategory,
    status: 'active',
    limit: 50,
  })

  const { data: categories } = trpc.categories.list.useQuery()

  // Clear success/cancel params from URL after showing notification
  const dismissNotification = () => {
    setShowSuccess(false)
    setShowCancelled(false)
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('success')
    newParams.delete('cancelled')
    setSearchParams(newParams, { replace: true })
  }

  const filteredListings = (listings || [])
    .filter((l) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.category?.name?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return 0
    })

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">
            The Marketplace
          </p>
          <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            Browse The Vault
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        {/* Payment Notifications */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-center relative">
            <button
              onClick={dismissNotification}
              className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-300"
            >
              &times;
            </button>
            <p className="font-cinzel text-xs tracking-[3px] uppercase text-emerald-400 mb-1">
              Payment Successful
            </p>
            <p className="text-xs text-[#C8BC98]">
              Your purchase is being processed. You will receive confirmation shortly.
            </p>
          </div>
        )}
        {showCancelled && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 text-center relative">
            <button
              onClick={dismissNotification}
              className="absolute top-2 right-2 text-orange-400 hover:text-orange-300"
            >
              &times;
            </button>
            <p className="font-cinzel text-xs tracking-[3px] uppercase text-orange-400 mb-1">
              Payment Cancelled
            </p>
            <p className="text-xs text-[#C8BC98]">
              Your payment was cancelled. The item is still available if you wish to try again.
            </p>
          </div>
        )}

        {/* Buy/Sell Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex border border-[#C9A84C]/25">
            <Link
              to="/browse"
              className="px-8 py-3 bg-[#C9A84C] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold"
            >
              Buy
            </Link>
            <Link
              to="/sell"
              className="px-8 py-3 text-[#C8BC98] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/7 hover:text-[#C9A84C] transition-all"
            >
              Sell
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A6E2F]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings..."
              className="w-full bg-[#161616] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 pl-11 pr-4 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F]"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#161616] border border-[#C9A84C]/20 text-[#C8BC98] text-xs tracking-[2px] py-3 px-4 outline-none focus:border-[#C9A84C] cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex border border-[#C9A84C]/20">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-[#C9A84C]/12 text-[#C9A84C]' : 'text-[#C8BC98] hover:text-[#C9A84C]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-[#C9A84C]/12 text-[#C9A84C]' : 'text-[#C8BC98] hover:text-[#C9A84C]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={`px-4 py-2 text-[10px] tracking-[2px] uppercase border transition-all ${
              !selectedCategory
                ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                : 'border-[#C9A84C]/20 text-[#C8BC98] hover:border-[#C9A84C]/50'
            }`}
          >
            All
          </button>
          {(categories || []).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 text-[10px] tracking-[2px] uppercase border transition-all ${
                selectedCategory === cat.slug
                  ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                  : 'border-[#C9A84C]/20 text-[#C8BC98] hover:border-[#C9A84C]/50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <p className="text-[10px] tracking-[2px] text-[#8A6E2F] uppercase mb-6">
          {filteredListings.length} item{filteredListings.length !== 1 ? 's' : ''} available
        </p>

        {/* Listings Grid/List */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 border border-[#C9A84C]/15 bg-[#161616]">
            <Diamond className="w-12 h-12 text-[#C9A84C]/20 mx-auto mb-4" />
            <p className="font-cinzel text-sm text-[#C8BC98] tracking-[2px] uppercase mb-2">No listings found</p>
            <p className="text-xs text-[#8A6E2F]">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="group bg-[#161616] border border-[#C9A84C]/15 overflow-hidden hover:border-[#C9A84C] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(201,168,76,0.1)] transition-all duration-300"
              >
                <div className="h-40 bg-[#1E1E1E] flex items-center justify-center relative border-b border-[#C9A84C]/15">
                  <div className="text-[#C9A84C]/30 group-hover:text-[#C9A84C]/50 transition-colors">
                    {categoryIcons[listing.category?.name || ''] || <Diamond className="w-14 h-14" />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080808]/60" />
                  {listing.badge && listing.badge !== 'none' && (
                    <span className={`absolute top-3 right-3 px-2.5 py-0.5 text-[7px] tracking-[2px] uppercase border ${badgeStyles[listing.badge] || badgeStyles.verified}`}>
                      {listing.badge}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-1.5">
                    {listing.category?.name}
                  </p>
                  <h3 className="font-cinzel text-[11px] font-semibold tracking-[1px] text-[#F5EED8] mb-2 leading-relaxed line-clamp-2">
                    {listing.title}
                  </h3>
                  <p className="text-[10px] text-[#C8BC98] leading-relaxed mb-4 line-clamp-2 font-light">
                    {listing.description}
                  </p>
                  <div className="flex items-end justify-between pt-3 border-t border-[#C9A84C]/10">
                    <div>
                      <div className="font-cinzel text-base font-bold text-[#C9A84C]">
                        ${Number(listing.price).toLocaleString('en-US')}
                      </div>
                      <div className="text-[7px] tracking-[1px] text-[#8A6E2F] mt-0.5">
                        Fee: {listing.commissionRate}%
                      </div>
                    </div>
                    <span className="text-[9px] tracking-[2px] uppercase text-[#C9A84C] font-cinzel font-semibold">
                      Buy Now
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="group flex bg-[#161616] border border-[#C9A84C]/15 hover:border-[#C9A84C] transition-all duration-300"
              >
                <div className="w-40 sm:w-48 bg-[#1E1E1E] flex items-center justify-center flex-shrink-0 border-r border-[#C9A84C]/15">
                  <div className="text-[#C9A84C]/30">
                    {categoryIcons[listing.category?.name || ''] || <Diamond className="w-10 h-10" />}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-1">
                      {listing.category?.name}
                    </p>
                    <h3 className="font-cinzel text-xs font-semibold tracking-[1px] text-[#F5EED8] mb-2">
                      {listing.title}
                    </h3>
                    <p className="text-[10px] text-[#C8BC98] line-clamp-1 font-light">
                      {listing.description}
                    </p>
                  </div>
                  <div className="flex items-end justify-between pt-3 border-t border-[#C9A84C]/10 mt-3">
                    <div className="font-cinzel text-base font-bold text-[#C9A84C]">
                      ${Number(listing.price).toLocaleString('en-US')}
                    </div>
                    <span className="text-[9px] tracking-[2px] uppercase text-[#C9A84C] font-cinzel font-semibold">
                      Buy Now
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
