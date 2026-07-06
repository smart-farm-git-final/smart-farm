import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState } from 'react';

const NAV_LINKS = [
    { to: '/', label: 'หน้าแรก' },
    { to: '/products', label: 'สินค้า' },
    { to: '/orders', label: 'คำสั่งซื้อ' },
    { to: '/membership', label: 'Membership' },
    { to: '/subscribe', label: 'สมัครสมาชิก' },
];

export default function Navbar() {
    const { user, isAdmin, logout } = useAuth();
    const { totalItems } = useCart();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const query = searchText.trim();
        if (query) {
            navigate(`/products?search=${encodeURIComponent(query)}`);
        } else {
            navigate('/products');
        }
        setMenuOpen(false);
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-6">
                    <Link to="/" className="flex items-center gap-3 font-black text-xl text-slate-900 dark:text-white hover:scale-105 transition-transform">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-lg shadow-lg">
                            🛒
                        </div>
                        <span className="text-lg">Smart Farm</span>
                    </Link>

                    <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm overflow-hidden transition-all focus-within:border-emerald-500">
                        <input
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            type="search"
                            placeholder="ค้นหาสินค้า ผลไม้ ผักสด..."
                            className="px-4 py-2 w-72 bg-transparent text-sm text-slate-900 dark:text-slate-100 outline-none"
                        />
                        <button type="submit" className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-r-full hover:bg-emerald-700 transition-all">
                            ค้นหา
                        </button>
                    </form>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="hidden md:flex items-center gap-3">
                        <Link
                            to="/products"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            หมวดหมู่
                        </Link>
                        <Link
                            to="/products"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            โปรโมชั่น
                        </Link>
                        <Link
                            to="/orders"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            คำสั่งซื้อ
                        </Link>
                        <Link
                            to="/membership"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            Membership
                        </Link>
                        <Link
                            to="/subscribe"
                            className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            สมัครสมาชิก
                        </Link>
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                            >
                                แอดมิน
                            </Link>
                        )}
                        <Link
                            to="/cart"
                            className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors"
                        >
                            <span>ตะกร้า</span>
                            {totalItems > 0 && (
                                <span className="bg-emerald-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                                    {totalItems}
                                </span>
                            )}
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 rounded-full text-sm font-semibold text-emerald-600 border border-emerald-600 hover:bg-emerald-50 transition-all"
                                >
                                    ออกจากระบบ
                                </button>
                                <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-900 px-4 py-2 text-sm text-slate-800 dark:text-slate-200">
                                    👋 {user.displayName || 'ผู้ใช้'}
                                </span>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 rounded-full text-sm font-semibold text-emerald-600 border border-emerald-600 hover:bg-emerald-50 transition-all"
                                >
                                    สมัครสมาชิก
                                </Link>
                                <Link
                                    to="/login"
                                    className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all"
                                >
                                    เข้าสู่ระบบ
                                </Link>
                            </>
                        )}
                        <button
                            onClick={toggle}
                            className="p-2 rounded-full text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                            title="Toggle theme"
                        >
                            {dark ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 hidden md:flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-emerald-600">จัดส่งทั่วไทย</span>
                </div>
            </div>

            {/* Mobile hamburger */}
            <div className="md:hidden px-4 py-3 flex items-center justify-between">
                <form onSubmit={handleSearchSubmit} className="flex items-center w-full gap-2">
                    <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        type="search"
                        placeholder="ค้นหา..."
                        className="w-full px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-sm outline-none"
                    />
                    <button type="submit" className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-all">
                        ค้นหา
                    </button>
                </form>
            </div>

            {menuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white/95 p-4 space-y-2 shadow-sm">
                    {NAV_LINKS.map((l) => (
                        <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
                            {l.label}
                        </Link>
                    ))}
                    {isAdmin && (
                        <Link to="/admin" onClick={() => setMenuOpen(false)}
                            className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
                            แอดมิน
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
}
