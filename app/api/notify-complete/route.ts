import { NextResponse } from 'next/server'

const TEXT_LK_TOKEN = '3018|BOLZ8T5jV2lbcN3Bjn0l3XwItBzHbMCgPLTeTLjt20c35712'
const ADMIN_PHONE = '0777887542'
const TEXT_LK_URL = 'https://app.text.lk/api/http/'

async function sendSMS(to: string, message: string) {
    const phone = to.replace(/^0/, '94')
    const url = `${TEXT_LK_URL}?username=${TEXT_LK_TOKEN}&to=${phone}&message=${encodeURIComponent(message)}`
    const res = await fetch(url)
    return res.ok
}

export async function POST(request: Request) {
    try {
        const { workerName, workerPhone, taskTitle } = await request.json()

        if (!workerName || !workerPhone || !taskTitle) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // Message to the worker
        const workerMsg = `Emma Thinking ✅ Well Done!\n\nHello ${workerName}, you have successfully completed your task:\n"${taskTitle}"\n\nGreat work! Keep it up. - Emma Admin`

        // Message to admin
        const adminMsg = `Emma Thinking ✅ Task Completed!\n\n${workerName} has successfully completed:\n"${taskTitle}"\n\nMarked done just now.`

        await Promise.all([
            sendSMS(workerPhone, workerMsg),
            sendSMS(ADMIN_PHONE, adminMsg),
        ])

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('notify-complete error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}