import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PERMANENT_MEET_LINK = 'https://meet.google.com/dgc-ayrs-gzg';

const COUNSELLORS: Record<string, string> = {
    'Ayesha': '94744120719',
    'Rashi': '94744120718',
};

const COUNSELLOR_PACKAGES = [
    'Gold Pass',
    'VIP Pass',
    'Princess Gold',
    'Princess VIP'
];

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone, packageName, counsellor } = body;

        if (!name || !phone || !packageName || !counsellor) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const formattedPhone = phone.replace(/^0/, '94').replace(/^\+/, '');
        const WABA_PHONE_ID = '1134936466363142';
        const ACCESS_TOKEN = process.env.WABA_ACCESS_TOKEN!;

        // 1. greeting → client
        try {
            await sendWhatsApp(formattedPhone, 'greeting', [
                { name: 'customer_name', value: name }
            ], WABA_PHONE_ID, ACCESS_TOKEN);
        } catch (err) { console.error("WhatsApp greeting error:", err); }

        // 2. registration → client (has dynamic URL button)
        try {
            await sendWhatsAppWithButton(formattedPhone, 'registration',
                [{ name: 'customer_name', value: name }],
                'https://www.emmathinking.com/login',
                WABA_PHONE_ID, ACCESS_TOKEN);
        } catch (err) { console.error("WhatsApp registration error:", err); }

        // 3. meeting_confirmation → client
        try {
            await sendWhatsApp(formattedPhone, 'meeting_confirmation', [
                { name: 'customer_name', value: name },
                { name: 'meet_link', value: PERMANENT_MEET_LINK }
            ], WABA_PHONE_ID, ACCESS_TOKEN);
        } catch (err) { console.error("WhatsApp meeting_confirmation error:", err); }

        // 4. counsellor_alert → counsellor (premium packages only)
        if (COUNSELLOR_PACKAGES.includes(packageName)) {
            const counsellorPhone = COUNSELLORS[counsellor];
            if (counsellorPhone) {
                try {
                    await sendWhatsApp(counsellorPhone, 'counsellor_alert', [
                        { name: 'customer_name', value: name },
                        { name: 'customer_phone', value: phone },
                        { name: 'package_name', value: packageName },
                        { name: 'meet_link', value: PERMANENT_MEET_LINK }
                    ], WABA_PHONE_ID, ACCESS_TOKEN);
                } catch (err) { console.error("WhatsApp counsellor_alert error:", err); }
            }
        }

        // 5. Google Calendar Event
        try {
            const privateKey = process.env.GOOGLE_PRIVATE_KEY!
                .replace(/^"(.*)"$/, '$1')
                .split(String.raw`\n`)
                .join('\n');

            const auth = new google.auth.JWT({
                email: process.env.GOOGLE_CLIENT_EMAIL,
                key: privateKey,
                scopes: ['https://www.googleapis.com/auth/calendar.events'],
            });

            const calendar = google.calendar({ version: 'v3', auth });
            const now = new Date();
            const end = new Date(now.getTime() + 30 * 60000);

            await calendar.events.insert({
                calendarId: 'ridma.emmathinking@gmail.com',
                requestBody: {
                    summary: `Onboarding: ${name}`,
                    start: { dateTime: now.toISOString() },
                    end: { dateTime: end.toISOString() },
                    description: `Package: ${packageName}\nCounsellor: ${counsellor}\nJoin: ${PERMANENT_MEET_LINK}`,
                    location: PERMANENT_MEET_LINK,
                }
            });
        } catch (err) { console.error("Google Calendar error:", err); }

        // 6. Save to Supabase
        const { error: dbError } = await supabase
            .from('customers')
            .insert({
                customer_name: name,
                customer_number: phone,
                package: packageName,
                counsellor: counsellor,
                status: 'New'
            });

        if (dbError) console.error("Supabase insert error:", dbError.message);

        return NextResponse.json({ success: true, meet: PERMANENT_MEET_LINK });

    } catch (err: any) {
        console.error("API ROUTE ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// For templates without buttons
async function sendWhatsApp(
    to: string,
    template: string,
    parameters: { name: string, value: string }[],
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
                ...(parameters.length > 0 && {
                    components: [{
                        type: "body",
                        parameters: parameters.map(p => ({
                            type: "text",
                            parameter_name: p.name,
                            text: p.value
                        }))
                    }]
                })
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

// For templates with dynamic URL button
async function sendWhatsAppWithButton(
    to: string,
    template: string,
    parameters: { name: string, value: string }[],
    buttonUrl: string,
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
                components: [
                    {
                        type: "body",
                        parameters: parameters.map(p => ({
                            type: "text",
                            parameter_name: p.name,
                            text: p.value
                        }))
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: 0,
                        parameters: [
                            { type: "text", text: buttonUrl }
                        ]
                    }
                ]
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