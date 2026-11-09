/*
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0.
 */

import type { Message } from '../../api/types';

export interface ChatStoreState {
  messages: Message[];
  isLoading: boolean;
  abortController: AbortController | null;
  /**
   * Per-session routing override: force every new turn onto the Company
   * Intelligence (agent-loop) plane. Defaults off and is never persisted;
   * a page reload starts a fresh session with the override off.
   */
  forcedRouting: boolean;
}

let state: ChatStoreState = {
  messages: [],
  isLoading: false,
  abortController: null,
  forcedRouting: false,
};

const listeners = new Set<() => void>();

function publish(next: ChatStoreState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/**
 * Chat request ownership lives outside the chat component.
 *
 * A layout change (for example collapsing the sidebar) must never tear
 * down an in-flight answer. The component subscribes to this store with
 * useSyncExternalStore, while the promise and AbortController survive
 * component unmount/remount. Intentional stop still calls abort().
 */
export const chatStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): ChatStoreState {
    return state;
  },

  startRequest(userMessage: Message): AbortController {
    const controller = new AbortController();
    publish({
      ...state,
      messages: [...state.messages, userMessage],
      isLoading: true,
      abortController: controller,
    });
    return controller;
  },

  appendMessage(message: Message): void {
    publish({
      ...state,
      messages: [...state.messages, message],
    });
  },

  setForcedRouting(enabled: boolean): void {
    if (state.forcedRouting === enabled) return;
    publish({ ...state, forcedRouting: enabled });
  },

  updateMessages(updater: (messages: Message[]) => Message[]): void {
    publish({ ...state, messages: updater(state.messages) });
  },

  finishRequest(controller: AbortController): void {
    if (state.abortController !== controller) return;
    publish({ ...state, isLoading: false, abortController: null });
  },

  abort(): void {
    state.abortController?.abort();
  },

  reset(): void {
    publish({
      messages: [],
      isLoading: false,
      abortController: null,
      forcedRouting: false,
    });
  },
};
