/*
 * Copyright (C) 2026 Andrea Marson (am.dev.75@gmail.com)
 *
 * Licensed under the Apache License, Version 2.0.
 */

import { describe, expect, it } from 'vitest';
import i18n from '../app/i18n';

describe('chat attachment interpolation', () => {
  it('renders the real filename and attachment id in Italian', async () => {
    await i18n.changeLanguage('it');
    const rendered = i18n.t('chat.candidate_uploaded', {
      filename: '2026-CRA-IT.xlsx',
      id: 'a1b2c3d4',
    });
    expect(rendered).toBe(
      "File '2026-CRA-IT.xlsx' allegato a questa chat (a1b2c3d4)."
    );
    expect(rendered).not.toContain('Qualifica');
  });

  it('renders the real filename and attachment id in English', async () => {
    await i18n.changeLanguage('en');
    const rendered = i18n.t('chat.candidate_uploaded', {
      filename: '2026-CRA-IT.xlsx',
      id: 'a1b2c3d4',
    });
    expect(rendered).toBe(
      "File '2026-CRA-IT.xlsx' attached to this chat session (a1b2c3d4)."
    );
    expect(rendered).not.toContain('Qualify');
  });
});
