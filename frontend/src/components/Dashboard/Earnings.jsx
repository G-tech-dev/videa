import React, { useState, useEffect } from 'react';
import { watchService } from '../../services/api';
import { 
  FaWallet, 
  FaHistory, 
  FaChartLine,
  FaCalendar,
  FaDownload,
  FaArrowUp,
  FaArrowDown,
  FaMoneyBillWave
} from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Earnings = () => {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    total: 0,
    watchTime: 0,
    historyCount: 0
  });
  const [history, setHistory] = useState([]);
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => {
    fetchEarningsData();
  }, [dateRange]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const [earningsRes, historyRes] = await Promise.all([
        watchService.getEarnings(),
        watchService.getHistory()
      ]);

      setEarnings(earningsRes.data.earnings);
      setHistory(historyRes.data.history || []);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sample chart data (would come from real API in production)
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Earnings (RWF)',
        data: [0.12, 0.45, 0.30, 0.89, 0.55, 1.20, 0.75],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => 'RWF ' + value.toFixed(2),
        },
      },
    },
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-dark-900"><FaMoneyBillWave className="text-primary-600" /> Earnings</h1>
          <p className="text-dark-600 mt-1">Track your watch-to-earn rewards</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field w-auto"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="btn-secondary flex items-center gap-2">
            <FaDownload className="text-sm" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-500">Total Earnings</p>
              <p className="text-3xl font-bold text-dark-900 mt-1">
                RWF {earnings.total.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <FaWallet className="text-green-500 text-xl" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-green-600">
            <FaArrowUp className="mr-1" />
            <span>+12.5% from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-500">Watch Time</p>
              <p className="text-3xl font-bold text-dark-900 mt-1">
                {formatTime(earnings.watchTime || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <FaHistory className="text-blue-500 text-xl" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-blue-600">
            <FaArrowUp className="mr-1" />
            <span>+8.2% from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-500">Videos Watched</p>
              <p className="text-3xl font-bold text-dark-900 mt-1">
                {earnings.historyCount || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
              <FaChartLine className="text-purple-500 text-xl" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-sm text-purple-600">
            <FaArrowUp className="mr-1" />
            <span>+5.7% from last week</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
        <h3 className="text-lg font-semibold text-dark-900 mb-4">Earnings Overview</h3>
        <div className="h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-100">
          <h3 className="text-lg font-semibold text-dark-900">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                  Watch Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-dark-500">
                    No watch history yet. Start watching videos to earn!
                  </td>
                </tr>
              ) : (
                history.map((item, index) => (
                  <tr key={index} className="hover:bg-dark-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-dark-900">
                      {item.video?.videoTitle || 'Unknown Video'}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-600">
                      {item.channel?.channelName || 'Unknown Channel'}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-600">
                      {formatTime(item.watchTime || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">
                      RWF {(item.earnings || 0).toFixed(4)}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-500">
                      {formatDate(item.lastWatched)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Earnings;