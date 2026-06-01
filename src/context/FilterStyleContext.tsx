import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILTER_STYLE_STORAGE_KEY = '@jaytap_filter_style';

export type FilterStyle = 'guided' | 'cascading' | 'master' | 'sentence';

interface FilterStyleContextType {
  filterStyle: FilterStyle;
  setFilterStyle: (s: FilterStyle) => Promise<void>;
}

const FilterStyleContext = createContext<FilterStyleContextType | undefined>(undefined);

export const FilterStyleProvider = ({ children }: { children: ReactNode }) => {
  const [filterStyle, setFilterStyleState] = useState<FilterStyle>('guided');

  useEffect(() => {
    loadFilterStyle();
  }, []);

  const loadFilterStyle = async () => {
    try {
      const stored = await AsyncStorage.getItem(FILTER_STYLE_STORAGE_KEY);
      if (
        stored === 'guided' ||
        stored === 'cascading' ||
        stored === 'master' ||
        stored === 'sentence'
      ) {
        setFilterStyleState(stored);
      }
      // D-10: any other value (including null, '', 'GUIDED', 'rainbow') silently
      // falls through to the default 'guided' — matches LanguageContext line 27 pattern.
    } catch (e) {
      console.error('Failed to load filter-style preference', e);
    }
  };

  const setFilterStyle = async (s: FilterStyle) => {
    try {
      await AsyncStorage.setItem(FILTER_STYLE_STORAGE_KEY, s);
      setFilterStyleState(s);
    } catch (e) {
      console.error('Failed to save filter-style preference', e);
    }
  };

  return (
    <FilterStyleContext.Provider value={{ filterStyle, setFilterStyle }}>
      {children}
    </FilterStyleContext.Provider>
  );
};

export const useFilterStyle = () => {
  const ctx = useContext(FilterStyleContext);
  if (!ctx) throw new Error('useFilterStyle must be used within FilterStyleProvider');
  return ctx;
};
