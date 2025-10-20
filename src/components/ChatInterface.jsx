import React, { useState } from 'react';
import { useChatContext } from '../context/ChatContext';
import { chatAPI } from '../api/apiClient';
import MessageList from './MessageList';
import InputBox from './InputBox';
import DocumentUpload from './DocumentUpload';
import { AlertCircle, X, Loader2, Activity } from 'lucide-react';

const ChatInterface = () => {
  const {
    messages,
    sessionId,
    isLoading,
    setIsLoading,
    error,
    setError,
    addMessage,
    addStreamingMessage,
    appendToStreamingMessage,
    finalizeStreamingMessage,
  } = useChatContext();

  const [currentProgress, setCurrentProgress] = useState(null);
  const [useStreaming] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  const handleSendMessage = async (message) => {
    if (!sessionId) {
      setError('Session not initialized. Please refresh the page.');
      return;
    }

    console.log('Sending message with session ID:', sessionId);

    addMessage('user', message);
    setIsLoading(true);
    setError(null);
    setCurrentProgress(null);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (useStreaming) {
        const assistantMessageId = addStreamingMessage('assistant', '');

        await chatAPI.sendMessageStream(message, conversationHistory, sessionId, {
          onProgress: (data) => {
            setCurrentProgress(data.message);
            console.log('Progress:', data.message);
          },
          onToken: (token) => {
            appendToStreamingMessage(assistantMessageId, token);
          },
          onComplete: (data) => {
            console.log('Complete:', data);
            finalizeStreamingMessage(assistantMessageId, data.sources || []);
            setCurrentProgress(null);
            setIsLoading(false);
          },
          onError: (errorMsg) => {
            console.error('Stream error:', errorMsg);
            setError(errorMsg);
            finalizeStreamingMessage(assistantMessageId, []);
            setIsLoading(false);
          },
        });
      } else {
        const response = await chatAPI.sendMessage(message, conversationHistory, sessionId);
        console.log('Chat response:', response);
        console.log('Route taken:', response.route_taken);

        addMessage('assistant', response.answer, response.sources);
        setIsLoading(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to get response';
      console.error('Send message error:', error);
      setError(errorMsg);
      addMessage('assistant', `Error: ${errorMsg}`);
      setIsLoading(false);
    }
  };

  return (
  <div className="flex h-full bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
    {/* Vertical Toggle Strip - Mobile Only */}
    <div className="lg:hidden w-12 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 flex-shrink-0">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? (
          <X className="w-6 h-6 text-gray-300" />
        ) : (
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
    </div>

    {/* Overlay - Mobile Only */}
    {isSidebarOpen && (
      <div 
        className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setIsSidebarOpen(false)}
      />
    )}

    {/* Sidebar - Document Upload */}
    <div className={`
      fixed lg:static top-0 bottom-0 z-50
      w-80 bg-white dark:bg-gray-800 
      border-r border-gray-200 dark:border-gray-700 
      overflow-y-auto shadow-xl flex flex-col
      transform transition-transform duration-300 ease-in-out
      ${isSidebarOpen ? 'translate-x-12' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Document Upload
            </h2>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <DocumentUpload />
      </div>

      {/* Session Info */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
          Session: {sessionId?.substring(0, 20)}...
        </p>
      </div>
    </div>

    {/* Main Chat Area - Flex column to fill height */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator - PRESERVED AND ENHANCED */}
      {currentProgress && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold truncate">
                {currentProgress}
              </p>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-1 mt-1.5">
                <div className="bg-blue-600 dark:bg-blue-400 h-1 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area - Scrollable, takes remaining space */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <MessageList />
      </div>

      {/* Input Box - Fixed at bottom, always visible */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl flex-shrink-0">
        <InputBox onSendMessage={handleSendMessage} />
      </div>
    </div>
  </div>
);

};

export default ChatInterface;
