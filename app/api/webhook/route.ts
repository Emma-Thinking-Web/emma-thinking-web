import { NextResponse } from 'next/server';

// උඹ දීපු පර්මනන්ට් ටෝකන් එක සහ ID එක
const WHATSAPP_TOKEN = "EAAXLCYV8OKIBRGfxJ213IvF7NZCwRmSLisvdWkBOBl99CF8EROsL6QFRaxMniBS2awW6VtMA0mFhXD3cVYpoG4ZBtZCTS0THZCTlZAcNlhQeTPLZBq4RpnyiDZBFSHGKkXS4ZC8ccAnvVVIwYFnJPuPo3T4tJ7teeipyPaZBdG9doss7ZAI1VfDhxkSrzn0YSDBgZDZD";
const PHONE_ID = "1134936466363142";

async function sendWhatsApp(to: string, templateName: string, parameters: any[]) {
    // නම්බර් එක ෆෝමැට් කරනවා (0 අයින් කරලා 94 දානවා)
    let formattedNumber = to.replace(/\D/g, "");
    if (formattedNumber.startsWith("0")) formattedNumber = "94" + formattedNumber.slice(1);
    if (!formattedNumber.startsWith("94")) formattedNumber = "94" + formattedNumber;

    const url = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

    const body = {
        messaging_product: "whatsapp",
        to: formattedNumber,
        type: "template",
        template: {
            name: templateName,
            language: { code: "en" },
            components: [{
                type: "body",
                parameters: parameters
            }]
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    return res.json();
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Calendly එකෙන් එවන පේලෝඩ් එකෙන් දත්ත ගන්නවා
        const invitee = body.payload.invitee;
        const event = body.payload.scheduled_event;

        const customerName = invitee.name;
        // Calendly එකේ "Phone Number" ක්ෂේත්‍රය text_reminder_number ලෙස බොහෝවිට එයි
        const customerPhone = invitee.text_reminder_number || invitee.questions_and_answers?.find((q: any) => q.question.toLowerCase().includes('phone'))?.answer;

        if (!customerPhone) {
            console.error("No phone number found in Calendly payload");
            return NextResponse.json({ status: 'Error', message: 'No phone number' }, { status: 400 });
        }

        const startUTC = new Date(event.start_time);
        const dateStr = startUTC.toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' });
        const timeStr = startUTC.toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' });
        const meetLink = event.location.join_url || event.location.location;

        // 1. Customer ට "meeting_confirmation" යනවා
        await sendWhatsApp(customerPhone, "meeting_confirmation", [
            { type: "text", text: customerName },
            { type: "text", text: dateStr },
            { type: "text", text: timeStr },
            { type: "text", text: meetLink }
        ]);

        // 2. උඹේ නම්බර් එකට (Counsellor) "counsellor_alert" යනවා
        await sendWhatsApp("94761552286", "counsellor_alert", [
            { type: "text", text: customerName },
            { type: "text", text: customerPhone },
            { type: "text", text: "Emma Consultation" },
            { type: "text", text: dateStr },
            { type: "text", text: timeStr },
            { type: "text", text: meetLink }
        ]);

        return NextResponse.json({ status: 'Success' });
    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ status: 'Error', error: error.message }, { status: 500 });
    }
}