/**
 * Custom hook for favorite templates management.
 * Encapsulates favorites state and operations.
 */

import { useState } from 'react';

export const useFavoriteTemplates = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId);
    } else {
      newFavorites.add(templateId);
    }
    setFavorites(newFavorites);
  };

  const isFavorite = (templateId: string) => favorites.has(templateId);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
};