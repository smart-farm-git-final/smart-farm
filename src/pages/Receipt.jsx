import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatTHB } from '../lib/utils';

export default function Receipt() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const q = query(collection(db, 'orders'), where('orderId', '==', orderId));
                const snap = await getDocs(q);
                if (!snap.empty) setOrder(snap.docs[0].data());
            } catch (error) { console.error("Fetch Error:", error); }
            finally { setLoading(false); }
        };
        fetchOrder();
    }, [orderId]);

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-[10px] uppercase tracking-[0.2em]">Loading Receipt...</div>;
    if (!order) return <div className="min-h-screen flex items-center justify-center font-black text-[10px] uppercase tracking-[0.2em]">Order Not Found</div>;

    // 💰 [Logic การคำนวณใหม่เพื่อใช้ยอดจริงจากฐานข้อมูล]
    const itemsTotal = order.items?.reduce((acc, item) => acc + (item.price * item.qty), 0) || 0;
    const orderTotal = typeof order.total === 'number' ? order.total : itemsTotal;

    // 👤 ข้อมูลลูกค้าจาก Map 'customer'
    const customer = order.customer || {};
    const fullAddress = `${customer.address || ''} ${customer.subDistrict || ''} ${customer.district || ''} ${customer.province || ''} ${customer.zipcode || ''}`.trim();

    const handlePrint = () => {
        const receiptEl = document.getElementById('receipt-print');
        if (!receiptEl) return;

        // copy all stylesheets from current page
        const styles = Array.from(document.styleSheets).map(sheet => {
            try {
                return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
            } catch { return ''; }
        }).join('\n');

        const printWindow = window.open('', '_blank', 'width=700,height=900');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Receipt</title>
                <style>
                    ${styles}
                    * { box-sizing: border-box; }
                    body { margin: 0; padding: 0; background: white; font-family: sans-serif; }
                    @page { margin: 10mm; size: A4; }
                </style>
            </head>
            <body>
                <div style="display:flex; justify-content:center; padding: 20px;">
                    ${receiptEl.outerHTML}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-100 flex flex-col items-center p-6 sm:p-12 font-sans overflow-x-hidden">

            {/* 🛠 Toolbar (no-print) */}
            <div className="max-w-md w-full flex justify-end gap-3 mb-4 no-print">
                <button onClick={handlePrint} className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 font-semibold">
                    <span className="text-lg">🖨️</span>
                    <span className="text-sm font-bold uppercase">Print</span>
                </button>
                <button onClick={() => navigate('/')} className="px-5 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all font-semibold">
                    <span className="text-sm font-bold uppercase">🏠 Home</span>
                </button>
            </div>

            {/* 📄 Receipt Paper */}
            <div id="receipt-print" className="max-w-md w-full bg-white shadow-2xl p-8 sm:p-12 border border-gray-50 flex flex-col items-center relative">

                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500/10">
                    <span className="text-3xl">🌿</span>
                </div>
                <h1 className="text-sm font-black tracking-tighter text-center uppercase leading-tight mb-1">
                    Smart Farm Greenhouse Co., Ltd.
                </h1>
                <p className="text-[10px] text-gray-400 font-bold mb-6 uppercase tracking-widest border-b pb-4 w-full text-center">
                    ใบกำกับภาษีอย่างย่อ / ใบเสร็จรับเงิน
                </p>

                {/* ข้อมูลลูกค้า */}
                <div className="w-full text-[11px] font-bold space-y-1.5 mb-6 uppercase">
                    <div className="flex justify-between border-b border-gray-50 pb-1">
                        <span className="opacity-40">ORDER DATE:</span>
                        <span>{order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('th-TH') : '01/04/2569'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-50 pb-1">
                        <span className="opacity-40">ORDER ID:</span>
                        <span>#{order.orderId}</span>
                    </div>

                    <div className="bg-gray-50 p-5 rounded-[2.5rem] border border-gray-100 mt-4 text-left">
                        <p className="text-[8px] text-emerald-600 mb-2 tracking-[0.2em] font-black uppercase border-b border-emerald-100 w-fit">Customer Info</p>
                        <p className="text-gray-900 text-[14px] mb-1 font-black leading-none">{customer.name || 'ลูกค้าทั่วไป'}</p>
                        <p className="text-gray-400 font-medium normal-case leading-relaxed text-[10px] mb-2 italic">
                            {fullAddress || "ไม่ระบุที่อยู่จัดส่ง"}
                        </p>
                        <p className="text-gray-900 text-[10px] font-black">TEL: {customer.phone || '0XX-XXX-XXXX'}</p>
                    </div>
                </div>

                {/* รายการสินค้า */}
                <div className="w-full mb-8">
                    <div className="border-b-2 border-black pb-2 mb-4 text-center">
                        <p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.3em]">Description</p>
                    </div>
                    <div className="space-y-6">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex flex-col text-[13px] font-bold leading-tight uppercase">
                                <p className="mb-1 text-gray-900 font-black tracking-tight">{idx + 1}) {item.name}</p>
                                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                                    <span>Qty: {item.qty} @ {formatTHB(item.price)}</span>
                                    <span className="text-black font-black text-[12px]">{formatTHB(item.price * item.qty)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 💰 สรุปยอดเงิน (ใช้ยอดจริงจากออเดอร์) */}
                <div className="w-full border-t-2 border-black pt-5 space-y-2 mb-10">
                    <div className="flex justify-between text-[11px] font-bold uppercase text-gray-400">
                        <span>ยอดรวมสินค้า (Subtotal)</span>
                        <span className="text-black font-black">{formatTHB(itemsTotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-lg font-black uppercase pt-4 mt-1 border-t border-gray-100">
                        <span className="text-gray-900 leading-none">ยอดรวมทั้งสิ้น</span>
                        <span className="text-emerald-600 text-2xl leading-none font-black">{formatTHB(orderTotal)}</span>
                    </div>
                </div>

                <p className="mt-6 text-[8px] font-black text-gray-200 uppercase tracking-[0.5em] text-center italic">
                    --- Thank you for your support ---
                </p>
            </div>
        </div>
    );
}
