import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
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
    const [membership, setMembership] = useState(null);
    const [loadingMembership, setLoadingMembership] = useState(true);

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
    const isActive = status === 'active' || status === 'pending';
    const statusLabel = status === 'active'
        ? 'ใช้งานอยู่'
        : status === 'pending'
            ? 'รอการตรวจสอบ'
            : 'ยังไม่ได้สมัคร';

    if (loading || loadingMembership) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white py-16 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="rounded-[2.5rem] border border-emerald-600/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/60 p-8 sm:p-10 shadow-2xl shadow-emerald-500/10">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 font-black">Membership Center</p>
                            <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white">สถานะสมาชิก Smart Farm</h1>
                            <p className="mt-4 text-slate-300 leading-relaxed">
                                {isActive
                                    ? 'คุณมีสิทธิ์เข้าถึงฟีเจอร์พรีเมียมและรับซัพพอร์ตจากทีมงานแล้ว'
                                    : 'สมัครสมาชิกเพื่อรับเครื่องฟรี การติดตั้ง และการช่วยเหลือจากทีมงาน'}
                            </p>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-xl">
                            <p className="text-sm text-slate-300">สถานะปัจจุบัน</p>
                            <p className="mt-2 text-2xl font-black text-emerald-300">{statusLabel}</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[2.5rem] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-black/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm uppercase tracking-[0.35em] text-slate-400 font-black">แผนของคุณ</p>
                                <h2 className="mt-2 text-2xl font-black text-white">Premium Monthly</h2>
                            </div>
                            <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-emerald-300 font-black">
                                {formatTHB(membership?.price || 699)} / เดือน
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            {BENEFITS.map((item) => (
                                <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-slate-300">
                                    ✅ {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-emerald-600/20 bg-emerald-500/10 p-8 shadow-2xl shadow-emerald-500/10">
                        <p className="text-sm uppercase tracking-[0.35em] text-emerald-200 font-black">Support</p>
                        <h2 className="mt-3 text-2xl font-black text-white">รับการช่วยเหลือจากทีมงาน</h2>
                        <p className="mt-4 text-slate-200 leading-relaxed">
                            หลังจากสมัครสมาชิกเรียบร้อย ทีมงานจะติดต่อคุณเพื่อจัดส่งเครื่องและช่วยติดตั้งให้ครบถ้วน
                        </p>

                        <div className="mt-8 space-y-4">
                            <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800">
                                <p className="text-sm text-slate-400">อีเมลสนับสนุน</p>
                                <a href="mailto:support@smartfarm.co.th" className="mt-2 block font-semibold text-emerald-300">support@smartfarm.co.th</a>
                            </div>
                            <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800">
                                <p className="text-sm text-slate-400">ข้อมูลผู้สมัคร</p>
                                <p className="mt-2 font-semibold text-white">{user?.displayName || user?.email || 'ผู้ใช้ Smart Farm'}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-950/80 p-4 border border-slate-800">
                                <p className="text-sm text-slate-400">หมายเลขคำขอ</p>
                                <p className="mt-2 font-semibold text-white">{membership?.id || membership?.transRef || 'ยังไม่มีคำขอ'}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link to="/subscribe" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100 transition">
                                {isActive ? 'ดูรายละเอียดแผนใหม่' : 'สมัครสมาชิกตอนนี้'}
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
