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

  it('renders tabs and defaults to Static Upload', () => {
    renderWithProviders(<IngestionLanding />);
    
    const staticTab = screen.getByText('Static Upload');
    const connectedTab = screen.getByText('Connected Sources');
    
    expect(staticTab).toBeInTheDocument();
    expect(connectedTab).toBeInTheDocument();
    
    // UploadPanel should be present
    expect(screen.getByText(/ingestion\.pending_uploads/i)).toBeInTheDocument();
  });

  it('switches to Connected Sources tab', async () => {
    renderWithProviders(<IngestionLanding />);
    
    const connectedTab = screen.getAllByText('Connected Sources')[0];
    fireEvent.click(connectedTab);
    
    // Check if ConnectedSourcesList is rendered
    const headings = await screen.findAllByText('Connected Sources');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/No connected sources configured yet/i)).toBeInTheDocument();
  });
});
