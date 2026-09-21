import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Icône de tri partagée : affichée uniquement sur la colonne actuellement
// triée, orientée selon le sens (asc/desc).
export default function SortIcon({ sortKey, sortDir, col }) {
  if (sortKey !== col) return null;
  return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
}
