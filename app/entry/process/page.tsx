'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, MessageCircle, Phone, UserCheck, ClipboardCheck, ArrowLeft, Send, Clock, Upload } from 'lucide-react'

function ProcessContent() {
    const searchParams = useSearchParams()
    const phone = searchParams.get('phone')
    const currentStepId = searchParams.get('step') || 'messages'
    const router = useRouter()

    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [showAction, setShowAction] = useState(false)
    const [isPriority, setIsPriority] = useState(false)
    const [customerName, setCustomerName] = useState('')
    const [selectedPackage, setSelectedPackage] = useState('')
    const [history, setHistory] = useState<any[]>([])

    // ── NEW ORDER STATES ──────────────────────────────────────
    const [paymentMethod, setPaymentMethod] = useState('')
    const [discountPercent, setDiscountPercent] = useState(0)
    const [slipFile, setSlipFile] = useState<File | null>(null)
    const [kokoId, setKokoId] = useState('')
    const [invoiceSent, setInvoiceSent] = useState(false)
    // ─────────────────────────────────────────────────────────

    const steps = [
        { id: 'messages', name: 'Message', icon: <MessageCircle size={18} /> },
        { id: 'calls', name: 'Call', icon: <Phone size={18} /> },
        { id: 'feedback', name: 'Feedback', icon: <UserCheck size={18} /> },
        { id: 'order', name: 'Order', icon: <ClipboardCheck size={18} /> },
    ]

    const packages = [
        { id: 'bronze', name: 'Bronze Pass', price: 5990, comm: 0.05 },
        { id: 'silver', name: 'Silver Pass', price: 9990, comm: 0.05 },
        { id: 'gold', name: 'Gold Pass', price: 12990, comm: 0.08 },
        { id: 'vip', name: 'VIP Pass', price: 17990, comm: 0.10 },
        { id: 'psilver', name: 'Princess Silver Pass', price: 6990, comm: 0.05 },
        { id: 'pgold', name: 'Princess Gold Pass', price: 8990, comm: 0.08 },
        { id: 'pvip', name: 'Princess VIP Pass', price: 12990, comm: 0.10 },
        { id: 'custom', name: 'Custom', price: 0, comm: 0.05 },
    ]

    // ── CALCULATED VALUES ─────────────────────────────────────
    const pkg = packages.find(p => p.id === selectedPackage)
    const baseAmount = pkg?.price || 0
    const finalAmount = discountPercent > 0
        ? Math.round(baseAmount - (baseAmount * discountPercent / 100))
        : baseAmount
    // ─────────────────────────────────────────────────────────

    const currentIndex = steps.findIndex(s => s.id === currentStepId)
    const progressWidth = ((currentIndex + 1) / steps.length) * 100
    const stepRatio = `${currentIndex + 1}/${steps.length}`

    useEffect(() => {
        const fetchHistory = async () => {
            if (!phone) return
            const { data } = await supabase.from('leads_history').select('*').eq('phone_number', phone).order('created_at', { ascending: false })
            if (data) {
                setHistory(data)
                if (data.length > 0) setIsPriority(data[0].is_priority)
            }
        }
        fetchHistory()
    }, [phone])

    const handleBack = () => {
        if (history.length > 0) { router.push('/dashboard/history') }
        else { router.push('/entry') }
    }

    // ── ORIGINAL SUBMIT (messages/calls/feedback) ─────────────
    const handleStepSubmit = async () => {
        if (!notes && currentStepId !== 'order') return alert("Please add some notes!")

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const finalPriority = currentStepId === 'order' ? false : isPriority

            const insertData: any = {
                worker_id: user?.id,
                phone_number: phone,
                last_step: currentStepId,
                notes: notes,
                is_priority: finalPriority,
                created_at: new Date().toISOString()
            }

            const { error } = await supabase.from('leads_history').insert([insertData])
            if (error) throw error
            router.push('/entry')
        } catch (err: any) { alert(err.message) } finally { setLoading(false) }
    }
    // ─────────────────────────────────────────────────────────

    // ── NEW ORDER SUBMIT ──────────────────────────────────────
    const handleOrderSubmit = async () => {
        if (!customerName) return alert('Enter client name!')
        if (!selectedPackage) return alert('Select a package!')
        if (!paymentMethod) return alert('Select payment method!')
        if (paymentMethod !== 'KOKO' && !slipFile) return alert('Upload payment slip!')
        if (paymentMethod === 'KOKO' && !kokoId) return alert('Enter KOKO ID!')

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            // Get next invoice number from DB
            const { data: lastOrder } = await supabase
                .from('orders')
                .select('invoice_number')
                .order('created_at', { ascending: false })
                .limit(1)

            let nextNum = 783
            if (lastOrder && lastOrder.length > 0) {
                const lastNum = parseInt(lastOrder[0].invoice_number.replace('EM', ''))
                if (!isNaN(lastNum)) nextNum = lastNum + 1
            }
            const invoiceNumber = `EM${String(nextNum).padStart(5, '0')}`

            // Convert slip to base64 if exists
            let slipBase64 = null
            let slipMimeType = null
            if (slipFile) {
                const buf = await slipFile.arrayBuffer()
                slipBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
                slipMimeType = slipFile.type
            }

            const res = await fetch('/api/send-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceNumber,
                    clientName: customerName,
                    clientNumber: phone,
                    paymentMethod,
                    kokoId: paymentMethod === 'KOKO' ? kokoId : null,
                    packageName: pkg?.name,
                    baseAmount,
                    discountPercent,
                    finalAmount,
                    slipBase64,
                    slipMimeType,
                    workerId: user?.id
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            // Save to leads_history
            await supabase.from('leads_history').insert([{
                worker_id: user?.id,
                phone_number: phone,
                last_step: 'order',
                notes: `Order: ${pkg?.name} (${customerName}) – LKR ${finalAmount.toLocaleString()}`,
                is_priority: false,
                package_name: pkg?.name,
                payment_amount: finalAmount,
                commission_earned: finalAmount * (pkg?.comm || 0.05),
                created_at: new Date().toISOString()
            }])

            setInvoiceSent(true)
            setTimeout(() => router.push('/entry'), 2500)
        } catch (err: any) {
            alert('Error: ' + err.message)
        } finally {
            setLoading(false)
        }
    }
    // ─────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-white max-w-md mx-auto p-6 font-sans pb-24 relative">
            <button onClick={handleBack} className="mt-4 p-3 bg-gray-50 rounded-2xl text-gray-500 hover:text-[#EA1E63] flex items-center gap-2">
                <ArrowLeft size={18} /><span className="text-[10px] font-black uppercase tracking-widest">Exit</span>
            </button>

            <div className="flex justify-between items-center mt-8 mb-4 px-2">
                {steps.map((s) => (
                    <div key={s.id} onClick={() => router.push(`/entry/process?phone=${phone}&step=${s.id}`)} className="flex flex-col items-center gap-2">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center border-2 transition-all ${currentStepId === s.id ? 'bg-[#EA1E63] border-[#EA1E63] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-300'}`}>
                            {s.icon}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-tighter ${currentStepId === s.id ? 'text-[#EA1E63]' : 'text-gray-300'}`}>{s.name}</span>
                    </div>
                ))}
            </div>

            <div className="mx-4 mb-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#EA1E63] transition-all duration-500" style={{ width: `${progressWidth}%` }}></div>
            </div>

            {!showAction ? (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-pink-50/50 p-6 rounded-[35px] border border-pink-100 flex flex-col items-center text-center">
                        <h2 className="text-lg font-black text-gray-800 italic">{phone}</h2>
                        <span className="text-[9px] font-black text-[#EA1E63] uppercase bg-white px-3 py-1 rounded-full mt-2 shadow-sm border border-pink-100">Level {stepRatio}</span>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 flex items-center gap-2"><Clock size={12} /> History</h3>
                        <div className="space-y-6 border-l-2 border-pink-100 ml-6 pl-8">
                            {history.map((item, idx) => (
                                <div key={idx} className="relative bg-gray-50 p-5 rounded-[30px] border border-gray-100 shadow-sm">
                                    <div className="absolute -left-[41px] top-1 h-5 w-5 bg-white border-4 border-[#EA1E63] rounded-full shadow-sm"></div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black text-white bg-[#EA1E63] px-3 py-1 rounded-full uppercase">{item.last_step}</span>
                                        <span className="text-[8px] text-gray-400 font-bold">{new Date(item.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 italic">"{item.notes}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => setShowAction(true)} className="w-full bg-[#EA1E63] text-white font-black p-5 rounded-full shadow-xl flex items-center justify-center gap-3">
                        <span>CONTINUE LEVEL {stepRatio}</span><Send size={18} />
                    </button>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 relative shadow-sm">
                        <h2 className="text-xl font-black capitalize mb-1 text-gray-800">{currentStepId} Entry</h2>

                        {/* ── ORDER STEP ────────────────────────────────────── */}
                        {currentStepId === 'order' ? (
                            <div className="space-y-4 mt-4">
                                {invoiceSent ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <div className="text-5xl">✅</div>
                                        <p className="font-black text-gray-700 text-lg">Invoice Sent!</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Redirecting...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Client Name */}
                                        <input
                                            type="text"
                                            placeholder="Client Name *"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full p-5 rounded-[20px] bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-200"
                                        />

                                        {/* Payment Method */}
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full p-5 rounded-[20px] bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-200"
                                        >
                                            <option value="">Payment Method *</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Genie">Genie Payment</option>
                                            <option value="KOKO">KOKO Payment</option>
                                        </select>

                                        {/* KOKO ID */}
                                        {paymentMethod === 'KOKO' && (
                                            <input
                                                type="text"
                                                placeholder="KOKO ID *"
                                                value={kokoId}
                                                onChange={(e) => setKokoId(e.target.value)}
                                                className="w-full p-5 rounded-[20px] bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-200"
                                            />
                                        )}

                                        {/* Package */}
                                        <select
                                            value={selectedPackage}
                                            onChange={(e) => setSelectedPackage(e.target.value)}
                                            className="w-full p-5 rounded-[20px] bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-200"
                                        >
                                            <option value="">Select Package *</option>
                                            {packages.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}{p.price > 0 ? ` – LKR ${p.price.toLocaleString()}` : ''}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Discount + Price Preview */}
                                        {selectedPackage && (
                                            <div className="bg-white border border-gray-100 rounded-[20px] p-5 space-y-3">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Discount %</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        value={discountPercent}
                                                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                                                        className="w-24 p-3 rounded-[12px] bg-gray-50 border border-gray-100 font-bold text-center outline-none focus:ring-2 focus:ring-pink-200"
                                                    />
                                                    <div className="flex-1 text-right">
                                                        {discountPercent > 0 && (
                                                            <p className="text-[11px] text-gray-400 line-through">LKR {baseAmount.toLocaleString()}</p>
                                                        )}
                                                        <p className="font-black text-[#EA1E63] text-xl">LKR {finalAmount.toLocaleString()}</p>
                                                        {discountPercent > 0 && (
                                                            <p className="text-[9px] text-green-500 font-black uppercase tracking-widest">{pkg?.name} {discountPercent}% Discount</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Slip Upload — hidden for KOKO */}
                                        {paymentMethod && paymentMethod !== 'KOKO' && (
                                            <label className={`flex flex-col items-center justify-center w-full p-6 rounded-[20px] border-2 border-dashed cursor-pointer transition-all ${slipFile ? 'bg-green-50 border-green-300' : 'bg-white border-pink-200 hover:bg-pink-50'}`}>
                                                <Upload size={24} className={slipFile ? 'text-green-500' : 'text-[#EA1E63]'} />
                                                <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-center" style={{ color: slipFile ? '#22c55e' : '#9ca3af' }}>
                                                    {slipFile ? `✓ ${slipFile.name}` : 'Upload Payment Slip *'}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                        )}

                                        {/* Submit */}
                                        <button
                                            onClick={handleOrderSubmit}
                                            disabled={loading}
                                            className="w-full bg-[#EA1E63] text-white font-black p-5 rounded-full shadow-xl flex items-center justify-center gap-2 mt-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : '📄 GENERATE & SEND INVOICE'}
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* ── OTHER STEPS (unchanged) ─────────────────────── */
                            <>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={`Enter ${currentStepId} details...`} className="w-full h-44 p-6 rounded-[30px] bg-white border-none outline-none shadow-inner resize-none text-sm text-gray-600 mt-4 focus:ring-2 focus:ring-pink-100" />
                                <div className="mt-4 flex items-center justify-between bg-white p-4 rounded-2xl border border-pink-50 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={isPriority} onChange={(e) => setIsPriority(e.target.checked)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#EA1E63] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Priority</span>
                                    </div>
                                    <button className="text-[#EA1E63] font-bold text-[10px] uppercase bg-pink-50 px-4 py-2 rounded-xl">Post Reply</button>
                                </div>
                            </>
                        )}

                        {/* Review button — only for non-order steps */}
                        {currentStepId !== 'order' && (
                            <button onClick={() => setShowAction(false)} className="absolute -top-3 -right-3 bg-white p-2 rounded-full border border-gray-100 shadow-md text-gray-400 text-[8px] font-black uppercase">Review</button>
                        )}
                    </div>

                    {/* Confirm button — only for non-order steps */}
                    {currentStepId !== 'order' && (
                        <button onClick={handleStepSubmit} disabled={loading} className="w-full bg-[#EA1E63] text-white font-black p-5 rounded-full shadow-xl flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM & SUBMIT'}
                        </button>
                    )}
                </div>
            )}

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-50 p-4 z-50">
                <div className="flex justify-between items-center mb-1 px-1"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Progress</span><span className="text-[10px] font-black text-[#EA1E63]">{stepRatio}</span></div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#EA1E63] to-[#ff4d8d]" style={{ width: `${progressWidth}%` }}></div></div>
            </div>
        </div>
    )
}

export default function ProcessLead() { return <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#EA1E63]" /></div>}><ProcessContent /></Suspense> }