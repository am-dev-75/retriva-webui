/*
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContainer } from './ChatContainer';
import { chatStore } from '../chatStore';
import i18n from '../../../app/i18n';

vi.mock('../../../api/gateway-client', () => ({
  gatewayClient: {
    sendChatMessage: vi.fn().mockResolvedValue({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Answer text',
      timestamp: new Date().toISOString(),
      feedback: null,
    }),
    uploadSessionAttachment: vi.fn(),
  },
}));

vi.mock('../../../app/providers/KnowledgeBaseProvider', () => ({
  useKnowledgeBase: () => ({ selectedKbIds: ['default'] }),
}));

describe('ChatContainer company-brain copy in both locales', () => {
  beforeEach(async () => {
    chatStore.reset();
    await i18n.changeLanguage('it');
  });

  it('renders the Italian subtitle and the forced-routing switch', async () => {
    render(<ChatContainer />);
    expect(screen.getByText(
      'Interagisci con il tuo company brain usando il linguaggio naturale.'
    )).toBeInTheDocument();
    expect(screen.getByRole('switch', {
      name: 'Interroga direttamente il database aziendale (routing forzato)',
    })).toBeInTheDocument();
  });

  it('renders the English subtitle and the forced-routing switch', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    render(<ChatContainer />);
    expect(screen.getByText(
      'Interact with your company brain using natural language.'
    )).toBeInTheDocument();
    expect(screen.getByRole('switch', {
      name: 'Query the company database directly (forced routing)',
    })).toBeInTheDocument();
  });
});
