import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { videoService, watchService } from '../../services/api';
const WATCH_REWARD_RWF_PER_MINUTE = Number(import.meta.env.VITE_WATCH_REWARD_RWF_PER_MINUTE || 1);
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
  FaUser,
  FaVideo,
  FaQuestionCircle,
  FaBolt,
  FaYoutube,
  FaExternalLinkAlt,
  FaCheckCircle
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
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchTime, setWatchTime] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [lastTrackTime, setLastTrackTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const completionSentRef = useRef(false);
  const lastReportedTimeRef = useRef(0);
  const watchRequestSequenceRef = useRef(0);
  const watchClientSessionRef = useRef('');

  useEffect(() => {
    fetchVideo();
    completionSentRef.current = false;
    lastReportedTimeRef.current = 0;
    watchRequestSequenceRef.current = 0;
    watchClientSessionRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setWatchedSeconds(0);
    return () => youtubePlayerRef.current?.destroy?.();
  }, [id]);

  useEffect(() => {
    if (!video?.youtubeVideoId || !youtubeContainerRef.current) return undefined;

    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !youtubeContainerRef.current) return;
      youtubePlayerRef.current = new window.YT.Player(youtubeContainerRef.current, {
        videoId: video.youtubeVideoId,
        playerVars: { controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration() || video.duration || 0);
            const trackingTimer = window.setInterval(() => {
              if (event.target.getPlayerState() !== window.YT.PlayerState.PLAYING) return;
              const current = event.target.getCurrentTime();
              setCurrentTime(current);
              setProgress((current / (event.target.getDuration() || 1)) * 100);
              setWatchedSeconds((seconds) => seconds + 1);
              const elapsed = current - lastReportedTimeRef.current;
              if (elapsed >= 10) {
                lastReportedTimeRef.current = current;
                trackWatchTime(false, Math.round(elapsed));
              }
            }, 1000);
            youtubePlayerRef.current.trackingTimer = trackingTimer;
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
            if (event.data === window.YT.PlayerState.ENDED && !completionSentRef.current) {
              completionSentRef.current = true;
              setIsPlaying(false);
              setProgress(100);
              setCurrentTime(event.target.getDuration() || duration);
              trackWatchTime(true, Math.round(event.target.getDuration() || duration)).then((result) => {
                if (result?.suspicious) toast.error('Watch session needs review before rewards can be trusted.');
                else if (result?.qualifiedView) toast.success(`View counted after 45 seconds. RWF ${result.viewerEarnings.toFixed(2)} added.`);
                else if (result?.viewerEarnings > 0) toast.success(`Watch-time reward: RWF ${result.viewerEarnings.toFixed(2)} added.`);
                else toast('Watch time recorded.');
              });
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      window.clearInterval(youtubePlayerRef.current?.trackingTimer);
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
      const relatedResponse = await videoService.getAll({
        category: response.data.video.category || 'all',
        sortBy: 'views',
        limit: 8
      });
      setRelatedVideos(relatedResponse.data.videos.filter((item) => item._id !== id).slice(0, 4));
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
      const response = await watchService.track({
        videoId: id,
        watchTime: trackedTime,
        completed: completed,
        deviceInfo: navigator.userAgent,
        idempotencyKey: `${id}:${watchClientSessionRef.current}:${watchRequestSequenceRef.current += 1}`
      });
      
      setWatchTime(0);
      setLastTrackTime(currentTime);
      return response.data.data;
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
    if (youtubePlayerRef.current) {
      if (isPlaying) {
        youtubePlayerRef.current.pauseVideo();
      } else {
        youtubePlayerRef.current.playVideo();
      }
      return;
    }
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
    if (youtubePlayerRef.current) {
      if (isMuted) {
        youtubePlayerRef.current.unMute();
      } else {
        youtubePlayerRef.current.mute();
      }
      setIsMuted(!isMuted);
      return;
    }
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

    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.seekTo(time, true);
      setCurrentTime(time);
      setProgress(x * 100);
      return;
    }
    
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
      setCurrentTime(videoRef.current.duration || duration);
      trackWatchTime(true, Math.round(videoRef.current.duration || duration)).then((result) => {
        if (result?.suspicious) toast.error('Watch session needs review before rewards can be trusted.');
        else if (result?.qualifiedView) toast.success(`View counted after 45 seconds. RWF ${result.viewerEarnings.toFixed(2)} added.`);
        else if (result?.viewerEarnings > 0) toast.success(`Watch-time reward: RWF ${result.viewerEarnings.toFixed(2)} added.`);
        else toast('Watch time recorded.');
      });
    }
  };

  const handleShare = async () => {
    const shareData = { title: video.videoTitle, text: `Watch ${video.videoTitle} on Videa`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Video link copied.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') toast.error('Could not share this video.');
    }
  };

  const youtubeSubscribeUrl = video?.channel?.youtubeChannelUrl
    ? `${video.channel.youtubeChannelUrl}${video.channel.youtubeChannelUrl.includes('?') ? '&' : '?'}sub_confirmation=1`
    : '';

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
        <div className="mb-4 flex justify-center text-6xl text-primary-500"><FaQuestionCircle /></div>
        <h2 className="text-2xl font-bold text-dark-700">Video Not Found</h2>
        <p className="text-dark-500 mt-2">The video you're looking for doesn't exist</p>
        <button onClick={() => navigate('/videos')} className="btn-primary mt-4">
          Browse Videos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="container-custom py-5 lg:py-8">
        <div className="mb-5 flex items-center justify-between text-white">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">Now watching</p><p className="mt-1 text-sm text-slate-400">Settle in and watch all the way through to earn.</p></div>
          <button type="button" onClick={() => navigate('/videos')} className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-primary-400 hover:text-white sm:block">Back to library</button>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div 
              ref={containerRef}
              className="group relative aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/30 ring-1 ring-white/10"
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
                    <FaVideo className="mb-4 text-6xl text-primary-400" />
                    <p className="text-xl font-medium">Video Preview</p>
                    <p className="text-dark-400 text-sm mt-2">YouTube video will play here</p>
                  </div>
                </div>
              )}

              {!subscriptionConfirmed && youtubeSubscribeUrl && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 p-6 text-center backdrop-blur-sm">
                  <div className="max-w-sm text-white">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-2xl shadow-lg shadow-red-950/40"><FaYoutube /></div>
                    <h2 className="mt-5 text-xl font-bold">Subscribe to watch</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">Subscribe to this channel on YouTube, then return here to watch and earn.</p>
                    <a href={youtubeSubscribeUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"><FaYoutube /> Subscribe on YouTube <FaExternalLinkAlt className="text-xs" /></a>
                    <button type="button" onClick={() => setSubscriptionConfirmed(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-primary-300 hover:text-white"><FaCheckCircle /> I subscribed, start watching</button>
                  </div>
                </div>
              )}

              {/* Video Info Overlay */}
              <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-16 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div ref={progressRef} onClick={handleProgressClick} className="mb-4 h-1.5 w-full cursor-pointer rounded-full bg-white/25" role="slider" aria-label="Video progress" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100" tabIndex="0">
                  <div className="h-full rounded-full bg-primary-400 shadow-[0_0_12px_rgba(129,140,248,0.8)]" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <button 
                      type="button"
                      onClick={handlePlay}
                      aria-label={isPlaying ? 'Pause video' : 'Play video'}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition hover:scale-105 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium tabular-nums">{formatTime(currentTime)}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-sm text-slate-400 tabular-nums">{formatTime(duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleVolume}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      className="rounded-full p-2 text-white transition hover:bg-white/10 hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </button>
                    <button
                      type="button"
                      onClick={handleFullscreen}
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                      className="rounded-full p-2 text-white transition hover:bg-white/10 hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-white"
                    >
                      {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Details */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Video details</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{video.videoTitle}</h1></div><span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold capitalize text-primary-700">{video.category || 'General'}</span></div>
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
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
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setIsLiked((current) => !current)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${isLiked ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-200 hover:text-primary-700'}`}><FaHeart /> {isLiked ? 'Liked' : 'Like'}</button>
                <button type="button" onClick={handleShare} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary-200 hover:text-primary-700"><FaShare /> Share</button>
              </div>

              {video.videoDescription && (
                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
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
            {/* Earnings Potential */}
            {isAuthenticated && (
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wider">
                  <span className="flex items-center gap-2"><FaDollarSign /> Earnings Potential</span>
                </h3>
                <p className="mt-2 text-sm leading-5 text-green-700">Complete at least 60 seconds and reach the end to unlock your reward.</p>
                                <p className="mt-2 text-sm leading-5 text-green-700">Your reward is based on verified watch time. Watching at least 45 seconds counts as one view.</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-green-100" aria-label="Watch progress toward reward">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${duration ? Math.min(100, (currentTime / duration) * 100) : 0}%` }} />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">Completion reward</span>
                                        <span className="text-sm text-green-700">Rate per minute</span>
                    <span className="text-sm font-medium text-green-800">
                      RWF 1.50
                                          RWF {WATCH_REWARD_RWF_PER_MINUTE.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700">Current Watch Time</span>
                    <span className="text-sm font-medium text-green-800">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-green-200 pt-2">
                    <span className="text-sm font-semibold text-green-800">Estimated Earnings</span>
                    <span className="text-sm font-bold text-green-800">
                      RWF {duration > 0 && currentTime >= duration ? '1.50' : '0.00'}
                                          RWF {(currentTime / 60 * WATCH_REWARD_RWF_PER_MINUTE).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 text-xs text-green-600">
                  <span className="flex items-center gap-1"><FaBolt /> {currentTime >= duration && duration > 0 ? 'View counted. Reward submitted.' : 'Watch the full video to unlock your reward.'}</span>
                                  <span className="flex items-center gap-1"><FaBolt /> {currentTime >= Math.min(45, duration || 45) ? 'View counted. Watch-time reward submitted.' : 'Watch at least 45 seconds to count a view.'}</span>
                </div>
              </div>
            )}

            {/* Related videos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
                Related Videos
              </h3>
              {relatedVideos.length === 0 ? <p className="text-sm text-dark-500">No related videos yet.</p> : <div className="space-y-2">{relatedVideos.map((relatedVideo) => <Link key={relatedVideo._id} to={`/video/${relatedVideo._id}`} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"><div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">{relatedVideo.thumbnailUrl ? <img src={relatedVideo.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><FaVideo className="text-primary-400" /></div>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-700">{relatedVideo.videoTitle}</p><p className="mt-1 truncate text-xs text-slate-500">{relatedVideo.channel?.channelName || 'Videa creator'}</p><p className="mt-1 text-[11px] text-slate-400">{formatViews(relatedVideo.views)} views</p></div></Link>)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;