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
    // Fixed overlay modal - blocks everything underneath
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 border-2 border-blue-500 dark:border-blue-400">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Animated Loader */}
          <div className="relative">
            <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-pulse"></div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Starting Server{dots}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Please wait while we initialize the system
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 w-full border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🚀 <strong>Cold Start Detected</strong>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              The server is starting up (cold start). This usually takes 10-30 seconds on first load.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStatus;
