'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Calendar, ChevronLeft, ChevronRight, X, User, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface PlanSlot {
    id: string
    booking_code: string
    customer_phone: string
    customer_name?: string
    date_slot: string
    time_slot: string
    description: string
    councillor_id: string
    councillor_name: string
    status: string
    created_at: string
}

const TIME_SLOTS = [
    { key: 'W', label: '6.30am', hour: 6.5 },
    { key: 'X', label: '11.30am', hour: 11.5 },
    { key: 'Y', label: '3.30pm', hour: 15.5 },
    { key: 'Z', label: '8.30pm', hour: 20.5 },
]

function getDatesInRange(start: Date, count: number): Date[] {
    const dates = []
    for (let i = 0; i < count; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        dates.push(d)
    }
    return dates
}

function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0]
}

function isPast(dateStr: string): boolean {
    const today = toDateStr(new Date())
    return dateStr < today
}

function isToday(dateStr: string): boolean {
    return dateStr === toDateStr(new Date())
}

const COUNCILLOR_COLORS: Record<string, string> = {
    'Rashi': '#EA1E63',
    'Ayesha': '#8B5CF6',
}

function getCounsellorColor(name: string): string {
    return COUNCILLOR_COLORS[name] || '#3B82F6'
}

export default function FRPlanPage() {
    const router = useRouter()
    const [slots, setSlots] = useState<PlanSlot[]>([])
    const [loading, setLoading] = useState(true)
    const [startDate, setStartDate] = useState<Date>(() => {
        const d = new Date()
        d.setDate(d.getDate() - 2)
        return d
    })
    const [selectedSlot, setSelectedSlot] = useState<PlanSlot | null>(null)
    const redLineRef = useRef<HTMLDivElement>(null)
    const todayColRef = useRef<HTMLDivElement>(null)

    const DAYS_SHOWN = 14
    const dates = getDatesInRange(startDate, DAYS_SHOWN)

    useEffect(() => {
        fetchSlots()
    }, [])

    useEffect(() => {
        // Scroll today into view
        setTimeout(() => {
            todayColRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        }, 300)
    }, [loading])

    // Animate red line
    useEffect(() => {
        const update = () => {
            const now = new Date()
            const hour = now.getHours() + now.getMinutes() / 60
            // position within day: 0 (6am) to 1 (11pm)
            const pct = Math.max(0, Math.min(100, ((hour - 6) / 17) * 100))
            if (redLineRef.current) {
                redLineRef.current.style.top = `${pct}%`
            }
        }
        update()
        const interval = setInterval(update, 60000)
        return () => clearInterval(interval)
    }, [])

    const fetchSlots = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('plan_slots')
            .select('*')
            .order('date_slot', { ascending: true })
        if (data) setSlots(data)
        setLoading(false)
    }

    const getSlot = (date: string, time: string): PlanSlot | undefined => {
        return slots.find(s => s.date_slot === date && s.time_slot === time)
    }

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-[#EA1E63]" size={36} />
        </div>
    )

    return (
        <div className="h-screen flex flex-col bg-white font-sans overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-20 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#FFE1EC] rounded-xl flex items-center justify-center">
                        <Calendar size={17} className="text-[#EA1E63]" />
                    </div>
                    <div>
                        <p className="text-base font-black text-gray-800 tracking-tighter italic">FR Plan</p>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Schedule Overview</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { const d = new Date(startDate); d.setDate(d.getDate() - 7); setStartDate(d) }}
                        className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#EA1E63]">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 2); setStartDate(d) }}
                        className="text-[9px] font-black text-[#EA1E63] bg-pink-50 px-4 py-2 rounded-xl uppercase tracking-widest">
                        Today
                    </button>
                    <button onClick={() => { const d = new Date(startDate); d.setDate(d.getDate() + 7); setStartDate(d) }}
                        className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#EA1E63]">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-2 flex items-center gap-4 border-b border-gray-50 flex-shrink-0">
                {Object.entries(COUNCILLOR_COLORS).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{name}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                    <div className="w-3 h-3 rounded-full bg-pink-100" />
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Past</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1 bg-red-500" />
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Now</span>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-grow overflow-hidden flex">
                {/* Time labels */}
                <div className="w-16 flex-shrink-0 border-r border-gray-100 pt-10 flex flex-col justify-around">
                    {TIME_SLOTS.map(t => (
                        <div key={t.key} className="flex items-center justify-center flex-1 border-b border-gray-50">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-gray-400 uppercase">{t.key}</p>
                                <p className="text-[7px] font-bold text-gray-300">{t.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scrollable columns */}
                <div className="flex-grow overflow-x-auto overflow-y-hidden">
                    <div className="flex h-full" style={{ minWidth: `${dates.length * 120}px` }}>
                        {dates.map((date, di) => {
                            const dateStr = toDateStr(date)
                            const past = isPast(dateStr)
                            const today = isToday(dateStr)

                            return (
                                <div
                                    key={dateStr}
                                    ref={today ? todayColRef : undefined}
                                    className={`flex-shrink-0 flex flex-col border-r border-gray-100 relative ${today ? 'bg-blue-50/20' : past ? 'bg-pink-50/40' : 'bg-white'}`}
                                    style={{ width: 120 }}
                                >
                                    {/* Date header */}
                                    <div className={`h-10 flex flex-col items-center justify-center border-b text-center flex-shrink-0 ${today ? 'border-blue-100 bg-blue-50' : 'border-gray-100'}`}>
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${today ? 'text-blue-500' : past ? 'text-gray-300' : 'text-gray-500'}`}>
                                            {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                                        </p>
                                        <p className={`text-sm font-black leading-none ${today ? 'text-blue-600' : past ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {date.getDate()}
                                            <span className="text-[8px] font-bold ml-0.5">
                                                {date.toLocaleDateString('en-GB', { month: 'short' })}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Red line for today */}
                                    {today && (
                                        <div
                                            ref={redLineRef}
                                            className="absolute left-0 right-0 z-10 pointer-events-none"
                                            style={{ top: '40%' }}
                                        >
                                            <div className="h-0.5 bg-red-500 w-full shadow-sm shadow-red-200" />
                                            <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                                        </div>
                                    )}

                                    {/* Slots */}
                                    <div className="flex-grow flex flex-col">
                                        {TIME_SLOTS.map(slot => {
                                            const planSlot = getSlot(dateStr, slot.key)
                                            const color = planSlot ? getCounsellorColor(planSlot.councillor_name) : ''

                                            return (
                                                <div
                                                    key={slot.key}
                                                    onClick={() => planSlot && setSelectedSlot(planSlot)}
                                                    className={`flex-1 border-b border-gray-50 p-1.5 transition-all ${planSlot ? 'cursor-pointer hover:opacity-90' : ''}`}
                                                >
                                                    {planSlot ? (
                                                        <div
                                                            className="h-full rounded-[10px] p-1.5 flex flex-col justify-between"
                                                            style={{ backgroundColor: color + '18', borderLeft: `3px solid ${color}` }}
                                                        >
                                                            <p className="text-[7px] font-black leading-tight text-gray-700 line-clamp-2">
                                                                {planSlot.booking_code}
                                                            </p>
                                                            <p className="text-[6px] font-bold text-gray-400 mt-0.5 line-clamp-1">
                                                                {planSlot.customer_phone}
                                                            </p>
                                                            <div className="w-2 h-2 rounded-full mt-1" style={{ backgroundColor: color }} />
                                                        </div>
                                                    ) : (
                                                        <div className={`h-full rounded-[10px] ${past ? 'opacity-30' : ''}`} />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Slot Detail Modal */}
            {selectedSlot && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end justify-center px-4 pb-6"
                    onClick={() => setSelectedSlot(null)}>
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center"
                                    style={{ backgroundColor: getCounsellorColor(selectedSlot.councillor_name) + '20' }}>
                                    <User size={18} style={{ color: getCounsellorColor(selectedSlot.councillor_name) }} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-800">{selectedSlot.booking_code}</p>
                                    <p className="text-[9px] font-bold" style={{ color: getCounsellorColor(selectedSlot.councillor_name) }}>
                                        {selectedSlot.councillor_name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedSlot(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-[20px] p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <User size={13} className="text-gray-400" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer</span>
                                <span className="text-xs font-black text-gray-800 ml-auto">{selectedSlot.customer_phone}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={13} className="text-gray-400" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</span>
                                <span className="text-xs font-black text-gray-800 ml-auto">
                                    {new Date(selectedSlot.date_slot).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={13} className="text-gray-400" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Time</span>
                                <span className="text-xs font-black text-gray-800 ml-auto">
                                    {TIME_SLOTS.find(t => t.key === selectedSlot.time_slot)?.label}
                                </span>
                            </div>
                        </div>

                        {selectedSlot.description && (
                            <div className="bg-[#FFE1EC] rounded-[20px] p-4">
                                <p className="text-[9px] font-black text-[#EA1E63] uppercase tracking-widest mb-2">Notes</p>
                                <p className="text-xs font-bold text-gray-700 leading-relaxed">{selectedSlot.description}</p>
                            </div>
                        )}

                        <div className={`text-center py-2 rounded-[16px] text-[9px] font-black uppercase tracking-widest ${selectedSlot.status === 'scheduled' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'}`}>
                            {selectedSlot.status}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}