import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import {
    collection, query, where, getDocs, updateDoc, setDoc,
    serverTimestamp, doc, increment
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { formatTHB } from '../lib/utils';
import app from '../lib/firebase';
import jsQR from 'jsqr';

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { amount, orderId, isSubscription } = location.state || { amount: 0, orderId: 'N/A', isSubscription: false };

    const [qrRawData, setQrRawData] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [statusModal, setStatusModal] = useState({ show: false, success: false, message: '', details: null });

    const storage = getStorage(app);
    const { user } = useAuth();
    const functions = useMemo(() => getFunctions(app, 'asia-southeast1'), []);

    useEffect(() => {
        const handleGenerateQR = async () => {
            if (amount <= 0) return;
            setLoading(true);
            try {
                const getSCBQR = httpsCallable(functions, 'getscbqr');
                const result = await getSCBQR({ amount, orderId });
                if (result.data?.qrRawData) setQrRawData(result.data.qrRawData);
            } catch (error) {
                console.error("QR Generation Error:", error);
            } finally {
                setLoading(false);
            }
        };
        handleGenerateQR();
    }, [amount, orderId, functions]);

    const scanSlipForPayload = useCallback(async (file) => {
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
    }, []);

    const handleUploadSlip = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const payload = await scanSlipForPayload(file);
            if (!payload) {
                setUploading(false);
                return setStatusModal({ show: true, success: false, message: 'ไม่พบ QR Code', details: 'กรุณาใช้รูปสลิปที่มี Mini QR ชัดเจน' });
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

                const isNameValid = receiverName.replace(/\s/g, "").includes("ณัฐวุฒิ");
                const isAccountValid = receiverAccount.includes("4218");
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

                const duplicateQuery = query(collection(db, 'orders'), where('transRef', '==', transRef));
                const duplicateSnap = await getDocs(duplicateQuery);
                if (!duplicateSnap.empty) {
                    setUploading(false);
                    return setStatusModal({ show: true, success: false, message: 'สลิปนี้เคยใช้ไปแล้ว!', details: `รหัสธุรกรรม ${transRef} ถูกใช้งานแล้ว` });
                }

                const storageRef = ref(storage, `slips/${orderId}_${Date.now()}.jpg`);
                await uploadBytes(storageRef, file);

                if (isSubscription) {
                    if (!user) {
                        setUploading(false);
                        return setStatusModal({ show: true, success: false, message: 'กรุณาเข้าสู่ระบบ', details: 'ต้องเข้าสู่ระบบเพื่อสมัครสมาชิกด้วย PromptPay' });
                    }

                    const storageRef = ref(storage, `slips/subscription_${user.uid}_${Date.now()}.jpg`);
                    await uploadBytes(storageRef, file);

                    const subscriptionId = transRef || `sub_${user.uid}_${Date.now()}`;
                    const subscriptionDoc = doc(db, 'subscriptions', subscriptionId);
                    await updateDoc(subscriptionDoc, {
                        userId: user.uid,
                        email: user.email || '',
                        plan: 'monthly_699',
                        price: 699,
                        status: 'pending',
                        transRef,
                        slipPath: `slips/subscription_${user.uid}_${Date.now()}.jpg`,
                        verifiedBy: 'PromptPay Subscription',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    }).catch(async () => {
                        await setDoc(subscriptionDoc, {
                            userId: user.uid,
                            email: user.email || '',
                            plan: 'monthly_699',
                            price: 699,
                            status: 'pending',
                            transRef,
                            slipPath: `slips/subscription_${user.uid}_${Date.now()}.jpg`,
                            verifiedBy: 'PromptPay Subscription',
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    });

                    await updateDoc(doc(db, 'users', user.uid), {
                        subscription: {
                            status: 'pending',
                            plan: 'monthly_699',
                            paymentMethod: 'PromptPay',
                            transRef,
                            updatedAt: serverTimestamp()
                        }
                    });

                    setUploading(false);
                    setStatusModal({ show: true, success: true, message: 'ขอสมัครสมาชิกเรียบร้อยแล้ว!', details: 'ส่งหลักฐานชำระเงินให้ทางทีมงานตรวจสอบแล้ว' });
                    setTimeout(() => navigate('/membership'), 800);
                } else {
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
                            slipPath: `slips/${orderId}_${Date.now()}.jpg`,
                            transRef: transRef,
                            updatedAt: serverTimestamp(),
                            verifiedBy: 'PromptPay Triple Lock (Stable)'
                        });

                        setUploading(false);
                        setStatusModal({ show: true, success: true, message: 'ชำระเงินสำเร็จ!', details: 'ยืนยันออเดอร์และตัดสต๊อกเรียบร้อย' });
                    }
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
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-gray-950 dark:text-white flex flex-col items-center justify-center p-4 sm:p-6">
            <div className="relative z-10 w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <span className="text-3xl">💳</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-2">
                        ชำระเงิน
                    </h1>
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        ยืนยันการโอนเงินผ่าน PromptPay
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-2xl p-6 text-center">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">ยอดเงินที่ต้องชำระ</p>
                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatTHB(amount)}</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                        </div>
                    ) : qrRawData ? (
                        <div className="flex justify-center bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl">
                            <QRCodeCanvas value={qrRawData} size={256} level="H" includeMargin={true} />
                        </div>
                    ) : null}

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            📱 อัพโหลดใบเสร็จ
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadSlip}
                            disabled={uploading}
                            className="w-full px-4 py-3 border-2 border-dashed border-emerald-300 dark:border-emerald-600 rounded-xl text-sm file:hidden focus:outline-none focus:border-emerald-500 disabled:opacity-50 cursor-pointer"
                        />
                    </div>

                    {uploading && (
                        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                            กำลังประมวลผล...
                        </div>
                    )}
                </div>

                {statusModal.show && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full animate-in zoom-in">
                            <div className="text-center mb-6">
                                <div className="text-4xl mb-4">
                                    {statusModal.success ? '✅' : '❌'}
                                </div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                                    {statusModal.message}
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {statusModal.details}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setStatusModal({ show: false, success: false, message: '', details: null });
                                    if (statusModal.success) navigate(`/receipt/${orderId}`);
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
