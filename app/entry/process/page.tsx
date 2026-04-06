'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, MessageCircle, Phone, UserCheck, ClipboardCheck, ArrowLeft, Send, Clock } from 'lucide-react'

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

    const steps = [
        { id: 'messages', name: 'Message', icon: <MessageCircle size={18} /> },
        { id: 'calls', name: 'Call', icon: <Phone size={18} /> },
        { id: 'feedback', name: 'Feedback', icon: <UserCheck size={18} /> },
        { id: 'order', name: 'Order', icon: <ClipboardCheck size={18} /> },
    ]

    const packages = [
        { id: 'vip', name: 'VIP Pass', price: 17990, comm: 0.10 },
        { id: 'gold', name: 'Gold Pass', price: 12990, comm: 0.08 },
        { id: 'silver', name: 'Silver Pass', price: 9990, comm: 0.05 },
        { id: 'pvip', name: 'Princess VIP Pass', price: 12990, comm: 0.10 },
        { id: 'pgold', name: 'Princess Gold Pass', price: 8990, comm: 0.08 },
        { id: 'psilver', name: 'Princess Silver Pass', price: 6990, comm: 0.05 },
    ]

    const currentIndex = steps.findIndex(s => s.id === currentStepId)
    const progressWidth = ((currentIndex + 1) / steps.length) * 100
    const stepRatio = `${currentIndex + 1}/${steps.length}`

    useEffect(() => {
        const fetchHistory = async () => {
            if (!phone) return
            const { data } = await supabase.from('leads_history').select('*').eq('phone_number', phone).order('created_at', { ascending: false })
            if (data) {
                setHistory(data)
                // පරණ priority status එක මෙතනින් ගන්නවා
                if (data.length > 0) setIsPriority(data[0].is_priority)
            }
        }
        fetchHistory()
    }, [phone])

    const handleBack = () => {
        if (history.length > 0) { router.push('/dashboard/history') }
        else { router.push('/entry') }
    }

    const handleStepSubmit = async () => {
        if (!notes && currentStepId !== 'order') return alert("Please add some notes!")
        if (currentStepId === 'order' && (!selectedPackage || !customerName)) return alert("Fill order details!")

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const pkg = packages.find(p => p.id === selectedPackage)

            // Logic: ඕඩර් එකක් නම් Priority එක ඔටෝම OFF වෙනවා
            const finalPriority = currentStepId === 'order' ? false : isPriority;

            const insertData: any = {
                worker_id: user?.id,
                phone_number: phone,
                last_step: currentStepId,
                notes: currentStepId === 'order' ? `Order: ${pkg?.name} (${customerName})` : notes,
                is_priority: finalPriority,
                created_at: new Date().toISOString()
            }

            if (currentStepId === 'order' && pkg) {
                insertData.package_name = pkg.name
                insertData.payment_amount = pkg.price
                insertData.commission_earned = pkg.price * pkg.comm
            }

            const { error } = await supabase.from('leads_history').insert([insertData])
            if (error) throw error
            router.push('/entry')
        } catch (err: any) { alert(err.message) } finally { setLoading(false) }
    }

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
                        {currentStepId === 'order' ? (
                            <div className="space-y-4 mt-4">
                                <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-5 rounded-[20px] bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-200" />
                                <select value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value)} className="w-full p-5 rounded-[20px] bg-white border border-gray-100 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-200">
                                    <option value="">Select Package</option>
                                    {packages.map(p => <option key={p.id} value={p.id}>{p.name} - LKR {p.price}</option>)}
                                </select>
                            </div>
                        ) : (
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
                        <button onClick={() => setShowAction(false)} className="absolute -top-3 -right-3 bg-white p-2 rounded-full border border-gray-100 shadow-md text-gray-400 text-[8px] font-black uppercase">Review</button>
                    </div>
                    <button onClick={handleStepSubmit} disabled={loading} className="w-full bg-[#EA1E63] text-white font-black p-5 rounded-full shadow-xl flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM & SUBMIT'}
                    </button>
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