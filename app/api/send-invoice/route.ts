import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WHATSAPP_TOKEN = process.env.WABA_ACCESS_TOKEN!
const PHONE_ID = "1134936466363142"
const LAST_MANUAL_INVOICE = 782

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendWhatsApp(to: string, params: {
    customer_name: string
    invoice_number: string
    amount: string
    package_name: string
    invoice_link: string
}) {
    let num = to.replace(/\D/g, '')
    if (num.startsWith('0')) num = '94' + num.slice(1)
    if (num.startsWith('9494')) num = num.slice(2)
    if (!num.startsWith('94')) num = '94' + num

    const url = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`

    const body = {
        messaging_product: 'whatsapp',
        to: num,
        type: 'template',
        template: {
            name: 'invoice_ready',
            language: { code: 'en' },
            components: [{
                type: 'body',
                parameters: [
                    { type: 'text', parameter_name: 'customer_name', text: params.customer_name },
                    { type: 'text', parameter_name: 'invoice_number', text: params.invoice_number },
                    { type: 'text', parameter_name: 'amount', text: params.amount },
                    { type: 'text', parameter_name: 'package_name', text: params.package_name },
                    { type: 'text', parameter_name: 'invoice_link', text: params.invoice_link },
                ]
            }]
        }
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    })
    const result = await res.json()
    console.log('WhatsApp result:', JSON.stringify(result))
    return result
}

async function getNextInvoiceNumber(): Promise<string> {
    try {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .select('invoice_number')
            .order('created_at', { ascending: false })
            .limit(1)

        if (error || !data || data.length === 0) {
            return 'EM' + String(LAST_MANUAL_INVOICE + 1).padStart(5, '0')
        }

        const lastNum = parseInt(data[0].invoice_number.replace('EM', ''))

        if (isNaN(lastNum) || lastNum < LAST_MANUAL_INVOICE) {
            return 'EM' + String(LAST_MANUAL_INVOICE + 1).padStart(5, '0')
        }

        return 'EM' + String(lastNum + 1).padStart(5, '0')
    } catch {
        return 'EM' + String(LAST_MANUAL_INVOICE + 1).padStart(5, '0')
    }
}

export async function POST(req: Request) {
    try {
        const {
            clientName,
            clientNumber,
            paymentMethod,
            kokoId,
            packageName,
            baseAmount,
            discountPercent,
            finalAmount,
            slipBase64,
            slipMimeType,
            workerId
        } = await req.json()

        const invoiceNumber = await getNextInvoiceNumber()
        console.log('Generated invoice number:', invoiceNumber)

        // Upload slip
        let slipUrl = null
        if (slipBase64 && paymentMethod !== 'KOKO') {
            const slipBuffer = Buffer.from(slipBase64, 'base64')
            let ext = 'jpg'
            if (slipMimeType === 'image/png') ext = 'png'
            else if (slipMimeType === 'application/pdf') ext = 'pdf'

            const slipPath = 'slips/' + invoiceNumber + '.' + ext
            const { error: slipError } = await supabaseAdmin.storage
                .from('invoices')
                .upload(slipPath, slipBuffer, { contentType: slipMimeType, upsert: true })

            if (slipError) {
                console.error('Slip upload error:', slipError)
            } else {
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('invoices')
                    .getPublicUrl(slipPath)
                slipUrl = publicUrl
            }
        }

        // Generate and upload invoice HTML
        const invoiceHtml = generateInvoiceHtml({
            invoiceNumber,
            clientName,
            clientNumber,
            paymentMethod,
            kokoId,
            packageName,
            baseAmount,
            discountPercent,
            finalAmount
        })

        const pdfPath = 'pdfs/' + invoiceNumber + '.html'
        const { error: pdfError } = await supabaseAdmin.storage
            .from('invoices')
            .upload(pdfPath, Buffer.from(invoiceHtml, 'utf-8'), {
                contentType: 'text/html',
                upsert: true
            })
        if (pdfError) throw new Error('Invoice upload failed: ' + pdfError.message)

        const { data: { publicUrl: pdfUrl } } = supabaseAdmin.storage
            .from('invoices')
            .getPublicUrl(pdfPath)

        // Save to DB
        const { error: dbError } = await supabaseAdmin.from('orders').insert([{
            invoice_number: invoiceNumber,
            client_name: clientName,
            client_number: clientNumber,
            payment_method: paymentMethod,
            koko_id: kokoId || null,
            package_name: packageName,
            base_amount: baseAmount,
            discount_percent: discountPercent,
            final_amount: finalAmount,
            slip_url: slipUrl,
            pdf_url: pdfUrl,
            worker_id: workerId
        }])
        if (dbError) throw new Error('DB insert failed: ' + dbError.message)

        // Send WhatsApp
        const waResult = await sendWhatsApp(clientNumber, {
            customer_name: clientName,
            invoice_number: invoiceNumber,
            amount: Number(finalAmount).toLocaleString(),
            package_name: packageName,
            invoice_link: 'https://emma-thinking-web.vercel.app/invoice/' + invoiceNumber
        })

        if (waResult.error) {
            console.error('WhatsApp send failed:', JSON.stringify(waResult.error))
        }

        return NextResponse.json({ success: true, invoiceNumber, pdfUrl })

    } catch (error: any) {
        console.error('send-invoice error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function generateInvoiceHtml(data: {
    invoiceNumber: string
    clientName: string
    clientNumber: string
    paymentMethod: string
    kokoId?: string
    packageName: string
    baseAmount: number
    discountPercent: number
    finalAmount: number
}) {
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const dash = '-'
    const descriptionLine = data.discountPercent > 0
        ? data.packageName + ' ' + dash + ' ' + data.discountPercent + '% Discount'
        : data.packageName + ' ' + dash + ' Profile Publishing & Ad Boost'

    const finalAmountFormatted = Number(data.finalAmount).toLocaleString()
    const kokoLine = data.kokoId ? ' (ID: ' + data.kokoId + ')' : ''

    const html = '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '<meta charset="UTF-8"/>\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n' +
        '<title>Invoice ' + data.invoiceNumber + ' - Emma Thinking</title>\n' +
        '<style>\n' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
        'body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #f5f5f5; }\n' +
        '.download-bar { background: #EA1E63; padding: 14px; text-align: center; position: sticky; top: 0; z-index: 100; }\n' +
        '.download-btn { background: white; color: #EA1E63; border: none; border-radius: 25px; padding: 10px 28px; font-size: 13px; font-weight: 900; cursor: pointer; }\n' +
        '.badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; border-radius: 20px; padding: 3px 12px; font-size: 10px; font-weight: 900; margin-left: 10px; vertical-align: middle; }\n' +
        '.page { background: #fff; max-width: 750px; margin: 30px auto; padding: 50px; border-radius: 8px; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }\n' +
        '.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 20px; }\n' +
        '.company-name { font-size: 18px; font-weight: 900; }\n' +
        '.company-address { font-size: 11px; color: #555; margin-top: 4px; }\n' +
        '.invoice-title { font-size: 32px; font-weight: 900; color: #222; }\n' +
        '.mobile-row { margin-bottom: 16px; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 12px; }\n' +
        '.two-col { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }\n' +
        '.customer-block label { font-weight: 700; font-size: 14px; margin-bottom: 6px; display: block; }\n' +
        '.customer-block p { font-size: 12px; margin: 3px 0; }\n' +
        '.invoice-meta { text-align: right; font-size: 12px; min-width: 180px; }\n' +
        '.invoice-meta p { margin: 3px 0; }\n' +
        'table { width: 100%; border-collapse: collapse; margin: 20px 0; }\n' +
        'th { font-weight: 900; font-size: 13px; padding: 12px 8px; border-top: 2px solid #222; border-bottom: 1px solid #ccc; text-align: left; }\n' +
        'td { padding: 16px 8px; font-size: 12px; border-bottom: 1px solid #eee; }\n' +
        '.total-row { border-top: 2px solid #222; padding-top: 12px; text-align: right; font-size: 15px; font-weight: 900; margin: 8px 0 24px 0; }\n' +
        '.terms { font-size: 10.5px; color: #333; line-height: 1.7; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 16px; }\n' +
        '.terms h4 { font-size: 13px; font-weight: 900; margin-bottom: 8px; }\n' +
        '.terms p { margin-bottom: 4px; }\n' +
        '.thank-you { text-align: center; margin-top: 30px; font-size: 15px; font-weight: 900; color: #EA1E63; padding: 20px; }\n' +
        '@media print { .download-bar { display: none; } body { background: #fff; } .page { box-shadow: none; margin: 0; border-radius: 0; padding: 30px; } }\n' +
        '@media (max-width: 600px) { .page { margin: 0; border-radius: 0; padding: 20px; box-shadow: none; } .two-col { flex-direction: column; } .invoice-meta { text-align: left; } }\n' +
        '</style>\n' +
        '</head>\n' +
        '<body>\n' +
        '<div class="download-bar">\n' +
        '  <button class="download-btn" onclick="window.print()">Download / Print Invoice</button>\n' +
        '  <span class="badge">Emma Thinking</span>\n' +
        '</div>\n' +
        '<div class="page">\n' +
        '  <div class="header">\n' +
        '    <div>\n' +
        '      <div class="company-name">EMMA THINKING (PVT) LTD</div>\n' +
        '      <div class="company-address">RP 578, Rajapakshapura, Seeduwa, SRI LANKA</div>\n' +
        '    </div>\n' +
        '    <div class="invoice-title">Invoice</div>\n' +
        '  </div>\n' +
        '  <div class="mobile-row"><strong>Mobile:</strong> 077 734 8733</div>\n' +
        '  <div class="two-col">\n' +
        '    <div class="customer-block">\n' +
        '      <label>Customer</label>\n' +
        '      <p><strong>Name of Customer :</strong> ' + data.clientName + '</p>\n' +
        '      <p><strong>Mobile Number &nbsp;&nbsp;&nbsp;:</strong> ' + data.clientNumber + '</p>\n' +
        '      <p><strong>Payment Method :</strong> ' + data.paymentMethod + kokoLine + '</p>\n' +
        '      <div style="font-size:12px;margin-top:10px;"><br/><strong>Invoiced by</strong></div>\n' +
        '    </div>\n' +
        '    <div class="invoice-meta">\n' +
        '      <p>Invoice No: <strong>' + data.invoiceNumber + '</strong></p>\n' +
        '      <p>Date: &nbsp;<strong>' + today + '</strong></p>\n' +
        '      <br/>\n' +
        '      <p>Invoiced by</p>\n' +
        '      <p>Emma Thinking (Pvt) Ltd</p>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '  <table>\n' +
        '    <thead><tr>\n' +
        '      <th>Date</th>\n' +
        '      <th>Description</th>\n' +
        '      <th style="text-align:right">Subtotal</th>\n' +
        '    </tr></thead>\n' +
        '    <tbody><tr>\n' +
        '      <td>' + today + '</td>\n' +
        '      <td>' + descriptionLine + '</td>\n' +
        '      <td style="text-align:right">LKR ' + finalAmountFormatted + '.00</td>\n' +
        '    </tr></tbody>\n' +
        '  </table>\n' +
        '  <div class="total-row">Total: LKR ' + finalAmountFormatted + '.00</div>\n' +
        '  <div class="terms">\n' +
        '    <h4>Terms &amp; Conditions</h4>\n' +
        '    <p>1. Emma Thinking (Pvt) Ltd is a legally registered Sri Lankan matchmaking service provider operating online via Facebook, Instagram, WhatsApp, and other digital platforms.</p>\n' +
        '    <p>2. All clients must be 18+ years old and legally free to marry. Clients are responsible for providing accurate personal information. Emma Thinking is not liable for false details submitted by clients.</p>\n' +
        '    <p>3. Services include profile publishing, ad boosting, and matchmaking introductions. Emma Thinking does not guarantee a successful relationship or marriage outcome.</p>\n' +
        '    <p>4. Contact information is shared only after mutual consent from both parties. Client privacy is respected and protected.</p>\n' +
        '    <p>5. Full payment must be made before service begins. Prices are in Sri Lankan Rupees (LKR). Except for VIP packages (with guaranteed results), payments are non-refundable once the profile post is live.</p>\n' +
        '    <p>6. VIP Refund Policy: A full refund is provided only if no genuine responses are received within 14 days of the post being published.</p>\n' +
        '    <p>7. Client data is used solely for matchmaking purposes. Emma Thinking never sells or rents personal information. Clients may request corrections or deletions at any time.</p>\n' +
        '    <p>8. Emma Thinking is not liable for any issues, losses, or disputes between matched clients. Clients proceed at their own risk and responsibility.</p>\n' +
        '    <p>9. By paying, you confirm that you accept all terms listed above, effective as of April 2025. Full policy is available on request or via our official Facebook page.</p>\n' +
        '  </div>\n' +
        '  <div class="thank-you">Thank You</div>\n' +
        '</div>\n' +
        '</body>\n' +
        '</html>'

    return html
}