import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { channelService } from '../../services/api';
import { FaEdit, FaExternalLinkAlt, FaSave, FaSpinner, FaYoutube, FaSyncAlt, FaUsers } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Loader from '../Common/Loader';

const ChannelDetail = () => {
	const navigate = useNavigate();
	const [channel, setChannel] = useState(null);
	const [videos, setVideos] = useState([]);
	const [formData, setFormData] = useState({ channelName: '', channelDescription: '', channelLogo: '' });
	const [editing, setEditing] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		const loadChannel = async () => {
			try {
				const response = await channelService.getMyChannel();
				const { channel: savedChannel, videos: savedVideos } = response.data;
				setChannel(savedChannel);
				setVideos(savedVideos || []);
				setFormData({
					channelName: savedChannel.channelName || '',
					channelDescription: savedChannel.channelDescription || '',
					channelLogo: savedChannel.channelLogo || '',
				});
			} catch (error) {
				if (error.response?.status === 404) navigate('/channel/create');
			} finally {
				setLoading(false);
			}
		};

		loadChannel();
	}, [navigate]);

	const handleChange = (event) => {
		const { name, value } = event.target;
		setFormData((current) => ({ ...current, [name]: value }));
	};

	const saveChannel = async (event) => {
		event.preventDefault();
		setSaving(true);
		try {
			const response = await channelService.update(channel._id, formData);
			setChannel((current) => ({ ...current, ...response.data.channel }));
			setEditing(false);
			toast.success('Channel details updated.');
		} catch (error) {
			console.error('Channel update error:', error);
		} finally {
			setSaving(false);
		}
	};

	const refreshStats = async () => {
		setRefreshing(true);
		try {
			const response = await channelService.refreshStats(channel._id);
			setChannel((current) => ({ ...current, ...response.data.channel }));
			toast.success('YouTube channel statistics updated.');
		} catch (error) {
			console.error('Channel statistics error:', error);
		} finally {
			setRefreshing(false);
		}
	};

	if (loading) return <Loader text="Loading your channel..." />;
	if (!channel) return null;

	return (
		<div className="container-custom py-8">
			<div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Creator tools</p>
					<h1 className="mt-1 text-3xl font-bold text-dark-900">My channel</h1>
					<p className="mt-2 text-dark-600">Manage your shared YouTube channel and linked videos.</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<button type="button" onClick={refreshStats} disabled={refreshing} className="secondary-button inline-flex items-center gap-2">
						<FaSyncAlt className={refreshing ? 'animate-spin' : ''} /> Refresh stats
					</button>
					<a href={channel.youtubeChannelUrl} target="_blank" rel="noreferrer" className="secondary-button inline-flex items-center gap-2">
						View on YouTube <FaExternalLinkAlt className="text-xs" />
					</a>
					<a href={`${channel.youtubeChannelUrl}${channel.youtubeChannelUrl.includes('?') ? '&' : '?'}sub_confirmation=1`} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2">
						<FaUsers /> Subscribe on YouTube
					</a>
					<Link to="/share-video" className="btn-primary inline-flex items-center gap-2">
						<FaYoutube /> Share video
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<section className="card lg:col-span-3">
					<div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
						<div><p className="text-sm text-dark-500">Subscribers</p><p className="mt-1 text-2xl font-bold text-dark-900">{Number(channel.subscriberCount || 0).toLocaleString()}</p></div>
						<div><p className="text-sm text-dark-500">YouTube videos</p><p className="mt-1 text-2xl font-bold text-dark-900">{Number(channel.totalVideoCount || 0).toLocaleString()}</p></div>
						<div><p className="text-sm text-dark-500">YouTube views</p><p className="mt-1 text-2xl font-bold text-dark-900">{Number(channel.totalViews || 0).toLocaleString()}</p></div>
					</div>
				</section>
				<section className="card lg:col-span-1">
					<div className="flex items-center justify-between border-b border-dark-100 px-5 py-4">
						<h2 className="font-semibold text-dark-900">Channel details</h2>
						{!editing && <button type="button" onClick={() => setEditing(true)} className="text-primary-600 hover:text-primary-700" title="Edit channel"><FaEdit /></button>}
					</div>
					<form onSubmit={saveChannel} className="space-y-4 p-5">
						<div>
							<label className="mb-1 block text-sm font-medium text-dark-700">Channel name</label>
							<input name="channelName" value={formData.channelName} onChange={handleChange} disabled={!editing} required className="input-field disabled:bg-dark-50 disabled:text-dark-500" />
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium text-dark-700">Description</label>
							<textarea name="channelDescription" value={formData.channelDescription} onChange={handleChange} disabled={!editing} rows="5" className="input-field disabled:bg-dark-50 disabled:text-dark-500" />
						</div>
						{editing && <div className="flex gap-3"><button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">{saving ? <FaSpinner className="animate-spin" /> : <FaSave />} Save</button><button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button></div>}
					</form>
				</section>

				<section className="card lg:col-span-2">
					<div className="flex items-center justify-between border-b border-dark-100 px-5 py-4">
						<div><h2 className="font-semibold text-dark-900">Shared videos</h2><p className="mt-1 text-sm text-dark-500">{videos.length} video{videos.length === 1 ? '' : 's'} linked to this channel</p></div>
						<Link to="/videos" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View list</Link>
					</div>
					<div className="divide-y divide-dark-100">
						{videos.length === 0 ? <div className="p-8 text-center"><p className="text-sm text-dark-500">No videos shared yet.</p><Link to="/share-video" className="mt-4 inline-flex btn-primary">Share your first video</Link></div> : videos.map((video) => (
							<Link key={video._id} to={`/video/${video._id}`} className="flex items-center justify-between gap-4 p-5 transition hover:bg-dark-50">
								<div className="min-w-0"><p className="truncate font-semibold text-dark-800">{video.videoTitle}</p><p className="mt-1 text-sm text-dark-500">{video.views || 0} views · {video.status}</p></div>
								<FaExternalLinkAlt className="shrink-0 text-sm text-dark-400" />
							</Link>
						))}
					</div>
				</section>
			</div>
		</div>
	);
};

export default ChannelDetail;
