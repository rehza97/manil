/**
 * useMediaQuery Hook
 *
 * React hook for responsive design with media queries
 *
 * @module shared/hooks/useMediaQuery
 */

import { useState, useEffect } from "react";

/**
 * Media query hook
 *
 * @param {string} query - Media query string
 * @returns {boolean} True if media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}
