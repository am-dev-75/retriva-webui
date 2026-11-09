/*
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatContainer } from './ChatContainer';
import { chatStore } from '../chatStore';

const sendChatMessage = vi.fn();
const uploadSessionAttachment = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('../../../api/gateway-client', () => ({
  gatewayClient: {
    sendChatMessage: (...args: unknown[]) => sendChatMessage(...args),
    uploadSessionAttachment: (...args: unknown[]) => uploadSessionAttachment(...args),
  },
}));

vi.mock('../../../app/providers/KnowledgeBaseProvider', () => ({
  useKnowledgeBase: () => ({ selectedKbIds: ['default'] }),
}));

describe('ChatContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatStore.reset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    sendChatMessage.mockResolvedValue({
      id: 'assistant-1',
      role: 'assistant',
      content: 'Answer text',
      timestamp: new Date().toISOString(),
      feedback: null,
    });
  });

  it('shows check feedback after copying the answer and clears it', async () => {
    const { container } = render(<ChatContainer />);
    fireEvent.change(screen.getByPlaceholderText('chat.placeholder'), {
      target: { value: 'Question' },
    });
    fireEvent.click(container.querySelector('.btn-send') as HTMLButtonElement);

    await waitFor(() => expect(screen.getByText('Answer text')).toBeInTheDocument());
    const copy = screen.getByTitle('chat.copy_response');
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveClass('copied'));
    expect(screen.getByTitle('chat.copied')).toBe(copy);
    expect(copy.querySelector('svg')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1900));
    });
    expect(copy).not.toHaveClass('copied');
  });

  it('keeps the attachment box but removes the Qualifica control', async () => {
    uploadSessionAttachment.mockResolvedValue({
      attachment_id: 'attachment-12345678',
      session_id: 'session-1',
      original_filename: 'prospects.xlsx',
      media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 10,
      checksum: 'x',
      upload_time: '2026-11-02T00:00:00Z',
      expiration_time: '2026-11-03T00:00:00Z',
      status: 'STORED',
      selected_parser: null,
      parsed_element_count: 0,
      parse_warnings: [],
      failure_info: null,
    });
    const { container } = render(<ChatContainer />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['x'], 'prospects.xlsx')] },
    });
    await waitFor(() => expect(screen.getByText('prospects.xlsx')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'chat.candidate_qualify' })).toBeNull();
    expect(screen.queryByText(/Qualifica/)).toBeNull();
  });

  it('keeps an in-flight answer alive across a chat subtree remount', async () => {
    let resolveAnswer: ((value: unknown) => void) | null = null;
    sendChatMessage.mockReturnValue(new Promise((resolve) => {
      resolveAnswer = resolve;
    }));
    const first = render(<ChatContainer />);
    fireEvent.change(screen.getByPlaceholderText('chat.placeholder'), {
      target: { value: 'Question' },
    });
    fireEvent.click(first.container.querySelector('.btn-send') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByText('Question')).toBeInTheDocument());
    expect(first.container.querySelector('.typing-indicator')).toBeInTheDocument();

    first.unmount();
    const second = render(<ChatContainer />);
    expect(await screen.findByText('Question')).toBeInTheDocument();
    expect(second.container.querySelector('.typing-indicator')).toBeInTheDocument();

    resolveAnswer!({
      id: 'assistant-remount',
      role: 'assistant',
      content: 'Answer survives',
      timestamp: new Date().toISOString(),
      feedback: null,
    });
    expect(await screen.findByText('Answer survives')).toBeInTheDocument();
  });

  it('shows feedback for the question/answer copy action', async () => {
    const { container } = render(<ChatContainer />);
    fireEvent.change(screen.getByPlaceholderText('chat.placeholder'), {
      target: { value: 'Question' },
    });
    fireEvent.click(container.querySelector('.btn-send') as HTMLButtonElement);
    await waitFor(() => expect(screen.getByText('Answer text')).toBeInTheDocument());

    const copy = screen.getByTitle('chat.copy_qa');
    fireEvent.click(copy);
    await waitFor(() => expect(copy).toHaveClass('copied'));
    expect(screen.getByTitle('chat.copied')).toBe(copy);
  });
});
