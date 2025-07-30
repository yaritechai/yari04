import { useState, useCallback, useRef } from "react";
import { FragmentType } from "../components/RightPanel";

export function useRightPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(800);
  const [activeFragment, setActiveFragment] = useState<FragmentType | null>(null);
  const [fragmentData, setFragmentData] = useState<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openFragment = useCallback((fragment: FragmentType, data?: any) => {
    // Clear any pending transitions
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    
    // Prevent rapid fragment switching conflicts
    if (isTransitioning) {
      return;
    }
    
    setIsTransitioning(true);
    
    // If switching to a different fragment, give a brief moment for cleanup
    if (activeFragment && activeFragment !== fragment) {
      setActiveFragment(null);
      setFragmentData(null);
      
      transitionTimeoutRef.current = setTimeout(() => {
        setActiveFragment(fragment);
        setFragmentData(data);
        setIsOpen(true);
        setIsTransitioning(false);
      }, 50);
    } else {
      // Same fragment or no previous fragment, switch immediately
      setActiveFragment(fragment);
      setFragmentData(data);
      setIsOpen(true);
      setIsTransitioning(false);
    }
  }, [activeFragment, isTransitioning]);

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
