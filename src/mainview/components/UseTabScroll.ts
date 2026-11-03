import { useEffect, useRef } from "react";

export function UseTabScroll(activeTabId: string | null) {

  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scrollToTab = (id: string | null) => {
    if (!id) {
      return;
    }
    // Use requestAnimationFrame to wait for the next paint frame
    requestAnimationFrame(() => {
      const activeTabElement = tabRefs.current[id];
      const container = containerRef.current;

      if (activeTabElement && container) {
        console.log('id', id);
        const scrollLeft =
          activeTabElement.offsetLeft -
          container.offsetWidth / 2 +
          activeTabElement.offsetWidth / 2;

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth',
        });
      } else {
        console.warn('Scroll target missing:', {
          activeTabElement,
          container,
        });
      }
    });
  };

  useEffect(() => {
    scrollToTab(activeTabId);
  }, [activeTabId])

  return {
    tabRefs,
    containerRef,
    scrollToTab,
  }
}