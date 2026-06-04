import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAL_BRIGHT, PAL_DIM } from '../constants/palette';

const STORAGE_KEY = 'vt_dim_mode';

const DimContext = createContext({
  dim: false,
  pal: PAL_BRIGHT,
  setDim: () => {},
  toggleDim: () => {},
});

export function DimProvider({ children }) {
  const [dim, setDimState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => { if (v === '1') setDimState(true); })
      .catch(() => {});
  }, []);

  const setDim = (v) => {
    setDimState(v);
    AsyncStorage.setItem(STORAGE_KEY, v ? '1' : '0').catch(() => {});
  };
  const toggleDim = () => setDim(!dim);

  // 用 useMemo 提供當前色票，避免重複物件
  const pal = useMemo(() => (dim ? PAL_DIM : PAL_BRIGHT), [dim]);

  return (
    <DimContext.Provider value={{ dim, pal, setDim, toggleDim }}>
      {children}
    </DimContext.Provider>
  );
}

export function useDim() {
  return useContext(DimContext);
}

// 方便的 hook：直接拿色票
export function usePAL() {
  return useContext(DimContext).pal;
}
