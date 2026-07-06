import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { getStripe } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Subscribe() {
    const { user, loading } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('session_id')) {
            setStatus('success');
            addToast('สมัครสมาชิกเรียบร้อย! ระบบจะส่งเครื่องฟรีและคุณจะได้รับซัพพอร์ต', 'success');
            navigate('/membership', { replace: true });
        }
        if (params.get('cancelled')) {
            setStatus('cancelled');
            addToast('ยกเลิกการสมัครสมาชิกแล้ว คุณสามารถลองใหม่ได้เสมอ', 'info');
        }
    }, [location.search, addToast]);

    const handleSubscribe = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setProcessing(true);
        try {
            const createCheckout = httpsCallable(functions, 'createStripeCheckoutSession');
            const result = await createCheckout({ userId: user.uid, email: user.email });
            const sessionId = result.data?.sessionId;
            if (!sessionId) {
                throw new Error('ไม่สามารถสร้าง session การชำระเงินได้');
            }

            const stripe = await getStripe();
            if (!stripe) {
                throw new Error('Stripe ไม่ได้ถูกกำหนดค่าบนหน้าเว็บ');
            }

            const { error } = await stripe.redirectToCheckout({ sessionId });
            if (error) {
                throw new Error(error.message || 'ไม่สามารถไปยัง Stripe Checkout ได้');
            }
        } catch (error) {
            console.error('Subscribe error:', error);
            addToast(error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก', 'error');
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
                <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-start">
                    <div className="space-y-8">
                        <div className="rounded-[2.5rem] border border-emerald-600/20 bg-slate-900/90 p-10 shadow-2xl shadow-emerald-500/10">
                            <div className="inline-flex items-center gap-3 rounded-full bg-emerald-600/10 px-4 py-2 text-sm font-semibold text-emerald-200 uppercase tracking-[0.35em]">
                                สมัครสมาชิก Premium
                            </div>
                            <h1 className="mt-6 text-4xl font-black tracking-tight text-white">จ่ายรายเดือน 699 บาท</h1>
                            <p className="mt-4 max-w-2xl text-slate-300 leading-relaxed text-lg">
                                รับเครื่องไปใช้ฟรี พร้อมบริการซัพพอร์ต ติดตั้ง และอัปเดตสินค้าใหม่ทุกเดือน.
                                ระบบของเราจะบันทึกสถานะสมาชิกของคุณใน Firestore เพื่อให้บริการได้ต่อเนื่อง.
                            </p>

                            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
                                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-200 font-black">ราคา</p>
                                    <p className="mt-4 text-5xl font-black text-white">699</p>
                                    <p className="text-sm text-slate-400 uppercase tracking-[0.35em] mt-2">บาท/เดือน</p>
                                </div>
                                <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
                                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">รวม</p>
                                    <ul className="mt-4 space-y-3 text-sm text-slate-300">
                                        <li>✅ เครื่องฟรีเมื่อสมัครสมาชิก</li>
                                        <li>✅ ฟรีซัพพอร์ต 24/7</li>
                                        <li>✅ สินค้าใหม่และบริการพิเศษ</li>
                                        <li>✅ ยกเลิกได้ตลอดเวลา</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl bg-slate-900/80 p-6 border border-slate-800">
                                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">ลูกค้า</p>
                                    <p className="mt-3 text-xl font-bold text-white">{user?.displayName || user?.email || 'ผู้ใช้ Smart Farm'}</p>
                                </div>
                                <div className="rounded-3xl bg-slate-900/80 p-6 border border-slate-800">
                                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">สถานะ</p>
                                    <p className="mt-3 text-xl font-bold text-emerald-400">พร้อมสมัครสมาชิก</p>
                                </div>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={handleSubscribe}
                                    disabled={processing}
                                    className="w-full rounded-3xl bg-emerald-500 px-8 py-5 text-lg font-black uppercase tracking-[0.15em] text-slate-950 shadow-2xl shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? 'กำลังเชื่อมต่อ Stripe...' : 'สมัครสมาชิกด้วยบัตร (Stripe)'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!user) {
                                            addToast('กรุณาเข้าสู่ระบบก่อนชำระเงิน', 'info');
                                            return navigate('/login');
                                        }
                                        navigate('/payment', { state: { amount: 699, orderId: 'subscribe-699', isSubscription: true } });
                                    }}
                                    className="w-full rounded-3xl border border-white/20 bg-slate-900 px-8 py-5 text-lg font-black uppercase tracking-[0.15em] text-white shadow-2xl shadow-slate-900/40 transition hover:bg-slate-800"
                                >
                                    ชำระด้วย PromptPay QR
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[2.5rem] bg-slate-900/80 border border-slate-800 p-8 shadow-2xl shadow-black/10">
                            <h2 className="text-2xl font-black text-white">ทำไมต้องสมัครสมาชิก?</h2>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-3xl bg-slate-950/80 p-6 border border-slate-800">
                                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 font-black">เครื่องฟรี</p>
                                    <p className="mt-3 text-slate-300 leading-relaxed">รับเครื่องสำหรับใช้งาน Smart Farm แบบฟรีเมื่อเริ่มสัญญารายเดือน.</p>
                                </div>
                                <div className="rounded-3xl bg-slate-950/80 p-6 border border-slate-800">
                                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 font-black">ซัพพอร์ตเต็มรูปแบบ</p>
                                    <p className="mt-3 text-slate-300 leading-relaxed">บริการลูกค้าด่วน ช่วยเหลือด้านเทคนิค และคำแนะนำการใช้งาน.</p>
                                </div>
                                <div className="rounded-3xl bg-slate-950/80 p-6 border border-slate-800">
                                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 font-black">อัปเดตสินค้า</p>
                                    <p className="mt-3 text-slate-300 leading-relaxed">สิทธิพิเศษสำหรับสมาชิก รับข้อเสนอและสินค้าใหม่ก่อนใคร.</p>
                                </div>
                                <div className="rounded-3xl bg-slate-950/80 p-6 border border-slate-800">
                                    <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 font-black">ยกเลิกง่าย</p>
                                    <p className="mt-3 text-slate-300 leading-relaxed">ควบคุมสัญญาได้เอง แก้ไขหรือยกเลิกได้ตามต้องการ.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-emerald-600/20 bg-emerald-500/10 p-10 shadow-2xl shadow-emerald-500/20">
                        <p className="text-sm uppercase tracking-[0.35em] text-emerald-200 font-black mb-4">สิทธิพิเศษสมาชิก</p>
                        <div className="space-y-5 text-slate-200">
                            <div className="rounded-3xl bg-slate-950/90 p-5 border border-slate-800">
                                <p className="font-black text-white">Free Device</p>
                                <p className="mt-2 text-sm text-slate-300">รับเครื่องไปใช้ฟรี พร้อมบริการติดตั้งเบื้องต้น.</p>
                            </div>
                            <div className="rounded-3xl bg-slate-950/90 p-5 border border-slate-800">
                                <p className="font-black text-white">Priority Support</p>
                                <p className="mt-2 text-sm text-slate-300">ได้สิทธิ์ช่วยเหลือจากทีมงานก่อนลูกค้าทั่วไป.</p>
                            </div>
                            <div className="rounded-3xl bg-slate-950/90 p-5 border border-slate-800">
                                <p className="font-black text-white">Billing Managed</p>
                                <p className="mt-2 text-sm text-slate-300">ระบบต่ออายุอัตโนมัติและแจ้งเตือนทางอีเมล.</p>
                            </div>
                            <div className="rounded-3xl bg-slate-950/90 p-5 border border-slate-800">
                                <p className="font-black text-white">Secure Checkout</p>
                                <p className="mt-2 text-sm text-slate-300">ชำระเงินด้วย Stripe ปลอดภัยระดับโลก.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
