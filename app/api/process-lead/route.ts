import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone } = body;

        // Vercel dashboard eke dapu key eka gannawa
        let privateKey = process.env.GOOGLE_PRIVATE_KEY;

        if (!privateKey) {
            console.error("CRITICAL: GOOGLE_PRIVATE_KEY missing!");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const formattedKey = privateKey
            .replace(/^"(.*)"$/, '$1')
            .split(String.raw`\n`)
            .join('\n');

        const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

        const auth = new google.auth.JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: formattedKey,
            scopes: SCOPES,
        });

        // WhatsApp Details
        const WABA_PHONE_ID = '1134936466363142';
        const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN;

        // Phone Number format (077 -> 9477)
        const formattedPhone = phone.replace(/^0/, '94').replace(/^\+/, '');

        // 1. WhatsApp Templates
        try {
            await sendWhatsApp(formattedPhone, 'greeting', [{ type: "text", text: name }], WABA_PHONE_ID, ACCESS_TOKEN!);
            await sendWhatsApp(formattedPhone, 'registration', [{ type: "text", text: name }], WABA_PHONE_ID, ACCESS_TOKEN!);
        } catch (wsErr) {
            console.error("WhatsApp Error:", wsErr);
        }

        // 2. Google Meet Creation
        const calendar = google.calendar({ version: 'v3', auth });
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 60000);

        const eventRes = await calendar.events.insert({
            calendarId: 'ridma.emmathinking@gmail.com',
            conferenceDataVersion: 1,
            requestBody: {
                summary: `Onboarding: ${name}`,
                start: { dateTime: now.toISOString() },
                end: { dateTime: end.toISOString() },
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: { type: 'eventHangout' } // ✅ Fixed: personal Gmail uses eventHangout
                    }
                }
            }
        });

        // Meet link - fallback chain because personal Gmail may return it differently
        const meetLink =
            eventRes.data.hangoutLink ||
            eventRes.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ||
            null;

        if (!meetLink) {
            console.warn("Meet link not returned. Full conferenceData:", JSON.stringify(eventRes.data.conferenceData));
        }

        return NextResponse.json({ success: true, meet: meetLink });

    } catch (err: any) {
        console.error("API ROUTE ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function sendWhatsApp(
    to: string,
    template: string,
    parameters: any[],
    phoneId: string,
    token: string
) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: template,
                language: { code: "en" },
                components: [{ type: "body", parameters }]
            }
        })
    });

    const data = await res.json();

    if (!res.ok) {
        console.error(`WhatsApp API Error (${template}):`, JSON.stringify(data));
        throw new Error(`WhatsApp send failed: ${data?.error?.message || 'Unknown error'}`);
    }

    return data;
}