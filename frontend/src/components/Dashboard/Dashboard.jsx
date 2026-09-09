import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaChartLine, FaClock, FaEye, FaWallet, FaCrown } from 'react-icons/fa';
import { authService, channelService, watchService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Loader from '../Common/Loader';

const formatMoney = (value) => `RWF ${Number(value || 0).toFixed(2)}`;

const formatTime = (seconds) => {
  const hours = Math.floor((seconds || 0) / 3600);
  const minutes = Math.floor(((seconds || 0) % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

function Dashboard() {
  const { user, isPremiumCreator, activatePremium } = useAuth();
  const [earnings, setEarnings] = useState(null);
  const [history, setHistory] = useState([]);
  const [channels, setChannels] = useState([]);
  const [account, setAccount] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activatingPremium, setActivatingPremium] = useState(false);
  const plans = [
    { id: 'basic', name: 'Basic', price: 'RWF 2,500', channels: 1, videos: 1, views: '5,000' },
    { id: 'pro', name: 'Pro', price: 'RWF 7,500', channels: 3, videos: 10, views: '25,000' },
    { id: 'elite', name: 'Elite', price: 'RWF 15,000', channels: 10, videos: 50, views: '100,000' },
  ];

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [earningsResponse, historyResponse, accountResponse, channelsResponse] = await Promise.all([
          watchService.getEarnings(),
          watchService.getHistory(),
          authService.getMe(),
          channelService.getAll(),
        ]);
        setEarnings(earningsResponse.data.earnings);
        setHistory(historyResponse.data.history || []);
        setAccount(accountResponse.data.user);
        setChannels(channelsResponse.data.channels || []);
      } catch (requestError) {
        console.error('Dashboard data error:', requestError);
        setError('Dashboard data could not be loaded. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <Loader />;

  const topChannels = channels
    .sort((firstChannel, secondChannel) => (secondChannel.totalViews || 0) - (firstChannel.totalViews || 0))
    .slice(0, 4);

  const handleActivatePremium = async (plan) => {
    setActivatingPremium(true);
    const result = await activatePremium(plan);
    if (!result.success) setError(result.error);
    setActivatingPremium(false);
  };

  return (
    <div className="container-custom py-8">
      <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Your account</p>
          <h1 className="mt-1 text-3xl font-bold text-dark-900"> {user?.username || 'viewer'}</h1>
          <p className="mt-2 text-dark-600">A live view of your watching activity and rewards.</p>
        </div>
        <Link to="/earnings" className="btn-primary inline-flex items-center gap-2">
          View earnings <FaArrowRight className="text-xs" />
        </Link>
      </header>

      {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!isPremiumCreator && <section className="mb-8 rounded-2xl bg-primary-700 p-6 text-white">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><FaCrown /> Choose a premium creator plan</h2>
          <p className="mt-1 text-sm text-primary-100">Unpaid accounts can keep watching and earning. Premium plans unlock channel and video sharing.</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {plans.map((plan) => <div key={plan.id} className="rounded-xl bg-white p-4 text-dark-900">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{plan.name}</h3><span className="text-sm font-bold text-primary-700">{plan.price}/mo</span></div>
            <p className="mt-2 text-sm text-dark-600">{plan.channels} channel{plan.channels === 1 ? '' : 's'} · {plan.videos} video{plan.videos === 1 ? '' : 's'} · {plan.views} views</p>
            <button type="button" onClick={() => handleActivatePremium(plan.id)} disabled={activatingPremium} className="mt-4 w-full rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {activatingPremium ? 'Activating...' : `Choose ${plan.name}`}
            </button>
          </div>)}
        </div>
      </section>}

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total earnings', value: formatMoney(earnings?.total), icon: FaWallet, color: 'text-green-600 bg-green-50' },
          { label: 'Watch time', value: formatTime(earnings?.watchTime), icon: FaClock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Videos completed', value: earnings?.completedCount || 0, icon: FaEye, color: 'text-primary-600 bg-primary-50' },
          { label: 'Wallet balance', value: formatMoney(account?.walletBalance), icon: FaChartLine, color: 'text-orange-600 bg-orange-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-dark-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-dark-900">{value}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}><Icon /></span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <div className="border-b border-dark-100 px-5 py-4">
            <h2 className="font-semibold text-dark-900">Top channels</h2>
            <p className="mt-1 text-sm text-dark-500">Ranked by real YouTube views</p>
          </div>
          <div className="p-5">
            {topChannels.length === 0 ? <p className="py-6 text-sm text-dark-500">No channels have been shared yet.</p> : topChannels.map((channel) => (
              <div key={channel._id} className="flex items-center justify-between border-b border-dark-100 py-3 last:border-0">
                <div className="min-w-0 pr-4"><strong className="block truncate text-sm text-dark-800">{channel.channelName}</strong><span className="text-xs text-dark-500">{Number(channel.totalViews || 0).toLocaleString()} views</span></div>
                <span className="whitespace-nowrap text-sm font-semibold text-green-600">{formatMoney(channel.totalEarnings)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-dark-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-dark-900">Recent activity</h2>
              <p className="mt-1 text-sm text-dark-500">Your latest watch sessions</p>
            </div>
            <Link to="/earnings" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="divide-y divide-dark-100">
            {history.length === 0 ? <p className="px-5 py-8 text-sm text-dark-500">No watch history yet. Start watching a video to begin.</p> : history.slice(0, 5).map((item) => (
              <Link to={`/video/${item.video?._id}`} key={item._id} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-dark-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-dark-800">{item.video?.videoTitle || 'Unknown video'}</p>
                  <p className="mt-1 text-xs text-dark-500">{item.channel?.channelName || 'Unknown channel'} · {formatTime(item.watchTime)}</p>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-green-600">+{formatMoney(item.earnings)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-2xl bg-dark-900 p-6 text-white">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Ready for something new?</h2>
            <p className="mt-1 text-sm text-dark-300">Browse shared YouTube videos and keep earning.</p>
          </div>
          <Link to="/videos" className="secondary-button border-dark-700 bg-dark-800 text-white hover:bg-dark-700">Browse videos</Link>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;