'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Users, UserPlus, Trash2, Loader2, ShieldCheck, LogOut,
    Settings2, Target, Percent, Laptop, Briefcase, Mail, Key, Send
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
    interface Worker {
        id: string;
        full_name: string;
        email: string;
        post_label: string;
        access_level: string[];
        targets?: any;
        commission_rates?: any;
        level?: string;
    }

    const [workers, setWorkers] = useState<Worker[]>([])
    const [packages, setPackages] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState('workers')
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [sending, setSending] = useState(false) // WhatsApp sending state
    const router = useRouter()

    // Customer WhatsApp States
    const [custName, setCustName] = useState('')
    const [custPhone, setCustPhone] = useState('')

    // Edit Modal States
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
    const [tempTargets, setTempTargets] = useState<any>({ p1: 10, p2: 10, p3: 10, p4: 10, p5: 10, p6: 10 })
    const [tempCommissions, setTempCommissions] = useState<any>({ p1: 10, p2: 8, p3: 5, p4: 10, p5: 8, p6: 5 })

    const accessOptions = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'attendance', label: 'Attendance' },
        { id: 'leads', label: 'Leads' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'matching', label: 'Matching' },
        { id: 'profile', label: 'Profile' }
    ]

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        postLabel: '',
        access: [] as string[]
    })

    const fetchWorkers = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('role', 'worker').order('created_at', { ascending: false })
        if (data) setWorkers(data as Worker[])
    }

    const fetchPackages = async () => {
        const { data } = await supabase.from('packages').select('*').order('id', { ascending: true })
        if (data) setPackages(data)
    }

    useEffect(() => {
        fetchWorkers()
        fetchPackages()
    }, [])

    const handleAccessChange = (id: string) => {
        setFormData(prev => ({
            ...prev,
            access: prev.access.includes(id) ? prev.access.filter(item => item !== id) : [...prev.access, id]
        }))
    }

    // WhatsApp Sending Logic
    const handleSendWelcome = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        try {
            const res = await fetch('/api/send-welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: custName, phone: custPhone }),
            });
            if (res.ok) {
                alert('✅ WhatsApp Pack Sent Successfully!');
                setCustName('');
                setCustPhone('');
            } else {
                alert('❌ Failed to send WhatsApp.');
            }
        } catch (err) {
            alert('❌ Connection Error');
        } finally {
            setSending(false);
        }
    };

    const handleAddWorker = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: { data: { full_name: formData.fullName, role: 'worker' } }
            })

            if (authError) throw authError

            if (authData?.user) {
                const { error: profileError } = await supabase.from('profiles').insert([{
                    id: authData.user.id,
                    email: formData.email,
                    full_name: formData.fullName,
                    post_label: formData.postLabel,
                    role: 'worker',
                    level: 'Silver',
                    access_level: formData.access,
                    targets: { p1: 10, p2: 10, p3: 10, p4: 10, p5: 10, p6: 10 },
                    commission_rates: { p1: 10, p2: 8, p3: 5, p4: 10, p5: 8, p6: 5 },
                    achievements: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
                    total_commission: 0,
                    warnings: 0,
                    created_at: new Date().toISOString()
                }])
                if (profileError) throw profileError
                alert("Worker Registered Successfully! ✅")
                setFormData({ fullName: '', email: '', password: '', postLabel: '', access: [] })
                setActiveTab('workers')
                fetchWorkers()
            }
        } catch (error: any) { alert("Admin Error: " + error.message) }
        finally { setLoading(false) }
    }

    const handleUpdatePackage = async (id: string, newPrice: number, newComm: number) => {
        const { error } = await supabase.from('packages').update({ price: newPrice, default_commission_rate: newComm }).eq('id', id)
        if (!error) fetchPackages()
    }

    const handleUpdateWorkerTargets = async () => {
        if (!editingWorker) return
        setUpdating(true)
        const { error } = await supabase.from('profiles').update({ targets: tempTargets, commission_rates: tempCommissions }).eq('id', editingWorker.id)
        if (!error) {
            alert("Worker Config Updated! 🚀")
            setEditingWorker(null)
            fetchWorkers()
        }
        setUpdating(false)
    }

    return (
        <div className="fixed inset-0 w-screen h-screen bg-gray-50 flex font-sans text-gray-900 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-100 flex flex-col p-8 z-20 shadow-sm">
                <div className="flex items-center gap-3 mb-12 pb-6 border-b border-pink-50">
                    <Image src="/emma-logo.png" alt="Logo" width={32} height={32} />
                    <span className="font-black text-[#EA1E63] text-xl tracking-tighter italic">Emma Admin</span>
                </div>
                <nav className="space-y-2 flex-grow overflow-y-auto">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4 mb-4">Management</p>
                    <button onClick={() => setActiveTab('workers')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] font-bold ${activeTab === 'workers' ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400'}`}><Users size={18} /> Workers List</button>
                    <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] font-bold ${activeTab === 'customers' ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400'}`}><Send size={18} /> New Customer</button>
                    <button onClick={() => setActiveTab('add')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] font-bold ${activeTab === 'add' ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400'}`}><UserPlus size={18} /> Registration</button>
                    <button onClick={() => setActiveTab('packages')} className={`w-full flex items-center gap-4 p-4 rounded-[20px] font-bold ${activeTab === 'packages' ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400'}`}><Briefcase size={18} /> Packages</button>
                </nav>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="flex items-center gap-4 p-4 text-gray-400 font-bold hover:text-red-500 mt-auto"><LogOut size={18} /> Logout</button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col overflow-hidden">
                <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-8 flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                        <Laptop size={24} className="text-gray-300" />
                        <h1 className="text-3xl font-black tracking-tighter italic uppercase text-gray-800">{activeTab}</h1>
                    </div>
                    <div className="flex items-center gap-5 italic font-black text-sm">Dilshan Jayawickrama <div className="h-10 w-10 bg-[#EA1E63] rounded-xl flex items-center justify-center text-white">K</div></div>
                </header>

                <div className="flex-grow p-12 overflow-y-auto">
                    {/* CUSTOMER WHATSAPP TAB */}
                    {activeTab === 'customers' && (
                        <div className="max-w-4xl mx-auto bg-white p-16 rounded-[60px] shadow-2xl border border-gray-100">
                            <h2 className="text-3xl font-black mb-10 italic tracking-tighter text-[#EA1E63]">Customer Onboarding</h2>
                            <form onSubmit={handleSendWelcome} className="space-y-8">
                                <div className="space-y-6">
                                    <input required type="text" value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-100" placeholder="Customer Name" />
                                    <input required type="text" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-100" placeholder="WhatsApp Number (077...)" />
                                </div>
                                <button type="submit" disabled={sending} className="w-full bg-[#EA1E63] text-white font-black p-8 rounded-[40px] shadow-2xl flex items-center justify-center gap-4 text-xl">
                                    {sending ? <Loader2 className="animate-spin" /> : <>SEND WELCOME PACK <Send size={24} /></>}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* WORKERS LIST */}
                    {activeTab === 'workers' && (
                        <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-[10px] text-gray-400 tracking-widest">
                                    <tr><th className="p-8">Details</th><th className="p-8">Level</th><th className="p-8 text-center">Manage</th><th className="p-8">Access</th><th className="p-8 text-center">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-bold text-gray-800">
                                    {workers.map((w) => (
                                        <tr key={w.id} className="hover:bg-pink-50/20">
                                            <td className="p-8"><div>{w.full_name}</div><div className="text-[10px] text-[#EA1E63]">{w.post_label}</div></td>
                                            <td className="p-8"><span className="bg-gray-100 px-4 py-1 rounded-full text-[10px]">{w.level || 'Silver'}</span></td>
                                            <td className="p-8 text-center"><button onClick={() => { setEditingWorker(w); setTempTargets(w.targets); setTempCommissions(w.commission_rates); }} className="text-[#EA1E63] border-2 border-pink-50 px-5 py-2 rounded-xl text-[10px] uppercase">Targets</button></td>
                                            <td className="p-8"><div className="flex gap-1 flex-wrap max-w-[150px]">{w.access_level?.map(a => <span key={a} className="bg-white border text-[8px] p-1 rounded-md">{a}</span>)}</div></td>
                                            <td className="p-8 text-center text-gray-300"><Trash2 size={18} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* NEW REGISTRATION */}
                    {activeTab === 'add' && (
                        <div className="max-w-5xl mx-auto bg-white p-16 rounded-[60px] shadow-2xl border border-gray-100">
                            <h2 className="text-3xl font-black mb-10 italic tracking-tighter">Onboarding System</h2>
                            <form onSubmit={handleAddWorker} className="grid grid-cols-12 gap-8">
                                <div className="col-span-8 space-y-6">
                                    <input required type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full bg-gray-50 p-6 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-100" placeholder="Full Name" />
                                    <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-gray-50 p-6 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-100" placeholder="worker@emma.com" />
                                    <input required type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full bg-pink-50/20 p-6 rounded-[30px] border-2 border-pink-100 text-[#EA1E63] font-black outline-none" placeholder="Password" />
                                </div>
                                <div className="col-span-4 bg-gray-50 p-8 rounded-[40px] space-y-3">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Permissions</p>
                                    {accessOptions.map(o => (
                                        <div key={o.id} onClick={() => handleAccessChange(o.id)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer font-black text-[9px] uppercase ${formData.access.includes(o.id) ? 'bg-[#EA1E63] border-[#EA1E63] text-white shadow-lg' : 'bg-white text-gray-300'}`}>{o.label}</div>
                                    ))}
                                </div>
                                <button type="submit" disabled={loading} className="col-span-12 bg-[#EA1E63] text-white font-black p-8 rounded-[40px] shadow-2xl flex items-center justify-center gap-4 text-xl">
                                    {loading ? <Loader2 className="animate-spin" /> : <>REGISTER EMPLOYEE <Send size={24} /></>}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* PACKAGES CONTROL */}
                    {activeTab === 'packages' && (
                        <div className="grid grid-cols-3 gap-8">
                            {packages.map((pkg) => (
                                <div key={pkg.id} className="bg-white p-10 rounded-[50px] shadow-xl border border-gray-100 space-y-6">
                                    <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase text-[#EA1E63] italic">{pkg.name}</span><Briefcase size={16} className="text-gray-200" /></div>
                                    <div><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">Price (LKR)</label>
                                        <input type="number" defaultValue={pkg.price} onBlur={(e) => handleUpdatePackage(pkg.id, parseInt(e.target.value), pkg.default_commission_rate)} className="w-full bg-gray-50 p-5 rounded-[25px] font-black text-lg text-gray-800 outline-none border-2 border-transparent focus:border-pink-100 transition-all shadow-inner" /></div>
                                    <div><label className="text-[8px] font-black text-[#EA1E63] uppercase tracking-widest ml-4 mb-2 block">Default Comm (%)</label>
                                        <input type="number" defaultValue={pkg.default_commission_rate} onBlur={(e) => handleUpdatePackage(pkg.id, pkg.price, parseInt(e.target.value))} className="w-full bg-pink-50/20 p-5 rounded-[25px] font-black text-lg text-[#EA1E63] outline-none border-2 border-pink-100 transition-all shadow-inner" /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="p-8 text-center"><p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] italic">Made By Kossa • Enterprise v2.0.1</p></footer>
            </div>

            {/* Target Modal */}
            {editingWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-12">
                    <div className="bg-white w-full max-w-5xl rounded-[70px] p-16 shadow-2xl animate-in zoom-in-95 relative">
                        <div className="flex justify-between items-start mb-12"><div><h2 className="text-4xl font-black italic tracking-tighter text-gray-800">Sales Config</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{editingWorker.full_name}</p></div><button onClick={() => setEditingWorker(null)} className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">✕</button></div>
                        <div className="grid grid-cols-3 gap-6">
                            {['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((p, i) => {
                                const names = ["Silver", "Gold", "VIP", "P.Silver", "P.Gold", "P.VIP"];
                                return (
                                    <div key={p} className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 space-y-4">
                                        <p className="text-[10px] font-black text-[#EA1E63] uppercase italic">{names[i]}</p>
                                        <input type="number" value={tempTargets[p]} onChange={(e) => setTempTargets({ ...tempTargets, [p]: parseInt(e.target.value) })} className="w-full bg-white p-4 rounded-2xl text-xs font-bold" placeholder="Target" />
                                        <input type="number" value={tempCommissions[p]} onChange={(e) => setTempCommissions({ ...tempCommissions, [p]: parseInt(e.target.value) })} className="w-full bg-white p-4 rounded-2xl text-xs font-black text-[#EA1E63]" placeholder="Comm %" />
                                    </div>
                                )
                            })}
                        </div>
                        <button onClick={handleUpdateWorkerTargets} disabled={updating} className="w-full mt-10 bg-[#EA1E63] text-white font-black p-8 rounded-full shadow-2xl flex items-center justify-center gap-4 text-xl">
                            {updating ? <Loader2 className="animate-spin" /> : <>SAVE WORKER CONFIG <ShieldCheck size={24} /></>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}