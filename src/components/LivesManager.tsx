import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFlappyLivesContract } from '@/hooks/useFlappyLivesContract';
import { setLives } from '@/lib/secureLivesApi';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';

interface LivesManagerProps {
  walletAddress: string | null;
  lives: number | null;
  refreshPlayerStats: () => void;
}

const LivesManager: React.FC<LivesManagerProps> = ({ walletAddress, lives, refreshPlayerStats }) => {
  const { contract, getSigner } = useFlappyLivesContract();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const buyLives = async (amount: 5 | 15) => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      // Get signer and contract when actually making transaction
      const signer = await getSigner();
      if (!signer) {
    toast({
          title: "Connection Error",
          description: "Please connect your wallet first.",
        variant: "destructive"
      });
      return;
    }

      const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || '0x041B26f332B9C63213fB22d7b791986A08F7d55E';
      const contract = new ethers.Contract(contractAddress, 
        (await import('@/contracts/FlappyLivesABI.json')).default, signer);
      
      const price = amount === 5 ? ethers.parseEther('0.05') : ethers.parseEther('0.1');
      const tx = await contract.buyLives(amount, { value: price });
      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });
      await tx.wait();
      toast({
        title: "Success!",
        description: `${amount} lives purchased successfully!`,
      });
      await setLives(walletAddress, amount);
      await refreshPlayerStats();
    } catch (err: any) {
      toast({
        title: "Transaction Failed",
        description: err?.message || "Failed to purchase lives. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-game-primary/20 text-center">
      <h4 className="font-semibold mb-2 text-foreground">Your Lives</h4>
      <div className="text-2xl font-bold mb-4">
        {lives === null ? 'Loading...' : lives}
      </div>
      {lives === 0 && (
        <div className="space-x-2">
          <Button onClick={() => buyLives(5)} disabled={loading || !walletAddress} className="bg-game-primary hover:bg-game-primary/80 text-white">
            Buy 5 Lives (0.05 STT)
          </Button>
          <Button onClick={() => buyLives(15)} disabled={loading || !walletAddress} className="bg-game-secondary hover:bg-game-secondary/80 text-white">
            Buy 15 Lives (0.1 STT)
            </Button>
        </div>
      )}
    </Card>
  );
};

export default LivesManager;