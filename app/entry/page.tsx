'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2, Bell, ChevronRight, Phone, History as HistoryIcon, Target, Clipboard, Check, LayoutDashboard, PlusCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function NumberEntry() {
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [dailyCount, setDailyCount] = useState(0)
    const [country, setCountry] = useState('LK')
    const [pasted, setPasted] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const fetchDailyGoal = async () => {
            const today = new Date().toISOString().split('T')[0]
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('leads_history')
                .select('phone_number')
                .eq('worker_id', user.id)
                .gte('created_at', today)

            if (data) {
                const uniqueNumbers = new Set(data.map(item => item.phone_number)).size
                setDailyCount(uniqueNumbers)
            }
        }
        fetchDailyGoal()
    }, [])

    const countryDialCodes: { code: string; dial: string; digits: number }[] = [
        { code: 'LK', dial: '94', digits: 9 },
        { code: 'AE', dial: '971', digits: 9 },
        { code: 'QA', dial: '974', digits: 8 },
        { code: 'AU', dial: '61', digits: 9 },
        { code: 'JP', dial: '81', digits: 10 },
        { code: 'CN', dial: '86', digits: 11 },
        { code: 'KR', dial: '82', digits: 10 },
        { code: 'OM', dial: '968', digits: 8 },
        { code: 'GB', dial: '44', digits: 10 },
        { code: 'US', dial: '1', digits: 10 },
        { code: 'MV', dial: '960', digits: 7 },
        { code: 'KW', dial: '965', digits: 8 },
        { code: 'CA', dial: '1', digits: 10 },
        { code: 'IT', dial: '39', digits: 10 },
        { code: 'FR', dial: '33', digits: 9 },
        { code: 'IL', dial: '972', digits: 9 },
        { code: 'RO', dial: '40', digits: 9 },
    ]

    const handleSmartPaste = async () => {
        try {
            const text = await navigator.clipboard.readText()
            const cleaned = text.replace(/\D/g, '') // strip everything except digits

            // Try to match a country dial code at the start
            // Sort by dial length descending so longer codes match first (e.g. 971 before 1)
            const sorted = [...countryDialCodes].sort((a, b) => b.dial.length - a.dial.length)

            let matched = false
            for (const c of sorted) {
                if (cleaned.startsWith(c.dial)) {
                    const local = cleaned.slice(c.dial.length)
                    if (local.length === c.digits) {
                        setCountry(c.code)
                        setPhone(local)
                        setPasted(true)
                        setTimeout(() => setPasted(false), 2000)
                        matched = true
                        break
                    }
                }
            }

            if (!matched) {
                // No country prefix found — just take last 9 digits as fallback
                const last9 = cleaned.slice(-9)
                if (last9.length === 9) {
                    setPhone(last9)
                    setPasted(true)
                    setTimeout(() => setPasted(false), 2000)
                } else {
                    alert("Invalid number in clipboard!")
                }
            }
        } catch (err) {
            alert("Please allow clipboard access!")
        }
    }

    const startJob = async () => {
        if (phone.length < 9) return alert("Please enter a valid number")
        setLoading(true)
        try {
            const { data } = await supabase.from('leads_history').select('last_step').eq('phone_number', phone).order('created_at', { ascending: false }).limit(1)
            let nextStep = 'messages'
            if (data && data.length > 0) {
                const last = data[0].last_step
                const flow = ['messages', 'calls', 'feedback', 'order']
                const currentIndex = flow.indexOf(last)
                if (currentIndex !== -1 && currentIndex < flow.length - 1) {
                    nextStep = flow[currentIndex + 1]
                }
            }
            router.push(`/entry/process?phone=${phone}&step=${nextStep}`)
        } catch (err: any) { alert("Error: " + err.message) } finally { setLoading(false) }
    }

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            <div className="bg-[#FFE1EC] p-5 rounded-b-[35px] flex justify-between items-center shadow-sm z-50">
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-xl shadow-sm">
                        <Image src="/emma-logo.png" alt="Logo" width={28} height={28} priority />
                    </div>
                    <span className="text-[#EA1E63] font-black text-lg tracking-tighter">Emma Thinking</span>
                </div>
                <div className="h-9 w-9 bg-white border-2 border-pink-100 rounded-full flex items-center justify-center text-[#EA1E63] font-black text-[10px]">US</div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">New Job Entry</h1>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 text-center sm:text-left">Lead Generation & Processing</p>
                </div>

                <div className="w-full bg-gradient-to-br from-gray-50 to-white p-8 rounded-[45px] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="relative">
                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-4 rounded-[25px] shadow-sm border border-pink-50 text-[#EA1E63]"><Phone size={32} strokeWidth={2.5} /></div>
                        </div>
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-4 block text-center italic">Customer Phone Number</label>
                        <div className="flex gap-2 relative">
                            <div className="flex items-center gap-2 bg-white border-2 border-gray-100 px-3 rounded-[20px] shadow-sm">
                                <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none text-xs cursor-pointer">
                                    <option value="LK">🇱🇰 +94</option>
                                    <option value="AE">🇦🇪 +971</option>
                                    <option value="QA">🇶🇦 +974</option>
                                    <option value="AU">🇦🇺 +61</option>
                                    <option value="JP">🇯🇵 +81</option>
                                    <option value="CN">🇨🇳 +86</option>
                                    <option value="KR">🇰🇷 +82</option>
                                    <option value="OM">🇴🇲 +968</option>
                                    <option value="GB">🇬🇧 +44</option>
                                    <option value="US">🇺🇸 +1</option>
                                    <option value="MV">🇲🇻 +960</option>
                                    <option value="KW">🇰🇼 +965</option>
                                    <option value="CA">🇨🇦 +1</option>
                                    <option value="IT">🇮🇹 +39</option>
                                    <option value="FR">🇫🇷 +33</option>
                                    <option value="IL">🇮🇱 +972</option>
                                    <option value="RO">🇷🇴 +40</option>
                                </select>
                            </div>
                            <div className="relative flex-grow">
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="7X XXX XXXX" className="w-full pl-6 pr-12 py-5 rounded-[25px] bg-white border-2 border-gray-100 outline-none font-black text-gray-800 shadow-sm focus:border-[#EA1E63] focus:ring-4 focus:ring-pink-50 transition-all text-lg tracking-widest" />
                                <button onClick={handleSmartPaste} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#EA1E63] hover:scale-110 active:scale-90 transition-all">
                                    {pasted ? <Check size={20} strokeWidth={3} /> : <Clipboard size={20} />}
                                </button>
                            </div>
                        </div>
                        <button onClick={startJob} disabled={loading || phone.length < 9} className={`w-full mt-8 p-5 rounded-full font-black text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${phone.length >= 9 ? 'bg-[#EA1E63] hover:bg-pink-700 shadow-pink-200' : 'bg-gray-200 cursor-not-allowed shadow-none'}`}>
                            {loading ? <Loader2 className="animate-spin" /> : <><span>START JOB NOW</span><ChevronRight size={20} strokeWidth={3} /></>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-pink-50/50 p-5 rounded-[30px] border border-pink-100 flex flex-col gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Recent Lead</span>
                        <span className="text-xs font-bold text-gray-700 truncate">{phone || 'None'}</span>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-[30px] border border-gray-100 flex flex-col gap-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Daily Goal</span>
                        <span className="text-sm font-black text-[#EA1E63]">{dailyCount} / 30 Tasks</span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-50">
                <div className="bg-white border border-pink-100 rounded-full p-1.5 flex justify-between items-center shadow-lg">
                    <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-2.5 rounded-full transition-all ${pathname === '/dashboard' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}><LayoutDashboard size={20} /><span className="text-[8px] font-black mt-0.5 uppercase">Home</span></Link>
                    <Link href="/dashboard/history" className={`flex-1 flex flex-col items-center py-2.5 rounded-full transition-all ${pathname === '/dashboard/history' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}><HistoryIcon size={20} /><span className="text-[8px] font-black mt-0.5 uppercase">History</span></Link>
                    <Link href="/entry" className={`flex-1 flex flex-col items-center py-2.5 rounded-full transition-all ${pathname === '/entry' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}><PlusCircle size={20} /><span className="text-[8px] font-black mt-0.5 uppercase">Entry</span></Link>
                </div>
            </div>
        </div>
    )
}