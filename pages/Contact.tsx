import { Link } from 'react-router'
import { Diamond, Mail, Clock, ArrowRight } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[6px] mb-4">CONTACT US</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="font-cormorant italic text-lg text-[#C8BC98]">We are here to help.</p>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/25 p-8 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          <div className="text-center mb-8">
            <div className="w-16 h-16 border border-[#C9A84C]/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-[#C9A84C]" />
            </div>
            <h2 className="font-cinzel text-sm tracking-[3px] uppercase text-[#C9A84C] font-semibold mb-2">Direct Email</h2>
            <p className="text-xs text-[#C8BC98] mb-4">
              For the fastest response, email us directly. We typically reply within 24 hours.
            </p>
            <a
              href="mailto:ratchetkrewelabs@gmail.com"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[12px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all w-full"
            >
              <Mail className="w-4 h-4" />
              ratchetkrewelabs@gmail.com
            </a>
          </div>

          <div className="border-t border-[#C9A84C]/15 pt-6 space-y-4">
            <h3 className="font-cinzel text-[10px] tracking-[3px] uppercase text-[#C9A84C] font-semibold text-center mb-4">Other Ways to Reach Us</h3>

            {[
              { label: 'Support Center', desc: 'Browse FAQs and submit tickets', link: '/support', linkText: 'Visit Support' },
              { label: 'ProVerify Questions', desc: 'Expert verification inquiries', link: '/proverify', linkText: 'Submit Item' },
              { label: 'AI Appraisal', desc: 'Get an instant valuation', link: '/appraisal', linkText: 'Start Appraisal' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className="flex items-center justify-between p-4 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 transition-colors group"
              >
                <div>
                  <div className="text-xs text-[#F5EED8] font-medium">{item.label}</div>
                  <div className="text-[10px] text-[#8A6E2F]">{item.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#C9A84C] group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#C9A84C]/10 flex items-center justify-center gap-2 text-[10px] text-[#8A6E2F]">
            <Clock className="w-3 h-3" />
            <span>Typical response time: under 24 hours</span>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#8A6E2F] hover:text-[#C9A84C] transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
