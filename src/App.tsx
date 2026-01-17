import { useState } from 'react';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import RewriteMode from './components/RewriteMode';
import Dictionary from './components/Dictionary';
import ReplaceText from './components/ReplaceText';
import History from './components/History';
import Settings from './components/Settings';
import HelpTutorials from './components/HelpTutorials';
import FloatingWidget from './components/FloatingWidget';

type Page = 'home' | 'rewrite' | 'dictionary' | 'replace' | 'history' | 'settings' | 'help';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings } = useSettings();

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'rewrite':
        return <RewriteMode />;
      case 'dictionary':
        return <Dictionary />;
      case 'replace':
        return <ReplaceText />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <HelpTutorials />;
      default:
        return <Home />;
    }
  };

  return (
    <div className={`app-container ${settings.theme}`}>
      {/* Mobile header */}
      <div className="mobile-header">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="app-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <span>Whspr</span>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
      />

      {/* Main content */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* Floating recording widget */}
      <FloatingWidget />
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
