'use client';

import { useEffect, useState } from 'react';

/** Simulates token streaming for assistant messages (backend returns full text). */
export function useStreamingText(fullText: string, enabled: boolean, charsPerTick = 8) {
  const [displayed, setDisplayed] = useState(enabled ? '' : fullText);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(fullText);
      return;
    }
    setDisplayed('');
    if (!fullText) return;

    let i = 0;
    const id = window.setInterval(() => {
      i = Math.min(fullText.length, i + charsPerTick);
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) window.clearInterval(id);
    }, 16);

    return () => window.clearInterval(id);
  }, [fullText, enabled, charsPerTick]);

  const isStreaming = enabled && displayed.length < fullText.length;

  return { displayed, isStreaming };
}
