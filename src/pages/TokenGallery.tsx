import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  Diamond, ShieldCheck, Loader2, ExternalLink, Gem, Coins,
  Landmark, Palette, Watch, Trophy, BookOpen
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  'Fine Jewelry': <Gem className="w-8 h-8" />,
  'Rare Coins': <Coins className="w-8 h-8" />,
  'Luxury Watches': <Watch className="w-8 h-8" />,
  'Fine Art': <Palette className="w-8 h-8" />,
  'Antiques': <Landmark className="w-8 h-8" />,
  'Sports Memorabilia': <Trophy className="w-8 h-8" />,
  'Estate Jewelry': <Diamond className="w-8 h-8" />,
  'Rare Books': <BookOpen className="w-8 h-8" />,
}

export default function TokenGallery() {
  const { data: certs, isLoading } = trpc.blockchain.list.useQuery()
  const { data: listingsData } = trpc.listings.certified.useQuery()

  // Merge cert data with listing data
  const mergedItems = (certs || []).map(cert => {
    const listing = (listingsData || []).find(l => l.id === cert.listingId)
    return { cert, listing }
  }).filter(item => item.listing)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#C9A84C]/25 mb-4">
            <ShieldCheck className="w-3 h-3 text-[#C9A84C]" />
            <span className="text-[8px] tracking-[4px] uppercase text-[#C9A84C] font-medium">On-Chain Certified</span>
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            Token Gallery
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
          <p className="font-cormorant italic text-base text-[#C8BC98] max-w-xl mx-auto">
            Every item in this gallery has been certified on the Ethereum blockchain.
            Each carries a unique smart contract, token ID, and an immutable block hash.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-12 max-w-lg mx-auto">
          <div className="p-5 bg-[#161616] border border-[#C9A84C]/15 text-center">
            <div className="font-cinzel text-2xl font-bold text-[#C9A84C] mb-1">{certs?.length || 0}</div>
            <div className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F]">Certified Items</div>
          </div>
          <div className="p-5 bg-[#161616] border border-[#C9A84C]/15 text-center">
            <div className="font-cinzel text-2xl font-bold text-emerald-400 mb-1">100%</div>
            <div className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F]">Verified</div>
          </div>
          <div className="p-5 bg-[#161616] border border-[#C9A84C]/15 text-center">
            <div className="font-cinzel text-2xl font-bold text-[#FFD97A] mb-1">Sepolia</div>
            <div className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F]">Network</div>
          </div>
        </div>

        {/* Token Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
          </div>
        ) : mergedItems.length === 0 ? (
          <div className="text-center py-20 border border-[#C9A84C]/15 bg-[#161616]">
            <Diamond className="w-12 h-12 text-[#C9A84C]/20 mx-auto mb-4" />
            <p className="font-cinzel text-sm text-[#C8BC98] tracking-[2px] uppercase mb-2">No Certified Items Yet</p>
            <p className="text-xs text-[#8A6E2F] mb-4">Be the first to certify and tokenize your collection</p>
            <Link to="/sell" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold">
              List & Certify an Item
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mergedItems.map(({ cert, listing }) => (
              <div key={cert.id} className="bg-[#161616] border border-[#C9A84C]/15 overflow-hidden hover:border-[#C9A84C] hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(201,168,76,0.1)] transition-all duration-300">
                {/* Token Image Area */}
                <div className="h-40 bg-gradient-to-b from-[#1E1E1E] to-[#0F0F0F] flex items-center justify-center relative border-b border-[#C9A84C]/15">
                  <div className="text-[#C9A84C]/30">
                    {categoryIcons[listing?.category?.name || ''] || <Diamond className="w-14 h-14" />}
                  </div>
                  {/* Token Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-[#080808]/80 border border-[#C9A84C]/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-[7px] tracking-[2px] uppercase text-emerald-400 font-cinzel font-semibold">On-Chain</span>
                  </div>
                  {/* Token ID Badge */}
                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#C9A84C]/10 border border-[#C9A84C]/25">
                    <span className="text-[8px] tracking-[1px] text-[#C9A84C] font-mono">#{cert.tokenId}</span>
                  </div>
                </div>

                {/* Token Details */}
                <div className="p-5">
                  <p className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-1">{listing?.category?.name}</p>
                  <h3 className="font-cinzel text-[11px] font-semibold tracking-[1px] text-[#F5EED8] mb-3 leading-relaxed line-clamp-2">
                    {listing?.title}
                  </h3>

                  {/* Blockchain Details */}
                  <div className="space-y-2 mb-4 p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#8A6E2F]">Contract</span>
                      <span className="text-[#C9A84C] font-mono text-[9px] truncate max-w-[120px]">{cert.contractAddress}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#8A6E2F]">Block</span>
                      <span className="text-[#C8BC98] font-mono">{Number(cert.blockNumber).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#8A6E2F]">Hash</span>
                      <span className="text-[#C8BC98] font-mono text-[9px] truncate max-w-[120px]">{cert.certificateHash?.slice(0, 16)}...</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-end justify-between pt-3 border-t border-[#C9A84C]/10">
                    <span className="font-cinzel text-base font-bold text-[#C9A84C]">
                      ${Number(listing?.price || 0).toLocaleString('en-US')}
                    </span>
                    <Link
                      to={`/certificate/${cert.id}`}
                      className="flex items-center gap-1 text-[9px] tracking-[2px] uppercase text-[#C9A84C] font-cinzel font-semibold hover:text-[#E8CB7A] transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Certificate
                    </Link>
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
