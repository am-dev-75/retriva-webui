/*
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';
import i18n from '../app/i18n';

describe('chat company-brain copy', () => {
  it('renders the Italian company-brain subtitle and routing tooltip', async () => {
    await i18n.changeLanguage('it');
    expect(i18n.t('chat.subtitle')).toBe(
      'Interagisci con il tuo company brain usando il linguaggio naturale.'
    );
    expect(i18n.t('chat.routing_override_label')).toBe('Database aziendale');
    expect(i18n.t('chat.routing_override_tooltip')).toBe(
      'Interroga direttamente il database aziendale (routing forzato)'
    );
  });

  it('renders the English company-brain subtitle and routing tooltip', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('chat.subtitle')).toBe(
      'Interact with your company brain using natural language.'
    );
    expect(i18n.t('chat.routing_override_label')).toBe('Company database');
    expect(i18n.t('chat.routing_override_tooltip')).toBe(
      'Query the company database directly (forced routing)'
    );
  });
});
