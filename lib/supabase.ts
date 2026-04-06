import { createClient } from '@supabase/supabase-js'

// මේ values දෙක .env.local එකෙන් තමයි ගන්නේ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)