'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
    Loader2, PlusCircle, CheckCircle2, Clock,
    AlertTriangle, X, CalendarDays, ChevronRight, Bell
} from 'lucide-react'
import Link from 'next/link'
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
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : isUrgent || isOverdue ? 'bg-red-50' : 'bg-pink-50'}`}>
                            {isDone ? (
                                <CheckCircle2 size={20} className="text-green-500" />
                            ) : isUrgent || isOverdue ? (
                                <AlertTriangle size={20} className="text-red-400" />
                            ) : (
                                <Clock size={20} className="text-[#EA1E63]" />
                            )}
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

                {/* Description */}
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

                {/* Deadline */}
                <div className="flex items-center gap-3 px-1">
                    <CalendarDays size={14} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Deadline:{' '}
                        <span className="text-gray-700">
                            {new Date(task.deadline).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'long', year: 'numeric',
                            })}
                        </span>
                    </span>
                </div>

                {/* Progress Bar */}
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

                {/* Overdue notice */}
                {isOverdue && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 items-start">
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] font-black text-red-400 leading-relaxed uppercase tracking-wide">
                            This task is overdue. It cannot be dismissed until marked as done.
                        </p>
                    </div>
                )}

                {/* Actions */}
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
                            <button
                                onClick={() => setConfirming(false)}
                                disabled={submitting}
                                className="flex-1 bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDone}
                                disabled={submitting}
                                className="flex-1 bg-green-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                            >
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
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)

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

    if (loading)
        return (
            <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#EA1E63]" size={40} />
            </div>
        )

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            {/* TOP NAV — handles bell, tasks panel, avatar, wallet */}
            <TopNav onTaskSelect={(task) => setSelectedTask(task)} />

            {/* SCROLLABLE CONTENT */}
            <div className="flex-grow overflow-y-auto px-5 py-4 space-y-5 pb-28">
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

                {/* Empty state */}
                <div className="bg-gray-50 rounded-[24px] p-10 text-center space-y-2">
                    <Bell size={28} className="text-pink-200 mx-auto" />
                    <p className="text-xs font-black text-gray-400">
                        {tasks.filter(t => t.status !== 'done').length > 0
                            ? `You have ${tasks.filter(t => t.status !== 'done').length} active task${tasks.filter(t => t.status !== 'done').length !== 1 ? 's' : ''}`
                            : 'No active tasks'}
                    </p>
                    <p className="text-[9px] text-gray-300 font-black uppercase tracking-widest">
                        Tap the bell to view
                    </p>
                </div>

                <div className="py-2 text-center">
                    <p className="text-[9px] text-gray-200 font-black uppercase tracking-[0.3em] italic">
                        Made By Kossa • v1.0.3
                    </p>
                </div>
            </div>

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