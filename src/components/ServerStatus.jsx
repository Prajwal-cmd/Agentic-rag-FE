import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const ServerStatus = ({ onReady }) => {
  const [status, setStatus] = useState('checking');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    const checkServer = async () => {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${API_URL}/warmup`, {
          method: 'GET',
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.ok) {
          const elapsed = Date.now() - startTime;
          console.log(`Server ready in ${elapsed}ms`);
          setStatus('ready');
          setTimeout(() => onReady(), 500);
        } else {
          throw new Error('Server not ready');
        }
      } catch (error) {
        console.error('Server warmup failed:', error);
        setTimeout(checkServer, 2000);
      }
    };

    checkServer();

    return () => clearInterval(dotsInterval);
  }, [onReady]);

  if (status === 'ready') return null;

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          Waking up the server{dots}
        </h2>
        <p className="text-gray-400 text-sm max-w-md">
          The server is starting up (cold start). This usually takes 10-30 seconds on first load.
        </p>
      </div>
    </div>
  );
};

export default ServerStatus;
