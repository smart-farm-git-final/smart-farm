import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function Login() {
    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            addToast('เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับกลับ 😊', 'success');
            navigate('/');
        } catch (err) {
            addToast(
                err.code === 'auth/invalid-credential' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' :
                    err.code === 'auth/user-not-found' ? 'ไม่พบบัญชีผู้ใช้นี้ กรุณาสมัครสมาชิกก่อน' :
                        err.code === 'auth/wrong-password' ? 'รหัสผ่านไม่ถูกต้อง' :
                            'เกิดข้อผิดพลาด: ' + err.message,
                'error'
            );
        }
        setLoading(false);
    };

    // google sign-in removed

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-3xl"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-slate-300/70 dark:bg-slate-700/70 blur-2xl"></div>
                <div className="absolute top-24 left-10 w-32 h-32 rounded-full bg-slate-200/70 dark:bg-slate-800/70 blur-2xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in-up rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900/90">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-float">
                        <span className="text-2xl">🌱</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">ยินดีต้อนรับกลับ!</h1>
                    <p className="text-slate-600 dark:text-slate-400">เข้าสู่ระบบ Smart Farm เพื่อเลือกซื้อสินค้าเกษตรอินทรีย์</p>
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-[28px] bg-gradient-to-r from-emerald-500 to-sky-500"></div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-200">
                                อีเมล <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-300 bg-white text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm placeholder-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-300 bg-white text-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm placeholder-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                    placeholder="รหัสผ่านของคุณ"
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
                        </div>

                        {/* Remember me & Forgot password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center">
                                <input type="checkbox" className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 mr-2" />
                                <span className="text-slate-600 dark:text-slate-400">จำฉันไว้</span>
                            </label>
                            <Link to="/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                                ลืมรหัสผ่าน?
                            </Link>
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
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </>
                            ) : (
                                <>
                                    <span>เข้าสู่ระบบ</span>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-500 dark:bg-slate-950 dark:text-slate-400">หรือ</span>
                        </div>
                    </div>

                    {/* Social login removed */}

                    {/* Register Link */}
                    <div className="text-center mt-8 pt-6 border-t border-slate-800">
                        <p className="text-slate-600 dark:text-slate-400">
                            ยังไม่มีบัญชี?
                            <Link to="/register" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold ml-2 transition-colors">
                                สมัครสมาชิกฟรี
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        การเข้าสู่ระบบของคุณปลอดภัยและได้รับการปกป้อง 🔒
                    </p>
                </div>
            </div>
        </div>
    );
}
