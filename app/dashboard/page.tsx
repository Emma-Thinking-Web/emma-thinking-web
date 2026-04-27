'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
    ArrowLeft, Zap, Plus, X, Save, Loader2, GripVertical,
    User, Briefcase, ShieldCheck, CalendarDays, ExternalLink
} from 'lucide-react'

interface CustomAction {
    id: string
    label: string
    description: string
    color: string
}

interface Worker {
    id: string
    full_name: string
    email: string
    post_label: string
    level?: string
    custom_actions?: CustomAction[]
}

interface AssignedCustomer {
    phone_number: string
    notes: string
    created_at: string
    transferred_to_name?: string
}

const actionColors = [
    '#EA1E63', '#3B82F6', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444'
]

// Councillor roles that get the "Add to Plan" feature
const COUNCILLOR_ROLES = ['Councillor', 'Councellor', 'Councilor']

function isCouncillor(worker: Worker): boolean {
    return COUNCILLOR_ROLES.some(r =>
        worker.post_label?.toLowerCase().includes(r.toLowerCase()) ||
        worker.full_name?.toLowerCase() === 'rashi' ||
        worker.full_name?.toLowerCase() === 'ayesha'
    )
}

export default function WorkerActionsPage() {
    const router = useRouter()
    const params = useParams()
    const workerId = params?.id as string

    const [worker, setWorker] = useState<Worker | null>(null)
    const [actions, setActions] = useState<CustomAction[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'actions' | 'customers'>('actions')
    const [assignedCustomers, setAssignedCustomers] = useState<AssignedCustomer[]>([])
    const [loadingCustomers, setLoadingCustomers] = useState(false)

    useEffect(() => {
        if (workerId) fetchWorker()
    }, [workerId])

    useEffect(() => {
        if (activeTab === 'customers' && worker) fetchAssignedCustomers()
    }, [activeTab, worker])

    const fetchWorker = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', workerId)
            .single()

        if (data) {
            setWorker(data as Worker)
            setActions(data.custom_actions && data.custom_actions.length > 0 ? [...data.custom_actions] : [])
        }
        setLoading(false)
    }

    const fetchAssignedCustomers = async () => {
        setLoadingCustomers(true)
        const { data } = await supabase
            .from('leads_history')
            .select('*')
            .eq('last_step', 'transfer')
            .eq('transferred_to', workerId)
            .order('created_at', { ascending: false })

        if (data) {
            const seen = new Set()
            const unique = data.filter((item: any) => {
                if (seen.has(item.phone_number)) return false
                seen.add(item.phone_number)
                return true
            })
            setAssignedCustomers(unique)
        }
        setLoadingCustomers(false)
    }

    const addAction = () => {
        const newAction: CustomAction = {
            id: Date.now().toString(),
            label: '',
            description: '',
            color: actionColors[actions.length % actionColors.length]
        }
        setActions(prev => [...prev, newAction])
    }

    const updateAction = (id: string, field: keyof CustomAction, value: string) => {
        setActions(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
    }

    const removeAction = (id: string) => {
        setActions(prev => prev.filter(a => a.id !== id))
    }

    const saveActions = async () => {
        if (!worker) return
        setSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update({ custom_actions: actions })
            .eq('id', worker.id)

        if (!error) {
            alert('Actions saved! ✅')
        } else {
            alert('Error: ' + error.message)
        }
        setSaving(false)
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#EA1E63]" size={32} />
            </div>
        )
    }

    if (!worker) {
        return (
            <div className="fixed inset-0 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="font-black text-gray-300 text-sm uppercase tracking-widest">Worker not found</p>
                    <button onClick={() => router.push('/admin')} className="mt-4 text-[#EA1E63] font-black text-xs">
                        ← Back to Admin
                    </button>
                </div>
            </div>
        )
    }

    const showCouncillorTab = isCouncillor(worker)

    return (
        <div className="fixed inset-0 w-screen h-screen bg-gray-50 flex font-sans text-gray-900 overflow-hidden">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-100 flex flex-col p-8 z-20 shadow-sm">
                <button
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-3 text-gray-400 hover:text-[#EA1E63] font-black text-sm mb-10 transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Admin
                </button>

                {/* Worker Card */}
                <div className="bg-[#FFE1EC] rounded-[28px] p-6 mb-8">
                    <div className="h-14 w-14 bg-[#EA1E63] rounded-2xl flex items-center justify-center text-white font-black text-lg uppercase mb-4">
                        {worker.full_name?.substring(0, 2)}
                    </div>
                    <p className="font-black text-gray-800 text-sm">{worker.full_name}</p>
                    <p className="text-[10px] text-[#EA1E63] font-bold mt-0.5">{worker.post_label}</p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="text-[8px] font-black bg-white text-gray-500 px-3 py-1 rounded-full">
                            {worker.level || 'Silver'}
                        </span>
                        <span className="text-[8px] font-black bg-white text-[#EA1E63] px-3 py-1 rounded-full">
                            {actions.length} actions
                        </span>
                        {showCouncillorTab && (
                            <span className="text-[8px] font-black bg-[#EA1E63] text-white px-3 py-1 rounded-full">
                                Councillor
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="space-y-2 mb-6">
                    <button
                        onClick={() => setActiveTab('actions')}
                        className={`w-full flex items-center gap-3 p-4 rounded-[20px] font-bold text-sm transition-all ${activeTab === 'actions' ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Zap size={16} /> Workflow Buttons
                    </button>
                    {showCouncillorTab && (
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`w-full flex items-center gap-3 p-4 rounded-[20px] font-bold text-sm transition-all ${activeTab === 'customers' ? 'bg-[#FFE1EC] text-[#EA1E63]' : 'text-gray-400 hover:bg-gray-50'}`}
                        >
                            <User size={16} /> Assigned Customers
                        </button>
                    )}
                </div>

                {/* View FR Plan */}
                <button
                    onClick={() => router.push('/plan')}
                    className="w-full flex items-center gap-3 p-4 rounded-[20px] font-bold text-sm text-gray-400 hover:bg-pink-50 hover:text-[#EA1E63] transition-all border border-dashed border-gray-200 mt-auto"
                >
                    <CalendarDays size={16} /> View FR Plan
                </button>

                {/* Info */}
                <div className="space-y-3 text-[10px] font-bold text-gray-400 mt-4">
                    <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4">
                        <Zap size={14} className="text-[#EA1E63] mt-0.5 flex-shrink-0" />
                        <p className="leading-relaxed">
                            Buttons show on <span className="text-gray-700 font-black">{worker.full_name}</span>'s screen when they tap a customer.
                        </p>
                    </div>
                    {showCouncillorTab && (
                        <div className="flex items-start gap-3 bg-pink-50 rounded-2xl p-4">
                            <CalendarDays size={14} className="text-[#EA1E63] mt-0.5 flex-shrink-0" />
                            <p className="leading-relaxed text-[#EA1E63]">
                                Councillor can accept customers, add notes, and plan them in the FR Plan.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col overflow-hidden">
                <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-8 flex justify-between items-center z-10">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter italic uppercase text-gray-800">
                            {activeTab === 'actions' ? 'Workflow Buttons' : 'Assigned Customers'}
                        </h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                            {worker.full_name} — {activeTab === 'actions' ? 'Custom Actions' : 'Councillor View'}
                        </p>
                    </div>
                    {activeTab === 'actions' && (
                        <button
                            onClick={saveActions}
                            disabled={saving}
                            className="bg-[#EA1E63] text-white font-black px-8 py-4 rounded-[20px] flex items-center gap-3 shadow-lg shadow-pink-100 text-sm"
                        >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={16} /> Save All Actions</>}
                        </button>
                    )}
                </header>

                <div className="flex-grow p-12 overflow-y-auto">

                    {/* ── ACTIONS TAB ── */}
                    {activeTab === 'actions' && (
                        <div className="max-w-3xl mx-auto space-y-5">
                            {actions.length === 0 && (
                                <div className="bg-white rounded-[40px] p-16 text-center border border-gray-100 border-dashed">
                                    <Zap size={40} className="text-gray-200 mx-auto mb-4" />
                                    <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No actions yet</p>
                                    <p className="text-[10px] text-gray-300 font-bold mt-2">Add your first button below</p>
                                </div>
                            )}

                            {actions.map((action, idx) => (
                                <div key={action.id} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <GripVertical size={16} className="text-gray-200" />
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                Button {idx + 1}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1.5">
                                                {actionColors.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => updateAction(action.id, 'color', c)}
                                                        className={`w-5 h-5 rounded-full transition-all ${action.color === c ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'opacity-60 hover:opacity-100'}`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => removeAction(action.id)}
                                                className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors ml-2"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="px-5 py-2.5 rounded-2xl text-white text-xs font-black shadow-sm" style={{ backgroundColor: action.color }}>
                                            {action.label || 'Button Label'}
                                        </div>
                                        <span className="text-[9px] text-gray-300 font-bold italic">← live preview</span>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Button Label</label>
                                        <input
                                            type="text"
                                            value={action.label}
                                            onChange={(e) => updateAction(action.id, 'label', e.target.value)}
                                            placeholder="e.g. Call Done, Send Brochure, Site Visit"
                                            className="w-full bg-gray-50 p-5 rounded-[20px] font-black text-sm text-gray-700 outline-none border-2 border-transparent focus:border-pink-100 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Description — What should the worker do?</label>
                                        <textarea
                                            rows={3}
                                            value={action.description}
                                            onChange={(e) => updateAction(action.id, 'description', e.target.value)}
                                            placeholder="e.g. Call the customer and confirm their package details."
                                            className="w-full bg-gray-50 p-5 rounded-[20px] font-bold text-sm text-gray-600 outline-none border-2 border-transparent focus:border-pink-100 resize-none leading-relaxed transition-all"
                                        />
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addAction}
                                className="w-full border-2 border-dashed border-gray-200 text-gray-400 font-black text-[10px] uppercase tracking-widest py-6 rounded-[32px] hover:border-pink-200 hover:text-[#EA1E63] transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Add New Button
                            </button>

                            {actions.length > 0 && (
                                <button
                                    onClick={saveActions}
                                    disabled={saving}
                                    className="w-full bg-[#EA1E63] text-white font-black p-6 rounded-[32px] shadow-xl flex items-center justify-center gap-3 text-base mt-4"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> SAVE ALL ACTIONS</>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── CUSTOMERS TAB (Councillor only) ── */}
                    {activeTab === 'customers' && showCouncillorTab && (
                        <div className="max-w-3xl mx-auto space-y-5">
                            {/* Quick link to FR Plan */}
                            <button
                                onClick={() => router.push('/plan')}
                                className="w-full bg-gradient-to-r from-[#EA1E63] to-[#c01652] text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 text-sm shadow-xl shadow-pink-200"
                            >
                                <CalendarDays size={18} /> Open FR Plan Timetable <ExternalLink size={14} />
                            </button>

                            {loadingCustomers ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="animate-spin text-[#EA1E63]" size={28} />
                                </div>
                            ) : assignedCustomers.length === 0 ? (
                                <div className="bg-white rounded-[40px] p-16 text-center border border-gray-100">
                                    <User size={40} className="text-gray-200 mx-auto mb-4" />
                                    <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No customers assigned yet</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
                                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-black text-gray-800">Assigned Customers</h3>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{assignedCustomers.length} total</p>
                                        </div>
                                        <span className="text-[9px] font-black text-[#EA1E63] bg-pink-50 px-4 py-2 rounded-full uppercase tracking-widest">
                                            {worker.full_name}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {assignedCustomers.map((cust, idx) => (
                                            <div key={idx} className="p-6 flex items-center justify-between hover:bg-pink-50/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-[#FFE1EC] rounded-xl flex items-center justify-center">
                                                        <User size={16} className="text-[#EA1E63]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800">{cust.phone_number}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold">
                                                            {new Date(cust.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* This button opens the councillor page for this customer */}
                                                <button
                                                    onClick={() => router.push(`/councillor/${encodeURIComponent(cust.phone_number)}`)}
                                                    className="bg-[#EA1E63] text-white font-black px-5 py-2.5 rounded-[14px] text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm shadow-pink-100 hover:opacity-90 transition-all"
                                                >
                                                    <CalendarDays size={12} /> Add to Plan
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <footer className="p-8 text-center">
                    <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] italic">
                        Made By Kossa • Enterprise v2.0.3
                    </p>
                </footer>
            </div>
        </div>
    )
}