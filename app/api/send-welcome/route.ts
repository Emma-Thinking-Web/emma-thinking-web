import { NextResponse } from 'next/server';

const WHATSAPP_TOKEN = "EAAXLCYV8OKIBRGfxJ213IvF7NZCwRmSLisvdWkBOBl99CF8EROsL6QFRaxMniBS2awW6VtMA0mFhXD3cVYpoG4ZBtZCTS0THZCTlZAcNlhQeTPLZBq4RpnyiDZBFSHGKkXS4ZC8ccAnvVVIwYFnJPuPo3T4tJ7teeipyPaZBdG9doss7ZAI1VfDhxkSrzn0YSDBgZDZD";
const PHONE_ID = "1134936466363142";

async function sendWhatsApp(to: string, template: string, name: string) {
    let formattedNumber = to.replace(/\D/g, "");
    if (formattedNumber.startsWith("0")) formattedNumber = "94" + formattedNumber.slice(1);
    if (!formattedNumber.startsWith("94")) formattedNumber = "94" + formattedNumber;

    const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: formattedNumber,
            type: "template",
            template: {
                name: template,
                language: { code: "en" },
                components: [{
                    type: "body",
                    parameters: [{ type: "text", text: name }]
                }]
            }
        })
    });
    return res.json();
}

export async function POST(req: Request) {
    try {
        const { name, phone } = await req.json();
        await sendWhatsApp(phone, "greeting", name);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await sendWhatsApp(phone, "registration", name);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}