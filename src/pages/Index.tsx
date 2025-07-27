import React, { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import FlappyGame from '@/components/FlappyGame';
import WalletConnection from '@/components/WalletConnection';
import LivesManager from '@/components/LivesManager';
import Leaderboard from '@/components/Leaderboard';
import { Card } from '@/components/ui/card';
import { getPlayerStats, setLives, setBestScore, decrementLives, getLeaderboard } from '@/lib/secureLivesApi';
import { useWalletContext } from '@/hooks/WalletContext';

interface LeaderboardEntry {
  wallet: string;
  best_score: number;
}

const Index = () => {
  const { walletAddress, walletProvider, connectWallet, disconnectWallet } = useWalletContext();
  const [lives, setLivesState] = useState<number | null>(null);
  const [bestScore, setBestScoreState] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Fetch player stats from Supabase
  const refreshPlayerStats = useCallback(async (address?: string | null) => {
    let wallet: string | null = null;
    if (address) {
      if (typeof address === 'string') {
        wallet = address.toLowerCase();
      } else if (typeof address === 'object' && 'address' in (address as any)) {
        wallet = (address as any).address.toLowerCase();
      }
    } else if (walletAddress) {
      if (typeof walletAddress === 'string') {
        wallet = walletAddress.toLowerCase();
      } else if (typeof walletAddress === 'object' && 'address' in (walletAddress as any)) {
        wallet = (walletAddress as any).address.toLowerCase();
      }
    }
    if (!wallet) {
      setLivesState(null);
      setBestScoreState(null);
      return;
    }
    try {
      const stats = await getPlayerStats(wallet);
      setLivesState(stats.lives);
      setBestScoreState(stats.best_score);
    } catch {
      setLivesState(null);
      setBestScoreState(null);
    }
  }, [walletAddress]);

  // Fetch leaderboard from Supabase
  const refreshLeaderboard = useCallback(async () => {
    try {
      const data = await getLeaderboard(3);
      setLeaderboard(data);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      refreshPlayerStats(walletAddress);
    } else {
      setLivesState(null);
      setBestScoreState(null);
    }
    refreshLeaderboard();
  }, [walletAddress, refreshPlayerStats, refreshLeaderboard]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-game-primary via-game-secondary to-game-primary bg-clip-text text-transparent leading-tight py-2">
            Flappy Bird
          </h1>
          <p className="text-xl text-muted-foreground">
            Blockchain-powered Flappy Bird on Somnia Testnet
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="max-w-md mx-auto mb-8">
          <WalletConnection />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game */}
          <div className="lg:col-span-2">
            <FlappyGame
              walletAddress={walletAddress}
              lives={lives}
              bestScore={bestScore}
              refreshPlayerStats={refreshPlayerStats}
              refreshLeaderboard={refreshLeaderboard}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lives Manager */}
            <LivesManager walletAddress={walletAddress} lives={lives} refreshPlayerStats={refreshPlayerStats} />

            {/* Leaderboard */}
            <Leaderboard scores={leaderboard} showMoreButton={true} />

            {/* How to Play */}
            <Card className="p-4 bg-card border-game-primary/20">
              <h4 className="font-semibold mb-2 text-foreground">🎮 How to Play</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Click or press SPACE to flap</p>
                <p>• Each game costs 1 life</p>
                <p>• Play more to unlock themes</p>
                <p>• Connect wallet to save scores</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-muted-foreground">
          <p className="text-sm">
            Connect your wallet and purchase lives with STT tokens to play!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
