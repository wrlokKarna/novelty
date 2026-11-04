import { useEffect, useRef } from "react";

export function UseTabScroll(activeTabId: string | null) {

  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const scrollToTab = (id: string | null) => {
    if (!id) {
      return;
    }
    // Use requestAnimationFrame to wait for the next paint frame
    requestAnimationFrame(() => {
      const activeTabElement = tabRefs.current[id];

      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        })
      }
      else {
        console.warn('Scroll target missing:', {
          activeTabElement,
        });
      }
    });
  };
  useEffect(() => {
    scrollToTab(activeTabId);
  }, [activeTabId])
  return {
    tabRefs,
  };
}