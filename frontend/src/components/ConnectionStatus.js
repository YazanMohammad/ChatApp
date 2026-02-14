import React, { useState, useEffect } from 'react';
import signalRService from '../services/signalRService';

const ConnectionStatus = () => {
  const [state, setState] = useState({ isConnected: false, connectionState: 'Disconnected' });

  useEffect(() => {
    const update = () => setState(signalRService.getConnectionState());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusClass = state.isConnected
    ? 'status-connected'
    : ['Connecting', 'Reconnecting'].includes(state.connectionState)
      ? 'status-connecting'
      : 'status-disconnected';

  const statusText = state.isConnected
    ? 'Connected'
    : state.connectionState === 'Connecting'
      ? 'Connecting…'
      : state.connectionState === 'Reconnecting'
        ? 'Reconnecting…'
        : 'Disconnected';

  return (
    <div className="connection-status">
      <div className={`status-indicator ${statusClass}`} />
      <span>{statusText}</span>
    </div>
  );
};

export default ConnectionStatus;
