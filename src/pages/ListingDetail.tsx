import { useParams, useNavigate, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import {
  Diamond, ArrowLeft, ShieldCheck, Loader2, Gem, Coins,
  Landmark, Palette, Watch, Trophy, BookOpen, ChevronRight,
  Bitcoin, ExternalLink, CheckCircle2
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  'Fine Jewelry': <Gem className="w-24 h-24" />,
  'Rare Coins': <Coins className="w-24 h-24" />,
  'Luxury Watches': <Watch className="w-24 h-24" />,
  'Fine Art': <Palette className="w-24 h-24" />,
  'Antiques': <Landmark className="w-24 h-24" />,
  'Sports Memorabilia': <Trophy className="w-24 h-24" />,
  'Estate Jewelry': <Diamond className="w-24 h-24" />,
  'Rare Books': <BookOpen className="w-24 h-24" />,
}

const badgeStyles: Record<string, string> = {
  verified: 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10',
  new: 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
  hot: 'border-red-500 text-red-400 bg-red-500/10',
  offer: 'border-orange-500 text-orange-400 bg-orange-500/10',
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const listingId = parseInt(id || '0')
  const { data: listing, isLoading } = trpc.listings.getById.useQuery({ id: listingId })
  const { data: cert } = trpc.blockchain.getByListing.useQuery(
    { listingId },
    { enabled: !!listing?.isCertified }
  )

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/checkout/${listingId}`)
  }

  const handleCryptoBuy = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/crypto-checkout/${listingId}`)
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
        <Diamond className="w-16 h-16 text-[#C9A84C]/20 mx-auto mb-4" />
        <h2 className="font-cinzel text-lg text-[#C8BC98] tracking-[3px] uppercase mb-2">Listing Not Found</h2>
        <Link to="/browse" className="text-[#C9A84C] text-xs tracking-[2px] uppercase hover:underline">Back to Browse</Link>
      </div>
    )
  }

  const commission = Number(listing.price) * (Number(listing.commissionRate) / 100)
  const features = (listing.features as string[] | null) || []

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link to="/browse" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Browse
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Image Area */}
          <div className="bg-[#161616] border border-[#C9A84C]/15 aspect-square flex items-center justify-center relative">
            <div className="text-[#C9A84C]/20">
              {categoryIcons[listing.category?.name || ''] || <Diamond className="w-24 h-24" />}
            </div>
            {listing.badge && listing.badge !== 'none' && (
              <span className={`absolute top-4 right-4 px-4 py-1.5 text-[8px] tracking-[2px] uppercase border ${badgeStyles[listing.badge] || badgeStyles.verified}`}>
                {listing.badge}
              </span>
            )}
            {/* Certified Badge */}
            {listing.isCertified && (
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[8px] tracking-[2px] uppercase text-emerald-400 font-cinzel font-semibold">On-Chain</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <p className="text-[8px] tracking-[4px] text-[#8A6E2F] uppercase mb-3">
              {listing.category?.name} &middot; {listing.condition?.replace('_', ' ')} condition
            </p>

            <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-[#F5EED8] tracking-[2px] mb-4 leading-tight">
              {listing.title}
            </h1>

            <p className="text-sm text-[#C8BC98] leading-relaxed mb-6 font-light">
              {listing.description}
            </p>

            {listing.sellerHandle && (
              <Link
                to={`/seller/${listing.sellerHandle}`}
                className="inline-flex items-center gap-2 mb-6 text-[10px] tracking-[2px] uppercase text-[#C9A84C] hover:text-[#E8CB7A]"
              >
                View Seller Storefront <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Blockchain Certification Section */}
            {listing.isCertified && cert && (
              <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[9px] tracking-[3px] uppercase text-emerald-400 font-cinzel font-semibold">Blockchain Certified</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-[#8A6E2F]">Contract</span>
                    <p className="text-[#C8BC98] font-mono text-[9px] truncate">{cert.contractAddress}</p>
                  </div>
                  <div>
                    <span className="text-[#8A6E2F]">Token ID</span>
                    <p className="text-[#C8BC98] font-mono">#{cert.tokenId}</p>
                  </div>
                  <div>
                    <span className="text-[#8A6E2F]">Block</span>
                    <p className="text-[#C8BC98] font-mono">{Number(cert.blockNumber).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[#8A6E2F]">Status</span>
                    <p className="text-emerald-400">{cert.status}</p>
                  </div>
                </div>
                <Link
                  to={`/certificate/${cert.id}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-[9px] tracking-[2px] uppercase text-emerald-400 font-cinzel font-semibold hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> View Certificate
                </Link>
              </div>
            )}

            {/* Features */}
            {features.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[9px] tracking-[3px] uppercase text-[#C9A84C] mb-3 font-cinzel font-semibold">Features</h3>
                <div className="flex flex-wrap gap-2">
                  {features.map((f, i) => (
                    <span key={i} className="px-3 py-1.5 bg-[#161616] border border-[#C9A84C]/15 text-[10px] text-[#C8BC98] tracking-[1px]">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Price Block */}
            <div className="bg-[#161616] border border-[#C9A84C]/25 p-6 mb-6">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-cinzel text-3xl font-bold text-[#C9A84C]">${Number(listing.price).toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A6E2F] mb-4">
                <ShieldCheck className="w-3 h-3" />
                <span>Commission: {listing.commissionRate}% (${commission.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#C9A84C]/15">
                <div className="flex justify-between text-xs">
                  <span className="text-[#C8BC98]">Item Price</span>
                  <span className="text-[#F5EED8] font-cinzel">${Number(listing.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#C8BC98]">Vault Fee ({listing.commissionRate}%)</span>
                  <span className="text-[#C9A84C] font-cinzel">${commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-[#C9A84C]/10">
                  <span className="text-[#F5EED8] font-medium">Total</span>
                  <span className="text-[#FFD97A] font-cinzel font-bold">${Number(listing.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-auto">
              <button
                onClick={handleBuyNow}
                disabled={listing.status === 'sold'}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {listing.status === 'sold' ? 'Sold' : <><ChevronRight className="w-3.5 h-3.5" /> Buy Now with Card</>}
              </button>

              {listing.status !== 'sold' && (
                <button
                  onClick={handleCryptoBuy}
                  className="w-full flex items-center justify-center gap-2 px-8 py-4 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[11px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 transition-all"
                >
                  <Bitcoin className="w-4 h-4" /> Pay with Crypto (ETH)
                </button>
              )}
            </div>

            {!isAuthenticated && (
              <p className="text-[10px] text-[#8A6E2F] mt-3 tracking-[1px] text-center">
                Please <Link to="/login" className="text-[#C9A84C] hover:underline">sign in</Link> to purchase
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
