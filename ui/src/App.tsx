import { useState, useEffect, useCallback } from 'react'
import SettingsDashboard, { type Page } from './components/SettingsDashboard'
import RecordingFloatingWidget from './components/RecordingFloatingWidget'
import CommandPalette from './components/CommandPalette'
import { useSettings } from './contexts/SettingsContext'
import Home from './pages/Home'
import History from './pages/History'
import RewriteMode from './pages/RewriteMode'
import Dictionary from './pages/Dictionary'
import ReplaceText from './pages/ReplaceText'
import SettingsPage from './pages/SettingsPage'

function App() {
  const { settings, addTranscription, applyDictionary } = useSettings()
  const [usageSeconds, setUsageSeconds] = useState(0)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [_isRecording, setIsRecording] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [backendConnected, setBackendConnected] = useState<boolean>(false)

  const handleTranscription = (text: string) => {
    // Apply dictionary replacements before saving
    const processedText = applyDictionary(text)
    addTranscription(processedText)
    const words = processedText.split(/\s+/).length
    setUsageSeconds(prev => prev + Math.ceil(words / 2))
  }

  const handleCommand = useCallback((command: string) => {
    switch (command) {
      case 'record':
      case 'stop':
        // Toggle recording via custom event
        window.dispatchEvent(new CustomEvent('whspr:toggle-recording'))
        break
      case 'clear':
        // Handled by context
        break
      case 'copy':
        if (settings.history.length > 0) {
          navigator.clipboard.writeText(settings.history[0].text)
        }
        break
      case 'settings':
        setCurrentPage('settings')
        break
      case 'history':
        setCurrentPage('history')
        break
    }
  }, [settings.history])

  // Check backend health every 10 seconds
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health')
        setBackendConnected(response.ok)
      } catch (error) {
        setBackendConnected(false)
      }
    }

    // Check immediately on mount
    checkBackendHealth()

    // Then check every 10 seconds
    const interval = setInterval(checkBackendHealth, 10000)

    return () => clearInterval(interval)
  }, [])

  // Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home usageSeconds={usageSeconds} maxSeconds={3600} />
      case 'history':
        return <History />
      case 'rewrite':
        return <RewriteMode />
      case 'dictionary':
        return <Dictionary />
      case 'replace':
        return <ReplaceText />
      case 'settings':
        return <SettingsPage />
      default:
        return <Home usageSeconds={usageSeconds} maxSeconds={3600} />
    }
  }

  return (
    <div className="relative">
      <SettingsDashboard
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        historyCount={settings.history.length}
      >
        {renderPage()}
      </SettingsDashboard>

      <RecordingFloatingWidget
        onTranscription={handleTranscription}
        onRecordingChange={setIsRecording}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onCommand={handleCommand}
      />

      {/* Command Palette hint */}
      <div className="fixed bottom-4 left-4 text-xs" style={{ color: 'var(--cyber-text-dim)' }}>
        Press <kbd className="cyber-badge text-[10px]">Ctrl+K</kbd> for commands
      </div>

      {/* Backend Connection Status */}
      <div
        className="fixed bottom-4 right-4"
        title={backendConnected ? 'Backend connected' : 'Backend offline'}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: backendConnected ? 'var(--cyber-success)' : 'var(--cyber-error)',
          boxShadow: backendConnected
            ? '0 0 8px var(--cyber-success)'
            : '0 0 8px var(--cyber-error)',
          cursor: 'help'
        }}
      />
    </div>
  )
}

export default App
