import { Link } from 'react-router'
import { Diamond, ArrowLeft, Clock, ShieldCheck, RefreshCw } from 'lucide-react'

export default function Returns() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#F5EED8] tracking-[6px] mb-4">RETURNS & REFUNDS</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="font-cormorant italic text-lg text-[#C8BC98]">Our commitment to fair and transparent returns.</p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Clock, title: '14-Day Window', desc: 'Request a return within 14 days of delivery' },
            { icon: ShieldCheck, title: 'Condition Check', desc: 'Item must be in substantially same condition' },
            { icon: RefreshCw, title: 'Direct Resolution', desc: 'Buyer and seller work out the details' },
          ].map((step) => (
            <div key={step.title} className="bg-[#161616] border border-[#C9A84C]/15 p-6 text-center">
              <step.icon className="w-6 h-6 text-[#C9A84C] mx-auto mb-3" />
              <h3 className="font-cinzel text-xs tracking-[2px] uppercase text-[#C9A84C] font-semibold mb-2">{step.title}</h3>
              <p className="text-[11px] text-[#C8BC98]">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/20 p-8 sm:p-12 space-y-8 text-sm text-[#C8BC98] leading-relaxed relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {[
            { title: 'Return Eligibility', text: 'You may request a return within 14 days of the item being marked as delivered. To be eligible, the item must be significantly not as described (wrong item, materially different condition, counterfeit when advertised as authentic). Buyer remorse returns are at the seller\'s discretion.' },
            { title: 'Return Process', text: '1. Contact the seller through your order page to explain the issue. 2. If the seller agrees, ship the item back with tracking. 3. Once the seller receives and confirms the item\'s condition, the refund is processed through the original payment method. 4. If the seller disputes the return, contact us at ratchetkrewelabs@gmail.com and we will mediate.' },
            { title: 'Refund Timeline', text: 'Stripe refunds typically appear in 5-10 business days. Cryptocurrency refunds depend on blockchain confirmation times and may take 1-3 business days. Wallet-to-wallet transfers are irreversible on the blockchain — please ensure you are satisfied before completing a direct transfer.' },
            { title: 'Items Not Eligible for Return', text: 'The following cannot be returned: items accurately described and photographed, items damaged by the buyer after receipt, perishable goods, personalized or custom items, and items where blockchain certificates have already been issued and transferred.' },
            { title: 'Shipping Costs', text: 'If the return is due to the item being not as described, the seller pays return shipping. If the return is due to buyer remorse, the buyer pays return shipping. We recommend using insured shipping for high-value returns.' },
            { title: 'ProVerify Re-verification', text: 'For disputed authenticity claims, both parties may agree to a re-verification through ProVerify. If the re-verification confirms the item is not as originally described, the seller must accept the return and refund. The cost of re-verification is paid by the party whose claim is disproven.' },
            { title: 'Chargebacks', text: 'We strongly encourage resolving disputes through our platform before initiating chargebacks. Chargebacks damage seller ratings and may result in account suspension. We cooperate fully with payment processors in investigating disputes.' },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="font-cinzel text-xs tracking-[3px] uppercase text-[#C9A84C] font-semibold mb-3">{section.title}</h2>
              <p>{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link to="/support" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C9A84C] hover:text-[#E8CB7A] transition-colors">
            <ArrowLeft className="w-3 h-3" /> Back to Support
          </Link>
        </div>
      </div>
    </div>
  )
}
