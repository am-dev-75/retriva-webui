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

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, User, Bot, Paperclip, Mic } from 'lucide-react';
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await gatewayClient.sendChatMessage(selectedKbIds, userMessage.content);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Fallback mock if gateway fails
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `This is a mock response because the Gateway is not reachable. I'm searching across ${selectedKbIds.length} Knowledge Base(s): ${selectedKbIds.join(', ')}.`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

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
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                handleSend();
              }
            }}
            rows={1}
          />

          {CONFIG.ENABLE_SPEECH_INPUT && (
            <button className="composer-action speech-btn" title={t('chat.voice_input')} disabled>
              <Mic size={20} />
            </button>
          )}

          <button 
            className="btn-send" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
        <p className="input-hint">{t('chat.input_hint')}</p>
      </div>
    </div>
  );
};
