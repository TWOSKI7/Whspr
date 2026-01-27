/**
 * Escapes special regex characters in a string
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Formats keyboard shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('PageUp', 'PgUp')
    .replace('PageDown', 'PgDn')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→');
}

/**
 * Parses a shortcut string and checks if a keyboard event matches it
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+');
  const key = parts[parts.length - 1];
  const needsCtrl = parts.includes('Ctrl');
  const needsAlt = parts.includes('Alt');
  const needsShift = parts.includes('Shift');
  const needsMeta = parts.includes('Meta');

  const ctrlMatch = needsCtrl ? e.ctrlKey : !e.ctrlKey;
  const altMatch = needsAlt ? e.altKey : !e.altKey;
  const shiftMatch = needsShift ? e.shiftKey : !e.shiftKey;
  const metaMatch = needsMeta ? e.metaKey : !e.metaKey;

  return e.key === key && ctrlMatch && altMatch && shiftMatch && metaMatch;
}

/**
 * Safely copies text to clipboard with error handling
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    // Fallback for older browsers or insecure contexts
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}
