import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    collection, query, where, getDocs, updateDoc,
    serverTimestamp, doc, increment
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { formatTHB } from '../lib/utils';
import app from '../lib/firebase';

export default function Payment() {
    const location = useLocation();
    const navigate = useNavigate();
    const { amount, orderId, isSubscription } = location.state || { amount: 0, orderId: 'N/A', isSubscription: false };

    const [uploading, setUploading] = useState(false);
    const [statusModal, setStatusModal] = useState({ show: false, success: false, message: '', details: null });

    const storage = getStorage(app);
    const { user } = useAuth();

    const handleUploadSlip = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `slips/${orderId}_${Date.now()}.jpg`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            const transRef = `demo-${Date.now()}`;

            if (isSubscription) {
                if (!user) {
                    setUploading(false);
                    return setStatusModal({ show: true, success: false, message: 'กรุณาเข้าสู่ระบบ', details: 'ต้องเข้าสู่ระบบเพื่อสมัครสมาชิก' });
                }

                const subscriptionId = `demo_sub_${user.uid}_${Date.now()}`;
                const subscriptionDoc = doc(db, 'subscriptions', subscriptionId);
                await updateDoc(subscriptionDoc, {
                    userId: user.uid,
                    email: user.email || '',
                    plan: 'monthly_699',
                    price: 699,
                    status: 'active',
                    transRef,
                    slipPath: downloadURL,
                    verifiedBy: 'Demo PromptPay',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }).catch(async () => {
                    await setDoc(subscriptionDoc, {
                        userId: user.uid,
                        email: user.email || '',
                        plan: 'monthly_699',
                        price: 699,
                        status: 'active',
                        transRef,
                        slipPath: downloadURL,
                        verifiedBy: 'Demo PromptPay',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                });

                await updateDoc(doc(db, 'users', user.uid), {
                    subscription: {
                        status: 'active',
                        plan: 'monthly_699',
                        paymentMethod: 'PromptPay Demo',
                        transRef,
                        updatedAt: serverTimestamp()
                    }
                });

                setUploading(false);
                setStatusModal({ show: true, success: true, message: 'ชำระสมาชิกสำเร็จ!', details: 'อัปโหลดรูปสำเร็จและใช้งานได้ทันที' });
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
                        slipUrl: downloadURL,
                        transRef,
                        updatedAt: serverTimestamp(),
                        verifiedBy: 'Demo PromptPay'
                    });
                }

                setUploading(false);
                setStatusModal({ show: true, success: true, message: 'ชำระเงินสำเร็จ!', details: 'อัปโหลดรูปอะไรก็ได้แล้วคำสั่งซื้อผ่านเรียบร้อย' });
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
