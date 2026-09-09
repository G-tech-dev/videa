const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  app,
  User,
  Channel,
  Video,
  WatchHistory,
  WatchSession,
  WalletTransaction
} = require('../server');

let mongo;

const createViewer = async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const response = await request(app)
    .post('/api/auth/register')
    .set('User-Agent', 'Mozilla/5.0')
    .send({ username: `test${suffix}`, email: `test${suffix}@example.com`, password: 'testpass123', role: 'viewer' });
  assert.equal(response.status, 201);
  return response.body;
};

const createVideo = async (userId, duration = 120) => {
  const channel = await Channel.create({
    user: userId,
    channelName: `Test channel ${userId}`,
    youtubeChannelId: `UC${userId.toString().slice(-20)}`,
    youtubeChannelUrl: 'https://youtube.com/channel/test'
  });
  const video = await Video.create({
    channel: channel._id,
    user: userId,
    videoTitle: 'Test video',
    youtubeVideoId: `video-${userId}-${Date.now()}`,
    youtubeVideoUrl: 'https://youtube.com/watch?v=test',
    duration,
    status: 'active'
  });
  return { channel, video };
};

const watch = (token, videoId, body = {}) => request(app)
  .post('/api/watch/track')
  .set('Authorization', `Bearer ${token}`)
  .set('User-Agent', 'Mozilla/5.0')
  .send({ videoId, watchTime: 10, completed: false, deviceInfo: 'test-browser', ...body });

const moveHeartbeatBack = async (userId, videoId, seconds = 10) => {
  await WatchSession.updateOne({ user: userId, video: videoId }, { $set: { lastHeartbeat: new Date(Date.now() - seconds * 1000) } });
};

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

test.beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Channel.deleteMany({}), Video.deleteMany({}), WatchHistory.deleteMany({}), WatchSession.deleteMany({}), WalletTransaction.deleteMany({})]);
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('counts one view after at least 45 server-verified seconds', async () => {
  const auth = await createViewer();
  const { video } = await createVideo(auth.user.id);
  await watch(auth.token, video._id, { watchTime: 10 });

  for (let index = 0; index < 5; index += 1) {
    await moveHeartbeatBack(auth.user.id, video._id);
    const response = await watch(auth.token, video._id, { watchTime: 10 });
    assert.equal(response.status, 200);
  }

  const savedVideo = await Video.findById(video._id);
  const history = await WatchHistory.findOne({ user: auth.user.id, video: video._id });
  assert.equal(savedVideo.views, 1);
  assert.equal(history.completed, true);
  assert.equal(history.watchTime >= 45, true);
});

test('duplicate reward requests create one transaction and one balance increase', async () => {
  const auth = await createViewer();
  const { channel, video } = await createVideo(auth.user.id);
  await WatchSession.create({ user: auth.user.id, video: video._id, channel: channel._id, lastHeartbeat: new Date(Date.now() - 10 * 1000) });
  await WatchHistory.create({ user: auth.user.id, video: video._id, channel: channel._id, rewardRemainderSeconds: 59 });

  const key = 'duplicate-reward-test';
  const first = await watch(auth.token, video._id, { watchTime: 10, idempotencyKey: key });
  const second = await watch(auth.token, video._id, { watchTime: 10, idempotencyKey: key });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);

  const user = await User.findById(auth.user.id);
  const transactions = await WalletTransaction.find({ user: auth.user.id, type: 'reward' });
  assert.equal(user.walletBalance, 1);
  assert.equal(transactions.length, 1);
});

test('rejects bot watch requests before changing watch state', async () => {
  const auth = await createViewer();
  const { video } = await createVideo(auth.user.id);
  const response = await request(app)
    .post('/api/watch/track')
    .set('Authorization', `Bearer ${auth.token}`)
    .set('User-Agent', 'curl/8.0')
    .send({ videoId: video._id, watchTime: 60 });
  assert.equal(response.status, 403);
  assert.equal(await WatchSession.countDocuments({ user: auth.user.id }), 0);
});

test('increases wallet balance only when a whole RWF reward is earned', async () => {
  const auth = await createViewer();
  const { channel, video } = await createVideo(auth.user.id);
  await WatchSession.create({ user: auth.user.id, video: video._id, channel: channel._id, lastHeartbeat: new Date(Date.now() - 10 * 1000) });
  await WatchHistory.create({ user: auth.user.id, video: video._id, channel: channel._id, rewardRemainderSeconds: 59 });
  const response = await watch(auth.token, video._id, { watchTime: 10 });
  assert.equal(response.body.data.viewerEarnings, 1);
  const user = await User.findById(auth.user.id);
  assert.equal(user.walletBalance, 1);
  assert.equal(await WalletTransaction.countDocuments({ user: auth.user.id, type: 'reward' }), 1);
});

test('prevents pending withdrawals from exceeding available balance', async () => {
  const auth = await createViewer();
  await User.findByIdAndUpdate(auth.user.id, { walletBalance: 100 });
  await request(app).put('/api/wallet/details').set('Authorization', `Bearer ${auth.token}`).send({ registeredName: 'Test User', phoneNumber: '0780000000', provider: 'mtn' });
  const first = await request(app).post('/api/wallet/withdraw').set('Authorization', `Bearer ${auth.token}`).send({ amount: 80 });
  const second = await request(app).post('/api/wallet/withdraw').set('Authorization', `Bearer ${auth.token}`).send({ amount: 30 });
  assert.equal(first.status, 200);
  assert.equal(second.status, 400);
  assert.equal(await WalletTransaction.countDocuments({ user: auth.user.id, type: 'withdrawal', status: 'pending' }), 1);
});
