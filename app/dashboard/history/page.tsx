'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, ChevronRight, User, LayoutDashboard, History as HistoryIcon, PlusCircle, Star, ShoppingBag, Wallet, Calendar, CheckCircle2 } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function HistoryPage() {
    const [leads, setLeads] = useState<any[]>([])
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    const router = useRouter()
    const pathname = usePathname()
    const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma';

    const fetchHistoryAndProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabase.from('profiles').select('avatar_url, total_commission').eq('id', user.id).single()
        if (profileData) setProfile(profileData)

        const { data } = await supabase.from('leads_history').select('*').eq('worker_id', user.id).order('is_priority', { ascending: false }).order('created_at', { ascending: false })

        if (data) {
            const filtered = data.filter(item => {
                const itemDate = new Date(item.created_at).toISOString().split('T')[0];
                return item.is_priority === true || itemDate === selectedDate;
            });
            const unique = filtered.filter((v, i, a) => a.findIndex(t => t.phone_number === v.phone_number) === i)
            setLeads(unique)
        }
        setLoading(false)
    }

    useEffect(() => { fetchHistoryAndProfile() }, [selectedDate])

    const togglePriorityOff = async (e: React.MouseEvent, phone: string) => {
        e.stopPropagation();
        try {
            const { error } = await supabase.from('leads_history').update({ is_priority: false }).eq('phone_number', phone);
            if (error) throw error;
            fetchHistoryAndProfile();
        } catch (err: any) { alert(err.message) }
    }

    const getProgressWidth = (step: string) => {
        const flow: any = { 'messages': 25, 'calls': 50, 'feedback': 75, 'order': 100 };
        return flow[step] || 0;
    };

    const displayLeads = leads.filter(lead => {
        if (filter === 'orders') return lead.last_step === 'order';
        if (filter === 'priority') return lead.is_priority === true;
        return true;
    });

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#EA1E63]" size={40} /></div>

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            <div className="bg-[#FFE1EC] p-5 rounded-b-[35px] flex justify-between items-center shadow-sm z-50">
                <div className="flex items-center gap-2">
                    <Image src="/emma-logo.png" alt="Logo" width={28} height={28} priority />
                    <span className="text-[#EA1E63] font-black text-lg tracking-tighter italic">Emma History</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-white/60 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 border border-pink-100 shadow-sm">
                        <Wallet size={12} className="text-[#EA1E63]" />
                        <span className="text-[10px] font-black text-gray-800 italic">LKR {profile?.total_commission?.toLocaleString() || '0.00'}</span>
                    </div>
                    <Link href="/dashboard/profile">
                        <div className="h-9 w-9 bg-white rounded-full overflow-hidden border-2 border-white shadow-md transition-transform active:scale-90">
                            <img src={profile?.avatar_url || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    </Link>
                </div>
            </div>

            <div className="px-6 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-[#EA1E63] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>All</button>
                        <button onClick={() => setFilter('priority')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'priority' ? 'bg-pink-100 text-[#EA1E63]' : 'bg-gray-100 text-gray-400'}`}>Priority</button>
                        <button onClick={() => setFilter('orders')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'orders' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}>Orders</button>
                    </div>
                    <div className="relative bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-[#EA1E63] outline-none" />
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {displayLeads.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-[40px] border border-dashed border-gray-200"><p className="text-gray-300 font-black uppercase text-[10px]">Empty Records</p></div>
                ) : (
                    displayLeads.map((lead, idx) => {
                        const isOrder = lead.last_step === 'order';
                        const progress = getProgressWidth(lead.last_step);
                        return (
                            <div key={idx}
                                onClick={() => router.push(`/entry/process?phone=${lead.phone_number}&step=${isOrder ? 'messages' : lead.last_step}`)}
                                className={`p-5 rounded-[35px] border relative overflow-hidden active:scale-95 transition-all shadow-sm ${isOrder ? 'bg-rose-600 border-rose-700 text-white shadow-lg' : lead.is_priority ? 'bg-pink-50 border-pink-200' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl shadow-sm ${isOrder ? 'bg-white text-rose-600' : 'bg-white text-[#EA1E63]'}`}>
                                            {isOrder ? <CheckCircle2 size={18} /> : <User size={18} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-black ${isOrder ? 'text-white' : 'text-gray-800'}`}>{lead.phone_number}</p>
                                                {lead.is_priority && (
                                                    <button onClick={(e) => togglePriorityOff(e, lead.phone_number)} className="hover:scale-125 transition-transform">
                                                        <Star size={12} fill={isOrder ? "#fff" : "#EA1E63"} className={isOrder ? "text-white" : "text-[#EA1E63]"} />
                                                    </button>
                                                )}
                                            </div>
                                            <p className={`text-[9px] font-bold uppercase tracking-tight ${isOrder ? 'text-rose-100' : 'text-gray-400'}`}>Status: <span className="font-black italic">{lead.last_step}</span></p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className={isOrder ? "text-white/50" : "text-gray-300"} />
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5">
                                    <div className={`h-full transition-all duration-1000 ${isOrder ? 'bg-white/50' : 'bg-[#EA1E63]'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div className="p-4 bg-white border-t border-gray-50">
                <div className="bg-white border border-pink-100 rounded-full p-1.5 flex justify-between items-center shadow-lg">
                    <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-2.5 rounded-full ${pathname === '/dashboard' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}><LayoutDashboard size={20} /><span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">Home</span></Link>
                    <Link href="/dashboard/history" className={`flex-1 flex flex-col items-center py-2.5 rounded-full ${pathname === '/dashboard/history' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}><HistoryIcon size={20} /><span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">History</span></Link>
                    <Link href="/entry" className={`flex-1 flex flex-col items-center py-2.5 rounded-full ${pathname === '/entry' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}><PlusCircle size={20} /><span className="text-[8px] font-black mt-0.5 uppercase tracking-tighter">Entry</span></Link>
                </div>
            </div>
        </div>
    )
}