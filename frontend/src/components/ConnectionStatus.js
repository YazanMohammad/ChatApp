import React, { useState, useEffect } from 'react';
import signalRService from '../services/signalRService';

const ConnectionStatus = () => {
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    connectionState: 'Disconnected'
  });

  useEffect(() => {
    const updateConnectionState = () => {
      setConnectionState(signalRService.getConnectionState());
    };

    // Update connection state every second
    const interval = setInterval(updateConnectionState, 1000);

    // Initial update
    updateConnectionState();

    return () => clearInterval(interval);
  }, []);

  const getStatusClass = () => {
    if (connectionState.isConnected) return 'status-connected';
    if (connectionState.connectionState === 'Connecting' ||
        connectionState.connectionState === 'Reconnecting') {
      return 'status-connecting';
    }
    return 'status-disconnected';
  };

  const getStatusText = () => {
    if (connectionState.isConnected) return 'Connected';
    if (connectionState.connectionState === 'Connecting') return 'Connecting...';
    if (connectionState.connectionState === 'Reconnecting') return 'Reconnecting...';
    return 'Disconnected';
  };

  return (
    <div className="connection-status">
      <div className={`status-indicator ${getStatusClass()}`}></div>
      <span>{getStatusText()}</span>
    </div>
  );
};

export default ConnectionStatus;
