'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
    Loader2, CheckCircle2, Clock, AlertTriangle,
    X, CalendarDays, Bell, Search, User, ChevronRight,
    MessageCircle, Phone, ClipboardCheck, UserCheck, Receipt
} from 'lucide-react'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'

interface Task {
    id: string
    title: string
    description: string
    deadline: string
    status: string
    created_at: string
    worker_phone: string
}

interface AssignedCustomer {
    phone_number: string
    transferred_to_name: string
    notes: string
    created_at: string
    worker_id: string
}

interface LeadHistory {
    id: string
    phone_number: string
    last_step: string
    notes: string
    created_at: string
    worker_id: string
    transferred_to_name?: string
    payment_amount?: number
    commission_earned?: number
    package_name?: string
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

// ── STEP ICON ──────────────────────────────────────────────────────────────────
const StepIcon = ({ step }: { step: string }) => {
    if (step === 'messages') return <MessageCircle size={14} className="text-blue-400" />
    if (step === 'calls') return <Phone size={14} className="text-purple-400" />
    if (step === 'feedback') return <UserCheck size={14} className="text-amber-400" />
    if (step === 'order') return <ClipboardCheck size={14} className="text-green-500" />
    if (step === 'transfer') return <ChevronRight size={14} className="text-pink-400" />
    return <Clock size={14} className="text-gray-400" />
}

const stepColor = (step: string) => {
    if (step === 'messages') return 'bg-blue-50 text-blue-500'
    if (step === 'calls') return 'bg-purple-50 text-purple-500'
    if (step === 'feedback') return 'bg-amber-50 text-amber-500'
    if (step === 'order') return 'bg-green-50 text-green-600'
    if (step === 'transfer') return 'bg-pink-50 text-pink-500'
    return 'bg-gray-50 text-gray-400'
}

// ── CUSTOMER DETAIL MODAL ──────────────────────────────────────────────────────
const CustomerModal = ({
    phone,
    onClose,
}: {
    phone: string
    onClose: () => void
}) => {
    const [history, setHistory] = useState<LeadHistory[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            const { data } = await supabase
                .from('leads_history')
                .select('*')
                .eq('phone_number', phone)
                .order('created_at', { ascending: true })
            if (data) setHistory(data)
            setLoading(false)
        }
        fetch()
    }, [phone])

    const assignedBy = history.find(h => h.last_step === 'transfer')
    const orderRecord = history.find(h => h.last_step === 'order')
    const messageHistory = history.filter(h => h.last_step === 'messages')
    const callHistory = history.filter(h => h.last_step === 'calls')

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-6"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#FFE1EC] px-6 pt-6 pb-5">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <User size={22} className="text-[#EA1E63]" />
                            </div>
                            <div>
                                <p className="text-base font-black text-gray-800 tracking-tight">{phone}</p>
                                {assignedBy && (
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">
                                        Assigned by {assignedBy.transferred_to_name || 'Unknown'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-gray-400"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Step pills */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                        {['messages', 'calls', 'feedback', 'order'].map(step => {
                            const done = history.some(h => h.last_step === step)
                            return (
                                <span
                                    key={step}
                                    className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${done ? stepColor(step) : 'bg-white/50 text-gray-300'}`}
                                >
                                    {step}
                                </span>
                            )
                        })}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-[#EA1E63]" size={24} />
                    </div>
                ) : (
                    <div className="overflow-y-auto max-h-[60vh] px-5 py-5 space-y-4">

                        {/* Order / Invoice */}
                        {orderRecord && (
                            <div className="bg-green-50 border border-green-100 rounded-[20px] p-4 space-y-2">
                                <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Order</p>
                                <p className="text-xs font-black text-gray-800">{orderRecord.package_name || 'Package'}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500">Amount</span>
                                    <span className="text-sm font-black text-green-600">LKR {orderRecord.payment_amount?.toLocaleString() || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-500">Commission</span>
                                    <span className="text-[10px] font-black text-green-500">LKR {orderRecord.commission_earned?.toLocaleString() || '—'}</span>
                                </div>
                                <p className="text-[9px] text-gray-400 font-bold italic mt-1">{orderRecord.notes}</p>
                            </div>
                        )}

                        {/* Full timeline */}
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3">Full History</p>
                            <div className="border-l-2 border-pink-100 ml-3 pl-5 space-y-4">
                                {history.map((item, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[25px] top-1 w-4 h-4 bg-white border-2 border-[#EA1E63] rounded-full flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 bg-[#EA1E63] rounded-full" />
                                        </div>
                                        <div className="bg-gray-50 rounded-[18px] p-4 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <StepIcon step={item.last_step} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${stepColor(item.last_step)}`}>
                                                        {item.last_step}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] text-gray-300 font-bold">
                                                    {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    {' '}
                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-600 font-bold italic leading-relaxed">"{item.notes}"</p>
                                            {item.transferred_to_name && (
                                                <p className="text-[9px] text-pink-400 font-black">→ Transferred to {item.transferred_to_name}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── TASK DETAIL MODAL ──────────────────────────────────────────────────────────
const TaskModal = ({
    task,
    onClose,
    onMarkDone,
}: {
    task: Task
    onClose: () => void
    onMarkDone: (id: string) => Promise<void>
}) => {
    const [confirming, setConfirming] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const daysLeft = getDaysLeft(task.deadline)
    const progress = getProgressPercent(task.created_at, task.deadline)
    const isDone = task.status === 'done'
    const isOverdue = daysLeft < 0 && !isDone
    const isUrgent = daysLeft <= 2 && !isDone

    const barColor = isOverdue ? '#ef4444' : isUrgent ? '#f97316' : daysLeft <= 5 ? '#f59e0b' : '#EA1E63'

    const statusLabel = isDone
        ? 'Completed'
        : isOverdue
            ? `${Math.abs(daysLeft)}d overdue`
            : daysLeft === 0
                ? 'Due Today!'
                : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`

    const handleConfirmDone = async () => {
        setSubmitting(true)
        await onMarkDone(task.id)
        setSubmitting(false)
        setConfirming(false)
        onClose()
    }

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-6"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : isUrgent || isOverdue ? 'bg-red-50' : 'bg-pink-50'}`}>
                            {isDone ? <CheckCircle2 size={20} className="text-green-500" />
                                : isUrgent || isOverdue ? <AlertTriangle size={20} className="text-red-400" />
                                    : <Clock size={20} className="text-[#EA1E63]" />}
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-800 leading-tight">{task.title}</p>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 ${isDone ? 'bg-green-50 text-green-500' : isOverdue ? 'bg-red-50 text-red-500' : isUrgent ? 'bg-orange-50 text-orange-500' : 'bg-pink-50 text-[#EA1E63]'}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <X size={14} />
                    </button>
                </div>

                {task.description ? (
                    <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description</p>
                        <p className="text-xs font-bold text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-2xl p-4">
                        <p className="text-[10px] text-gray-300 font-bold italic">No description provided.</p>
                    </div>
                )}

                <div className="flex items-center gap-3 px-1">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Deadline:{' '}
                        <span className="text-gray-700">
                            {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </span>
                </div>

                {!isDone && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-[8px] text-gray-300 font-bold">
                                {new Date(task.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[8px] text-gray-400 font-black">{progress}% elapsed</span>
                            <span className="text-[8px] text-gray-400 font-black">
                                {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: barColor }} />
                        </div>
                    </div>
                )}

                {isOverdue && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 items-start">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] font-black text-red-400 leading-relaxed uppercase tracking-wide">
                            This task is overdue. It cannot be dismissed until marked as done.
                        </p>
                    </div>
                )}

                {isDone ? (
                    <div className="flex items-center justify-center gap-2 py-3">
                        <CheckCircle2 size={18} className="text-green-400" />
                        <span className="text-xs font-black text-green-400 uppercase tracking-widest">Task Completed</span>
                    </div>
                ) : !confirming ? (
                    <button
                        onClick={() => setConfirming(true)}
                        className="w-full bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-500 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all border border-gray-100 hover:border-green-100"
                    >
                        Mark as Done ✓
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Are you sure?</p>
                            <p className="text-[9px] text-amber-500 font-bold mt-1">
                                This will mark "{task.title}" as completed. This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirming(false)} disabled={submitting} className="flex-1 bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl">
                                Cancel
                            </button>
                            <button onClick={handleConfirmDone} disabled={submitting} className="flex-1 bg-green-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <>Yes, Done ✓</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────────
export default function Dashboard() {
    const router = useRouter()
    const [profile, setProfile] = useState<any>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomer[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/'); return }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            if (profileData) setProfile(profileData)

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    await supabase.from('profiles').update({
                        last_lat: pos.coords.latitude,
                        last_lng: pos.coords.longitude,
                        last_seen: new Date().toISOString(),
                    }).eq('id', user.id)
                })
            }

            const { data: taskData } = await supabase
                .from('tasks')
                .select('*')
                .eq('worker_id', user.id)
                .order('deadline', { ascending: true })
            if (taskData) setTasks(taskData)

            // Fetch customers transferred to this user
            const { data: transferData } = await supabase
                .from('leads_history')
                .select('*')
                .eq('last_step', 'transfer')
                .eq('transferred_to', user.id)
                .order('created_at', { ascending: false })

            if (transferData) {
                // Deduplicate by phone number — keep latest
                const seen = new Set()
                const unique = transferData.filter((item: any) => {
                    if (seen.has(item.phone_number)) return false
                    seen.add(item.phone_number)
                    return true
                })
                setAssignedCustomers(unique)
            }

            setLoading(false)
        }
        init()
    }, [router])

    const handleMarkDone = async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId)
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'done', updated_at: new Date().toISOString() })
            .eq('id', taskId)

        if (!error) {
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'done' } : t)))
            if (task && profile) {
                try {
                    await fetch('/api/notify-complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            workerName: profile.full_name,
                            workerPhone: task.worker_phone,
                            taskTitle: task.title,
                        }),
                    })
                } catch {
                    // SMS failure is non-blocking
                }
            }
        }
    }

    const filteredCustomers = assignedCustomers.filter(c =>
        c.phone_number.toLowerCase().includes(search.toLowerCase())
    )

    if (loading)
        return (
            <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#EA1E63]" size={40} />
            </div>
        )

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            {/* TOP NAV */}
            <TopNav onTaskSelect={(task) => setSelectedTask(task)} />

            {/* SCROLLABLE CONTENT */}
            <div className="flex-grow overflow-y-auto px-5 py-4 space-y-5 pb-28">

                {/* Search bar */}
                <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Search by phone number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 bg-gray-50 rounded-[18px] border border-gray-100 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-pink-100 placeholder:text-gray-300"
                    />
                </div>

                {/* Assigned Customers */}
                {assignedCustomers.length === 0 ? (
                    <div className="bg-gray-50 rounded-[24px] p-10 text-center space-y-2">
                        <Bell size={28} className="text-pink-200 mx-auto" />
                        <p className="text-xs font-black text-gray-400">No customers assigned yet</p>
                        <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest">
                            Customers will appear here when assigned to you
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Assigned Customers
                            </h3>
                            <span className="text-[9px] font-black text-[#EA1E63] bg-pink-50 px-3 py-1 rounded-full">
                                {filteredCustomers.length} total
                            </span>
                        </div>

                        {filteredCustomers.length === 0 ? (
                            <div className="bg-gray-50 rounded-[20px] p-6 text-center">
                                <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">No results found</p>
                            </div>
                        ) : (
                            filteredCustomers.map((customer, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedCustomerPhone(customer.phone_number)}
                                    className="w-full text-left bg-white border border-gray-50 rounded-[24px] p-5 shadow-sm space-y-3 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <User size={18} className="text-[#EA1E63]" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-gray-800">{customer.phone_number}</p>
                                                <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                                                    From {customer.transferred_to_name || 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-[8px] font-black text-[#EA1E63] bg-pink-50 px-2 py-1 rounded-full uppercase tracking-widest">
                                                New
                                            </span>
                                            <ChevronRight size={14} className="text-gray-300" />
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-gray-300 font-black uppercase tracking-widest text-center">
                                        Tap to view full history
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                )}

                <div className="py-2 text-center">
                    <p className="text-[9px] text-gray-200 font-black uppercase tracking-[0.3em] italic">
                        Made By Kossa • v1.0.3
                    </p>
                </div>
            </div>

            {/* CUSTOMER DETAIL MODAL */}
            {selectedCustomerPhone && (
                <CustomerModal
                    phone={selectedCustomerPhone}
                    onClose={() => setSelectedCustomerPhone(null)}
                />
            )}

            {/* TASK DETAIL MODAL */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onMarkDone={handleMarkDone}
                />
            )}

            <BottomNav />
        </div>
    )
}