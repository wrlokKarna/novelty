
import { useCallback, useEffect, useRef } from "react";

export function useTabScroll(activeTabId: string | null) {

  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToTab = useCallback((id: string | null) => {
    if (!id) {
      return;
    }
    // Use requestAnimationFrame to wait for the next paint frame
    const activeTabElement = tabRefs.current[id];

    if (activeTabElement) {
      activeTabElement.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest'
      })
    }
    else {
      console.warn('Scroll target missing:', {
        activeTabElement,
      });
    }
  }, []);
  useEffect(() => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        // Runs after the 50ms delay, right before the next paint frame
        scrollToTab(activeTabId);
      });
    }, 200)
  });
  return {
    tabRefs,
  };
}