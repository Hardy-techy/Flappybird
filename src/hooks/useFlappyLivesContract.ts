import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import FlappyLivesABI from '@/contracts/FlappyLivesABI.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0x041B26f332B9C63213fB22d7b791986A08F7d55E';

export function useFlappyLivesContract() {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setContract(null);
      setProvider(null);
      setSigner(null);
      return;
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    setProvider(provider);
    
    // Don't automatically get signer - only when needed for transactions
    // This prevents wallet popup on page load
    setContract(null);
    setSigner(null);
  }, []);

  // Function to get signer when needed (for transactions)
  const getSigner = async () => {
    if (!provider) return null;
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, FlappyLivesABI, signer);
      setSigner(signer);
      setContract(contract);
      return signer;
    } catch (error) {
      console.error('Failed to get signer:', error);
      return null;
    }
  };

  return { contract, provider, signer, getSigner };
} 