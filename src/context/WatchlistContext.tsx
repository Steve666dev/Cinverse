import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import CryptoJS from 'crypto-js';

const STORAGE_KEY = 'cinematix_watchlist';
const SECRET_KEY = 'c1n3m4t1x_s3cr3t_k3y_!@#'; // Client-side encryption key for obfuscation

interface WatchlistContextType {
  watchlist: Set<number>;
  toggleWatch: (id: number) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export const WatchlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [watchlist, setWatchlist] = useState<Set<number>>(() => {
    try {
      const storedEncrypted = localStorage.getItem(STORAGE_KEY);
      if (storedEncrypted) {
        // Decrypt the stored data
        const bytes = CryptoJS.AES.decrypt(storedEncrypted, SECRET_KEY);
        const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedStr) {
          return new Set(JSON.parse(decryptedStr));
        }
      }
    } catch (e) {
      console.error('Failed to decrypt and load watchlist from local storage', e);
    }
    return new Set();
  });

  useEffect(() => {
    try {
      // Encrypt the data before saving
      const dataStr = JSON.stringify([...watchlist]);
      const encryptedStr = CryptoJS.AES.encrypt(dataStr, SECRET_KEY).toString();
      localStorage.setItem(STORAGE_KEY, encryptedStr);
    } catch (e) {
      console.error('Failed to encrypt and save watchlist to local storage', e);
    }
  }, [watchlist]);

  const toggleWatch = (id: number) => {
    setWatchlist((prev) => {
      const newWatchlist = new Set(prev);
      if (newWatchlist.has(id)) {
        newWatchlist.delete(id);
      } else {
        newWatchlist.add(id);
      }
      return newWatchlist;
    });
  };

  return (
    <WatchlistContext.Provider value={{ watchlist, toggleWatch }}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return context;
};
