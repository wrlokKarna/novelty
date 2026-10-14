import { createContext, useContext } from 'react';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

export const DialogSidebarContext = createContext<{
    mode: SidebarMode;
    cycle: () => void;
} | null>(null);

export const useDialogSidebar = () => useContext(DialogSidebarContext);
