'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Bell, PlusCircle, CheckCircle2, Clock, Loader2, AlertTriangle } from 'lucide-react'
import BottomNav from '../components/BottomNav'

interface Task {
    id: string
    title: string
    description: string
    deadline: string
    status: string
    created_at: string
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

const TaskCard = ({ task, onMarkDone }: { task: Task; onMarkDone: (id: string) => void }) => {
    const daysLeft = getDaysLeft(task.deadline)
    const progress = getProgressPercent(task.created_at, task.deadline)
    const isDone = task.status === 'done'
    const isUrgent = daysLeft <= 2 && !isDone
    const isOverdue = daysLeft < 0 && !isDone

    const barColor = isOverdue
        ? '#ef4444'
        : isUrgent
            ? '#f97316'
            : daysLeft <= 5
                ? '#f59e0b'
                : '#EA1E63'

    const statusLabel = isDone
        ? 'Completed'
        : isOverdue
            ? `${Math.abs(daysLeft)}d overdue`
            : daysLeft === 0
                ? 'Due Today!'
                : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`

    return (
        <div
            className={`bg-white border rounded-[24px] p-5 shadow-sm space-y-3 transition-all ${isUrgent || isOverdue ? 'border-red-100 shadow-red-50' : 'border-gray-50'
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : isUrgent || isOverdue ? 'bg-red-50' : 'bg-pink-50'
                            }`}
                    >
                        {isDone ? (
                            <CheckCircle2 size={18} className="text-green-500" />
                        ) : isUrgent || isOverdue ? (
                            <AlertTriangle size={18} className="text-red-400" />
                        ) : (
                            <Clock size={18} className="text-[#EA1E63]" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-black text-gray-800 leading-tight">{task.title}</p>
                        {task.description && (
                            <p className="text-[9px] text-gray-400 font-bold mt-0.5 line-clamp-1">{task.description}</p>
                        )}
                    </div>
                </div>
                <span
                    className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0 ${isDone
                        ? 'bg-green-50 text-green-500'
                        : isOverdue
                            ? 'bg-red-50 text-red-500'
                            : isUrgent
                                ? 'bg-orange-50 text-orange-500'
                                : 'bg-pink-50 text-[#EA1E63]'
                        }`}
                >
                    {statusLabel}
                </span>
            </div>

            {/* Progress Bar */}
            {!isDone && (
                <div className="space-y-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: barColor }}
                        />
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[8px] text-gray-300 font-bold">
                            {new Date(task.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[8px] text-gray-400 font-black">
                            {new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                </div>
            )}

            {/* Mark Done Button */}
            {!isDone && (
                <button
                    onClick={() => onMarkDone(task.id)}
                    className="w-full bg-gray-50 hover:bg-green-50 text-gray-400 hover:text-green-500 font-black text-[9px] uppercase tracking-widest py-2.5 rounded-2xl transition-all border border-gray-100 hover:border-green-100"
                >
                    Mark as Done ✓
                </button>
            )}
        </div>
    )
}

export default function Dashboard() {
    const router = useRouter()
    const [profile, setProfile] = useState<any>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const init = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()
            if (profileData) setProfile(profileData)

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
        const { error } = await supabase
            .from('tasks')
            .update({ status: 'done' })
            .eq('id', taskId)
        if (!error) {
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'done' } : t)))
        }
    }

    if (loading)
        return (
            <div className="h-screen flex items-center justify-center bg-white">
                <Loader2 className="animate-spin text-[#EA1E63]" size={40} />
            </div>
        )

    const activeTasks = tasks.filter((t) => t.status !== 'done')
    const doneTasks = tasks.filter((t) => t.status === 'done')

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            {/* TOP BAR */}
            <div className="bg-[#FFE1EC] p-5 rounded-b-[35px] flex justify-between items-center shadow-sm z-50">
                <div className="flex items-center gap-2">
                    <Image src="/emma-logo.png" alt="Logo" width={28} height={28} priority />
                    <span className="text-[#EA1E63] font-black text-lg tracking-tighter">Emma Thinking</span>
                </div>
                <div className="flex items-center gap-3">
                    {activeTasks.length > 0 && (
                        <div className="relative">
                            <Bell size={22} className="text-gray-700" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EA1E63] rounded-full text-white text-[8px] font-black flex items-center justify-center">
                                {activeTasks.length}
                            </span>
                        </div>
                    )}
                    {activeTasks.length === 0 && <Bell size={22} className="text-gray-700" />}
                    <div className="h-9 w-9 bg-white rounded-full flex items-center justify-center text-[#EA1E63] font-black border border-pink-100 shadow-sm uppercase text-xs">
                        {profile?.full_name?.substring(0, 2) || 'US'}
                    </div>
                </div>
            </div>

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

                {/* Active Tasks */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            My Tasks
                        </h3>
                        <span className="text-[9px] font-black text-[#EA1E63] bg-pink-50 px-3 py-1 rounded-full">
                            {activeTasks.length} active
                        </span>
                    </div>

                    {activeTasks.length === 0 ? (
                        <div className="bg-gray-50 rounded-[24px] p-8 text-center">
                            <CheckCircle2 size={32} className="text-green-300 mx-auto mb-2" />
                            <p className="text-xs font-black text-gray-400">All tasks completed!</p>
                        </div>
                    ) : (
                        activeTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onMarkDone={handleMarkDone} />
                        ))
                    )}
                </div>

                {/* Completed Tasks */}
                {doneTasks.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">
                            Completed
                        </h3>
                        {doneTasks.map((task) => (
                            <TaskCard key={task.id} task={task} onMarkDone={handleMarkDone} />
                        ))}
                    </div>
                )}

                <div className="py-2 text-center">
                    <p className="text-[9px] text-gray-200 font-black uppercase tracking-[0.3em] italic">
                        Made By Kossa • v1.0.3
                    </p>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}