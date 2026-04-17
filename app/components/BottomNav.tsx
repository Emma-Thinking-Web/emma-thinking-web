'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, History, PlusCircle, Award, Users } from 'lucide-react'

export default function BottomNav() {
    const pathname = usePathname()

    if (pathname === '/') return null

    return (
        /* Max-width eka 500px kala tabs 5ma penna ona nisa */
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] p-2 bg-white/80 backdrop-blur-md border-t border-gray-50 z-50">
            <div className="bg-white border border-pink-100 rounded-full p-1 flex justify-between items-center shadow-lg shadow-pink-100/30">

                <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-2 rounded-full transition-all duration-300 ${pathname === '/dashboard' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}>
                    <LayoutDashboard size={18} strokeWidth={pathname === '/dashboard' ? 3 : 2} />
                    <span className="text-[7px] font-black mt-0.5 uppercase tracking-tighter">Home</span>
                </Link>

                <Link href="/dashboard/history" className={`flex-1 flex flex-col items-center py-2 rounded-full transition-all duration-300 ${pathname === '/dashboard/history' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}>
                    <History size={18} strokeWidth={pathname === '/dashboard/history' ? 3 : 2} />
                    <span className="text-[7px] font-black mt-0.5 uppercase tracking-tighter">History</span>
                </Link>

                <Link href="/entry" className={`flex-1 flex flex-col items-center py-2 rounded-full transition-all duration-300 ${pathname === '/entry' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}>
                    <PlusCircle size={18} strokeWidth={pathname === '/entry' ? 3 : 2} />
                    <span className="text-[7px] font-black mt-0.5 uppercase tracking-tighter">Entry</span>
                </Link>

                <Link href="/dashboard/clients" className={`flex-1 flex flex-col items-center py-2 rounded-full transition-all duration-300 ${pathname === '/dashboard/clients' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}>
                    <Users size={18} strokeWidth={pathname === '/dashboard/clients' ? 3 : 2} />
                    <span className="text-[7px] font-black mt-0.5 uppercase tracking-tighter">Clients</span>
                </Link>

                <Link href="/dashboard/profile" className={`flex-1 flex flex-col items-center py-2 rounded-full transition-all duration-300 ${pathname === '/dashboard/profile' ? 'bg-[#EA1E63] text-white shadow-md' : 'text-gray-300'}`}>
                    <Award size={18} strokeWidth={pathname === '/dashboard/profile' ? 3 : 2} />
                    <span className="text-[7px] font-black mt-0.5 uppercase tracking-tighter">Profile</span>
                </Link>

            </div>
        </div>
    )
}