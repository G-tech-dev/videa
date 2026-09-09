import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { channelService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaYoutube, FaLink, FaSpinner, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const extractChannelId = (value) => {
	const trimmed = value.trim();
	if (/^UC[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
	const match = trimmed.match(/youtube\.com\/(?:channel\/|c\/|@)?([a-zA-Z0-9_@-]+)/i);
	return match?.[1] || '';
};

const CreateChannel = () => {
	const navigate = useNavigate();
	const { isPremiumCreator } = useAuth();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({ channelName: '', channelDescription: '', youtubeChannelUrl: '' });

	if (!isPremiumCreator) {
		return (
			<div className="container-custom py-16 text-center">
				<div className="mb-4 flex justify-center text-6xl text-primary-500"><FaLock /></div>
				<h2 className="text-2xl font-bold text-dark-700">Premium creator access required</h2>
				<p className="mt-2 text-dark-500">Upgrade to share a channel. Unpaid accounts can still watch videos and earn rewards.</p>
				<button type="button" onClick={() => navigate('/dashboard')} className="btn-primary mt-4">View premium options</button>
			</div>
		);
	}

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((current) => ({ ...current, [name]: value }));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		const youtubeChannelId = extractChannelId(formData.youtubeChannelUrl);
		if (!youtubeChannelId) {
			toast.error('Use a YouTube channel URL containing its UC channel ID.');
			return;
		}

		setLoading(true);
		try {
			await channelService.create({ ...formData, youtubeChannelId });
			toast.success('YouTube channel shared successfully!');
			navigate('/share-video');
		} catch (error) {
			console.error('Channel sharing error:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container-custom py-8 max-w-3xl">
			<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
				<div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
					<h1 className="text-2xl font-bold flex items-center gap-2"><FaYoutube className="text-3xl" />Share your YouTube channel</h1>
					<p className="text-primary-100 mt-1">Let viewers find your channel and its videos.</p>
				</div>
				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					<div>
						<label className="block text-sm font-medium text-dark-700 mb-1">Channel name *</label>
						<input name="channelName" value={formData.channelName} onChange={handleChange} required maxLength="100" className="input-field" placeholder="Your YouTube channel name" />
					</div>
					<div>
						<label className="block text-sm font-medium text-dark-700 mb-1">YouTube channel URL *</label>
						<div className="relative"><FaLink className="absolute left-3 top-3.5 text-dark-400" /><input name="youtubeChannelUrl" value={formData.youtubeChannelUrl} onChange={handleChange} required type="url" className="input-field pl-10" placeholder="https://www.youtube.com/channel/UC..." /></div>
						<p className="text-xs text-dark-400 mt-1">Use the channel URL from YouTube so videos can be linked to the right creator.</p>
					</div>
					<div>
						<label className="block text-sm font-medium text-dark-700 mb-1">About this channel</label>
						<textarea name="channelDescription" value={formData.channelDescription} onChange={handleChange} rows="4" maxLength="500" className="input-field" placeholder="What can viewers expect?" />
					</div>
					<button type="submit" disabled={loading} className="w-full btn-primary py-3 disabled:opacity-50">{loading ? <><FaSpinner className="inline mr-2 animate-spin" />Sharing...</> : 'Share channel'}</button>
				</form>
			</div>
		</div>
	);
};

export default CreateChannel;
