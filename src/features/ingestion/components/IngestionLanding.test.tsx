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

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IngestionLanding } from './IngestionLanding';
import { KnowledgeBaseProvider } from '../../../app/providers/KnowledgeBaseProvider';

vi.mock('../../../api/gateway-client', () => ({
  gatewayClient: {
    getSources: vi.fn().mockResolvedValue([]),
    getKBs: vi.fn().mockResolvedValue([])
  }
}));

describe('IngestionLanding', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <KnowledgeBaseProvider>
        {ui}
      </KnowledgeBaseProvider>
    );
  };

  it('renders tabs and defaults to Static Ingestion', () => {
    renderWithProviders(<IngestionLanding />);
    
    const staticTab = screen.getByText('Static Ingestion');
    const connectedTab = screen.getByText('Dynamic Ingestion');
    
    expect(staticTab).toBeInTheDocument();
    expect(connectedTab).toBeInTheDocument();
    
    // UploadPanel should be present
    expect(screen.getByText(/ingestion\.pending_uploads/i)).toBeInTheDocument();
  });

  it('switches to Dynamic Ingestion tab', async () => {
    renderWithProviders(<IngestionLanding />);
    
    const connectedTab = screen.getAllByText('Dynamic Ingestion')[0];
    fireEvent.click(connectedTab);
    
    // Check if ConnectedSourcesList is rendered
    const headings = await screen.findAllByText('Dynamic Ingestion');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/No connected sources configured yet/i)).toBeInTheDocument();
  });
});
