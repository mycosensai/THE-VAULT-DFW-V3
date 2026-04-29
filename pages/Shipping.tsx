import { Diamond, Truck, Package, Clock, Globe, ShieldCheck } from 'lucide-react'

export default function Shipping() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#F5EED8] tracking-[6px] mb-4">SHIPPING INFORMATION</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="font-cormorant italic text-lg text-[#C8BC98]">Safe, insured delivery for your treasures.</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Truck, label: 'Insured Shipping', desc: 'Full value coverage' },
            { icon: Package, label: 'Expert Packaging', desc: 'Museum-grade materials' },
            { icon: Clock, label: 'Tracking', desc: 'Real-time updates' },
            { icon: Globe, label: 'Worldwide', desc: '40+ countries' },
          ].map((f) => (
            <div key={f.label} className="bg-[#161616] border border-[#C9A84C]/15 p-5 text-center">
              <f.icon className="w-5 h-5 text-[#C9A84C] mx-auto mb-2" />
              <div className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] font-semibold mb-1">{f.label}</div>
              <div className="text-[10px] text-[#8A6E2F]">{f.desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/20 p-8 sm:p-12 space-y-8 text-sm text-[#C8BC98] leading-relaxed relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {[
            { title: 'Shipping Arrangements', text: 'The Vault is a peer-to-peer marketplace. Buyers and sellers arrange shipping directly. We strongly recommend using insured shipping with tracking for all transactions. For items over $5,000, we require signature confirmation and full insurance coverage.' },
            { title: 'Packaging Standards', text: 'Sellers are responsible for proper packaging. We recommend: double-boxing for fragile items, acid-free tissue paper for textiles and art, custom foam inserts for watches and jewelry, and tamper-evident seals. Poor packaging that results in damage is the seller\'s responsibility.' },
            { title: 'Insurance Requirements', text: 'All shipments must be insured for the full transaction value. Sellers should obtain insurance through their chosen carrier (USPS, UPS, FedEx, DHL) or a third-party insurer like U-PIC or Shipsurance. Never ship high-value items uninsured.' },
            { title: 'Shipping Timelines', text: 'Sellers should ship within 3 business days of payment confirmation. Domestic shipments typically arrive in 2-5 business days. International shipments may take 7-21 business days depending on customs. The seller must provide tracking information to the buyer within 24 hours of shipment.' },
            { title: 'International Shipping', text: 'International buyers are responsible for customs duties, import taxes, and any brokerage fees. Sellers should accurately declare item values and descriptions on customs forms. We recommend DHL or FedEx for international shipments as they handle customs clearance efficiently.' },
            { title: 'High-Value Items ($25,000+)', text: 'For transactions exceeding $25,000, we recommend using a professional art shipping service (Crozier, U.S. Art Company, or Pak Mail). White-glove delivery with climate-controlled transport and armed courier services are available for museum-grade pieces.' },
            { title: 'Tracking & Confirmation', text: 'Both parties should save all tracking numbers, shipping receipts, and delivery confirmations until the transaction is complete. In case of disputes, this documentation is essential. Photograph the packaged item before shipping for your records.' },
            { title: 'Lost or Damaged Shipments', text: 'If a shipment is lost or damaged in transit, the buyer should file a claim with the shipping carrier using the insurance policy. The seller must cooperate by providing necessary documentation. If insurance coverage is insufficient, the parties may negotiate a partial refund.' },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="font-cinzel text-xs tracking-[3px] uppercase text-[#C9A84C] font-semibold mb-3">{section.title}</h2>
              <p>{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 p-4 bg-[#C9A84C]/5 border border-[#C9A84C]/15">
          <ShieldCheck className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[#C8BC98] leading-relaxed">
            The Vault is not a shipping provider and does not arrange or guarantee shipping. All shipping arrangements are between buyer and seller. We are not liable for shipping delays, lost packages, or damage in transit.
          </p>
        </div>
      </div>
    </div>
  )
}
