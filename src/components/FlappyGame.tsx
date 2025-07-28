import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFlappyLivesContract } from '@/hooks/useFlappyLivesContract';
import { setBestScore, decrementLives, getUnlockedThemes } from '@/lib/secureLivesApi';

// Theme definitions
const THEMES = {
  classic: {
    name: 'Classic',
    background: 'linear-gradient(to bottom, #87CEEB 0%, #98E4FF 100%)',
    pipeColor: '#2ECC71',
    birdColor: '#FFD700',
    unlocked: true
  },
  sunset: {
    name: 'Sunset',
    background: 'linear-gradient(to bottom, #FF6B6B 0%, #FFE66D 50%, #4ECDC4 100%)',
    pipeColor: '#8B4513',
    birdColor: '#FFD700',
    unlocked: true // Will be locked by default later
  },
  night: {
    name: 'Night',
    background: 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    pipeColor: '#4A90E2',
    birdColor: '#FFD700',
    unlocked: true // Will be locked by default later
  },
  forest: {
    name: 'Forest',
    background: 'linear-gradient(to bottom, #228B22 0%, #32CD32 50%, #90EE90 100%)',
    pipeColor: '#8B4513',
    birdColor: '#FFD700',
    unlocked: true // Will be locked by default later
  },
  space: {
    name: 'Space',
    background: 'linear-gradient(to bottom, #000428 0%, #004e92 100%)',
    pipeColor: '#FFD700',
    birdColor: '#FF6B6B',
    unlocked: true // Will be locked by default later
  }
};

interface GameState {
  birdY: number;
  birdVelocity: number;
  pipes: Array<{ x: number; gap: number; height: number; passed: boolean }>;
  score: number;
  isPlaying: boolean;
  gameOver: boolean;
}

interface FlappyGameProps {
  walletAddress: string | null;
  lives: number | null;
  bestScore: number | null;
  refreshPlayerStats: () => void;
  refreshLeaderboard: () => void;
}

const GRAVITY = 0.5;
const JUMP_FORCE = -8;
const PIPE_WIDTH = 80;
const PIPE_SPEED = 4;
const PIPE_GAP = 110;
const BIRD_SIZE = 34;
const FIXED_TIME_STEP = 1000 / 60; // 16.67ms for 60 FPS

