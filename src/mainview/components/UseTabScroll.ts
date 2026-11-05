
import { useCallback, useEffect, useRef } from "react";

export function useTabScroll(activeTabId: string | null) {

  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToTab = useCallback((id: string | null) => {
    if (!id) {
      return;
    }
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
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {

        scrollToTab(activeTabId);
      });
    }, 200);

    return () => clearTimeout(timer);
  });
  return {
    tabRefs,
  };
}