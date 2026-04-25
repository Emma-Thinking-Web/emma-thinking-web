import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key so cron can read/write all tasks
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEXT_LK_TOKEN = '3018|BOLZ8T5jV2lbcN3Bjn0l3XwItBzHbMCgPLTeTLjt20c35712'
const ADMIN_PHONE = '0777887542'
const TEXT_LK_URL = 'https://app.text.lk/api/http/'

async function sendSMS(to: string, message: string) {
    const phone = to.replace(/^0/, '94')
    const url = `${TEXT_LK_URL}?username=${TEXT_LK_TOKEN}&to=${phone}&message=${encodeURIComponent(message)}`
    const res = await fetch(url)
    return res.ok
}

function getDaysLeft(deadline: string): number {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(deadline)
    end.setHours(0, 0, 0, 0)
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { data: tasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'active')

        if (error) throw error
        if (!tasks || tasks.length === 0) {
            return NextResponse.json({ message: 'No active tasks', sent: 0 })
        }

        let smsSentCount = 0
        const updates: any[] = []

        for (const task of tasks) {
            const daysLeft = getDaysLeft(task.deadline)
            const deadlineFormatted = new Date(task.deadline).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            })

            // ── 5 DAYS REMINDER ──
            if (daysLeft === 5 && !task.sms_sent_5) {
                const workerMsg = `Emma Thinking Reminder 🔔\n\nHello ${task.worker_name}, you have only 5 days left to complete your "${task.title}".\n\nDeadline: ${deadlineFormatted}\n\nPlease make sure to complete it on time. - Emma Admin`
                const adminMsg = `Emma Thinking 🔔 Reminder Sent\n\n${task.worker_name} has been reminded — 5 days left for:\n"${task.title}"\n\nDeadline: ${deadlineFormatted}`

                const workerOk = await sendSMS(task.worker_phone, workerMsg)
                await sendSMS(ADMIN_PHONE, adminMsg)

                if (workerOk) {
                    updates.push(() => supabase.from('tasks').update({ sms_sent_5: true }).eq('id', task.id))
                    smsSentCount++
                }
            }

            // ── 3 DAYS REMINDER ──
            if (daysLeft === 3 && !task.sms_sent_3) {
                const workerMsg = `Emma Thinking ⚠️ Reminder\n\nHello ${task.worker_name}, you have only 3 days left to complete your "${task.title}".\n\nDeadline: ${deadlineFormatted}\n\nDon't forget! - Emma Admin`
                const adminMsg = `Emma Thinking ⚠️ Reminder Sent\n\n${task.worker_name} has been reminded — 3 days left for:\n"${task.title}"\n\nDeadline: ${deadlineFormatted}`

                const workerOk = await sendSMS(task.worker_phone, workerMsg)
                await sendSMS(ADMIN_PHONE, adminMsg)

                if (workerOk) {
                    updates.push(() => supabase.from('tasks').update({ sms_sent_3: true }).eq('id', task.id))
                    smsSentCount++
                }
            }

            // ── DEADLINE DAY FINAL WARNING ──
            if (daysLeft === 0 && !task.sms_sent_0) {
                const workerMsg = `Emma Thinking 🚨 FINAL WARNING\n\nHello ${task.worker_name}, TODAY is the deadline for your "${task.title}".\n\nPlease complete and mark it done immediately! - Emma Admin`
                const adminMsg = `Emma Thinking 🚨 Deadline Today\n\n${task.worker_name}'s task is due TODAY:\n"${task.title}"\n\nNot yet completed.`

                const workerOk = await sendSMS(task.worker_phone, workerMsg)
                await sendSMS(ADMIN_PHONE, adminMsg)

                if (workerOk) {
                    updates.push(() => supabase.from('tasks').update({ sms_sent_0: true }).eq('id', task.id))
                    smsSentCount++
                }
            }
        }

        // ── CHECK FOR COMPLETED TASKS — notify admin ──
        const { data: doneTasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('status', 'done')
            .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        if (doneTasks && doneTasks.length > 0) {
            for (const done of doneTasks) {
                const adminMsg = `Emma Thinking ✅ Task Completed!\n\n${done.worker_name} has successfully completed "${done.title}".\n\nDeadline was: ${new Date(done.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
                await sendSMS(ADMIN_PHONE, adminMsg)
            }
        }

        // Run all DB updates in parallel
        await Promise.all(updates.map(fn => fn()))

        return NextResponse.json({
            message: 'Reminders processed',
            active_tasks: tasks.length,
            sms_sent: smsSentCount,
            completed_notifications: doneTasks?.length || 0
        })
    } catch (err: any) {
        console.error('Cron error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}