const FlappyGame: React.FC<FlappyGameProps> = ({ walletAddress, lives, bestScore, refreshPlayerStats, refreshLeaderboard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('classic');
  const [unlockedThemes, setUnlockedThemes] = useState<Set<keyof typeof THEMES>>(new Set(['classic']));

  // Function to check and unlock themes based on server-side conditions
  const checkThemeUnlocks = useCallback(async () => {
    if (!walletAddress) {
      // No wallet connected, only classic available
      setUnlockedThemes(new Set<keyof typeof THEMES>(['classic']));
      return;
    }

    try {
      // Get unlocked themes from server (secure validation)
      const unlockedThemeList = await getUnlockedThemes(walletAddress);
      const newUnlocked = new Set<keyof typeof THEMES>(unlockedThemeList as Array<keyof typeof THEMES>);
      setUnlockedThemes(newUnlocked);
    } catch (error) {
      console.error('Failed to get unlocked themes:', error);
      // Fallback to only classic
      setUnlockedThemes(new Set<keyof typeof THEMES>(['classic']));
    }
  }, [walletAddress]);

  // Check theme unlocks when wallet or best score changes
  useEffect(() => {
    checkThemeUnlocks();
  }, [checkThemeUnlocks, bestScore]);
  
  const [gameState, setGameState] = useState<GameState>({
    birdY: 300,
    birdVelocity: 0,
    pipes: [],
    score: 0,
    isPlaying: false,
    gameOver: false
  });

  const { contract } = useFlappyLivesContract();
  const [localLives, setLocalLives] = useState<number | null>(lives);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const { toast } = useToast();

  // Replace all refreshLives with refreshPlayerStats
  useEffect(() => {
    setLocalLives(lives);
  }, [lives]);

  // Reset the flag when lives are replenished
  useEffect(() => {
    if (localLives && localLives > 0) {
      setIsNewHighScore(false);
    }
  }, [localLives]);

  const resetGame = useCallback(() => {
    setGameState({
      birdY: 300,
      birdVelocity: 0,
      pipes: [
        { x: 800, gap: Math.random() * 150 + 120, height: Math.random() * 200 + 100, passed: false },
        { x: 1100, gap: Math.random() * 150 + 120, height: Math.random() * 200 + 100, passed: false }
      ],
      score: 0,
      isPlaying: false,
      gameOver: false
    });
  }, []);

  const jump = useCallback(() => {
    // Removed debug logs for production
    setGameState(prev => ({
      ...prev,
      birdVelocity: JUMP_FORCE
    }));
  }, [gameState.isPlaying, gameState.gameOver]);

  // Remove startGame function and related UI
  // Add logic to start the game on first click or SPACE press, and trigger the first jump
  const handleFirstFlap = useCallback(() => {
    if (localLives === null) {
      toast({
        title: "Loading Lives",
        description: "Please wait while we fetch your lives from the backend.",
        variant: "default"
      });
      return;
    }
    if (localLives <= 0) {
      toast({
        title: "No Lives Left",
        description: "Purchase more lives to continue playing!",
        variant: "destructive"
      });
      return;
    }
    // Allow starting a new game if not currently playing (even if game over)
    if (!gameState.isPlaying) {
      setLocalLives(l => (l !== null ? l - 1 : l));
      if (walletAddress && localLives > 0) {
        decrementLives(walletAddress).then(() => refreshPlayerStats());
      }
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      gameOver: false,
      birdY: 300,
        birdVelocity: JUMP_FORCE, // Auto-jump on first flap
      pipes: [
        { x: 800, gap: Math.random() * 150 + 120, height: Math.random() * 200 + 100, passed: false },
        { x: 1100, gap: Math.random() * 150 + 120, height: Math.random() * 200 + 100, passed: false }
      ],
      score: 0
    }));
    } else {
      jump();
    }
  }, [localLives, toast, walletAddress, refreshPlayerStats, gameState.isPlaying, jump]);

  const handleScoreUpdate = useCallback(async (score: number) => {
    if (walletAddress) {
      try {
        // Use bestScore prop directly
        if (typeof bestScore === 'number' && score > bestScore) {
          toast({
            title: "🎉 New High Score!",
            description: `Your score of ${score} has been saved!`,
          });
          await setBestScore(walletAddress, score);
          setIsNewHighScore(true);
          refreshLeaderboard();
          refreshPlayerStats();
        } else {
          setIsNewHighScore(false);
        }
      } catch (err: any) {
        toast({
          title: "Error",
          description: "Failed to save your score. Please try again.",
          variant: "destructive"
        });
      }
    }
  }, [walletAddress, bestScore, refreshLeaderboard, refreshPlayerStats, toast]);

  // Reset isNewHighScore on new game
  useEffect(() => {
    if (gameState.isPlaying === true) {
      setIsNewHighScore(false);
    }
  }, [gameState.isPlaying]);

  const gameLoop = useCallback(() => {
    setGameState(prev => {
      if (!prev.isPlaying || prev.gameOver) {
        return prev;
      }

      // Fixed time step physics update
      const newBirdY = prev.birdY + prev.birdVelocity;
      const newVelocity = prev.birdVelocity + GRAVITY;

      // Check ground and ceiling collision
      if (newBirdY >= 550 || newBirdY <= 0) {
        handleScoreUpdate(prev.score);
        return { ...prev, gameOver: true, isPlaying: false };
      }

      // Update pipes
      const newPipes = prev.pipes.map(pipe => ({
        ...pipe,
        x: pipe.x - PIPE_SPEED
      })).filter(pipe => pipe.x > -PIPE_WIDTH);

// Add new pipe with consistent spacing (like original Flappy Bird)
      const PIPE_SPACING = 300; // Distance between pipes
      const lastPipe = newPipes[newPipes.length - 1];
      
      // Spawn new pipe when the last pipe has moved enough distance
      if (!lastPipe || lastPipe.x <= 800 - PIPE_SPACING) {
        newPipes.push({
          x: lastPipe ? lastPipe.x + PIPE_SPACING : 800,
          gap: Math.random() * 150 + 120, // Slightly smaller range for better gameplay
          height: Math.random() * 200 + 100,
          passed: false
        });
      }

      // Check collisions and score
      let newScore = prev.score;
      const birdLeft = 100;
      const birdRight = birdLeft + BIRD_SIZE;
      const birdTop = newBirdY;
      const birdBottom = newBirdY + BIRD_SIZE;

      for (let pipe of newPipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        
        // Check if bird passed pipe
        if (!pipe.passed && birdLeft > pipeRight) {
          pipe.passed = true;
          newScore++;
        }

        // Check collision - more precise collision detection matching visual bird
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          const topPipeBottom = pipe.height;
          const bottomPipeTop = pipe.height + pipe.gap;
          
          // Use smaller collision box that matches the visual bird (oval shape)
          const birdCenterX = birdLeft + BIRD_SIZE / 2;
          const birdCenterY = newBirdY + BIRD_SIZE / 2;
          const birdRadiusX = 16; // Match the visual bird oval width
          const birdRadiusY = 12; // Match the visual bird oval height
          
          // Check if bird center is within pipe boundaries
          const birdCollisionTop = birdCenterY - birdRadiusY;
          const birdCollisionBottom = birdCenterY + birdRadiusY;
          const birdCollisionLeft = birdCenterX - birdRadiusX;
          const birdCollisionRight = birdCenterX + birdRadiusX;
          
          if (birdCollisionTop < topPipeBottom || birdCollisionBottom > bottomPipeTop) {
            handleScoreUpdate(newScore);
            return { ...prev, gameOver: true, isPlaying: false, score: newScore };
          }
        }
      }

      return {
        ...prev,
        birdY: newBirdY,
        birdVelocity: newVelocity,
        pipes: newPipes,
        score: newScore
      };
    });
  }, [handleScoreUpdate]);

  // Fixed time step game loop (industry standard)
  useEffect(() => {
    if (gameState.isPlaying && !gameState.gameOver) {
      const animate = (currentTime: number) => {
        // Calculate delta time
        const deltaTime = currentTime - lastTimeRef.current;
        lastTimeRef.current = currentTime;
        
        // Accumulate time
        accumulatorRef.current += deltaTime;
        
        // Run physics updates at fixed time step
        while (accumulatorRef.current >= FIXED_TIME_STEP) {
          gameLoop();
          accumulatorRef.current -= FIXED_TIME_STEP;
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      // Initialize time reference
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [gameState.isPlaying, gameState.gameOver, gameLoop]);

  // Canvas rendering with authentic Flappy Bird graphics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with current theme background
    const currentThemeData = THEMES[currentTheme];
    
    // Create gradient based on current theme
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    if (currentTheme === 'classic') {
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#98E4FF');
    } else if (currentTheme === 'sunset') {
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(0.5, '#FFE66D');
      gradient.addColorStop(1, '#4ECDC4');
    } else if (currentTheme === 'night') {
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(0.5, '#16213e');
      gradient.addColorStop(1, '#0f3460');
    } else if (currentTheme === 'forest') {
      gradient.addColorStop(0, '#228B22');
      gradient.addColorStop(0.5, '#32CD32');
      gradient.addColorStop(1, '#90EE90');
    } else if (currentTheme === 'space') {
      gradient.addColorStop(0, '#000428');
      gradient.addColorStop(1, '#004e92');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 5; i++) {
      const x = (i * 200 + Date.now() * 0.02) % (canvas.width + 100);
      const y = 50 + i * 30;
      drawCloud(ctx, x, y);
    }

    // Draw pipes with authentic look
    gameState.pipes.forEach(pipe => {
      drawPipe(ctx, pipe.x, 0, PIPE_WIDTH, pipe.height, true); // Top pipe
      drawPipe(ctx, pipe.x, pipe.height + pipe.gap, PIPE_WIDTH, canvas.height - pipe.height - pipe.gap, false); // Bottom pipe
    });

    // Draw bird with authentic look
    drawBird(ctx, 100, gameState.birdY);

    // Draw ground
    ctx.fillStyle = '#DEB887'; // Sandy brown
    ctx.fillRect(0, 550, canvas.width, 50);
    
    // Add grass texture on ground
    ctx.fillStyle = '#228B22';
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.fillRect(x, 550, 10, 8);
    }
  }, [gameState, currentTheme]);

  // Helper function to draw cloud
  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 20, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 40, y, 15, 0, Math.PI * 2);
    ctx.fill();
  };

  // Helper function to draw authentic pipe
  const drawPipe = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isTop: boolean) => {
    // Main pipe body
    ctx.fillStyle = '#228B22'; // Green
    ctx.fillRect(x, y, width, height);
    
    // Pipe cap (wider part)
    const capHeight = 30;
    const capWidth = width + 10;
    const capX = x - 5;
    
    if (isTop) {
      ctx.fillRect(capX, y + height - capHeight, capWidth, capHeight);
    } else {
      ctx.fillRect(capX, y, capWidth, capHeight);
    }
    
    // Pipe highlights
    ctx.fillStyle = '#32CD32'; // Lighter green
    ctx.fillRect(x + 5, y, 8, height);
    
    // Pipe shadows
    ctx.fillStyle = '#006400'; // Darker green
    ctx.fillRect(x + width - 8, y, 8, height);
  };

  // Helper function to draw authentic bird
  const drawBird = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const centerX = x + BIRD_SIZE / 2;
    const centerY = y + BIRD_SIZE / 2;
    
    // Calculate rotation based on velocity (authentic Flappy Bird feel)
    const rotation = Math.max(-0.4, Math.min(0.4, gameState.birdVelocity * 0.06));
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    
    // Bird body (oval shape like original)
    ctx.fillStyle = '#FFD700'; // Yellow
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bird outline
    ctx.strokeStyle = '#FFA500';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Bird beak
    ctx.fillStyle = '#FF8C00'; // Orange
    ctx.beginPath();
    ctx.moveTo(12, -3);
    ctx.lineTo(20, 0);
    ctx.lineTo(12, 3);
    ctx.fill();
    
    // Bird eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(3, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(5, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing (animated flap)
    ctx.fillStyle = '#FF6347'; // Red wing
    ctx.beginPath();
    const wingFlap = Math.sin(Date.now() * 0.015) * 0.3;
    ctx.ellipse(-3, 2, 10, 6, wingFlap, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing outline
    ctx.strokeStyle = '#DC143C';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFirstFlap();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleFirstFlap]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <Card className="p-6 bg-card border-game-primary/20">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleFirstFlap}
            className="border-2 rounded-lg cursor-pointer shadow-lg"
            style={{
              background: THEMES[currentTheme].background,
              borderColor: THEMES[currentTheme].pipeColor
            }}
          />
          
          {/* Theme Selector */}
          {!gameState.isPlaying && !gameState.gameOver && (
            <div className="absolute top-4 right-4 z-50">
              <div className="bg-card p-3 rounded-lg border border-game-primary/30 shadow-lg">
                <label className="text-xs text-muted-foreground block mb-1">Theme:</label>
                <select 
                  value={currentTheme} 
                  onChange={(e) => {
                    const newTheme = e.target.value as keyof typeof THEMES;
                    setCurrentTheme(newTheme);
                  }}
                  className="text-xs bg-background border border-muted rounded px-2 py-1 cursor-pointer hover:border-game-primary/50"
                >
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <option key={key} value={key} disabled={!unlockedThemes.has(key as keyof typeof THEMES)}>
                      {theme.name} {!unlockedThemes.has(key as keyof typeof THEMES) ? '🔒' : ''}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground mt-1">
                  Current: {THEMES[currentTheme].name}
                </div>
              </div>
            </div>
          )}
          
          {/* Game UI Overlay */}
          <div className="absolute top-4 left-4 text-white drop-shadow-lg">
            <div className="text-3xl font-bold text-yellow-300 stroke-black" style={{ textShadow: '2px 2px 0px black' }}>
              Score: {gameState.score}
            </div>
          </div>

          {!gameState.isPlaying && !gameState.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-card/90 p-6 rounded-lg border border-game-primary/30">
                <h3 className="text-xl font-bold mb-4 text-foreground">Flappy Somnia</h3>
                <p className="text-muted-foreground mb-4">Click or press SPACE to flap!</p>
                <Button onClick={handleFirstFlap} className="bg-game-primary hover:bg-game-primary/80">
                  Start Game
                </Button>
              </div>
            </div>
          )}

          {gameState.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-card/90 p-6 rounded-lg border border-game-danger/30">
                <h3 className="text-xl font-bold mb-2 text-game-danger">Game Over!</h3>
                <p className="text-lg mb-4 text-foreground">Final Score: {gameState.score}</p>
                {isNewHighScore && (
                  <p className="text-lg mb-4 text-game-success">New High Score!</p>
                )}
                <div className="space-x-2">
                  <Button onClick={resetGame} variant="outline">
                    Reset
                  </Button>
                  <Button onClick={handleFirstFlap} className="bg-game-primary hover:bg-game-primary/80">
                    Play Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      <div className="text-center text-muted-foreground">
        <p>Lives remaining: <span className="text-game-secondary font-bold">{localLives}</span></p>
        <p className="text-sm">Each game costs 1 life</p>
      </div>
    </div>
  );
};

export default FlappyGame;