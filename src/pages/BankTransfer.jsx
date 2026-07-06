import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    collection, query, where, getDocs, updateDoc,
    serverTimestamp, doc, increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatTHB } from '../lib/utils';
import app from '../lib/firebase';
import jsQR from 'jsqr';

export default function BankTransfer() {
    const location = useLocation();
    const navigate = useNavigate();
    const { amount, orderId } = location.state || { amount: 0, orderId: 'N/A' };

    const [uploading, setUploading] = useState(false);
    const [statusModal, setStatusModal] = useState({ show: false, success: false, message: '', details: null });

    const storage = getStorage(app);

    const scanSlipForPayload = async (file) => {
        const imageBitmap = await (window.createImageBitmap ? createImageBitmap(file) : new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }));

        const width = imageBitmap.width;
        const height = imageBitmap.height;
        const maxSide = 1024;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const targetWidth = Math.max(200, Math.round(width * scale));
        const targetHeight = Math.max(200, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const code = jsQR(imageData.data, targetWidth, targetHeight);
        imageBitmap.close?.();
        return code ? code.data : null;
    };

    const handleUploadSlip = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const payload = await scanSlipForPayload(file);
            if (!payload) {
                setUploading(false);
                return setStatusModal({ show: true, success: false, message: 'ไม่พบ QR Code', details: 'กรุณาใช้สลิปดั้งเดิมที่มี Mini QR ชัดเจน' });
            }

            const verifyRes = await fetch('/.netlify/functions/verify-slip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload: payload })
            });
            if (!verifyRes.ok) {
                const errorText = await verifyRes.text();
                throw new Error(`Verify API failed: ${errorText}`);
            }

            const result = await verifyRes.json();
            if (result && result.success === true) {
                const slipResponse = result.data || {};
                const slipData = slipResponse.rawSlip || {};

                const slipAmount = Number(slipResponse.amountInSlip || slipData.amount?.amount || 0);
                const receiverName = slipResponse.receiverName || slipData.receiver?.account?.name?.th || "";
                const receiverAccount = slipResponse.receiverAccount || slipData.receiver?.account?.bank?.account || "";
                const transRef = slipResponse.transRef || slipResponse.payloadHash || slipData.transRef || "";

                // Triple Lock Verification
                const isNameValid = receiverName.replace(/\s/g, "").includes("ณัฐวุฒิ");
                const isAccountValid = receiverAccount.includes("8656");
                const isAmountValid = Math.abs(Number(slipAmount) - Number(amount)) < 1;

                if (!isNameValid || !isAccountValid || !isAmountValid) {
                    setUploading(false);
                    let errorDetails = "";
                    if (!isNameValid) errorDetails += "[ชื่อไม่ตรง] ";
                    if (!isAccountValid) errorDetails += "[เลขบัญชีไม่ตรง] ";
                    if (!isAmountValid) errorDetails += "[ยอดเงินไม่ตรง] ";

                    return setStatusModal({
                        show: true, success: false,
                        message: 'ข้อมูลในสลิปไม่ตรงเงื่อนไข',
                        details: errorDetails + `ตรวจพบ: ${receiverName} ยอด ${slipAmount}บ.`
                    });
                }

                // Check Duplicate Slip
                const duplicateQuery = query(collection(db, 'orders'), where('transRef', '==', transRef));
                const duplicateSnap = await getDocs(duplicateQuery);
                if (!duplicateSnap.empty) {
                    setUploading(false);
                    return setStatusModal({ show: true, success: false, message: 'สลิปนี้เคยใช้ไปแล้ว!', details: `รหัสธุรกรรม ${transRef} ถูกใช้งานแล้ว` });
                }

                // Upload to Storage & Update Firestore
                const storageRef = ref(storage, `slips/${orderId}_${Date.now()}.jpg`);
                await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(storageRef);

                const q = query(collection(db, 'orders'), where('orderId', '==', orderId));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const orderDoc = snap.docs[0];
                    const orderData = orderDoc.data();

                    const updateStockPromises = (orderData.items || []).map(item =>
                        updateDoc(doc(db, 'products', item.id), { stock: increment(-item.qty) })
                    );
                    await Promise.all(updateStockPromises);

                    await updateDoc(orderDoc.ref, {
                        status: 'paid',
                        slipUrl: downloadURL,
                        transRef: transRef,
                        updatedAt: serverTimestamp(),
                        verifiedBy: 'Bank Transfer Triple Lock (Stable)'
                    });

                    setUploading(false);
                    setStatusModal({ show: true, success: true, message: 'แจ้งโอนสำเร็จ!', details: 'ยืนยันออเดอร์และตัดสต๊อกเรียบร้อย' });
                }
            } else {
                setUploading(false);
                setStatusModal({
                    show: true, success: false,
                    message: 'ตรวจสอบไม่สำเร็จ',
                    details: result?.message || 'สลิปไม่ผ่านการตรวจสอบจากระบบธนาคาร'
                });
            }
        } catch (error) {
            setUploading(false);
            setStatusModal({ show: true, success: false, message: 'เกิดข้อผิดพลาด', details: error.message });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 flex flex-col items-center justify-center p-6 text-center font-sans font-black uppercase tracking-tighter">
            <div className="max-w-sm w-full bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
                <h1 className="text-xl font-black mb-1 text-gray-800 leading-none">Bank Transfer</h1>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-10 border-b pb-2 leading-none">K-BANK PAYMENT</p>

                <div className="bg-emerald-700 rounded-[2.5rem] p-8 text-white mb-8 text-left relative overflow-hidden shadow-xl shadow-emerald-100">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-10 -mt-10 rounded-full blur-2xl"></div>
                    <p className="text-[9px] text-emerald-200 tracking-[0.3em] font-black mb-4 uppercase">Kasikornbank</p>
                    <p className="text-xl font-black tracking-widest mb-1">063 - 8 - 98656 - 6</p>
                    <p className="text-[10px] font-black text-white/80 mb-6 uppercase tracking-widest">Nattawut P.</p>

                    <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl backdrop-blur-sm">
                        <div>
                            <p className="text-[8px] text-emerald-200 font-black uppercase">Amount</p>
                            <p className="text-lg font-black">{formatTHB(amount)}</p>
                        </div>
                        <button onClick={() => {
                            navigator.clipboard.writeText("0638986566");
                            alert("คัดลอกเลขบัญชีแล้ว!");
                        }} className="text-[9px] bg-white text-emerald-700 px-4 py-2 rounded-xl font-black">COPY</button>
                    </div>
                </div>

                <label className={`block w-full py-5 rounded-[1.5rem] text-[10px] font-black uppercase cursor-pointer transition-all shadow-xl active:scale-95
                    ${uploading ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-black'}`}>
                    {uploading ? '⚙️ AI Verifying...' : '📸 ยืนยันการโอน'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadSlip} disabled={uploading} />
                </label>
            </div>

            {statusModal.show && (
                <div className="fixed inset-0 z-[1000] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-black ${statusModal.success ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                            {statusModal.success ? '✓' : '✕'}
                        </div>
                        <h2 className="text-xl font-black mb-2">{statusModal.message}</h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-8 font-black">{statusModal.details}</p>
                        <button onClick={statusModal.success ? () => navigate(`/receipt/${orderId}`) : () => setStatusModal({ ...statusModal, show: false })} className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest ${statusModal.success ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-gray-900 text-white'}`}>
                            {statusModal.success ? 'ดูใบเสร็จ' : 'ลองใหม่'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
