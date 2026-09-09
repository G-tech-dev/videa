import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { videoService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  FaYoutube, 
  FaTag, 
  FaInfoCircle,
  FaShare,
  FaSpinner,
  FaLock
} from 'react-icons/fa';
import toast from 'react-hot-toast';

let youtubeApiPromise;

const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve(window.YT);
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
};

const extractYouTubeVideoId = (value) => {
  const trimmedValue = value.trim();
  if (/^[\w-]{11}$/.test(trimmedValue)) return trimmedValue;

  const match = trimmedValue.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return match?.[1] || '';
};

const UploadVideo = () => {
  const navigate = useNavigate();
  const { user, isPremiumCreator } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const playerContainerRef = useRef(null);
  const playerRef = useRef(null);
  const [formData, setFormData] = useState({
    videoTitle: '',
    videoDescription: '',
    youtubeVideoId: '',
    youtubeVideoUrl: '',
    category: 'other',
    tags: '',
    duration: 0,
    thumbnailUrl: ''
  });

  useEffect(() => {
    const videoId = extractYouTubeVideoId(formData.youtubeVideoUrl);
    let cancelled = false;
    let durationTimer;

    if (!videoId) {
      setMetadataLoading(false);
      setMetadataError('');
      setFormData(prev => ({ ...prev, youtubeVideoId: '', thumbnailUrl: '', duration: 0 }));
      return undefined;
    }

    setMetadataLoading(true);
    setMetadataError('');
    setFormData(prev => ({
      ...prev,
      youtubeVideoId: videoId,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0
    }));

    const metadataTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setMetadataLoading(false);
        setMetadataError('Duration could not be detected. You can still share this video.');
      }
    }, 5000);

    loadYouTubeApi()
      .then(() => {
        if (cancelled || !playerContainerRef.current) return;

        const updateDuration = () => {
          const duration = Math.round(playerRef.current?.getDuration?.() || 0);
          if (duration > 0) {
            setFormData(prev => ({ ...prev, duration }));
            setMetadataLoading(false);
              setMetadataError('');
              clearTimeout(metadataTimeout);
            clearInterval(durationTimer);
          }
        };

        playerRef.current = new window.YT.Player(playerContainerRef.current, {
          height: '1',
          width: '1',
          videoId,
          playerVars: { controls: 0, modestbranding: 1 },
          events: {
            onReady: updateDuration,
            onStateChange: updateDuration
          }
        });
        durationTimer = window.setInterval(updateDuration, 500);
      })
      .catch(() => {
        if (!cancelled) {
          setMetadataLoading(false);
          setMetadataError('Duration could not be detected. You can still share this video.');
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(metadataTimeout);
      clearInterval(durationTimer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [formData.youtubeVideoUrl]);

  const categories = [
    { value: 'gaming', label: 'Gaming' },
    { value: 'tech', label: 'Tech' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'music', label: 'Music' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'travel', label: 'Travel' },
    { value: 'food', label: 'Food' },
    { value: 'other', label: 'Other' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const youtubeVideoId = extractYouTubeVideoId(formData.youtubeVideoUrl);
    if (!youtubeVideoId) {
      toast.error('Please enter a valid YouTube Video ID or URL');
      return;
    }

    // Convert tags string to array
    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const submitData = {
      ...formData,
      youtubeVideoId,
      tags: tagsArray,
      duration: parseInt(formData.duration) || 0
    };

    setLoading(true);
    try {
      await videoService.create(submitData);
      toast.success('YouTube video shared successfully!');
      navigate('/videos');
    } catch (error) {
      // Error handled by interceptor
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is a creator
  if (!isPremiumCreator) {
    return (
      <div className="container-custom py-16 text-center">
        <div className="mb-4 flex justify-center text-6xl text-primary-500"><FaLock /></div>
        <h2 className="text-2xl font-bold text-dark-700">Premium creator access required</h2>
        <p className="text-dark-500 mt-2">
          Paid creators can share channels and videos. Unpaid accounts can watch videos and earn rewards.
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn-primary mt-4"
        >
          View premium options
        </button>
      </div>
    );
  }

  return (
    <div className="container-custom py-8 max-w-3xl">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FaYoutube className="text-3xl" />
            Share a YouTube video
          </h1>
          <p className="text-primary-100 mt-1">
            Add a video from your YouTube channel for viewers to discover
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Video title *
            </label>
            <input
              type="text"
              name="videoTitle"
              value={formData.videoTitle}
              onChange={handleChange}
              required
              maxLength="200"
              className="input-field"
              placeholder="Enter video title"
            />
            <p className="text-xs text-dark-400 mt-1">
              {formData.videoTitle.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Description
            </label>
            <textarea
              name="videoDescription"
              value={formData.videoDescription}
              onChange={handleChange}
              rows="4"
              className="input-field"
              placeholder="Describe your video"
            />
          </div>

          {/* YouTube Video URL */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              YouTube video link *
            </label>
            <input
              type="text"
              name="youtubeVideoUrl"
              value={formData.youtubeVideoUrl}
              onChange={handleChange}
              required
              className="input-field"
              placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ"
            />
            <p className="text-xs text-dark-400 mt-1">
              Paste the public YouTube watch link for this video
            </p>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Thumbnail URL (detected automatically)
            </label>
            <input
              type="url"
              name="thumbnailUrl"
              value={formData.thumbnailUrl}
              readOnly
              className="input-field bg-dark-50"
              placeholder="Paste a YouTube link to detect the thumbnail"
            />
            <p className="text-xs text-dark-400 mt-1">
              Generated from the YouTube video ID{metadataError ? ` · ${metadataError}` : ''}
            </p>
          </div>

          {/* Category */}
          <div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div ref={playerContainerRef} className="absolute h-px w-px overflow-hidden opacity-0 pointer-events-none" aria-hidden="true" />

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input-field"
              placeholder="gaming, review, tutorial (comma separated)"
            />
            <p className="text-xs text-dark-400 mt-1">
              Separate tags with commas for better discoverability
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <FaInfoCircle className="text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Earnings Information</p>
                <p className="mt-1">
                  A view is counted only when a viewer watches the full video to the end. Creator revenue share starts at 65% and can increase up to 70%.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <FaSpinner className="animate-spin mr-2" />
                Sharing...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <FaShare className="mr-2" />
                Share video
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadVideo;