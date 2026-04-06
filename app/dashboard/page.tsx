'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Bell, LayoutDashboard, PlusCircle, History, LogOut, Loader2 } from 'lucide-react'
import BottomNav from "../components/BottomNav"; // Import එක තියෙනවා

// KPI Circle Component
const KPICircle = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex flex-col items-center">
        <div className="relative h-20 w-20">
            <svg className="h-full w-full" viewBox="0 0 36 36">
                <path className="text-gray-100 stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="stroke-current" strokeWidth="3" strokeDasharray={`${value}, 100`} strokeLinecap="round" fill="none" style={{ color: color }} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-black text-gray-800">{value}%</span>
            </div>
        </div>
        <span className="mt-2 text-gray-400 font-black text-[9px] tracking-widest uppercase text-center">{label}</span>
    </div>
)

export default function Dashboard() {
    const router = useRouter()
    const pathname = usePathname()
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/'); return; }
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            if (data) setProfile(data)
            setLoading(false)
        }
        getProfile()
    }, [router])

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#EA1E63]" size={40} /></div>

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">

            {/* --- TOP BAR (STAY ALWAYS AT TOP) --- */}
            <div className="bg-[#FFE1EC] p-5 rounded-b-[35px] flex justify-between items-center shadow-sm z-50">
                <div className="flex items-center gap-2">
                    <Image src="/emma-logo.png" alt="Logo" width={28} height={28} priority />
                    <span className="text-[#EA1E63] font-black text-lg tracking-tighter">Emma Thinking</span>
                </div>
                <div className="flex items-center gap-3">
                    <Bell size={22} className="text-gray-700" />
                    <div className="h-9 w-9 bg-white rounded-full flex items-center justify-center text-[#EA1E63] font-black border border-pink-100 shadow-sm uppercase text-xs">
                        {profile?.full_name?.substring(0, 2) || 'US'}
                    </div>
                </div>
            </div>

            {/* --- MIDDLE CONTENT (SCROLLABLE AREA) --- */}
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-6">

                {/* New Entry Button */}
                <Link href="/entry" className="block">
                    <div className="bg-[#EA1E63] text-white p-5 rounded-[28px] flex items-center justify-between shadow-lg shadow-pink-100 active:scale-95 transition-all">
                        <div className="flex items-center gap-3">
                            <PlusCircle size={24} />
                            <span className="font-black tracking-tight text-sm">Enter New WhatsApp Lead</span>
                        </div>
                        <span className="text-white/40 font-black text-xl">→</span>
                    </div>
                </Link>

                {/* KPI Card */}
                <div className="bg-gray-50/60 rounded-[35px] p-6 border border-gray-100">
                    <h2 className="text-[9px] font-black text-gray-400 mb-6 uppercase tracking-[0.2em]">Live Performance</h2>
                    <div className="flex justify-between gap-2">
                        <KPICircle label="Message" value={0} color="#EA1E63" />
                        <KPICircle label="Call" value={0} color="#EA1E63" />
                        <KPICircle label="Feedback" value={0} color="#EA1E63" />
                    </div>
                </div>

                {/* Status List */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Recent Tasks</h3>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white border border-gray-50 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-[#EA1E63] font-bold text-xs">{i}</div>
                                <div>
                                    <p className="text-xs font-black text-gray-800">Processing Lead #{i}04</p>
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Status: Active</p>
                                </div>
                            </div>
                            <span className="text-[8px] font-black text-pink-300">JUST NOW</span>
                        </div>
                    ))}
                </div>

                {/* Footer Credits */}
                <div className="kossa-footer py-4">Made By Kossa • v1.0.2</div>
            </div>

            {/* --- BOTTOM NAVIGATION COMPONENT --- */}
            <BottomNav />

        </div>
    )
}