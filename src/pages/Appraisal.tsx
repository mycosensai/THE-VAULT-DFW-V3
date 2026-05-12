import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  Diamond, Sparkles, Loader2, TrendingUp, BarChart3,
  DollarSign, FileSearch, ArrowRight, ImageIcon, X
} from 'lucide-react'

export default function Appraisal() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'loading'>('form')
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('good')
  const [description, setDescription] = useState('')
  const [, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: categories } = trpc.categories.list.useQuery()

  const createAppraisal = trpc.appraisal.create.useMutation({
    onSuccess: (data) => {
      // Redirect to email collection page with appraisal ID
      if (data.id) {
        navigate(`/appraisal-email?appraisalId=${data.id}`)
      } else {
        setStep('form')
      }
    },
    onError: () => {
      setStep('form')
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemName || !category) return

    setStep('loading')
    createAppraisal.mutate({
      itemName,
      category,
      condition,
      description,
      imageUrl: imagePreview || undefined,
    })
  }

  const conditions = [
    { value: 'mint', label: 'Mint' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'very_good', label: 'Very Good' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
  ]

  const confidenceColors: Record<string, string> = {
    high: 'text-emerald-400',
    medium: 'text-[#C9A84C]',
    low: 'text-orange-400',
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">
            AI-Powered Analysis
          </p>
          <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            Appraisal Machine
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
          <p className="font-cormorant italic text-base text-[#C8BC98] mt-4 max-w-xl mx-auto">
            Our AI analyzes your item description and photo against its training knowledge of market trends and collectible pricing. It provides an estimated range — not a guaranteed valuation. For insurance or legal purposes, consult a licensed appraiser.
          </p>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="bg-[#161616] border border-[#C9A84C]/25 p-8 sm:p-10 relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

            {/* Image Upload */}
            <div className="mb-8">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">
                Upload Photo
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                  imagePreview
                    ? 'border-[#C9A84C] bg-[#C9A84C]/5'
                    : 'border-[#C9A84C]/30 bg-[#1E1E1E] hover:border-[#C9A84C]/60'
                }`}
                style={{ height: '280px' }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <ImageIcon className="w-10 h-10 text-[#C9A84C]/40 mb-3" />
                    <p className="text-xs text-[#C8BC98] mb-1">Click to upload a photo</p>
                    <p className="text-[10px] text-[#8A6E2F]">JPG, PNG up to 10MB</p>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="mt-2 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" /> Remove image
                </button>
              )}
            </div>

            {/* Item Name */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">
                Item Name
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., 1924 Art Deco Diamond Ring"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F]"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors cursor-pointer"
                required
              >
                <option value="" className="bg-[#1E1E1E]">Select a category</option>
                {(categories || []).map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-[#1E1E1E]">{cat.name}</option>
                ))}
                <option value="Other" className="bg-[#1E1E1E]">Other / Not Sure</option>
              </select>
            </div>

            {/* Condition */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">
                Condition
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {conditions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCondition(c.value)}
                    className={`py-3 text-[10px] tracking-[2px] uppercase border transition-all ${
                      condition === c.value
                        ? 'border-[#C9A84C] bg-[#C9A84C]/12 text-[#C9A84C]'
                        : 'border-[#C9A84C]/15 text-[#C8BC98] hover:border-[#C9A84C]/40'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">
                Additional Details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include maker marks, hallmarks, provenance, measurements, certificates, year of production..."
                rows={5}
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors resize-none placeholder:text-[#8A6E2F]"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={createAppraisal.isPending}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-60"
            >
              {createAppraisal.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get AI Appraisal
                </>
              )}
            </button>
          </form>
        )}

        {/* Loading State */}
        {step === 'loading' && (
          <div className="bg-[#161616] border border-[#C9A84C]/25 p-16 text-center relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />
            <div className="relative inline-block mb-8">
              <div className="w-20 h-20 border-2 border-[#C9A84C]/15 rotate-45 flex items-center justify-center" />
              <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-[#C9A84C] animate-spin" />
            </div>
            <h3 className="font-cinzel text-lg text-[#C9A84C] tracking-[4px] uppercase mb-3">Analyzing Your Item</h3>
            <p className="text-sm text-[#C8BC98] font-light max-w-md mx-auto mb-6">
              Our AI is analyzing your item description and image against its training knowledge of collectible markets. It does not access live databases...
            </p>
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 text-[10px] text-[#8A6E2F]">
                <FileSearch className="w-3 h-3" />
                <span>Researching comparable sales</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A6E2F]">
                <BarChart3 className="w-3 h-3" />
                <span>Analyzing market data</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#8A6E2F]">
                <TrendingUp className="w-3 h-3" />
                <span>Calculating estimate</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
