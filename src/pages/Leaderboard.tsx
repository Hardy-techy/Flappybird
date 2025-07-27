import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Leaderboard from '@/components/Leaderboard';
import { getLeaderboard, getPlayerRank } from '@/lib/secureLivesApi';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '@/hooks/WalletContext';

const LeaderboardPage: React.FC = () => {
  const [scores, setScores] = useState([]);
  const [myRank, setMyRank] = useState<{ rank: number; best_score: number } | null>(null);
  const navigate = useNavigate();
  const { walletAddress } = useWalletContext();

  useEffect(() => {
    getLeaderboard(10).then(setScores).catch(() => setScores([]));
    // Fetch my rank if wallet is connected
    if (walletAddress) {
      getPlayerRank(walletAddress).then(setMyRank).catch(() => setMyRank(null));
    } else {
      setMyRank(null);
    }
  }, [walletAddress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Flappy Somnia Leaderboard</h1>
          <p className="text-blue-200">Top 10 players and their highest scores</p>
        </div>

        <div className="space-y-6">
          <Leaderboard scores={scores} />
          {/* Always show my rank if connected */}
          {walletAddress && myRank && (
            <Card className="p-6 bg-gradient-to-r from-game-primary/10 to-game-secondary/10 border-2 border-game-primary/30 text-center mt-6">
              <h3 className="text-xl font-bold mb-4 text-game-primary">🏆 Your Rank</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Rank:</span>
                  <span className="font-bold text-2xl text-game-primary">#{myRank.rank}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <span className="font-bold text-xl text-game-secondary">{myRank.best_score}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Wallet:</span>
                  <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              </div>
            </Card>
          )}
          <div className="text-center">
            <Button 
              onClick={() => navigate('/')}
              className="bg-game-primary hover:bg-game-primary/80 text-white px-8 py-3"
            >
              Back to Game
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;