/**
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Square, User, Bot, Paperclip, Mic, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { Message } from '../../../api/types';
import { gatewayClient } from '../../../api/gateway-client';
import { CONFIG } from '../../../app/config';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import './Chat.css';

export const ChatContainer: React.FC = () => {
  const { t } = useTranslation();
  const { selectedKbIds } = useKnowledgeBase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (messageOverride?: string) => {
    const text = messageOverride || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageOverride) setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await gatewayClient.sendChatMessage(selectedKbIds, userMessage.content, controller.signal);
      setMessages(prev => [...prev, { ...response, feedback: null }]);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // User interrupted the request
        const interruptedMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('chat.interrupted'),
          timestamp: new Date().toISOString(),
          feedback: null,
        };
        setMessages(prev => [...prev, interruptedMessage]);
      } else {
        console.error('Failed to send message:', error);
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `This is a mock response because the Gateway is not reachable. I'm searching across ${selectedKbIds.length} Knowledge Base(s): ${selectedKbIds.join(', ')}.`,
          timestamp: new Date().toISOString(),
          feedback: null,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleRepeatLast = useCallback(() => {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        handleSend(messages[i].content);
        return;
      }
    }
  }, [messages, selectedKbIds]);

  const handleFeedback = useCallback((messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id !== messageId) return msg;
        // Toggle: if the same feedback is clicked again, remove it
        const newFeedback = msg.feedback === feedback ? null : feedback;
        return { ...msg, feedback: newFeedback };
      })
    );
    // TODO: Send feedback to Gateway for future analytics
    // gatewayClient.sendFeedback(messageId, feedback);
  }, []);

  const hasUserMessages = messages.some(msg => msg.role === 'user');

  return (
    <div className="chat-container">
      <div className="message-list" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <h2>{t('chat.welcome')}</h2>
            <p>{t('chat.empty_state')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message-item ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="message-content">
                <div className="message-text">{msg.content}</div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="citations-list">
                    {msg.citations.map((cite) => (
                      <span key={cite.id} className="citation-tag" title={cite.text}>
                        [{cite.id}] {cite.filename}
                      </span>
                    ))}
                  </div>
                )}
                <div className="message-footer">
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="message-actions">
                      <button
                        className={`action-btn feedback-btn ${msg.feedback === 'positive' ? 'active positive' : ''}`}
                        onClick={() => handleFeedback(msg.id, 'positive')}
                        title={t('chat.feedback_positive')}
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        className={`action-btn feedback-btn ${msg.feedback === 'negative' ? 'active negative' : ''}`}
                        onClick={() => handleFeedback(msg.id, 'negative')}
                        title={t('chat.feedback_negative')}
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message-item assistant loading">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-area">
        <div className="composer-container">
          <button className="composer-action" title={t('chat.attachment')}>
            <Paperclip size={20} />
          </button>
          
          <textarea
            className="composer-textarea"
            placeholder={t('chat.placeholder')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isLoading) {
                  handleStop();
                } else {
                  handleSend();
                }
              }
            }}
            rows={1}
          />

          {CONFIG.ENABLE_SPEECH_INPUT && (
            <button className="composer-action speech-btn" title={t('chat.voice_input')} disabled>
              <Mic size={20} />
            </button>
          )}

          {!isLoading && hasUserMessages && (
            <button
              className="composer-action repeat-btn"
              onClick={() => handleRepeatLast()}
              title={t('chat.repeat')}
            >
              <RotateCcw size={18} />
            </button>
          )}

          {isLoading ? (
            <button
              className="btn-send stop"
              onClick={handleStop}
              title={t('chat.stop')}
            >
              <Square size={16} />
            </button>
          ) : (
            <button 
              className="btn-send" 
              onClick={() => handleSend()}
              disabled={!input.trim()}
            >
              <Send size={20} />
            </button>
          )}
        </div>
        <p className="input-hint">{t('chat.input_hint')}</p>
      </div>
    </div>
  );
};
