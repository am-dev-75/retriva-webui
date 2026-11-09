/*
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 * Licensed under the Apache License, Version 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { ChatContainer } from '../../features/chat/components/ChatContainer';
import { chatStore } from '../../features/chat/chatStore';

const sendChatMessage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark' }),
}));
vi.mock('../providers/KnowledgeBaseProvider', () => ({
  useKnowledgeBase: () => ({ selectedKbIds: ['default'], knowledgeBases: [], toggleKbSelection: vi.fn() }),
}));
vi.mock('../../api/gateway-client', () => ({
  gatewayClient: {
    crmHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
    sendChatMessage: (...args: unknown[]) => sendChatMessage(...args),
  },
}));

describe('AppShell + chat response lifecycle', () => {
  beforeEach(() => chatStore.reset());

  it('completes an in-flight answer after hiding the sidebar', async () => {
    let resolveAnswer: ((value: unknown) => void) | null = null;
    sendChatMessage.mockReturnValue(new Promise((resolve) => {
      resolveAnswer = resolve;
    }));
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<ChatContainer />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText('chat.placeholder'), {
      target: { value: 'Long question' },
    });
    fireEvent.click(container.querySelector('.btn-send') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByText('Long question')).toBeInTheDocument());
    expect(container.querySelector('.typing-indicator')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Hide sidebar'));
    expect(container.querySelector('.typing-indicator')).toBeInTheDocument();

    resolveAnswer!({
      id: 'a1', role: 'assistant', content: 'Completed answer',
      timestamp: new Date().toISOString(), feedback: null,
    });
    expect(await screen.findByText('Completed answer')).toBeInTheDocument();
  });
});
