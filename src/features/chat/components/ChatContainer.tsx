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

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Square, User, Bot, ThumbsUp, ThumbsDown, RotateCcw, Copy, ClipboardCopy, Check, Filter, Mic, Paperclip, FileText, Loader2, X } from 'lucide-react';
import { Message, Citation, SessionAttachment } from '../../../api/types';
import { gatewayClient } from '../../../api/gateway-client';
import { CONFIG } from '../../../app/config';
import { useKnowledgeBase } from '../../../app/providers/KnowledgeBaseProvider';
import { MetadataFilterManager } from '../../metadata/components/MetadataFilter';
import { useMetadataFilters } from '../../metadata/hooks/useMetadataFilters';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VoiceInputButton } from './VoiceInputButton';
import { chatStore } from '../chatStore';
import './Chat.css';

export const ChatContainer: React.FC = () => {
  const { t } = useTranslation();
  const { selectedKbIds } = useKnowledgeBase();
  const { messages, isLoading, forcedRouting } = useSyncExternalStore(
    chatStore.subscribe,
    chatStore.getSnapshot,
    chatStore.getSnapshot
  );
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<{
    messageId: string;
    action: 'query' | 'response' | 'qa';
  } | null>(null);
  const copyResetRef = useRef<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sttLanguage, setSttLanguage] = useState<'en' | 'it'>('en');
  const { 
    filters: activeFilters, 
    mode: filterMode, 
    updateFilters, 
    setFilterMode,
    activeCount 
  } = useMetadataFilters();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Candidate-list qualification state (agent mode) ---
  // A chat session is created lazily when the first candidate list is
  // uploaded; from then on chat messages run through the gateway's
  // bounded tool-calling agent loop for this session.
  const [candidateSessionId, setCandidateSessionId] = useState<string | null>(null);
  const [candidateAttachment, setCandidateAttachment] = useState<SessionAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => () => {
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
    }
  }, []);

  const handleSend = async (messageOverride?: string) => {
    const text = messageOverride || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    if (!messageOverride) setInput('');
    const controller = chatStore.startRequest(userMessage);

    try {
      const response = await gatewayClient.sendChatMessage(
        selectedKbIds, 
        userMessage.content, 
        activeFilters.length > 0 ? activeFilters : undefined,
        filterMode,
        controller.signal,
        // Agent mode: active when a candidate session exists. The gateway
        // runs the bounded tool-calling agent loop for this session.
        candidateSessionId && candidateAttachment
          ? { sessionId: candidateSessionId, attachmentIds: [candidateAttachment.attachment_id] }
          : undefined,
        forcedRouting
      );
      chatStore.appendMessage({ ...response, feedback: null });
    } catch (error: unknown) {
      const err = error as Error;
      if (err?.name === 'AbortError') {
        // User interrupted the request
        const interruptedMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t('chat.interrupted'),
          timestamp: new Date().toISOString(),
          feedback: null,
        };
        chatStore.appendMessage(interruptedMessage);
      } else {
        console.error('Failed to send message:', error);
        
        let errorText = 'The Gateway is not reachable.';
        if (error instanceof Error && error.message) {
          errorText = error.message;
        } else if (typeof error === 'string') {
          errorText = error;
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${errorText}`,
          timestamp: new Date().toISOString(),
          feedback: null,
        };
        chatStore.appendMessage(assistantMessage);
      }
    } finally {
      chatStore.finishRequest(controller);
    }
  };

  const handleStop = useCallback(() => {
    chatStore.abort();
  }, []);

  // --- Candidate-list upload + qualification ---

  const addSystemMessage = (content: string) => {
    chatStore.appendMessage({
      id: (Date.now() + Math.random()).toString(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      feedback: null,
    });
  };

  const handleCandidateFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file || isUploading) return;

    setIsUploading(true);
    try {
      // Sessions are implicit: the client generates the session ID and the
      // first attachment upload creates it server-side (same convention as
      // the CRM acceptance flow).
      const sessionId = candidateSessionId ?? crypto.randomUUID();
      if (!candidateSessionId) setCandidateSessionId(sessionId);

      const attachment = await gatewayClient.uploadSessionAttachment(sessionId, file);
      setCandidateAttachment(attachment);
      addSystemMessage(
        t('chat.candidate_uploaded', {
          filename: attachment.original_filename,
          id: attachment.attachment_id,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      addSystemMessage(`Error: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCandidateList = () => {
    setCandidateAttachment(null);
  };

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
    chatStore.updateMessages(prev =>
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

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
      } catch {
        return false;
      }
    }
  }, []);

  const copyWithFeedback = useCallback(async (
    text: string,
    messageId: string,
    action: 'query' | 'response' | 'qa'
  ) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied({ messageId, action });
    if (copyResetRef.current !== null) {
      window.clearTimeout(copyResetRef.current);
    }
    copyResetRef.current = window.setTimeout(() => {
      setCopied(null);
      copyResetRef.current = null;
    }, 1800);
  }, [copyToClipboard]);

  const getPrecedingQuery = useCallback((msgIndex: number): string | null => {
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return null;
  }, [messages]);

  const formatCitations = useCallback((citations?: Citation[]): string => {
    if (!citations || citations.length === 0) return '';
    const lines = citations.map((cite) => {
      const page = cite.page ? ` — Page ${cite.page}` : '';
      return `[${cite.id}] ${cite.filename}${page}`;
    });
    return `\n\nSources:\n${lines.join('\n')}`;
  }, []);

  const hasUserMessages = messages.some(msg => msg.role === 'user');

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="chat-header-info">
          <h1>{t('chat.title')}</h1>
          <p className="chat-header-subtitle">{t('chat.subtitle')}</p>
        </div>
        <div className="chat-header-actions">
          <span className="routing-override-caption" aria-hidden="true">
            {t('chat.routing_override_label')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={forcedRouting}
            aria-label={t('chat.routing_override_tooltip')}
            title={t('chat.routing_override_tooltip')}
            className={`routing-override${forcedRouting ? ' active' : ''}`}
            onClick={() => chatStore.setForcedRouting(!forcedRouting)}
          >
            <span className="routing-override-knob" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="message-list" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <h2>{t('chat.welcome')}</h2>
            <p>{t('chat.empty_state')}</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={msg.id} className={`message-item ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="message-content">
                <div className="message-text markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="citations-list">
                    {msg.citations.map((cite) => (
                      <button
                        key={cite.id}
                        className="citation-tag"
                        title={cite.text}
                        onClick={() => {
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>[${cite.id}] ${cite.filename}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.7; color: #e2e8f0; background: #0f172a; }
  h1 { font-size: 1.25rem; color: #94a3b8; border-bottom: 1px solid #334155; padding-bottom: 0.75rem; }
  pre { white-space: pre-wrap; word-wrap: break-word; background: #1e293b; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; font-size: 0.9rem; }
  a { color: #60a5fa; }
</style>
</head><body>
<h1>[${cite.id}] ${cite.filename}${cite.page ? ` — Page ${cite.page}` : ''}</h1>
${cite.source_url ? `<p><a href="${cite.source_url}" target="_blank" rel="noopener noreferrer">View original source page</a></p>` : ''}
<pre>${cite.text?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || 'No text available.'}</pre>
</body></html>`);
                            win.document.close();
                          }
                        }}
                      >
                        [{cite.id}] {cite.filename}
                      </button>
                    ))}
                  </div>
                )}
                <div className="message-footer">
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="message-actions">
                    {msg.role === 'user' && (
                      <button
                        className={`action-btn copy-btn${
                          copied?.messageId === msg.id &&
                          copied.action === 'query' ? ' copied' : ''
                        }`}
                        onClick={() => { void copyWithFeedback(
                          msg.content, msg.id, 'query'); }}
                        title={
                          copied?.messageId === msg.id &&
                          copied.action === 'query'
                            ? t('chat.copied')
                            : t('chat.copy_query')
                        }
                      >
                        {copied?.messageId === msg.id &&
                        copied.action === 'query'
                          ? <Check size={14} />
                          : <Copy size={14} />}
                      </button>
                    )}
                    {msg.role === 'assistant' && (
                      <>
                        <button
                          className={`action-btn copy-btn${
                            copied?.messageId === msg.id &&
                            copied.action === 'response' ? ' copied' : ''
                          }`}
                          onClick={() => { void copyWithFeedback(
                            msg.content + formatCitations(msg.citations),
                            msg.id, 'response'); }}
                          title={
                            copied?.messageId === msg.id &&
                            copied.action === 'response'
                              ? t('chat.copied')
                              : t('chat.copy_response')
                          }
                        >
                          {copied?.messageId === msg.id &&
                          copied.action === 'response'
                            ? <Check size={14} />
                            : <Copy size={14} />}
                        </button>
                        <button
                          className={`action-btn copy-btn${
                            copied?.messageId === msg.id &&
                            copied.action === 'qa' ? ' copied' : ''
                          }`}
                          onClick={() => {
                            const query = getPrecedingQuery(index);
                            const answer = msg.content + formatCitations(msg.citations);
                            const text = query
                              ? `Q: ${query}\n\nA: ${answer}`
                              : answer;
                            void copyWithFeedback(text, msg.id, 'qa');
                          }}
                          title={
                            copied?.messageId === msg.id &&
                            copied.action === 'qa'
                              ? t('chat.copied')
                              : t('chat.copy_qa')
                          }
                        >
                          {copied?.messageId === msg.id &&
                          copied.action === 'qa'
                            ? <Check size={14} />
                            : <ClipboardCopy size={14} />}
                        </button>
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
                      </>
                    )}
                  </div>
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
        {candidateAttachment && (
          <div className="candidate-panel">
            <div className="candidate-panel-header">
              <FileText size={16} />
              <span className="candidate-panel-title">
                {candidateAttachment.original_filename}
              </span>
              <button
                className="candidate-panel-close"
                onClick={handleRemoveCandidateList}
                title={t('chat.candidate_remove')}
              >
                <X size={14} />
              </button>
            </div>
            <div className="candidate-panel-body">
              <span className="candidate-panel-id">
                {t('chat.candidate_session')}: {candidateSessionId?.slice(0, 12)}…
              </span>
            </div>
          </div>
        )}
        <div className="composer-container">
          <button 
            className={`composer-action ${showFilters ? 'active' : ''}`} 
            title={t('chat.filters')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.xlsx,.pdf"
            style={{ display: 'none' }}
            onChange={handleCandidateFileSelected}
          />
          <button 
            className={`composer-action ${candidateAttachment ? 'active' : ''}`}
            title={t('chat.attachment')}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 size={20} className="spin" /> : <Paperclip size={20} />}
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
            rows={4}
          />

          <VoiceInputButton 
            gatewayBaseUrl={CONFIG.GATEWAY_BASE_URL}
            language={sttLanguage}
            onTranscript={(text) => {
              setInput(current => {
                const currentTrimmed = current.trim();
                const transcriptTrimmed = text.trim();

                if (!transcriptTrimmed) return current;
                if (!currentTrimmed) return transcriptTrimmed;

                return `${currentTrimmed} ${transcriptTrimmed}`;
              });
            }}
            disabled={isLoading}
          />

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

        <div className="mode-selector-container" style={{ justifyContent: 'space-between' }}>
          <div className="mode-selector">
            <button 
              className={`mode-btn ${filterMode === 'soft' ? 'active' : ''}`}
              onClick={() => setFilterMode('soft')}
              title={t('metadata.mode_soft')}
              disabled={activeCount === 0}
            >
              {t('metadata.mode_soft')}
            </button>
            <button 
              className={`mode-btn ${filterMode === 'hard' ? 'active' : ''}`}
              onClick={() => setFilterMode('hard')}
              title={t('metadata.mode_hard')}
              disabled={activeCount === 0}
            >
              {t('metadata.mode_hard')}
            </button>
          </div>
          <div className="mode-selector" title="Dictation Language">
            <button 
              className={`mode-btn ${sttLanguage === 'en' ? 'active' : ''}`}
              onClick={() => setSttLanguage('en')}
              title="English Dictation"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Mic size={14} /> EN
            </button>
            <button 
              className={`mode-btn ${sttLanguage === 'it' ? 'active' : ''}`}
              onClick={() => setSttLanguage('it')}
              title="Italian Dictation"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Mic size={14} /> ITA
            </button>
          </div>
        </div>

        <div className="input-footer">
          <div className="filter-status-indicator">
            {activeCount > 0 ? (
              <span className={`status-badge ${filterMode}`}>
                <Filter size={12} />
                {activeCount} filters active ({filterMode === 'soft' ? 'Ranking Hints' : 'Strict Matching'})
              </span>
            ) : (
              <span className="status-badge inactive">No metadata filters</span>
            )}
          </div>
          <p className="input-hint">{t('chat.input_hint')}</p>
        </div>
        {showFilters && (
          <div className="chat-filters-panel">
            <MetadataFilterManager 
              onFilterChange={updateFilters}
              initialFilters={activeFilters}
              initialMode={filterMode}
              hideMode={true}
            />
          </div>
        )}

        <p className="chat-disclaimer">{t('chat.disclaimer')}</p>
      </div>
    </div>
  );
};
