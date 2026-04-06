'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
    Loader2, Camera, Wallet, Fingerprint, LogOut,
    User, Phone, MapPin, Cake, Star
} from 'lucide-react'
import Image from 'next/image'
import BottomNav from "@/app/components/BottomNav";

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [timestamp, setTimestamp] = useState(Date.now())
    const router = useRouter()

    const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma';

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/'); return; }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) console.error("Profile Error:", error.message);
            if (data) setProfile(data)
            setLoading(false)
        }
        fetchProfile()
    }, [router])

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile || !profile?.id) return;

        try {
            setUploading(true)
            const fileExt = selectedFile.name.split('.').pop()
            const fileName = `${profile.id}-${Math.random()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, selectedFile)
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id)

            if (updateError) throw updateError

            setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }))
            setTimestamp(Date.now())
            alert("Success! Profile picture saved permanently. ✅")
        } catch (error: any) {
            alert("Upload failed: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-[#EA1E63]" size={40} />
        </div>
    )

    // මම මෙතන ඔයාගේ අලුත් පැකේජ් නම් 6 දැම්මා
    const packageStats = [
        { name: 'VIP Pass', current: profile?.achievements?.p1 || 0, target: profile?.targets?.p1 || 10 },
        { name: 'Gold Pass', current: profile?.achievements?.p2 || 0, target: profile?.targets?.p2 || 10 },
        { name: 'Silver Pass', current: profile?.achievements?.p3 || 0, target: profile?.targets?.p3 || 10 },
        { name: 'Princess VIP', current: profile?.achievements?.p4 || 0, target: profile?.targets?.p4 || 10 },
        { name: 'Princess Gold', current: profile?.achievements?.p5 || 0, target: profile?.targets?.p5 || 10 },
        { name: 'Princess Silver', current: profile?.achievements?.p6 || 0, target: profile?.targets?.p6 || 10 },
    ]

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-[#FFE1EC] p-5 rounded-b-[35px] flex justify-between items-center shadow-sm z-50">
                <div className="flex items-center gap-2">
                    <Image src="/emma-logo.png" alt="Logo" width={28} height={28} style={{ width: 'auto', height: 'auto' }} priority />
                    <span className="text-[#EA1E63] font-black text-lg tracking-tighter">Emma Profile</span>
                </div>
                <div className="h-10 w-10 relative rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100">
                    <img
                        src={profile?.avatar_url ? `${profile.avatar_url}?t=${timestamp}` : defaultAvatar}
                        alt="Profile Thumb"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {/* Profile Identity (Photo & Basic Info) */}
                <div className="flex flex-col items-center py-4">
                    <div className="relative">
                        <div className="h-28 w-28 rounded-[35px] overflow-hidden border-4 border-pink-50 shadow-xl relative bg-gray-200">
                            <img
                                src={profile?.avatar_url ? `${profile.avatar_url}?t=${timestamp}` : defaultAvatar}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-white" size={24} />
                                </div>
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-[#EA1E63] text-white p-2 rounded-xl shadow-lg cursor-pointer active:scale-90 transition-all">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                        </label>
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-gray-900 tracking-tighter">{profile?.full_name || 'Emma Worker'}</h2>
                    <p className="text-[10px] text-[#EA1E63] font-bold uppercase tracking-widest bg-pink-50 px-4 py-1 rounded-full mt-1 italic">
                        {profile?.post_label || 'Executive Partner'}
                    </p>
                </div>

                {/* Earning Card */}
                <div className="bg-gradient-to-br from-[#EA1E63] to-[#ff4b8b] p-8 rounded-[40px] shadow-xl relative overflow-hidden">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">My Wallet Balance</p>
                    <h3 className="text-white text-4xl font-black tracking-tighter italic">LKR {profile?.total_commission?.toLocaleString() || '0.00'}</h3>
                    <Wallet size={32} className="absolute top-8 right-8 text-white/20" />
                </div>

                {/* --- NEW: PERSONAL DETAILS SECTION --- */}
                <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Personal Details</h3>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-50">
                            <div className="bg-pink-50 p-2 rounded-xl text-[#EA1E63]"><User size={18} /></div>
                            <div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Full Name</p>
                                <p className="text-xs font-black text-gray-800">{profile?.full_name || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-50">
                            <div className="bg-pink-50 p-2 rounded-xl text-[#EA1E63]"><Phone size={18} /></div>
                            <div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Phone Number</p>
                                <p className="text-xs font-black text-gray-800">{profile?.phone_number || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-50">
                            <div className="bg-pink-50 p-2 rounded-xl text-[#EA1E63]"><MapPin size={18} /></div>
                            <div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Residential Address</p>
                                <p className="text-xs font-black text-gray-800">{profile?.address || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-50">
                            <div className="bg-pink-50 p-2 rounded-xl text-[#EA1E63]"><Cake size={18} /></div>
                            <div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Birthday</p>
                                <p className="text-xs font-black text-gray-800">{profile?.birthday || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Targets Status */}
                <div className="bg-gray-50 p-6 rounded-[35px] border border-gray-100 space-y-5">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Target Status</h3>
                        <Star size={14} className="text-[#EA1E63]" fill="currentColor" />
                    </div>
                    {packageStats.map((pkg, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-gray-500 uppercase tracking-tight">{pkg.name}</span>
                                <span className="text-[#EA1E63] font-black">{pkg.current} / {pkg.target}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-100">
                                <div className="h-full bg-[#EA1E63] transition-all duration-1000 shadow-sm shadow-pink-200" style={{ width: `${(pkg.current / (pkg.target || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Logout & Footer */}
                <div className="space-y-4 pb-24">
                    <div className="p-5 bg-white border border-gray-100 rounded-[30px] flex items-center gap-4">
                        <Fingerprint className="text-gray-300" size={24} />
                        <div>
                            <p className="text-[8px] text-gray-400 font-bold uppercase">System ID</p>
                            <p className="text-sm font-black">{profile?.employee_id || 'EMMA-SYS-001'}</p>
                        </div>
                    </div>
                    <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="w-full p-5 rounded-full border-2 border-red-50 text-red-500 font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                        <LogOut size={18} /> Logout Account
                    </button>
                    <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">
                        Made By Kossa • Official Worker System v1.0.3
                    </p>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}