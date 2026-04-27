'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
    ArrowLeft, Loader2, User, Phone, CheckCircle2,
    Calendar, Clock, X, ChevronRight, MessageCircle,
    UserCheck, Receipt, Send, CalendarDays, Zap
} from 'lucide-react'

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

interface PlanSlot {
    id: string
    booking_code: string
    customer_phone: string
    customer_name?: string
    date_slot: string   // e.g. "2026-04-28"
    time_slot: string   // W | X | Y | Z
    description: string
    councillor_id: string
    councillor_name: string
    status: string
    created_at: string
}

const TIME_SLOTS = [
    { key: 'W', label: '6:30 AM' },
    { key: 'X', label: '11:30 AM' },
    { key: 'Y', label: '3:30 PM' },
    { key: 'Z', label: '8:30 PM' },
]

// Month letter: A=Jan, B=Feb, ... L=Dec
function getMonthLetter(month: number): string {
    return String.fromCharCode(64 + month) // 1→A, 4→D
}

function buildBookingCode(date: Date, timeSlot: string, workerLetter: string): string {
    const year = String(date.getFullYear()).slice(-2)
    const monthLetter = getMonthLetter(date.getMonth() + 1)
    const day = date.getDate()
    return `L/${year}/${workerLetter}/${monthLetter}${day}/${timeSlot}`
}

const stepColor = (step: string) => {
    if (step === 'messages') return 'bg-blue-50 text-blue-500'
    if (step === 'calls') return 'bg-purple-50 text-purple-500'
    if (step === 'feedback') return 'bg-amber-50 text-amber-500'
    if (step === 'order') return 'bg-green-50 text-green-600'
    if (step === 'transfer') return 'bg-pink-50 text-pink-500'
    return 'bg-gray-50 text-gray-400'
}

const StepIcon = ({ step }: { step: string }) => {
    if (step === 'messages') return <MessageCircle size={13} className="text-blue-400" />
    if (step === 'calls') return <Phone size={13} className="text-purple-400" />
    if (step === 'feedback') return <UserCheck size={13} className="text-amber-400" />
    if (step === 'order') return <Receipt size={13} className="text-green-500" />
    if (step === 'transfer') return <ChevronRight size={13} className="text-pink-400" />
    return null
}

