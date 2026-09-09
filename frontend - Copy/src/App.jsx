import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import VideoList from './components/Videos/VideoList';
import VideoPlayer from './components/Videos/VideoPlayer';
import UploadVideo from './components/Videos/UploadVideo';
import CreateChannel from './components/Channels/CreateChannel';
import ChannelDetail from './components/Channels/ChannelDetail';
import Dashboard from './components/Dashboard/Dashboard';
import Earnings from './components/Dashboard/Earnings';
import Wallet from './components/Dashboard/Wallet';
import Loader from './components/Common/Loader';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader />;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppLayout = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-dark-50">
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#fff', color: '#1e293b' } }} />
      <Navbar />
      <main className={isAuthenticated ? 'pt-16 md:ml-64 md:pt-0' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/videos" element={<PrivateRoute><VideoList /></PrivateRoute>} />
          <Route path="/video/:id" element={<PrivateRoute><VideoPlayer /></PrivateRoute>} />
          <Route path="/upload" element={<PrivateRoute><UploadVideo /></PrivateRoute>} />
          <Route path="/share-video" element={<PrivateRoute><UploadVideo /></PrivateRoute>} />
          <Route path="/channel/create" element={<PrivateRoute><CreateChannel /></PrivateRoute>} />
          <Route path="/my-channel" element={<PrivateRoute><ChannelDetail /></PrivateRoute>} />
          <Route path="/earnings" element={<PrivateRoute><Earnings /></PrivateRoute>} />
          <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => (
  <Router>
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  </Router>
);

export default App;
