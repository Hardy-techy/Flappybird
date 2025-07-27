import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';
import { useWalletContext } from '@/hooks/WalletContext';

const SOMNIA_NETWORK = {
  chainId: '0xC488', // 50312 in hex
  chainName: 'Somnia Testnet',
  nativeCurrency: {
    name: 'STT',
    symbol: 'STT',
    decimals: 18
  },
  rpcUrls: ['https://dream-rpc.somnia.network'],
  blockExplorerUrls: ['https://shannon-explorer.somnia.network']
};

const WalletConnection: React.FC = () => {
  const { walletAddress, connectWallet, disconnectWallet, setWalletAddress } = useWalletContext();
  const { toast } = useToast();

  const connectWalletHandler = async () => {
    if (!window.ethereum) {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or another Web3 wallet!",
        variant: "destructive"
      });
      return;
    }
    try {
      // Always request accounts (this triggers the popup for new accounts)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      setWalletAddress(accounts[0]); // <-- CRITICAL: update with the returned account
      toast({
        title: "Wallet Connected",
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive"
      });
    }
  };

  const disconnectWalletHandler = () => {
    disconnectWallet();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected"
    });
  };

  React.useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected all accounts
          disconnectWallet();
        } else {
          // User switched to a different account (via MetaMask's built-in switcher)
          // Update to the newly selected account
          setWalletAddress(accounts[0]);
          toast({
            title: "Account Switched",
            description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          });
        }
      };
      const handleChainChanged = () => {
        window.location.reload();
      };
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [disconnectWallet]);

  if (walletAddress) {
    return (
      <Card className="p-4 bg-card border-game-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Connected Wallet</p>
            <p className="font-mono text-game-secondary">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
          <Button
            onClick={disconnectWalletHandler}
            variant="outline"
            size="sm"
            className="border-game-danger/30 text-game-danger hover:bg-game-danger/10"
          >
            Disconnect
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-game-primary/20">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Connect your wallet to play</p>
        <Button
          onClick={connectWalletHandler}
          className="bg-game-primary hover:bg-game-primary/80"
        >
          Connect Wallet
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Somnia Testnet | Chain ID: 50312
        </p>
      </div>
    </Card>
  );
};

export default WalletConnection;