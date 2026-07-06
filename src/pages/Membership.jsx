import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { db } from '../lib/firebase';
import { formatTHB } from '../lib/utils';

const BENEFITS = [
    'เครื่องฟรีเมื่อสมัครสมาชิกรายเดือน',
    'ซัพพอร์ตและช่วยติดตั้งแบบพรีเมียม',
    'อัปเดตสินค้าและโปรโมชั่นล่วงหน้า',
    'ยกเลิกได้ตามต้องการโดยไม่ต้องกังวล'
];

export default function Membership() {
    const { user, userProfile, loading } = useAuth();
    const { addToast } = useToast();
    const [membership, setMembership] = useState(null);
    const [loadingMembership, setLoadingMembership] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!user) {
            setMembership(null);
            setLoadingMembership(false);
            return;
        }

        const loadMembership = async () => {
            try {
                const q = query(collection(db, 'subscriptions'), where('userId', '==', user.uid));
                const snap = await getDocs(q);
                const rows = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
                rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                setMembership(rows[0] || userProfile?.subscription || null);
            } catch (error) {
                console.error('Load membership error:', error);
                setMembership(userProfile?.subscription || null);
            } finally {
                setLoadingMembership(false);
            }
        };

        loadMembership();
    }, [user, userProfile?.subscription]);

    const status = membership?.status || userProfile?.subscription?.status || 'inactive';
    const isActive = status === 'active';
    const isPending = status === 'pending';
    const statusMeta = {
        active: { label: 'ใช้งานอยู่', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
        pending: { label: 'รอการตรวจสอบ', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
        cancelled: { label: 'ยกเลิกแล้ว', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
        inactive: { label: 'ยังไม่ได้สมัคร', className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    };
    const statusInfo = statusMeta[status] || statusMeta.inactive;

    const handleCancelMembership = async () => {
        if (!user || !membership?.id) {
            addToast('ไม่พบข้อมูลสมาชิกที่ต้องยกเลิก', 'error');
            return;
        }

        setCancelling(true);
        try {
            await updateDoc(doc(db, 'subscriptions', membership.id), {
                status: 'cancelled',
                updatedAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'users', user.uid), {
                subscription: {
                    ...(userProfile?.subscription || {}),
                    status: 'cancelled',
                    updatedAt: serverTimestamp(),
                },
            });
            setMembership((prev) => prev ? { ...prev, status: 'cancelled' } : prev);
            addToast('ยกเลิกสมาชิกเรียบร้อยแล้ว', 'success');
        } catch (error) {
            console.error('Cancel membership error:', error);
            addToast('ยกเลิกสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
        } finally {
            setCancelling(false);
        }
    };

    if (loading || loadingMembership) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="rounded-[2.5rem] border border-emerald-600/20 bg-gradient-to-br from-white via-slate-100 to-emerald-100/70 p-8 sm:p-10 shadow-2xl shadow-emerald-500/10 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/60">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 font-black">Membership Center</p>
                            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">สถานะสมาชิก Smart Farm</h1>
                            <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                                {isActive
                                    ? 'คุณมีสิทธิ์เข้าถึงฟีเจอร์พรีเมียมและรับซัพพอร์ตจากทีมงานแล้ว'
                                    : 'สมัครสมาชิกเพื่อรับเครื่องฟรี การติดตั้ง และการช่วยเหลือจากทีมงาน'}
                            </p>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-100/80 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                            <p className="text-sm text-slate-600 dark:text-slate-300">สถานะปัจจุบัน</p>
                            <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-black ${statusInfo.className}`}>
                                {statusInfo.label}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[2.5rem] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-black/10 dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">แผนของคุณ</p>
                                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Premium Monthly</h2>
                            </div>
                            <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-300 font-black">
                                {formatTHB(membership?.price || 699)} / เดือน
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            {BENEFITS.map((item) => (
                                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                                    ✅ {item}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 font-black">การชำระล่าสุด</p>
                                    <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{formatTHB(membership?.price || 699)}</p>
                                </div>
                                <div className={`rounded-full px-3 py-1 text-sm font-black ${statusInfo.className}`}>
                                    {statusInfo.label}
                                </div>
                            </div>
                            <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70">
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">วิธีชำระ</p>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{membership?.paymentMethod || 'PromptPay / Stripe'}</p>
                                </div>
                                <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/70">
                                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">อ้างอิง</p>
                                    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{membership?.transRef || membership?.id || 'ยังไม่มีข้อมูล'}</p>
                                </div>
                            </div>
                            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                                <p>วันที่สมัคร: {membership?.createdAt?.seconds ? new Date(membership.createdAt.seconds * 1000).toLocaleDateString('th-TH') : 'ยังไม่มีข้อมูล'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-emerald-600/20 bg-emerald-500/10 p-8 shadow-2xl shadow-emerald-500/10">
                        <p className="text-sm uppercase tracking-[0.35em] text-emerald-700 dark:text-emerald-200 font-black">Support</p>
                        <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">รับการช่วยเหลือจากทีมงาน</h2>
                        <p className="mt-4 text-slate-700 dark:text-slate-200 leading-relaxed">
                            หลังจากสมัครสมาชิกเรียบร้อย ทีมงานจะติดต่อคุณเพื่อจัดส่งเครื่องและช่วยติดตั้งให้ครบถ้วน
                        </p>

                        <div className="mt-8 space-y-4">
                            <div className="rounded-2xl bg-slate-100/80 p-4 border border-slate-200 dark:bg-slate-950/80 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400">อีเมลสนับสนุน</p>
                                <a href="mailto:support@smartfarm.co.th" className="mt-2 block font-semibold text-emerald-600 dark:text-emerald-300">support@smartfarm.co.th</a>
                            </div>
                            <div className="rounded-2xl bg-slate-100/80 p-4 border border-slate-200 dark:bg-slate-950/80 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400">ข้อมูลผู้สมัคร</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{user?.displayName || user?.email || 'ผู้ใช้ Smart Farm'}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-100/80 p-4 border border-slate-200 dark:bg-slate-950/80 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400">หมายเลขคำขอ</p>
                                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{membership?.id || membership?.transRef || 'ยังไม่มีคำขอ'}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            {status !== 'cancelled' && (
                                <button
                                    type="button"
                                    onClick={handleCancelMembership}
                                    disabled={cancelling || !membership?.id}
                                    className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
                                >
                                    {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกสมาชิก'}
                                </button>
                            )}
                            <Link to="/subscribe" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100 transition">
                                {isActive || isPending ? 'ดูรายละเอียดแผนใหม่' : 'สมัครสมาชิกตอนนี้'}
                            </Link>
                            <Link to="/products" className="rounded-2xl border border-white/20 px-5 py-3 text-sm font-black text-white hover:bg-white/10 transition">
                                เลือกสินค้าเพิ่มเติม
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
