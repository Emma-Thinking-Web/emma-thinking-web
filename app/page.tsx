'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email, password,
      })
      if (authError) throw authError
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single()
      if (profile?.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      alert("Login Failed: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    /* මුළු Screen එකේම මැදට එන්න flex-grow සහ justify-center මෙතන තියෙනවා */
    <div className="flex-grow flex flex-col items-center justify-center p-6 w-full">

      <div className="w-full flex flex-col items-center">
        {/* Logo */}
        <div className="bg-white p-5 rounded-[35px] shadow-xl shadow-pink-100/50 mb-8 border border-pink-50">
          <Image src="/emma-logo.png" alt="Emma Logo" width={80} height={80} priority />
        </div>

        <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-1">Emma Thinking</h1>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-12 text-center">
          A world beyond the matrimony..
        </p>

        {/* Login Card */}
        <div className="w-full bg-white p-10 rounded-[50px] border border-gray-100 shadow-2xl shadow-gray-200/50">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-5 tracking-[0.2em]">Company Email</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-16 pr-6 py-5 rounded-[25px] bg-gray-50 border border-transparent focus:border-pink-200 focus:bg-white outline-none font-bold" placeholder="name@emma.com" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-5 tracking-[0.2em]">Password</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-16 pr-16 py-5 rounded-[25px] bg-gray-50 border border-transparent focus:border-pink-200 focus:bg-white outline-none font-bold" placeholder="••••••••" />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </div>
              </div>
            </div>

            <button disabled={loading} className="w-full bg-[#EA1E63] text-white font-black p-6 rounded-full shadow-xl hover:bg-pink-700 active:scale-95 transition-all flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={20} strokeWidth={3} /><span>SECURE LOG IN</span></>}
            </button>
          </form>
        </div>
      </div>

      {/* Kossa Footer - මේක දැන් හරියටම පල්ලෙහාටම යනවා */}
      <div className="kossa-footer">Made By Kossa • Official Enterprise Edition • v1.0.2</div>
    </div>
  )
}