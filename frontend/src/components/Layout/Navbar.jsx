import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/api';
import { FaBars, FaChartLine, FaHome, FaPlusCircle, FaSignOutAlt, FaTimes, FaUser, FaVideo, FaWallet } from 'react-icons/fa';

const Navbar = () => {
  const { user, logout, isAuthenticated, isPremiumCreator } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let mounted = true;
    const refreshBalance = async () => {
      try {
        const response = await walletService.get();
        if (mounted) setWalletBalance(response.data.wallet.balance || 0);
      } catch (error) {
        console.error('Sidebar balance refresh error:', error);
      }
    };

    refreshBalance();
    const refreshInterval = setInterval(refreshBalance, 30000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return (
      <header className="border-b border-dark-200 bg-white">
        <div className="container-custom flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white"><FaVideo /></span><span className="text-xl font-bold text-primary-700">Videa</span></Link>
          <div className="flex items-center gap-3 sm:gap-4"><Link to="/login" className="text-sm font-medium text-dark-600 hover:text-primary-600">Sign in</Link><Link to="/register" className="btn-primary px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm">Get started</Link></div>
        </div>
      </header>
    );
  }

  const links = [
    { to: '/', label: 'Dashboard', icon: FaHome },
    { to: '/videos', label: 'Browse videos', icon: FaVideo },
    { to: '/earnings', label: 'Earnings', icon: FaChartLine },
    { to: '/wallet', label: 'Wallet', icon: FaWallet },
  ];
  if (isPremiumCreator) {
    links.push({ to: '/share-video', label: 'Share video', icon: FaPlusCircle });
    links.push({ to: '/my-channel', label: 'My channel', icon: FaUser });
  } else {
    links.push({ to: '/channel/create', label: 'Upgrade to share', icon: FaPlusCircle });
  }

  const menu = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between border-b border-dark-700 px-6">
        <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white"><FaVideo /></span><span className="text-xl font-bold text-white">Videa</span></Link>
        <button type="button" onClick={() => setIsMenuOpen(false)} className="text-dark-300 hover:text-white md:hidden" aria-label="Close menu"><FaTimes /></button>
      </div>
      <div className="flex-1 space-y-1 px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-dark-400">Menu</p>
        {links.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return <Link key={to} to={to} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? 'bg-primary-600 text-white' : 'text-dark-300 hover:bg-dark-800 hover:text-white'}`}><Icon className="w-4" /><span>{label}</span></Link>;
        })}
      </div>
      <div className="border-t border-dark-700 p-4">
        <Link to="/wallet" onClick={() => setIsMenuOpen(false)} className="mb-3 flex items-center gap-3 rounded-xl bg-dark-800 p-3 text-white hover:bg-dark-700"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 font-bold">{user?.username?.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.username}</p><p className="truncate text-xs text-dark-400">RWF {Number(walletBalance).toFixed(2)}</p></div></Link>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200"><FaSignOutAlt /> Sign out</button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 bg-dark-900 md:block">{menu}</aside>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-dark-200 bg-white px-4 md:hidden"><button type="button" onClick={() => setIsMenuOpen(true)} className="shrink-0 text-dark-700" aria-label="Open menu"><FaBars size={20} /></button><Link to="/" className="text-lg font-bold text-primary-700">Videa</Link><Link to="/wallet" className="min-w-0 truncate text-right text-xs font-semibold text-green-700">RWF {Number(walletBalance).toFixed(2)}</Link></div>
      {isMenuOpen && <><button type="button" aria-label="Close menu overlay" onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-40 bg-dark-900/60 md:hidden" /><aside className="fixed inset-y-0 left-0 z-50 w-72 bg-dark-900 md:hidden">{menu}</aside></>}
    </>
  );
};

export default Navbar;