export default function CouncillorCustomerPage() {
    const router = useRouter()
    const params = useParams()
    const phone = decodeURIComponent(params?.id as string)

    const [profile, setProfile] = useState<any>(null)
    const [history, setHistory] = useState<LeadHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [accepted, setAccepted] = useState(false)
    const [accepting, setAccepting] = useState(false)

    // Description
    const [description, setDescription] = useState('')
    const [savingDesc, setSavingDesc] = useState(false)
    const [descSaved, setDescSaved] = useState(false)

    // Plan modal
    const [showPlanModal, setShowPlanModal] = useState(false)
    const [planSlots, setPlanSlots] = useState<PlanSlot[]>([])
    const [loadingPlan, setLoadingPlan] = useState(false)
    const [addingToPlan, setAddingToPlan] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedSlot, setSelectedSlot] = useState('')
    const [planSuccess, setPlanSuccess] = useState(false)

    useEffect(() => {
        init()
    }, [phone])

    const init = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/'); return }

        const { data: profileData } = await supabase
            .from('profiles').select('*').eq('id', user.id).single()
        if (profileData) setProfile(profileData)

        // Load history
        const { data: hist } = await supabase
            .from('leads_history')
            .select('*')
            .eq('phone_number', phone)
            .order('created_at', { ascending: true })
        if (hist) setHistory(hist)

        // Check if already accepted (has a step by this worker)
        if (profileData) {
            const mySteps = hist?.filter((h: LeadHistory) => h.worker_id === user.id) || []
            if (mySteps.length > 0) setAccepted(true)
        }

        setLoading(false)
    }

    const handleAccept = async () => {
        if (!profile) return
        setAccepting(true)
        const { error } = await supabase.from('leads_history').insert([{
            phone_number: phone,
            worker_id: profile.id,
            last_step: 'feedback',
            notes: 'Customer accepted by councillor.',
            created_at: new Date().toISOString(),
            transferred_to_name: profile.full_name,
        }])
        if (!error) {
            setAccepted(true)
            await init()
        }
        setAccepting(false)
    }

    const handleSaveDescription = async () => {
        if (!profile || !description.trim()) return
        setSavingDesc(true)
        const { error } = await supabase.from('leads_history').insert([{
            phone_number: phone,
            worker_id: profile.id,
            last_step: 'feedback',
            notes: description.trim(),
            created_at: new Date().toISOString(),
        }])
        if (!error) {
            setDescSaved(true)
            setDescription('')
            await init()
        }
        setSavingDesc(false)
    }

    const loadPlanSlots = async () => {
        setLoadingPlan(true)
        const { data } = await supabase
            .from('plan_slots')
            .select('*')
            .order('date_slot', { ascending: true })
        if (data) setPlanSlots(data)
        setLoadingPlan(false)
    }

    const openPlanModal = async () => {
        setShowPlanModal(true)
        await loadPlanSlots()
    }

    // Get worker letter from full_name initial or post_label
    const getWorkerLetter = () => {
        if (!profile) return 'X'
        // Rashi → R, Ayesha → A etc.
        return profile.full_name?.charAt(0).toUpperCase() || 'X'
    }

    const isSlotTaken = (date: string, slot: string) => {
        return planSlots.some(p => p.date_slot === date && p.time_slot === slot)
    }

    const handleAddToPlan = async () => {
        if (!selectedDate || !selectedSlot || !profile) return
        setAddingToPlan(true)

        const date = new Date(selectedDate)
        const code = buildBookingCode(date, selectedSlot, getWorkerLetter())

        const { error } = await supabase.from('plan_slots').insert([{
            booking_code: code,
            customer_phone: phone,
            date_slot: selectedDate,
            time_slot: selectedSlot,
            description: history.filter(h => h.last_step === 'feedback').map(h => h.notes).join(' | '),
            councillor_id: profile.id,
            councillor_name: profile.full_name,
            status: 'scheduled',
            created_at: new Date().toISOString(),
        }])

        if (!error) {
            // Notify via leads_history
            await supabase.from('leads_history').insert([{
                phone_number: phone,
                worker_id: profile.id,
                last_step: 'order',
                notes: `Planned: ${code} on ${selectedDate} at ${TIME_SLOTS.find(t => t.key === selectedSlot)?.label}`,
                created_at: new Date().toISOString(),
            }])
            setPlanSuccess(true)
            setShowPlanModal(false)
            await init()
        }
        setAddingToPlan(false)
    }

    // Next 14 days
    const getDateOptions = () => {
        const dates = []
        for (let i = 0; i < 14; i++) {
            const d = new Date()
            d.setDate(d.getDate() + i)
            const str = d.toISOString().split('T')[0]
            dates.push(str)
        }
        return dates
    }

    const isPlanned = history.some(h => h.last_step === 'order' && h.notes?.includes('Planned:'))

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-[#EA1E63]" size={36} />
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-5 sticky top-0 z-10">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-black text-xs mb-4">
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FFE1EC] rounded-2xl flex items-center justify-center">
                        <User size={22} className="text-[#EA1E63]" />
                    </div>
                    <div>
                        <p className="text-base font-black text-gray-800">{phone}</p>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Customer Profile</p>
                    </div>
                </div>

                {/* Step pills */}
                <div className="flex gap-2 mt-4 flex-wrap">
                    {['messages', 'calls', 'feedback', 'order'].map(step => {
                        const done = history.some(h => h.last_step === step)
                        return (
                            <span key={step} className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${done ? stepColor(step) : 'bg-gray-100 text-gray-300'}`}>
                                {step}
                            </span>
                        )
                    })}
                </div>
            </div>

            <div className="px-5 py-6 space-y-5 max-w-lg mx-auto">

                {/* ACCEPT CARD */}
                {!accepted ? (
                    <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                <Zap size={18} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-800">New Customer Assigned</p>
                                <p className="text-[9px] text-gray-400 font-bold">Accept to start working with this customer</p>
                            </div>
                        </div>
                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full bg-[#EA1E63] text-white font-black py-4 rounded-[20px] flex items-center justify-center gap-2 text-sm shadow-lg shadow-pink-100"
                        >
                            {accepting ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Accept Customer</>}
                        </button>
                    </div>
                ) : (
                    <div className="bg-green-50 border border-green-100 rounded-[28px] p-4 flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-green-500" />
                        <p className="text-xs font-black text-green-600">Customer Accepted</p>
                    </div>
                )}

                {/* HISTORY TIMELINE */}
                <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">Customer History</p>
                    {history.length === 0 ? (
                        <p className="text-[10px] text-gray-300 font-bold text-center py-4">No history yet</p>
                    ) : (
                        <div className="border-l-2 border-pink-100 ml-3 pl-5 space-y-4">
                            {history.map((item, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[25px] top-1 w-4 h-4 bg-white border-2 border-[#EA1E63] rounded-full flex items-center justify-center">
                                        <div className="w-1.5 h-1.5 bg-[#EA1E63] rounded-full" />
                                    </div>
                                    <div className="bg-gray-50 rounded-[16px] p-3 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <StepIcon step={item.last_step} />
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${stepColor(item.last_step)}`}>
                                                    {item.last_step}
                                                </span>
                                            </div>
                                            <span className="text-[8px] text-gray-300 font-bold">
                                                {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                        {item.notes && <p className="text-[10px] text-gray-600 font-bold italic leading-relaxed">"{item.notes}"</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DESCRIPTION INPUT */}
                {accepted && (
                    <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm space-y-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Add Description / Notes</p>
                        <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => { setDescription(e.target.value); setDescSaved(false) }}
                            placeholder="Write what you discussed, customer requirements, preferences..."
                            className="w-full bg-gray-50 p-4 rounded-[20px] font-bold text-sm text-gray-700 outline-none border-2 border-transparent focus:border-pink-100 resize-none leading-relaxed transition-all"
                        />
                        <button
                            onClick={handleSaveDescription}
                            disabled={savingDesc || !description.trim()}
                            className={`w-full font-black py-4 rounded-[20px] flex items-center justify-center gap-2 text-sm transition-all ${description.trim() ? 'bg-[#EA1E63] text-white shadow-lg shadow-pink-100' : 'bg-gray-100 text-gray-300'}`}
                        >
                            {savingDesc ? <Loader2 className="animate-spin" size={16} /> : descSaved ? <><CheckCircle2 size={16} /> Saved!</> : <><Send size={16} /> Save Notes</>}
                        </button>
                    </div>
                )}

                {/* ADD TO PLAN */}
                {accepted && !isPlanned && (
                    <button
                        onClick={openPlanModal}
                        className="w-full bg-gradient-to-r from-[#EA1E63] to-[#c01652] text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 text-sm shadow-xl shadow-pink-200"
                    >
                        <CalendarDays size={18} /> Add to FR Plan
                    </button>
                )}

                {isPlanned && (
                    <div className="bg-[#FFE1EC] border border-pink-200 rounded-[24px] p-5 flex items-center gap-3">
                        <CalendarDays size={18} className="text-[#EA1E63]" />
                        <div>
                            <p className="text-xs font-black text-[#EA1E63]">Added to FR Plan</p>
                            <p className="text-[9px] text-gray-500 font-bold">
                                {history.find(h => h.last_step === 'order' && h.notes?.includes('Planned:'))?.notes?.replace('Planned: ', '')}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* PLAN MODAL */}
            {showPlanModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center px-4 pb-6"
                    onClick={() => setShowPlanModal(false)}>
                    <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-base font-black text-gray-800">Select Plan Slot</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Pick date & time</p>
                            </div>
                            <button onClick={() => setShowPlanModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Date picker */}
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Date</p>
                            <div className="grid grid-cols-4 gap-2">
                                {getDateOptions().map(date => {
                                    const d = new Date(date)
                                    const hasAny = TIME_SLOTS.some(t => !isSlotTaken(date, t.key))
                                    return (
                                        <button
                                            key={date}
                                            onClick={() => { setSelectedDate(date); setSelectedSlot('') }}
                                            disabled={!hasAny}
                                            className={`p-2 rounded-2xl text-center transition-all ${selectedDate === date ? 'bg-[#EA1E63] text-white' : hasAny ? 'bg-gray-50 text-gray-600 hover:bg-pink-50' : 'bg-gray-50 text-gray-200 cursor-not-allowed'}`}
                                        >
                                            <p className="text-[8px] font-black uppercase">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                                            <p className="text-sm font-black">{d.getDate()}</p>
                                            <p className="text-[7px] font-bold">{d.toLocaleDateString('en-GB', { month: 'short' })}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Time slot picker */}
                        {selectedDate && (
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Time Slot</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {TIME_SLOTS.map(slot => {
                                        const taken = isSlotTaken(selectedDate, slot.key)
                                        const date = new Date(selectedDate)
                                        const code = buildBookingCode(date, slot.key, getWorkerLetter())
                                        return (
                                            <button
                                                key={slot.key}
                                                onClick={() => !taken && setSelectedSlot(slot.key)}
                                                disabled={taken}
                                                className={`p-4 rounded-[20px] text-left transition-all ${taken ? 'bg-gray-50 opacity-40 cursor-not-allowed' : selectedSlot === slot.key ? 'bg-[#EA1E63] text-white' : 'bg-gray-50 hover:bg-pink-50'}`}
                                            >
                                                <p className={`text-[8px] font-black uppercase tracking-widest ${selectedSlot === slot.key ? 'text-pink-100' : 'text-gray-400'}`}>
                                                    {slot.key} {taken ? '· Taken' : '· Available'}
                                                </p>
                                                <p className={`text-sm font-black mt-0.5 ${selectedSlot === slot.key ? 'text-white' : 'text-gray-700'}`}>{slot.label}</p>
                                                <p className={`text-[8px] font-bold mt-1 ${selectedSlot === slot.key ? 'text-pink-200' : 'text-gray-400'}`}>{code}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {selectedDate && selectedSlot && (
                            <div className="bg-[#FFE1EC] rounded-[20px] p-4 border border-pink-100">
                                <p className="text-[9px] font-black text-[#EA1E63] uppercase tracking-widest mb-1">Booking Code Preview</p>
                                <p className="text-xl font-black text-gray-800 tracking-widest">
                                    {buildBookingCode(new Date(selectedDate), selectedSlot, getWorkerLetter())}
                                </p>
                                <p className="text-[9px] text-gray-500 font-bold mt-1">{phone}</p>
                            </div>
                        )}

                        <button
                            onClick={handleAddToPlan}
                            disabled={!selectedDate || !selectedSlot || addingToPlan}
                            className={`w-full font-black py-5 rounded-[24px] flex items-center justify-center gap-2 text-sm transition-all ${selectedDate && selectedSlot ? 'bg-[#EA1E63] text-white shadow-lg shadow-pink-100' : 'bg-gray-100 text-gray-300'}`}
                        >
                            {addingToPlan ? <Loader2 className="animate-spin" size={16} /> : <><CalendarDays size={16} /> Confirm & Add to Plan</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}