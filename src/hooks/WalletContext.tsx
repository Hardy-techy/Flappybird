import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  walletAddress: string | null;
  walletProvider: ethers.BrowserProvider | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  setWalletAddress: (address: string | null) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<ethers.BrowserProvider | null>(null);

  // Removed auto-connect to prevent MetaMask popups on page load
  // Users will need to manually click "Connect Wallet" button

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    // Use eth_requestAccounts to get the currently selected account
    const accounts = await provider.send('eth_requestAccounts', []);
    if (accounts.length > 0) {
      setWalletAddress(accounts[0]);
      setWalletProvider(provider);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setWalletProvider(null);
  }, []);

  return (
    <WalletContext.Provider value={{ walletAddress, walletProvider, connectWallet, disconnectWallet, setWalletAddress }}>
      {children}
    </WalletContext.Provider>
  );
};

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within a WalletProvider');
  return ctx;
} 