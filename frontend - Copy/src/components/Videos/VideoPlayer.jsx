import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoService, watchService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FaPlay, 
  FaPause, 
  FaVolumeUp, 
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaShare,
  FaHeart,
  FaComment,
  FaClock,
  FaEye,
  FaDollarSign,
  FaUser
} from 'react-icons/fa';
import toast from 'react-hot-toast';

let youtubeApiPromise;

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
  });
  return youtubeApiPromise;
};

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchTime, setWatchTime] = useState(0);
  const [lastTrackTime, setLastTrackTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const completionSentRef = useRef(false);

  useEffect(() => {
    fetchVideo();
    completionSentRef.current = false;
    return () => youtubePlayerRef.current?.destroy?.();
  }, [id]);

  useEffect(() => {
    if (!video?.youtubeVideoId || !youtubeContainerRef.current) return undefined;

    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !youtubeContainerRef.current) return;
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: video.youtubeVideoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (event) => setDuration(event.target.getDuration() || video.duration || 0),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
            if (event.data === window.YT.PlayerState.ENDED && !completionSentRef.current) {
              completionSentRef.current = true;
              setIsPlaying(false);
              setProgress(100);
              trackWatchTime(true, Math.round(event.target.getDuration() || duration));
              toast.success('Video completed! RWF 1.50 added to your wallet.');
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = null;
    };
  }, [video]);

  useEffect(() => {
    // Auto-hide controls
    if (showControls) {
      clearTimeout(controlsTimeout);
      const timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
      setControlsTimeout(timeout);
    }
    return () => clearTimeout(controlsTimeout);
  }, [showControls, isPlaying]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await videoService.getById(id);
      setVideo(response.data.video);
      setDuration(response.data.video.duration || 0);
    } catch (error) {
      toast.error('Failed to load video');
      navigate('/videos');
    } finally {
      setLoading(false);
    }
  };

  const trackWatchTime = async (completed = false, trackedTime = watchTime) => {
    if (!isAuthenticated) return;
    if (trackedTime < 5) return; // Minimum 5 seconds to track

    try {
      await watchService.track({
        videoId: id,
        watchTime: trackedTime,
        completed: completed,
        deviceInfo: navigator.userAgent
      });
      
      setWatchTime(0);
      setLastTrackTime(currentTime);
    } catch (error) {
      console.error('Failed to track watch time:', error);
    }
  };

  // Handle video progress
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    
    setCurrentTime(current);
    setProgress((current / dur) * 100);
    
    // Track watch time every 10 seconds
    if (current - lastTrackTime >= 10) {
      const timeToAdd = current - lastTrackTime;
      setWatchTime(prev => prev + timeToAdd);
      setLastTrackTime(current);
      
      // Track in background
      if (watchTime >= 10) {
        trackWatchTime();
      }
    }
  };

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        // Track when paused
        if (watchTime > 0) {
          trackWatchTime();
        }
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolume = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const time = x * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      setProgress(x * 100);
    }
  };

  const handleVideoEnd = () => {
    if (videoRef.current && !completionSentRef.current) {
      completionSentRef.current = true;
      setIsPlaying(false);
      setProgress(100);
      trackWatchTime(true, Math.round(videoRef.current.duration || duration));
      toast.success('Video completed! RWF 1.50 added to your wallet.');
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-dark-700">Video Not Found</h2>
        <p className="text-dark-500 mt-2">The video you're looking for doesn't exist</p>
        <button onClick={() => navigate('/videos')} className="btn-primary mt-4">
          Browse Videos
        </button>
      </div>
    );
  }

  return (
    <div className="bg-dark-900 min-h-screen">
      <div className="container-custom py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div 
              ref={containerRef}
              className="relative bg-black rounded-xl overflow-hidden aspect-video"
              onMouseMove={() => setShowControls(true)}
              onMouseLeave={() => isPlaying && setShowControls(false)}
            >
              {/* YouTube Embed or Custom Player */}
              {video.youtubeVideoId ? (
                <div
                  ref={youtubeContainerRef}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-700 to-dark-900">
                  <div className="text-center text-white">
                    <div className="text-6xl mb-4">🎬</div>
                    <p className="text-xl font-medium">Video Preview</p>
                    <p className="text-dark-400 text-sm mt-2">YouTube video will play here</p>
                  </div>
                </div>
              )}

              {/* Video Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-dark-900 to-transparent">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={handlePlay}
                      className="w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-colors"
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{formatTime(currentTime)}</span>
                      <span className="text-dark-400">/</span>
                      <span className="text-sm text-dark-400">{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleVolume}
                      className="text-white hover:text-primary-400 transition-colors"
                    >
                      {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                    <button 
                      onClick={handleFullscreen}
                      className="text-white hover:text-primary-400 transition-colors"
                    >
                      {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Details */}
            <div className="bg-white rounded-xl p-6 mt-4">
              <h1 className="text-2xl font-bold text-dark-900">{video.videoTitle}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-dark-500">
                <span className="flex items-center gap-1">
                  <FaEye className="text-primary-500" />
                  {formatViews(video.views)} views
                </span>
                <span className="flex items-center gap-1">
                  <FaClock className="text-primary-500" />
                  {new Date(video.createdAt).toLocaleDateString()}
                </span>
                {video.earnings > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <FaDollarSign className="text-green-500" />
                    RWF {video.earnings.toFixed(2)} earned
                  </span>
                )}
                <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs">
                  {video.category || 'General'}
                </span>
              </div>

              {video.videoDescription && (
                <div className="mt-4 p-4 bg-dark-50 rounded-lg">
                  <p className="text-dark-700 text-sm whitespace-pre-wrap">
                    {video.videoDescription}
                  </p>
                </div>
              )}

              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {video.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="bg-dark-100 text-dark-600 text-xs px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Channel Info */}
            <div className="bg-white rounded-xl p-6">
              <h3 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
                Channel
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {video.channel?.channelName?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-dark-800">
                    {video.channel?.channelName || 'Unknown Channel'}
                  </h4>
                  <p className="text-xs text-dark-500">
                    {video.channel?.subscriberCount || 0} subscribers
                  </p>
                </div>
              </div>
              <button className="w-full btn-primary mt-4 py-2 text-sm">
                Subscribe
              </button>
            </div>

            {/* Earnings Potential */}
            {isAuthenticated && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wider">
                  💰 Earnings Potential
                </h3>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">Watch Reward</span>
                    <span className="text-sm font-medium text-green-800">
                      RWF 0.001/min
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">Current Watch Time</span>
                    <span className="text-sm font-medium text-green-800">
                      {Math.floor(watchTime)}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-green-200 pt-2">
                    <span className="text-sm font-semibold text-green-800">Estimated Earnings</span>
                    <span className="text-sm font-bold text-green-800">
                      RWF {((watchTime / 60) * 0.001).toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-green-600">
                  ⚡ Watch at least 30 seconds to start earning
                </div>
              </div>
            )}

            {/* Similar Videos */}
            <div className="bg-white rounded-xl p-6">
              <h3 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
                Related Videos
              </h3>
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex gap-3 cursor-pointer hover:bg-dark-50 p-2 rounded-lg transition-colors">
                    <div className="w-20 h-12 bg-dark-200 rounded flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-700 truncate">
                        Related Video {item}
                      </p>
                      <p className="text-xs text-dark-500">Channel Name</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;