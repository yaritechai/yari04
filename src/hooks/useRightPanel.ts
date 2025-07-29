import { useState, useCallback } from "react";
import { FragmentType } from "../components/RightPanel";

export function useRightPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState(400);
  const [activeFragment, setActiveFragment] = useState<FragmentType | null>(null);
  const [fragmentData, setFragmentData] = useState<any>(null);

  const openFragment = useCallback((fragment: FragmentType, data?: any) => {
    setActiveFragment(fragment);
    setFragmentData(data);
    setIsOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const updateFragmentData = useCallback((data: any) => {
    setFragmentData(data);
  }, []);

  return {
    isOpen,
    width,
    activeFragment,
    fragmentData,
    openFragment,
    closePanel,
    togglePanel,
    setWidth,
    setActiveFragment,
    updateFragmentData,
  };
}
