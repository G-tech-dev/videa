import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videoService } from '../../services/api';
import { FaEye, FaClock, FaFire, FaShareAlt, FaVideo, FaMoneyBillWave, FaFilm, FaSearch } from 'react-icons/fa';
import Loader from '../Common/Loader';
import toast from 'react-hot-toast';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVideos();
  }, [filter, sortBy]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await videoService.getAll({
        category: filter,
        sortBy: sortBy,
        limit: 20
      });
      setVideos(response.data.videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
  };

  const shareVideo = async (event, video) => {
    event.preventDefault();
    event.stopPropagation();
    const videoUrl = `${window.location.origin}/video/${video._id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video.videoTitle,
          text: `Watch ${video.videoTitle}`,
          url: videoUrl,
        });
      } else {
        await navigator.clipboard.writeText(videoUrl);
        toast.success('Video link copied!');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Could not share this video link');
      }
    }
  };

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'tech', label: 'Tech' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'music', label: 'Music' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'travel', label: 'Travel' },
    { value: 'food', label: 'Food' },
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Latest' },
    { value: 'views', label: 'Most Viewed' },
    { value: 'earnings', label: 'Top Earning' },
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleVideos = normalizedSearch
    ? videos.filter((video) => [
      video.videoTitle,
      video.channel?.channelName,
      video.category,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
    : videos;

  if (loading) return <Loader />;

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 border-b border-dark-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-primary-600">Video library</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-dark-900">Trending Videos</h1>
          <p className="mt-2 text-sm text-dark-600">Watch full videos and earn rewards.</p>
        </div>
        
        <div className="flex w-full flex-col items-stretch gap-2 rounded-2xl border border-dark-200 bg-white p-2 shadow-sm sm:w-auto sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 border-b border-dark-200 px-3 text-dark-400 sm:min-w-52 sm:border-b-0 sm:border-r">
            <FaSearch className="text-sm" />
            <span className="sr-only">Search videos</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search videos..."
              className="w-full bg-transparent py-2 text-sm text-dark-800 outline-none placeholder:text-dark-400"
            />
          </label>
          {/* Category Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-auto min-w-36 border-0 bg-transparent py-2 shadow-none focus:ring-0"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field w-auto min-w-36 border-0 bg-transparent py-2 shadow-none focus:ring-0"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Grid */}
      {visibleVideos.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-4 flex justify-center text-6xl text-primary-500"><FaFilm /></div>
          <h3 className="text-xl font-semibold text-dark-700">{videos.length === 0 ? 'No videos found' : 'No matching videos'}</h3>
          <p className="text-dark-500 mt-2">{videos.length === 0 ? 'Check back later for new content' : 'Try a different title, channel, or category.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleVideos.map((video) => (
            <article
              key={video._id}
              className="card group overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
            >
              <Link to={`/video/${video._id}`} className="block">
              <div className="relative">
                {/* Thumbnail */}
                <div className="aspect-video overflow-hidden bg-dark-100">
                  {video.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.videoTitle}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 to-primary-200">
                      <FaVideo className="text-4xl text-primary-600" />
                    </div>
                  )}
                </div>

                {/* Duration Badge */}
                {video.duration > 0 && (
                  <div className="absolute bottom-2 right-2 rounded-md bg-slate-950/85 px-2 py-1 font-mono text-xs text-white">
                    {formatDuration(video.duration)}
                  </div>
                )}

                {/* Earnings Badge */}
                {video.isMonetized && (
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
                    <FaFire className="text-xs" />
                    Earn
                  </div>
                )}
              </div>
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/video/${video._id}`} className="min-w-0">
                    <h3 className="font-semibold text-dark-800 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {video.videoTitle}
                    </h3>
                  </Link>
                  <button
                    type="button"
                    onClick={(event) => shareVideo(event, video)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dark-200 text-dark-500 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                    title="Share video link"
                    aria-label={`Share ${video.videoTitle}`}
                  >
                    <FaShareAlt className="text-sm" />
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-3 font-mono text-xs text-dark-500">
                  <span className="flex items-center gap-1">
                    <FaEye className="text-xs" />
                    {formatViews(video.views)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FaClock className="text-xs" />
                    {new Date(video.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-2">
                  <span className="inline-block rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                    {video.channel?.channelName || 'Unknown Channel'}
                  </span>
                </div>

                {/* Earnings Indicator */}
                {video.earnings > 0 && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    <FaMoneyBillWave className="mr-1 inline" /> RWF {video.earnings.toFixed(2)} earned
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoList;