import { NextResponse } from 'next/server';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = "1134936466363142";

async function sendWhatsApp(to: string, template: string, name: string) {
    let formattedNumber = to.replace(/\D/g, "");
    if (formattedNumber.startsWith("0")) formattedNumber = "94" + formattedNumber.slice(1);
    if (!formattedNumber.startsWith("94")) formattedNumber = "94" + formattedNumber;

    // Body එකේ {{customer_name}} එකට ඩේටා දානවා
    const components: any[] = [
        {
            type: "body",
            parameters: [
                { type: "text", text: name }
            ]
        }
    ];

    // ඔයාගේ Registration template එකේ "Visit website" බටන් එකක් තියෙන නිසා මේක අනිවාර්යයි
    if (template === "registration") {
        components.push({
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: "login" }] // මේ "login" කියන එක Meta dashboard එකේ බටන් එකේ suffix එකට මැච් වෙන්න ඕනේ
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

    const responseData = await res.json();
    console.log(`Meta Response for ${template}:`, responseData);
    return responseData;
}

export async function POST(req: Request) {
    try {
        const { name, phone } = await req.json();

        // 1. Greeting යවනවා (image_64df41.png)
        const res1 = await sendWhatsApp(phone, "greeting", name);

        // 2. තත්පර 2කින් Registration යවනවා (image_64df02.png)
        await new Promise(resolve => setTimeout(resolve, 2000));
        const res2 = await sendWhatsApp(phone, "registration", name);

        return NextResponse.json({ success: true, res1, res2 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}