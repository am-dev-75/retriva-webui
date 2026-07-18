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

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './app/providers/ThemeProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { UserProvider } from './app/providers/UserProvider';
import { KnowledgeBaseProvider } from './app/providers/KnowledgeBaseProvider';
import { AppShell } from './app/layout/AppShell';

import { ChatContainer } from './features/chat/components/ChatContainer';
import { KBList } from './features/knowledge-bases/components/KBList';
import { IngestionLanding } from './features/ingestion/components/IngestionLanding';
import { DocumentList } from './features/documents/components/DocumentList';
import { ArtifactList } from './features/artifacts/components/ArtifactList';
import { SettingsPage } from './features/settings/components/SettingsPage';
import { StatusPage } from './features/status/components/StatusPage';
import { CONFIG } from './app/config';

// Lazy load or placeholder features
// Retriva × 3D: chat on the left, live 3D viewer on the right.
const ChatPage = () => (
  <div style={{ display: 'flex', height: '100%', width: '100%', minHeight: 0 }}>
    <div style={{ flex: '0 0 46%', minWidth: 360, minHeight: 0, overflow: 'hidden',
                  borderRight: '1px solid var(--color-border, #2a2f3a)' }}>
      <ChatContainer />
    </div>
    <iframe title="3D model" src={CONFIG.VIEWER_URL}
            style={{ flex: 1, border: 'none', width: '100%', height: '100%' }} />
  </div>
);
const KBPage = () => <KBList />;
const DocumentsPage = () => <DocumentList />;
const IngestionPage = () => <IngestionLanding />;
const ArtifactsPage = () => <ArtifactList />;
const SettingsPagePlaceholder = () => <SettingsPage />;
const StatusPageWrapper = () => <StatusPage />;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <KnowledgeBaseProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<AppShell />}>
                  <Route index element={<ChatPage />} />
                  <Route path="kb" element={<KBPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="ingestion" element={<IngestionPage />} />
                  <Route path="artifacts" element={<ArtifactsPage />} />
                  <Route path="status" element={<StatusPageWrapper />} />
                  <Route path="settings" element={<SettingsPagePlaceholder />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </KnowledgeBaseProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
