import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import AuthPage from './components/AuthPage';
import Workspace from './components/Workspace';

function AppInner() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#4A154B', color: '#fff', fontSize: 18
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <SocketProvider>
      <Workspace />
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
