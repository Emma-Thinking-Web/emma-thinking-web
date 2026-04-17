import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const WABA_PHONE_ID = '1134936466363142';
const ACCESS_TOKEN = 'EAAXLCYV8OKIBRDgZB75fa9h5m4ul9QZCr3VJB4sv48dEZAdpUecXZAXj6m6pwltUAXM4pHzLm9g1QvTj2wyntxrgjvqUDdmqlqqRLSztThlNi3qVs6uR2lQt2B2M3NmorzvdsH54TJyyqXZAI8aUpRGGi3ZChELZA4dnVb9dREGGpvAFSq6ZA98KuzEPm37nWwZDZD';
const COUNSELLOR_PHONE = '94744120718';

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const auth = new google.auth.JWT({
    email: 'emma-meet-bot@emma-thinking-meet.iam.gserviceaccount.com',
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
});
const calendar = google.calendar({ version: 'v3', auth });

export async function POST(req: Request) {
    try {
        const { name, phone, package_name, date, time } = await req.json();

        // Phone Format Fix
        const formattedPhone = phone.replace(/^0/, '94').replace(/^\+/, '');

        // 1. Send Greeting & Registration First
        await sendWhatsApp(formattedPhone, 'greeting', [{ type: "text", text: name }]);
        await sendWhatsApp(formattedPhone, 'registration', [{ type: "text", text: name }]);

        // 2. Create Google Meet Link
        const startDateTime = new Date(`${date}T${time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // 30 mins later

        const event = {
            summary: `Consultation: ${name} (${package_name})`,
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() },
            conferenceData: {
                createRequest: { requestId: `meet-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } }
            },
        };

        const calRes = await calendar.events.insert({
            calendarId: 'ridma.emmathinking@gmail.com',
            requestBody: event,
            conferenceDataVersion: 1,
        });

        const meetLink = calRes.data.conferenceData?.entryPoints?.[0].uri || "";

        // 3. Send Meeting Confirmation to Customer
        await sendWhatsApp(formattedPhone, 'meeting_confirmation', [
            { type: "text", text: name },
            { type: "text", text: date },
            { type: "text", text: time },
            { type: "text", text: meetLink }
        ]);

        // 4. Send Alert to Counsellor
        await sendWhatsApp(COUNSELLOR_PHONE, 'counsellor_alert', [
            { type: "text", text: name },
            { type: "text", text: formattedPhone },
            { type: "text", text: package_name },
            { type: "text", text: date },
            { type: "text", text: time },
            { type: "text", text: meetLink }
        ]);

        return NextResponse.json({ success: true, link: meetLink });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function sendWhatsApp(to: string, template: string, parameters: any[]) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${WABA_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
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
    return res.json();
}