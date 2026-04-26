'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { Bell, X, CheckCircle2, Clock, AlertTriangle, ChevronRight, Wallet } from 'lucide-react'

interface Task {
    id: string
    title: string
    description: string
    deadline: string
    status: string
    created_at: string
    worker_phone: string
}

interface TopNavProps {
    onTaskSelect: (task: Task) => void
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

const TaskCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
    const daysLeft = getDaysLeft(task.deadline)
    const progress = getProgressPercent(task.created_at, task.deadline)
    const isDone = task.status === 'done'
    const isUrgent = daysLeft <= 2 && !isDone
    const isOverdue = daysLeft < 0 && !isDone

    const barColor = isOverdue ? '#ef4444' : isUrgent ? '#f97316' : daysLeft <= 5 ? '#f59e0b' : '#EA1E63'

    const statusLabel = isDone
        ? 'Completed'
        : isOverdue
            ? `${Math.abs(daysLeft)}d overdue`
            : daysLeft === 0
                ? 'Due Today!'
                : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`

    return (
        <button
            onClick={onClick}
            className={`w-full text-left bg-white border rounded-[24px] p-5 shadow-sm space-y-3 transition-all active:scale-[0.98] ${isUrgent || isOverdue ? 'border-red-100 shadow-red-50' : 'border-gray-50'}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : isUrgent || isOverdue ? 'bg-red-50' : 'bg-pink-50'}`}>
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
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${isDone ? 'bg-green-50 text-green-500' : isOverdue ? 'bg-red-50 text-red-500' : isUrgent ? 'bg-orange-50 text-orange-500' : 'bg-pink-50 text-[#EA1E63]'}`}>
                        {statusLabel}
                    </span>
                    <ChevronRight size={12} className="text-gray-300" />
                </div>
            </div>

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

            <p className="text-[8px] text-gray-300 font-black uppercase tracking-widest text-center">
                Tap to view details
            </p>
        </button>
    )
}

export default function TopNav({ onTaskSelect }: TopNavProps) {
    const [profile, setProfile] = useState<any>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [notifOpen, setNotifOpen] = useState(false)
    const [timestamp] = useState(Date.now())

    const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

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
        }
        init()
    }, [])

    const activeTasks = tasks.filter((t) => t.status !== 'done')
    const doneTasks = tasks.filter((t) => t.status === 'done')

    return (
        <>
            {/* TOP BAR */}
            <div className="bg-[#FFE1EC] p-5 rounded-b-[35px] flex justify-between items-center shadow-sm z-50">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Image src="/emma-logo.png" alt="Logo" width={28} height={28} priority />
                    <span className="text-[#EA1E63] font-black text-lg tracking-tighter">Emma Thinking</span>
                </div>

                {/* Right side: wallet pill + bell + avatar */}
                <div className="flex items-center gap-3">
                    {/* Wallet pill */}
                    <div className="bg-white/60 px-3 py-1.5 rounded-2xl flex items-center gap-1.5 border border-pink-100 shadow-sm">
                        <Wallet size={12} className="text-[#EA1E63]" />
                        <span className="text-[10px] font-black text-gray-800 italic">
                            LKR {profile?.total_commission?.toLocaleString() || '0.00'}
                        </span>
                    </div>

                    {/* Bell */}
                    <button onClick={() => setNotifOpen(true)} className="relative">
                        <Bell size={22} className="text-gray-700" />
                        {activeTasks.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EA1E63] rounded-full text-white text-[8px] font-black flex items-center justify-center">
                                {activeTasks.length}
                            </span>
                        )}
                    </button>

                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 flex-shrink-0">
                        <img
                            src={profile?.avatar_url ? `${profile.avatar_url}?t=${timestamp}` : defaultAvatar}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>

            {/* NOTIFICATION PANEL */}
            {notifOpen && (
                <div
                    className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6"
                    onClick={() => setNotifOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-50">
                            <div>
                                <h2 className="text-sm font-black text-gray-800">My Tasks</h2>
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                                    {activeTasks.length} active · {doneTasks.length} completed
                                </p>
                            </div>
                            <button
                                onClick={() => setNotifOpen(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Task list */}
                        <div className="overflow-y-auto max-h-[70vh] px-4 py-4 space-y-3">
                            {activeTasks.length === 0 && doneTasks.length === 0 ? (
                                <div className="py-8 text-center">
                                    <CheckCircle2 size={32} className="text-green-300 mx-auto mb-2" />
                                    <p className="text-xs font-black text-gray-400">All tasks completed!</p>
                                </div>
                            ) : (
                                <>
                                    {activeTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onClick={() => {
                                                setNotifOpen(false)
                                                onTaskSelect(task)
                                            }}
                                        />
                                    ))}
                                    {doneTasks.length > 0 && (
                                        <>
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1 pt-2">
                                                Completed
                                            </p>
                                            {doneTasks.map((task) => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onClick={() => {
                                                        setNotifOpen(false)
                                                        onTaskSelect(task)
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </>
                            )}
                            <div className="py-2 text-center">
                                <p className="text-[9px] text-gray-200 font-black uppercase tracking-[0.3em] italic">
                                    Made By Kossa • v1.0.3
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}