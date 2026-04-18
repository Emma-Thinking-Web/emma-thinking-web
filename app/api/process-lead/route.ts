import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MEET_LINKS = [
    'https://meet.google.com/zew-shav-sar',
    'https://meet.google.com/dvi-nefx-awd',
    'https://meet.google.com/yzp-dajy-dei',
    'https://meet.google.com/pjw-ztoo-mre',
    'https://meet.google.com/pgf-xyds-wif',
    'https://meet.google.com/wwk-ntdm-sar',
    'https://meet.google.com/qwv-jfmn-vxo',
    'https://meet.google.com/zdt-sjxd-edo',
    'https://meet.google.com/qfg-ekon-huo',
    'https://meet.google.com/mwa-jhqt-jqe',
];

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

async function getNextMeetLink(): Promise<string> {
    // Count existing customers to determine which link to use
    const { count } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

    const index = (count ?? 0) % MEET_LINKS.length;
    return MEET_LINKS[index];
}

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

        // Get rotating meet link
        const meetLink = await getNextMeetLink();

        // 1. website → client
        try {
            await sendWhatsAppWithButton(formattedPhone, 'website',
                [{ name: 'customer_name', value: name }],
                'https://www.emmathinking.com/login',
                WABA_PHONE_ID, ACCESS_TOKEN);
        } catch (err) { console.error("WhatsApp website error:", err); }

        // 2. meeting_confirmation → client
        try {
            await sendWhatsApp(formattedPhone, 'meeting_confirmation', [
                { name: 'customer_name', value: name },
                { name: 'meet_link', value: meetLink }
            ], WABA_PHONE_ID, ACCESS_TOKEN);
        } catch (err) { console.error("WhatsApp meeting_confirmation error:", err); }

        // 3. counsellor_alert → counsellor (premium packages only)
        if (COUNSELLOR_PACKAGES.includes(packageName)) {
            const counsellorPhone = COUNSELLORS[counsellor];
            if (counsellorPhone) {
                try {
                    await sendWhatsApp(counsellorPhone, 'counsellor_alert', [
                        { name: 'customer_name', value: name },
                        { name: 'customer_phone', value: phone },
                        { name: 'package_name', value: packageName },
                        { name: 'meet_link', value: meetLink }
                    ], WABA_PHONE_ID, ACCESS_TOKEN);
                } catch (err) { console.error("WhatsApp counsellor_alert error:", err); }
            }
        }

        // 4. Google Calendar Event
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
                    description: `Package: ${packageName}\nCounsellor: ${counsellor}\nJoin: ${meetLink}`,
                    location: meetLink,
                }
            });
        } catch (err) { console.error("Google Calendar error:", err); }

        // 5. Save to Supabase
        const { error: dbError } = await supabase
            .from('customers')
            .insert({
                customer_name: name,
                customer_number: phone,
                package: packageName,
                counsellor: counsellor,
                status: 'New',
                meet_link: meetLink
            });

        if (dbError) console.error("Supabase insert error:", dbError.message);

        return NextResponse.json({ success: true, meet: meetLink });

    } catch (err: any) {
        console.error("API ROUTE ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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