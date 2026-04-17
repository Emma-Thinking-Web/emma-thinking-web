import { NextResponse } from 'next/server';

const WHATSAPP_TOKEN = "EAAXLCYV8OKIBRGfxJ213IvF7NZCwRmSLisvdWkBOBl99CF8EROsL6QFRaxMniBS2awW6VtMA0mFhXD3cVYpoG4ZBtZCTS0THZCTlZAcNlhQeTPLZBq4RpnyiDZBFSHGKkXS4ZC8ccAnvVVIwYFnJPuPo3T4tJ7teeipyPaZBdG9doss7ZAI1VfDhxkSrzn0YSDBgZDZD";
const PHONE_ID = "1134936466363142";

async function sendWhatsApp(to: string, template: string, name: string) {
    let formattedNumber = to.replace(/\D/g, "");
    if (formattedNumber.startsWith("0")) formattedNumber = "94" + formattedNumber.slice(1);
    if (!formattedNumber.startsWith("94")) formattedNumber = "94" + formattedNumber;

    // Template එක අනුව components වෙනස් කරනවා
    const components: any[] = [
        {
            type: "body",
            parameters: [
                { type: "text", parameter_name: "customer_name", text: name }
            ]
        }
    ];

    // Registration template එකේදී විතරක් Button එක ඇඩ් කරනවා
    if (template === "registration") {
        components.push({
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: "login" }]
        });
    }

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
                components: components
            }
        })
    });
    return res.json();
}

export async function POST(req: Request) {
    try {
        const { name, phone } = await req.json();

        // 1. Greeting යවනවා
        await sendWhatsApp(phone, "greeting", name);

        // 2. තත්පර 2ක පරක්කුවකින් Registration යවනවා
        await new Promise(resolve => setTimeout(resolve, 2000));
        await sendWhatsApp(phone, "registration", name);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}