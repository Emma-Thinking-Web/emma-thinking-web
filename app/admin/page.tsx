'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Users, UserPlus, Trash2, Loader2, ShieldCheck, LogOut,
    Briefcase, Send, ClipboardList, Plus, Calendar, X, CheckCircle2
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
    interface Worker {
        id: string
        full_name: string
        email: string
        post_label: string
        access_level: string[]
        targets?: any
        commission_rates?: any
        level?: string
    }

    interface Task {
        id: string
        worker_id: string
        worker_name: string
        worker_phone: string
        title: string
        description: string
        deadline: string
        status: string
        sms_sent_5: boolean
        sms_sent_3: boolean
        sms_sent_0: boolean
        created_at: string
    }

    const [workers, setWorkers] = useState<Worker[]>([])
    const [packages, setPackages] = useState<any[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [activeTab, setActiveTab] = useState('workers')
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [sending, setSending] = useState(false)
    const [taskLoading, setTaskLoading] = useState(false)
    const router = useRouter()

    // Customer WhatsApp States
    const [custName, setCustName] = useState('')
    const [custPhone, setCustPhone] = useState('')

    // Edit Modal States
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
    const [tempTargets, setTempTargets] = useState<any>({ p1: 10, p2: 10, p3: 10, p4: 10, p5: 10, p6: 10 })
    const [tempCommissions, setTempCommissions] = useState<any>({ p1: 10, p2: 8, p3: 5, p4: 10, p5: 8, p6: 5 })

    // Task Form States
    const [taskForm, setTaskForm] = useState({
        worker_id: '',
        worker_phone: '',
        title: '',
        description: '',
        deadline: '',
    })
    const [taskFormOpen, setTaskFormOpen] = useState(false)

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

    const fetchTasks = async () => {
        const { data } = await supabase.from('tasks').select('*').order('deadline', { ascending: true })
        if (data) setTasks(data as Task[])
    }

    useEffect(() => {
        fetchWorkers()
        fetchPackages()
        fetchTasks()
    }, [])

    const handleAccessChange = (id: string) => {
        setFormData(prev => ({
            ...prev,
            access: prev.access.includes(id) ? prev.access.filter(item => item !== id) : [...prev.access, id]
        }))
    }

    const handleSendWelcome = async (e: React.FormEvent) => {
        e.preventDefault()
        setSending(true)
        try {
            const res = await fetch('/api/send-welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: custName, phone: custPhone }),
            })
            if (res.ok) {
                alert('✅ WhatsApp Pack Sent Successfully!')
                setCustName('')
                setCustPhone('')
            } else {
                alert('❌ Failed to send WhatsApp.')
            }
        } catch {
            alert('❌ Connection Error')
        } finally {
            setSending(false)
        }
    }

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
                alert('Worker Registered Successfully! ✅')
                setFormData({ fullName: '', email: '', password: '', postLabel: '', access: [] })
                setActiveTab('workers')
                fetchWorkers()
            }
        } catch (error: any) { alert('Admin Error: ' + error.message) }
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
            alert('Worker Config Updated! 🚀')
            setEditingWorker(null)
            fetchWorkers()
        }
        setUpdating(false)
    }

    // ── TASK FUNCTIONS ──────────────────────────────────────────
    const handleWorkerSelect = (workerId: string) => {
        const worker = workers.find(w => w.id === workerId)
        setTaskForm(prev => ({
            ...prev,
            worker_id: workerId,
            worker_phone: '',  // admin fills phone manually per task
        }))
    }

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!taskForm.worker_id || !taskForm.title || !taskForm.deadline || !taskForm.worker_phone) {
            alert('Please fill all required fields')
            return
        }
        setTaskLoading(true)
        const worker = workers.find(w => w.id === taskForm.worker_id)
        const { error } = await supabase.from('tasks').insert([{
            worker_id: taskForm.worker_id,
            worker_name: worker?.full_name || '',
            worker_phone: taskForm.worker_phone,
            title: taskForm.title,
            description: taskForm.description,
            deadline: taskForm.deadline,
            status: 'active',
            sms_sent_5: false,
            sms_sent_3: false,
            sms_sent_0: false,
            created_at: new Date().toISOString()
        }])
        if (!error) {
            alert('Task Added! ✅')
            setTaskForm({ worker_id: '', worker_phone: '', title: '', description: '', deadline: '' })
            setTaskFormOpen(false)
            fetchTasks()
        } else {
            alert('Error: ' + error.message)
        }
        setTaskLoading(false)
    }

    const handleDeleteTask = async (id: string) => {
        if (!confirm('Delete this task?')) return
        await supabase.from('tasks').delete().eq('id', id)
        fetchTasks()
    }

    const handleMarkTaskDone = async (id: string) => {
        await supabase.from('tasks').update({ status: 'done' }).eq('id', id)
        fetchTasks()
    }

    function getDaysLeft(deadline: string): number {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(deadline)
        end.setHours(0, 0, 0, 0)
        return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }

    function getProgressPercent(createdAt: string, deadline: string): number {
        const start = new Date(createdAt).getTime()
        const end = new Date(deadline).getTime()
        const now = Date.now()
        const total = end - start
        const elapsed = now - start
        if (total <= 0) return 100
        return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
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
                    {[
                        { id: 'workers', icon: <Users size={18} />, label: 'Workers List' },
                        { id: 'tasks', icon: <ClipboardList size={18} />, label: 'Tasks' },
                        { id: 'customers', icon: <Send size={18} />, label: 'New Customer' },
                        { id: 'add', icon: <UserPlus size={18} />, label: 'Registration' },
                        { id: 'packages', icon: <Briefcase size={18} />, label: 'Packages' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-[20px] font-bold ${activeTab === tab.id ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400'}`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                    className="flex items-center gap-4 p-4 text-gray-400 font-bold hover:text-red-500 mt-auto">
                    <LogOut size={18} /> Logout
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col overflow-hidden">
                <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-8 flex justify-between items-center z-10">
                    <h1 className="text-3xl font-black tracking-tighter italic uppercase text-gray-800">{activeTab}</h1>
                    <div className="flex items-center gap-5 italic font-black text-sm">
                        Dilshan Jayawickrama
                        <div className="h-10 w-10 bg-[#EA1E63] rounded-xl flex items-center justify-center text-white">K</div>
                    </div>
                </header>

                <div className="flex-grow p-12 overflow-y-auto">

                    {/* ── TASKS TAB ── */}
                    {activeTab === 'tasks' && (
                        <div className="space-y-6 max-w-5xl mx-auto">
                            {/* Add Task Button */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-gray-800 italic tracking-tighter">Worker Tasks</h2>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{tasks.length} total tasks</p>
                                </div>
                                <button onClick={() => setTaskFormOpen(true)}
                                    className="bg-[#EA1E63] text-white font-black px-8 py-4 rounded-[20px] flex items-center gap-3 shadow-lg shadow-pink-100">
                                    <Plus size={18} /> Add Task
                                </button>
                            </div>

                            {/* Tasks Table */}
                            <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
                                {tasks.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <ClipboardList size={40} className="text-gray-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-gray-300">No tasks yet. Add one above.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-gray-100 font-black uppercase text-[10px] text-gray-400 tracking-widest">
                                            <tr>
                                                <th className="p-6">Worker</th>
                                                <th className="p-6">Task</th>
                                                <th className="p-6">Deadline</th>
                                                <th className="p-6">Progress</th>
                                                <th className="p-6">Status</th>
                                                <th className="p-6 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 font-bold text-gray-800">
                                            {tasks.map((task) => {
                                                const daysLeft = getDaysLeft(task.deadline)
                                                const progress = getProgressPercent(task.created_at, task.deadline)
                                                const isDone = task.status === 'done'
                                                const isUrgent = daysLeft <= 2 && !isDone
                                                const isOverdue = daysLeft < 0 && !isDone
                                                const barColor = isOverdue ? '#ef4444' : isUrgent ? '#f97316' : daysLeft <= 5 ? '#f59e0b' : '#EA1E63'

                                                return (
                                                    <tr key={task.id} className="hover:bg-pink-50/10">
                                                        <td className="p-6">
                                                            <div className="text-xs">{task.worker_name}</div>
                                                            <div className="text-[9px] text-gray-400">{task.worker_phone}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-xs max-w-[160px]">{task.title}</div>
                                                            {task.description && <div className="text-[9px] text-gray-400 line-clamp-1">{task.description}</div>}
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-xs">{new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                            <div className={`text-[9px] font-black ${isOverdue ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-gray-400'}`}>
                                                                {isDone ? '—' : isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due Today!' : `${daysLeft}d left`}
                                                            </div>
                                                        </td>
                                                        <td className="p-6 w-40">
                                                            {!isDone && (
                                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden w-32">
                                                                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: barColor }} />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${isDone ? 'bg-green-50 text-green-500' : isOverdue ? 'bg-red-50 text-red-500' : isUrgent ? 'bg-orange-50 text-orange-500' : 'bg-pink-50 text-[#EA1E63]'}`}>
                                                                {isDone ? 'Done' : isOverdue ? 'Overdue' : isUrgent ? 'Urgent' : 'Active'}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center justify-center gap-3">
                                                                {!isDone && (
                                                                    <button onClick={() => handleMarkTaskDone(task.id)} className="text-green-400 hover:text-green-600 transition-colors">
                                                                        <CheckCircle2 size={18} />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => handleDeleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

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
                                    <input type="text" value={formData.postLabel} onChange={(e) => setFormData({ ...formData, postLabel: e.target.value })} className="w-full bg-gray-50 p-6 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-100" placeholder="Post Label (e.g. Senior Agent)" />
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

                <footer className="p-8 text-center"><p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] italic">Made By Kossa • Enterprise v2.0.2</p></footer>
            </div>

            {/* Target Modal */}
            {editingWorker && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-12">
                    <div className="bg-white w-full max-w-5xl rounded-[70px] p-16 shadow-2xl animate-in zoom-in-95 relative">
                        <div className="flex justify-between items-start mb-12">
                            <div><h2 className="text-4xl font-black italic tracking-tighter text-gray-800">Sales Config</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">{editingWorker.full_name}</p></div>
                            <button onClick={() => setEditingWorker(null)} className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">✕</button>
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                            {['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((p, i) => {
                                const names = ["Silver", "Gold", "VIP", "P.Silver", "P.Gold", "P.VIP"]
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

            {/* Add Task Modal */}
            {taskFormOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[100] p-12">
                    <div className="bg-white w-full max-w-2xl rounded-[60px] p-14 shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-gray-800">New Task</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Assign to a worker</p>
                            </div>
                            <button onClick={() => setTaskFormOpen(false)} className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-400">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddTask} className="space-y-5">
                            {/* Worker Select */}
                            <select
                                required
                                value={taskForm.worker_id}
                                onChange={(e) => handleWorkerSelect(e.target.value)}
                                className="w-full bg-gray-50 p-5 rounded-[25px] font-bold text-gray-700 outline-none border-2 border-transparent focus:border-pink-100 appearance-none"
                            >
                                <option value="">Select Worker</option>
                                {workers.map(w => (
                                    <option key={w.id} value={w.id}>{w.full_name} — {w.post_label}</option>
                                ))}
                            </select>

                            {/* Worker Phone */}
                            <input
                                required
                                type="text"
                                value={taskForm.worker_phone}
                                onChange={(e) => setTaskForm({ ...taskForm, worker_phone: e.target.value })}
                                className="w-full bg-gray-50 p-5 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-pink-100"
                                placeholder="Worker Phone (077...)"
                            />

                            {/* Task Title */}
                            <input
                                required
                                type="text"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="w-full bg-gray-50 p-5 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-pink-100"
                                placeholder="Task Title"
                            />

                            {/* Description */}
                            <textarea
                                rows={3}
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                className="w-full bg-gray-50 p-5 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-pink-100 resize-none"
                                placeholder="Description (optional)"
                            />

                            {/* Deadline */}
                            <div className="relative">
                                <Calendar size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    required
                                    type="date"
                                    value={taskForm.deadline}
                                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                                    className="w-full bg-gray-50 p-5 pl-12 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-pink-100"
                                />
                            </div>

                            {/* SMS Reminder Info */}
                            <div className="bg-pink-50/50 rounded-[20px] p-5 border border-pink-100">
                                <p className="text-[9px] font-black text-[#EA1E63] uppercase tracking-widest mb-2">Auto SMS Reminders (8:00 AM)</p>
                                <div className="flex gap-3">
                                    {['5 days left', '3 days left', 'Deadline day'].map(d => (
                                        <span key={d} className="text-[8px] font-black text-gray-400 bg-white px-3 py-1.5 rounded-xl border border-pink-100">{d}</span>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={taskLoading} className="w-full bg-[#EA1E63] text-white font-black p-6 rounded-[30px] shadow-xl flex items-center justify-center gap-3 text-base">
                                {taskLoading ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> ADD TASK</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}