'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function InvoicePage() {
    const { invoiceNumber } = useParams()
    const [order, setOrder] = useState<any>(null)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('invoice_number', invoiceNumber)
                .single()

            if (error || !data) {
                setNotFound(true)
                return
            }
            setOrder(data)
        }
        fetchOrder()
    }, [invoiceNumber])

    if (notFound) return (
        <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Arial' }}>
            <h2>Invoice not found</h2>
        </div>
    )

    if (!order) return (
        <div style={{ textAlign: 'center', padding: '60px', fontFamily: 'Arial' }}>
            <p>Loading invoice...</p>
        </div>
    )

    const today = new Date(order.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
    })
    const dash = '-'
    const descriptionLine = order.discount_percent > 0
        ? order.package_name + ' ' + dash + ' ' + order.discount_percent + '% Discount'
        : order.package_name + ' ' + dash + ' Profile Publishing & Ad Boost'
    const finalAmountFormatted = Number(order.final_amount).toLocaleString()
    const kokoLine = order.koko_id ? ' (ID: ' + order.koko_id + ')' : ''

    return (
        <>
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #f5f5f5; }
                .download-bar { background: #EA1E63; padding: 14px; text-align: center; position: sticky; top: 0; z-index: 100; }
                .download-btn { background: white; color: #EA1E63; border: none; border-radius: 25px; padding: 10px 28px; font-size: 13px; font-weight: 900; cursor: pointer; }
                .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; border-radius: 20px; padding: 3px 12px; font-size: 10px; font-weight: 900; margin-left: 10px; vertical-align: middle; }
                .page { background: #fff; max-width: 750px; margin: 30px auto; padding: 50px; border-radius: 8px; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
                .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #222; padding-bottom: 16px; margin-bottom: 20px; }
                .company-name { font-size: 18px; font-weight: 900; }
                .company-address { font-size: 11px; color: #555; margin-top: 4px; }
                .invoice-title { font-size: 32px; font-weight: 900; color: #222; }
                .mobile-row { margin-bottom: 16px; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 12px; }
                .two-col { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
                .customer-block label { font-weight: 700; font-size: 14px; margin-bottom: 6px; display: block; }
                .customer-block p { font-size: 12px; margin: 3px 0; }
                .invoice-meta { text-align: right; font-size: 12px; min-width: 180px; }
                .invoice-meta p { margin: 3px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { font-weight: 900; font-size: 13px; padding: 12px 8px; border-top: 2px solid #222; border-bottom: 1px solid #ccc; text-align: left; }
                td { padding: 16px 8px; font-size: 12px; border-bottom: 1px solid #eee; }
                .total-row { border-top: 2px solid #222; padding-top: 12px; text-align: right; font-size: 15px; font-weight: 900; margin: 8px 0 24px 0; }
                .terms { font-size: 10.5px; color: #333; line-height: 1.7; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 16px; }
                .terms h4 { font-size: 13px; font-weight: 900; margin-bottom: 8px; }
                .terms p { margin-bottom: 4px; }
                .thank-you { text-align: center; margin-top: 30px; font-size: 15px; font-weight: 900; color: #EA1E63; padding: 20px; }
                @media print { .download-bar { display: none; } body { background: #fff; } .page { box-shadow: none; margin: 0; border-radius: 0; padding: 30px; } }
                @media (max-width: 600px) { .page { margin: 0; border-radius: 0; padding: 20px; box-shadow: none; } .two-col { flex-direction: column; } .invoice-meta { text-align: left; } }
            `}</style>

            <div className="download-bar">
                <button className="download-btn" onClick={() => window.print()}>
                    Download / Print Invoice
                </button>
                <span className="badge">Emma Thinking</span>
            </div>

            <div className="page">
                <div className="header">
                    <div>
                        <div className="company-name">EMMA THINKING (PVT) LTD</div>
                        <div className="company-address">RP 578, Rajapakshapura, Seeduwa, SRI LANKA</div>
                    </div>
                    <div className="invoice-title">Invoice</div>
                </div>

                <div className="mobile-row"><strong>Mobile:</strong> 077 734 8733</div>

                <div className="two-col">
                    <div className="customer-block">
                        <label>Customer</label>
                        <p><strong>Name of Customer :</strong> {order.client_name}</p>
                        <p><strong>Mobile Number &nbsp;&nbsp;&nbsp;:</strong> {order.client_number}</p>
                        <p><strong>Payment Method :</strong> {order.payment_method}{kokoLine}</p>
                        <div style={{ fontSize: '12px', marginTop: '10px' }}><br /><strong>Invoiced by</strong></div>
                    </div>
                    <div className="invoice-meta">
                        <p>Invoice No: <strong>{order.invoice_number}</strong></p>
                        <p>Date: &nbsp;<strong>{today}</strong></p>
                        <br />
                        <p>Invoiced by</p>
                        <p>Emma Thinking (Pvt) Ltd</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{today}</td>
                            <td>{descriptionLine}</td>
                            <td style={{ textAlign: 'right' }}>LKR {finalAmountFormatted}.00</td>
                        </tr>
                    </tbody>
                </table>

                <div className="total-row">Total: LKR {finalAmountFormatted}.00</div>

                <div className="terms">
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

                <div className="thank-you">Thank You</div>
            </div>
        </>
    )
}