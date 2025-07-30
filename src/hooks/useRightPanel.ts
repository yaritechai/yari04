import { useState, useCallback, useRef } from "react";
import { FragmentType } from "../components/RightPanel";

export function useRightPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(Math.floor(window.innerWidth * 0.6)); // 60% of viewport width
  const [activeFragment, setActiveFragment] = useState<FragmentType | null>(null);
  const [fragmentData, setFragmentData] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openFragment = useCallback((fragment: FragmentType, data?: any) => {
    // Clear any pending transitions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // For immediate responsiveness, especially for search "View all" clicks
    // Always switch immediately without transition delays
    setActiveFragment(fragment);
    setFragmentData(data);
    setIsOpen(true);
    setIsTransitioning(false);
  }, []);

  const closePanel = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsOpen(false);
    setIsTransitioning(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setIsOpen(prev => !prev);
    setIsTransitioning(false);
  }, []);

  const updateFragmentData = useCallback((data: any) => {
    if (!isTransitioning) {
      setFragmentData(data);
    }
  }, [isTransitioning]);

  return {
    isOpen,
    width,
    activeFragment,
    fragmentData,
    isTransitioning,
    openFragment,
    closePanel,
    togglePanel,
    setWidth,
    setActiveFragment,
    updateFragmentData,
  };
}
