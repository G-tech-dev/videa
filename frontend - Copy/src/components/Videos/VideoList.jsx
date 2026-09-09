import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videoService } from '../../services/api';
import { FaEye, FaClock, FaFire, FaShareAlt } from 'react-icons/fa';
import Loader from '../Common/Loader';
import toast from 'react-hot-toast';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');

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

  if (loading) return <Loader />;

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-dark-900">Trending Videos</h1>
          <p className="text-dark-600 mt-1">Watch videos and earn rewards!</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Category Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-auto"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          {/* Sort Options */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field w-auto"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-semibold text-dark-700">No videos found</h3>
          <p className="text-dark-500 mt-2">Check back later for new content</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <article
              key={video._id}
              className="card group overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              <Link to={`/video/${video._id}`} className="block">
              <div className="relative">
                {/* Thumbnail */}
                <div className="aspect-video bg-dark-200 overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.videoTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-300">
                      <span className="text-4xl">🎬</span>
                    </div>
                  )}
                </div>

                {/* Duration Badge */}
                {video.duration > 0 && (
                  <div className="absolute bottom-2 right-2 bg-dark-900 bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}

                {/* Earnings Badge */}
                {video.isMonetized && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
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
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dark-200 text-dark-500 transition hover:border-primary-300 hover:text-primary-600"
                    title="Share video link"
                    aria-label={`Share ${video.videoTitle}`}
                  >
                    <FaShareAlt className="text-sm" />
                  </button>
                </div>
                
                <div className="mt-2 flex items-center gap-3 text-sm text-dark-500">
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
                  <span className="inline-block bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full">
                    {video.channel?.channelName || 'Unknown Channel'}
                  </span>
                </div>

                {/* Earnings Indicator */}
                {video.earnings > 0 && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    💰 RWF {video.earnings.toFixed(2)} earned
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