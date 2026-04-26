import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WHATSAPP_TOKEN = "EAAXLCYV8OKIBRGfxJ213IvF7NZCwRmSLisvdWkBOBl99CF8EROsL6QFRaxMniBS2awW6VtMA0mFhXD3cVYpoG4ZBtZCTS0THZCTlZAcNlhQeTPLZBq4RpnyiDZBFSHGKkXS4ZC8ccAnvVVIwYFnJPuPo3T4tJ7teeipyPaZBdG9doss7ZAI1VfDhxkSrzn0YSDBgZDZD"
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
                    { type: 'text', text: params.customer_name },
                    { type: 'text', text: params.invoice_number },
                    { type: 'text', text: params.amount },
                    { type: 'text', text: params.package_name },
                    { type: 'text', text: params.invoice_link },
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
            // No orders yet — start from last manual + 1
            return `EM${String(LAST_MANUAL_INVOICE + 1).padStart(5, '0')}`
        }

        const lastNum = parseInt(data[0].invoice_number.replace('EM', ''))

        if (isNaN(lastNum) || lastNum < LAST_MANUAL_INVOICE) {
            return `EM${String(LAST_MANUAL_INVOICE + 1).padStart(5, '0')}`
        }

        return `EM${String(lastNum + 1).padStart(5, '0')}`
    } catch {
        return `EM${String(LAST_MANUAL_INVOICE + 1).padStart(5, '0')}`
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

        // 1. Get next invoice number safely
        const invoiceNumber = await getNextInvoiceNumber()
        console.log('Generated invoice number:', invoiceNumber)

        // 2. Upload slip to Supabase Storage (skip if KOKO)
        let slipUrl = null
        if (slipBase64 && paymentMethod !== 'KOKO') {
            const slipBuffer = Buffer.from(slipBase64, 'base64')

            // Detect extension from mime type
            let ext = 'jpg'
            if (slipMimeType === 'image/png') ext = 'png'
            else if (slipMimeType === 'application/pdf') ext = 'pdf'

            const slipPath = `slips/${invoiceNumber}.${ext}`
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

        // 3. Generate invoice HTML
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

        // 4. Upload invoice HTML to Supabase Storage
        const pdfPath = `pdfs/${invoiceNumber}.html`
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

        // 5. Save order to DB
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

        // 6. Send WhatsApp
        const waResult = await sendWhatsApp(clientNumber, {
            customer_name: clientName,
            invoice_number: invoiceNumber,
            amount: Number(finalAmount).toLocaleString(),
            package_name: packageName,
            invoice_link: pdfUrl
        })

        // Log if WhatsApp failed but don't crash — invoice is already saved
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
    const descriptionLine = data.discountPercent > 0
        ? `${data.packageName} – ${data.discountPercent}% Discount`
        : `${data.packageName} – Profile Publishing & Ad Boost`

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 20px; }
  .company-name { font-size: 18px; font-weight: 900; }
  .company-address { font-size: 11px; color: #555; margin-top: 4px; }
  .invoice-title { font-size: 32px; font-weight: 900; color: #222; }
  .mobile-row { margin-bottom: 16px; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 12px; }
  .two-col { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .customer-block label { font-weight: 700; font-size: 14px; margin-bottom: 6px; display: block; }
  .customer-block p { font-size: 12px; margin: 3px 0; }
  .invoice-meta { text-align: right; font-size: 12px; }
  .invoice-meta p { margin: 3px 0; }
  .invoiced-by { font-size: 12px; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #fff; font-weight: 900; font-size: 13px; padding: 12px 8px; border-top: 2px solid #222; border-bottom: 1px solid #ccc; text-align: left; }
  td { padding: 16px 8px; font-size: 12px; border-bottom: 1px solid #eee; }
  .total-row { border-top: 2px solid #222; padding-top: 12px; text-align: right; font-size: 15px; font-weight: 900; margin: 8px 0 24px 0; }
  .terms { font-size: 10.5px; color: #333; line-height: 1.7; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 16px; }
  .terms h4 { font-size: 13px; font-weight: 900; margin-bottom: 8px; }
  .thank-you { text-align: center; margin-top: 30px; font-size: 14px; font-weight: 700; }
  .print-btn { display: block; margin: 20px auto; padding: 12px 32px; background: #EA1E63; color: white; border: none; border-radius: 25px; font-size: 14px; font-weight: 900; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="header">
  <div>
    <div class="company-name">EMMA THINKING (PVT) LTD</div>
    <div class="company-address">RP 578, Rajapakshapura, Seeduwa, SRI LANKA</div>
  </div>
  <div class="invoice-title">Invoice</div>
</div>
<div class="mobile-row"><strong>Mobile:</strong> 077 734 8733</div>
<div class="two-col">
  <div class="customer-block">
    <label>Customer</label>
    <p><strong>Name of Customer :</strong> ${data.clientName}</p>
    <p><strong>Mobile Number &nbsp;&nbsp;&nbsp;:</strong> ${data.clientNumber}</p>
    <p><strong>Payment Method :</strong> ${data.paymentMethod}${data.kokoId ? ` (ID: ${data.kokoId})` : ''}</p>
    <div class="invoiced-by"><br/><strong>Invoiced by</strong></div>
  </div>
  <div class="invoice-meta">
    <p>Invoice No: <strong>${data.invoiceNumber}</strong></p>
    <p>Date: &nbsp;<strong>${today}</strong></p>
    <br/>
    <p>Invoiced by</p>
    <p>Emma Thinking (Pvt) Ltd</p>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Description</th>
      <th style="text-align:right">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>${today}</td>
      <td>${descriptionLine}</td>
      <td style="text-align:right">LKR ${Number(data.finalAmount).toLocaleString()}.00</td>
    </tr>
  </tbody>
</table>
<div class="total-row">Total: LKR ${Number(data.finalAmount).toLocaleString()}.00</div>
<div class="terms">
  <h4>Terms &amp; Conditions</h4>
  <p>1. Emma Thinking (Pvt) Ltd is a legally registered Sri Lankan matchmaking service provider operating online via Facebook, Instagram, WhatsApp, and other digital platforms.</p>
  <p>2. All clients must be 18+ years old and legally free to marry. Clients are responsible for providing accurate personal information. Emma Thinking is not liable for false details submitted by clients.</p>
  <p>3. Services include profile publishing, ad boosting, and matchmaking introductions. Emma Thinking does not guarantee a successful relationship or marriage outcome.</p>
  <p>4. Contact information is shared only after mutual consent from both parties. Client privacy is respected and protected.</p>
  <p>5. Full payment must be made before service begins. Prices are in Sri Lankan Rupees (LKR). Except for VIP packages (with guaranteed results), payments are non-refundable once the profile post is live.</p>
  <p>6. VIP Refund Policy: A full refund is provided only if no genuine responses are received within 14 days of the post being published.</p>
  <p>7. Client data is used solely for matchmaking purposes. Emma Thinking never sells or rents personal information. Clients may request corrections or deletions at any time.</p>
  <p>8. Emma Thinking is not liable for any issues, losses, or disputes between matched clients. Clients proceed at their own risk and responsibility.</p>
  <p>9. By paying, you confirm that you accept all terms listed above, effective as of April 2025. Full policy is available on request or via our official Facebook page.</p>
</div>
<div class="thank-you">Thank You</div>
</body>
</html>`
}