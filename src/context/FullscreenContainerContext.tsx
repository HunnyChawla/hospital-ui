import React, { createContext, useContext } from 'react';

interface FullscreenContainerContextType {
    containerRef: React.RefObject<HTMLDivElement> | null;
}

const FullscreenContainerContext = createContext<FullscreenContainerContextType>({
    containerRef: null,
});

export const useFullscreenContainer = () => useContext(FullscreenContainerContext);

interface FullscreenContainerProviderProps {
    children: React.ReactNode;
    containerRef: React.RefObject<HTMLDivElement>;
}

export const FullscreenContainerProvider: React.FC<FullscreenContainerProviderProps> = ({
    children,
    containerRef
}) => {
    return (
        <FullscreenContainerContext.Provider value={{ containerRef }}>
            {children}
        </FullscreenContainerContext.Provider>
    );
};
