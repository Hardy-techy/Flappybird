import React from 'react';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface LeaderboardEntry {
  wallet: string;
  best_score: number;
}

interface LeaderboardProps {
  scores: LeaderboardEntry[];
  showMoreButton?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ scores, showMoreButton = false }) => {
  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <Card className="p-6 bg-card border-game-primary/20">
      <h3 className="text-xl font-bold mb-4 text-center text-foreground">🏆 Leaderboard</h3>
      
      {scores.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No scores yet!</p>
          <p className="text-sm">Be the first to set a high score!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scores.map((entry, index) => (
            <div
              key={entry.wallet}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                index === 0
                  ? 'bg-game-primary/10 border-game-primary/30 text-game-primary'
                  : index === 1
                  ? 'bg-game-secondary/10 border-game-secondary/30 text-game-secondary'
                  : index === 2
                  ? 'bg-game-warning/10 border-game-warning/30 text-game-warning'
                  : 'bg-muted/50 border-muted text-foreground'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="font-bold text-lg">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="font-mono text-sm">
                  {formatWallet(entry.wallet)}
                </span>
              </div>
              <span className="font-bold text-lg">
                {entry.best_score}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {showMoreButton && (
      <div className="mt-4 text-center">
        <p className="text-xs text-muted-foreground">
          Leaderboard shows best score per wallet
        </p>
          <Link to="/leaderboard">
            <button className="mt-2 bg-game-primary hover:bg-game-primary/80 text-white font-semibold px-4 py-2 rounded transition-colors">
              Show More
            </button>
          </Link>
      </div>
      )}
    </Card>
  );
};

export default Leaderboard;