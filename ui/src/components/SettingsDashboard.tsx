import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Home, PenTool, Book, Repeat, History as HistoryIcon,
  Mic, HelpCircle, Settings, LogIn
} from 'lucide-react';
import { themes, setTheme, getCurrentTheme } from '../theme/cyber-gourmet-themes';

// Cyber-Gourmet Theme Constants
const THEME = {
  bg: "bg-[var(--cyber-bg-dark)]",
  sidebar: "bg-[#0a0a0f]",
  textMain: "text-[var(--cyber-text-main)]",
  textMuted: "text-[var(--cyber-text-muted)]",
  accent: "text-orange-500",
  accentBorder: "border-orange-500",
  hover: "hover:bg-zinc-800 hover:text-orange-400",
};

export type Page = 'home' | 'rewrite' | 'dictionary' | 'replace' | 'history' | 'settings';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
}

const SidebarItem = ({ icon: Icon, label, active = false, onClick, badge }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg
    ${active
      ? `${THEME.accent} bg-zinc-800/80 border-l-2 ${THEME.accentBorder}`
      : `${THEME.textMuted} ${THEME.hover}`
    }`}
    style={active ? { boxShadow: 'var(--cyber-border-glow)' } : undefined}
  >
    <Icon size={18} />
    {label}
    {badge && (
      <span className="ml-auto text-xs bg-orange-500/20 text-orange-500 px-1.5 py-0.5 rounded">{badge}</span>
    )}
  </button>
);

interface SettingsDashboardProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
  historyCount?: number;
}

export default function SettingsDashboard({
  currentPage,
  onNavigate,
  children,
  historyCount = 0,
}: SettingsDashboardProps) {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      setCurrentTheme(e.detail.theme);
    };
    window.addEventListener('cyber-theme-change', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('cyber-theme-change', handleThemeChange as EventListener);
    };
  }, []);

  return (
    <div className={`flex h-screen w-full ${THEME.bg} text-zinc-100 font-sans selection:bg-orange-500/30`}>

      {/* Sidebar */}
      <div className={`w-64 flex-shrink-0 flex flex-col ${THEME.sidebar} border-r border-zinc-800 p-4 cyber-circuit-bg`}>
        <div className="flex items-center gap-2 px-4 mb-8">
          <Mic className="text-orange-500" />
          <h1 className="text-xl font-bold tracking-tight cyber-text-glow">Whspr<span className="text-orange-500">.ai</span></h1>
        </div>

        <nav className="space-y-1 flex-1">
          <SidebarItem
            icon={Home}
            label="Home"
            active={currentPage === 'home'}
            onClick={() => onNavigate('home')}
          />
          <SidebarItem
            icon={PenTool}
            label="Rewrite Mode"
            active={currentPage === 'rewrite'}
            onClick={() => onNavigate('rewrite')}
            badge="AI"
          />
          <SidebarItem
            icon={Book}
            label="Dictionary"
            active={currentPage === 'dictionary'}
            onClick={() => onNavigate('dictionary')}
          />
          <SidebarItem
            icon={Repeat}
            label="Replace text"
            active={currentPage === 'replace'}
            onClick={() => onNavigate('replace')}
          />
          <SidebarItem
            icon={HistoryIcon}
            label="History"
            active={currentPage === 'history'}
            onClick={() => onNavigate('history')}
            badge={historyCount > 0 ? String(historyCount) : undefined}
          />
          <div className="pt-4 mt-4 border-t border-zinc-800">
            <SidebarItem icon={Mic} label="Improve Accuracy" />
            <SidebarItem icon={HelpCircle} label="Help & Tutorials" />
            <SidebarItem
              icon={Settings}
              label="Settings"
              active={currentPage === 'settings'}
              onClick={() => onNavigate('settings')}
            />
          </div>
        </nav>

        {/* Theme Picker */}
        <div className="mt-auto mb-4 px-4">
          <div className="text-xs text-zinc-500 mb-2 font-medium">Theme</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`w-5 h-5 rounded-full transition-all duration-200 ${
                  currentTheme === key
                    ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0f]'
                    : 'hover:scale-110'
                }`}
                style={{
                  backgroundColor: theme.primary,
                  boxShadow: currentTheme === key ? `0 0 8px ${theme.primary}, 0 0 16px ${theme.secondary}` : 'none'
                }}
                title={theme.name}
                aria-label={`Switch to ${theme.name} theme`}
              />
            ))}
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 cyber-button">
          <LogIn size={16} />
          <span>Sign in</span>
        </button>
        <div className="mt-2 text-center text-xs text-zinc-600">Whisper Local</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
