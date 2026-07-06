import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Register() {
    const { register } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', password2: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.password2) {
            addToast('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบใหม่อีกครั้ง', 'error');
            return;
        }
        if (form.password.length < 6) {
            addToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
            return;
        }
        setLoading(true);
        try {
            await register(form.name, form.email, form.password);
            addToast('🎉 สมัครสมาชิกสำเร็จ! ยินดีต้อนรับสู่ครอบครัว Smart Farm', 'success');
            navigate('/');
        } catch (err) {
            addToast(
                err.code === 'auth/email-already-in-use' ? 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ' :
                    err.code === 'auth/weak-password' ? 'รหัสผ่านควรมีความยาวอย่างน้อย 6 ตัวอักษร' :
                        err.code === 'auth/invalid-email' ? 'กรุณาป้อนอีเมลที่ถูกต้อง' :
                            'เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + err.message,
                'error'
            );
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-slate-300/70 dark:bg-slate-700/70 blur-2xl"></div>
                <div className="absolute top-24 right-10 w-32 h-32 rounded-full bg-slate-200/70 dark:bg-slate-800/70 blur-2xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in-up rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900/90">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-float">
                        <span className="text-2xl">🌱</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">สร้างบัญชีใหม่</h1>
                    <p className="text-slate-600 dark:text-slate-400">เข้าร่วมครอบครัว Smart Farm และเริ่มช้อปปิ้งสินค้าเกษตรอินทรีย์</p>
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-[28px] bg-gradient-to-r from-emerald-500 to-sky-500"></div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-200">
                                ชื่อ-นามสกุล <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm placeholder-slate-400"
                                    placeholder="สมชาย ใจดี"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-200">
                                อีเมล <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm placeholder-slate-400"
                                    placeholder="your@email.com"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-200">
                                รหัสผ่าน <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm placeholder-slate-400"
                                    placeholder="อย่างน้อย 6 ตัวอักษร"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</p>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-200">
                                ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="password2"
                                    type={showPassword2 ? "text" : "password"}
                                    value={form.password2}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm placeholder-slate-400"
                                    placeholder="ยืนยันรหัสผ่าน"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword2(!showPassword2)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    {showPassword2 ? (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 inline-flex items-center justify-center gap-2 text-base"
                        >
                            {loading ? (
                                <>
                                    <div className="spinner w-5 h-5"></div>
                                    <span>กำลังสมัครสมาชิก...</span>
                                </>
                            ) : (
                                <>
                                    <span>สมัครสมาชิก</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Terms */}
                    <div className="text-center mt-6">
                        <p className="text-xs text-slate-500">
                            การสมัครสมาชิกแสดงว่าคุณยอมรับ
                            <Link to="/terms" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"> นโยบายและเงื่อนไข</Link>
                        </p>
                    </div>

                    {/* Login Link */}
                    <div className="text-center mt-6 pt-6 border-t border-slate-800">
                        <p className="text-slate-600 dark:text-slate-400">
                            มีบัญชีอยู่แล้ว?
                            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-bold ml-2 transition-colors">
                                เข้าสู่ระบบ
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-xs text-slate-500">
                        เข้าร่วมกับเรามากกว่า 10,000+ คนแล้ว 🌱
                    </p>
                </div>
            </div>
        </div>
    );
}
