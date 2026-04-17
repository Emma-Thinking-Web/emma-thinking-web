'use client'

import { useState } from 'react'
import { Send, Loader2, User, Phone } from 'lucide-react'
import Image from 'next/image'

export default function ClientsPage() {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')

    const handleQuickSend = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // මෙතනදී අපි කලින් හදපු API route එකම පාවිච්චි කරන්න පුළුවන්
            // පැකේජ් එකයි වෙලාවයි default විදිහට යවමු
            const res = await fetch('/api/process-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    phone,
                    package_name: 'General Inquiry',
                    date: new Date().toISOString().split('T')[0], // Today
                    time: '10:00' // Default time
                }),
            })

            if (res.ok) {
                alert('✅ Greeting & Registration Sent!')
                setName(''); setPhone('')
            } else {
                alert('❌ Failed to send.')
            }
        } catch (err) {
            alert('❌ Connection Error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="bg-[#EA1E63] p-10 rounded-b-[50px] shadow-lg">
                <h1 className="text-white font-black text-2xl italic tracking-tighter">Quick Client Onboarding</h1>
                <p className="text-pink-100 text-xs font-bold mt-1">Send Welcome Pack Instantly</p>
            </div>

            <form onSubmit={handleQuickSend} className="p-8 space-y-6 mt-6 max-w-md mx-auto">
                <div className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input
                            required
                            type="text"
                            placeholder="Client Name"
                            className="w-full bg-gray-50 p-6 pl-14 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-200 transition-all"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <input
                            required
                            type="text"
                            placeholder="WhatsApp Number"
                            className="w-full bg-gray-50 p-6 pl-14 rounded-[30px] font-bold outline-none border-2 border-transparent focus:border-pink-200 transition-all"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    disabled={loading}
                    type="submit"
                    className="w-full bg-[#EA1E63] text-white font-black p-7 rounded-[35px] shadow-xl shadow-pink-100 flex items-center justify-center gap-3 text-lg active:scale-95 transition-all"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <>SEND NOW <Send size={22} /></>}
                </button>
            </form>

            <div className="px-10 py-4 text-center">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-loose">
                    This will automatically send Greeting and Registration templates via WhatsApp.
                </p>
            </div>
        </div>
    )
}