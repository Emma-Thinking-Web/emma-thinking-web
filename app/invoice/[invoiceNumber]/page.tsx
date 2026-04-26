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

            if (error || !data) { setNotFound(true); return }
            setOrder(data)
        }
        fetchOrder()
    }, [invoiceNumber])

    const handleDownload = async () => {
        window.print()
    }

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

    // Description: just package name + discount if any
    const descriptionLine = order.discount_percent > 0
        ? order.package_name + ' ' + order.discount_percent + '% Discount'
        : order.package_name

    const finalAmountFormatted = Number(order.final_amount).toLocaleString()
    const kokoLine = order.koko_id ? ' (ID: ' + order.koko_id + ')' : ''

    return (
        <>
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { width: 100%; }
                body { font-family: Arial, sans-serif; font-size: 13px; color: #222; background: #f0f0f0; }

                /* Download bar - hidden on print */
                .download-bar {
                    background: #EA1E63;
                    padding: 14px 20px;
                    text-align: center;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }
                .download-btn {
                    background: white;
                    color: #EA1E63;
                    border: none;
                    border-radius: 25px;
                    padding: 10px 28px;
                    font-size: 13px;
                    font-weight: 900;
                    cursor: pointer;
                    letter-spacing: 0.3px;
                }
                .download-btn:hover { background: #fff0f5; }
                .hint {
                    color: rgba(255,255,255,0.85);
                    font-size: 11px;
                    font-weight: 600;
                }

                /* Invoice page wrapper */
                .page-wrap {
                    max-width: 794px;
                    margin: 30px auto;
                    background: #fff;
                    padding: 60px 60px 50px 60px;
                    box-shadow: 0 4px 30px rgba(0,0,0,0.10);
                    border-radius: 4px;
                }

                /* Header */
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #222;
                    padding-bottom: 18px;
                    margin-bottom: 18px;
                }
                .company-name { font-size: 17px; font-weight: 900; letter-spacing: -0.3px; }
                .company-address { font-size: 11px; color: #555; margin-top: 3px; }
                .invoice-title { font-size: 36px; font-weight: 900; color: #222; }

                /* Mobile line */
                .mobile-row {
                    font-size: 12px;
                    border-bottom: 1px solid #ccc;
                    padding-bottom: 14px;
                    margin-bottom: 18px;
                }

                /* Two column info */
                .two-col {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                    gap: 20px;
                }
                .customer-block { flex: 1; }
                .customer-block .section-label {
                    font-weight: 900;
                    font-size: 14px;
                    margin-bottom: 8px;
                    display: block;
                }
                .customer-block p { font-size: 12px; margin: 4px 0; }
                .invoiced-by-left { font-size: 13px; font-weight: 900; margin-top: 20px; }

                .invoice-meta { text-align: right; font-size: 12px; }
                .invoice-meta p { margin: 3px 0; }
                .invoice-meta .invoiced-by-right { margin-top: 16px; }

                /* Table */
                table { width: 100%; border-collapse: collapse; margin: 4px 0 0 0; }
                th {
                    font-weight: 900;
                    font-size: 13px;
                    padding: 12px 10px;
                    border-top: 2px solid #222;
                    border-bottom: 1px solid #bbb;
                    text-align: left;
                    background: #fff;
                }
                th:last-child { text-align: right; }
                td { padding: 18px 10px; font-size: 12px; border-bottom: 1px solid #eee; }
                td:last-child { text-align: right; }

                /* Total */
                .total-row {
                    border-top: 2px solid #222;
                    padding-top: 14px;
                    text-align: right;
                    font-size: 15px;
                    font-weight: 900;
                    margin: 0 0 28px 0;
                }

                /* Terms */
                .terms {
                    font-size: 10px;
                    color: #333;
                    line-height: 1.75;
                    margin-top: 20px;
                    border-top: 1px solid #ccc;
                    padding-top: 16px;
                }
                .terms h4 { font-size: 12px; font-weight: 900; margin-bottom: 6px; }
                .terms p { margin-bottom: 2px; }

                /* Thank you */
                .thank-you {
                    text-align: center;
                    margin-top: 32px;
                    font-size: 14px;
                    font-weight: 700;
                    color: #222;
                }

                /* PRINT STYLES */
                @media print {
                    body { background: #fff; }
                    .download-bar { display: none !important; }
                    .page-wrap {
                        margin: 0;
                        padding: 40px 50px;
                        box-shadow: none;
                        border-radius: 0;
                        max-width: 100%;
                    }
                }

                /* MOBILE */
                @media (max-width: 640px) {
                    .page-wrap { margin: 0; padding: 24px 20px; box-shadow: none; border-radius: 0; }
                    .two-col { flex-direction: column; gap: 16px; }
                    .invoice-meta { text-align: left; }
                    .invoice-title { font-size: 26px; }
                    .download-bar { flex-direction: column; gap: 6px; }
                }
            `}</style>

            {/* Sticky download bar */}
            <div className="download-bar">
                <button className="download-btn" onClick={handleDownload}>
                    Download / Print as PDF
                </button>
                <span className="hint">Select "Save as PDF" in print dialog</span>
            </div>

            {/* Invoice */}
            <div className="page-wrap">

                {/* Header */}
                <div className="header">
                    <div>
                        <div className="company-name">EMMA THINKING (PVT) LTD</div>
                        <div className="company-address">RP 578, Rajapakshapura, Seeduwa, SRI LANKA</div>
                    </div>
                    <div className="invoice-title">Invoice</div>
                </div>

                {/* Mobile */}
                <div className="mobile-row">
                    <strong>Mobile:</strong> 077 734 8733
                </div>

                {/* Two col */}
                <div className="two-col">
                    <div className="customer-block">
                        <span className="section-label">Customer</span>
                        <p><strong>Name of Customer :</strong> {order.client_name}</p>
                        <p><strong>Mobile Number &nbsp;&nbsp;&nbsp;:</strong> {order.client_number}</p>
                        <p><strong>Payment Method &nbsp;:</strong> {order.payment_method}{kokoLine}</p>
                        <div className="invoiced-by-left">Invoiced by</div>
                    </div>
                    <div className="invoice-meta">
                        <p>Invoice No: <strong>{order.invoice_number}</strong></p>
                        <p>Date: &nbsp;<strong>{today}</strong></p>
                        <div className="invoiced-by-right">
                            <p>Invoiced by</p>
                            <p>Emma Thinking (Pvt) Ltd</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{today}</td>
                            <td>{descriptionLine}</td>
                            <td>LKR {finalAmountFormatted}.00</td>
                        </tr>
                    </tbody>
                </table>

                {/* Total */}
                <div className="total-row">
                    Total: LKR {finalAmountFormatted}.00
                </div>

                {/* Terms */}
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

                {/* Thank you - no signature */}
                <div className="thank-you">Thank You</div>

            </div>
        </>
    )
}