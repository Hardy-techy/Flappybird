import { supabase } from './supabaseClient';
import { ethers } from 'ethers';

// Session storage for wallet verification
let walletSession: { address: string; verified: boolean; timestamp: number } | null = null;
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Helper function to get wallet signature
async function getWalletSignature(walletAddress: string, message: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('MetaMask not found');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // Verify the signer matches the wallet address
  const signerAddress = await signer.getAddress();
  if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Wallet address mismatch');
  }

  // Sign the message
  const signature = await signer.signMessage(message);
  return signature;
}

// Helper function to create a timestamped message
function createMessage(action: string, walletAddress: string, data: any): string {
  const timestamp = Date.now();
  const messageData = {
    action,
    wallet: walletAddress.toLowerCase(),
    data,
    timestamp,
    nonce: Math.random().toString(36).substring(2, 15)
  };
  
  return `FlappySomnia:${JSON.stringify(messageData)}`;
}

// Verify wallet session or create new one
async function verifyWalletSession(wallet: string): Promise<boolean> {
  const now = Date.now();
  
  // Check if we have a valid session
  if (walletSession && 
      walletSession.address.toLowerCase() === wallet.toLowerCase() &&
      walletSession.verified &&
      (now - walletSession.timestamp) < SESSION_DURATION) {
    return true;
  }
  
  // Create new session with signature
  try {
    const message = createMessage('verify_session', wallet, { timestamp: now });
    const signature = await getWalletSignature(wallet, message);
    
    // Store session
    walletSession = {
      address: wallet.toLowerCase(),
      verified: true,
      timestamp: now
    };
    
    return true;
  } catch (error) {
    return false;
  }
}

// Pre-verify wallet session when wallet connects (no signature required for reading)
export async function preVerifyWalletSession(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  
  const now = Date.now();
  
  // Check if we have a valid session
  if (walletSession && 
      walletSession.address.toLowerCase() === wallet.toLowerCase() &&
      walletSession.verified &&
      (now - walletSession.timestamp) < SESSION_DURATION) {
    return true;
  }
  
  // Try to create new session
  try {
    const message = createMessage('verify_session', wallet, { timestamp: now });
    const signature = await getWalletSignature(wallet, message);
    
    // Store session
    walletSession = {
      address: wallet.toLowerCase(),
      verified: true,
      timestamp: now
    };
    
    return true;
  } catch (error) {
    return false;
  }
}

// Clear session when wallet changes
export function clearWalletSession() {
  walletSession = null;
}

// Check if session is valid without requiring signature
export function isSessionValid(wallet: string): boolean {
  if (!wallet || !walletSession) return false;
  
  const now = Date.now();
  return walletSession.address.toLowerCase() === wallet.toLowerCase() &&
         walletSession.verified &&
         (now - walletSession.timestamp) < SESSION_DURATION;
}

// Secure version of getPlayerStats - uses session verification
export async function getPlayerStats(wallet: string): Promise<{ lives: number, best_score: number }> {
  if (!wallet) {
    console.log('No wallet address provided for getPlayerStats');
    return { lives: 0, best_score: 0 };
  }

  try {
    console.log('Attempting to get player stats for wallet:', wallet);
    const { data, error, status } = await supabase
      .from('player_stats')
      .select('lives, best_score')
      .eq('wallet', wallet.toLowerCase())
      .maybeSingle();
      
    console.log('Player stats result:', { data, error, status });
    
    if (error && status !== 406) throw error;
    return { lives: data?.lives ?? 0, best_score: data?.best_score ?? 0 };
  } catch (error) {
    console.error('Error getting player stats:', error);
    return { lives: 0, best_score: 0 };
  }
}

// Set lives without session verification
export async function setLives(wallet: string, lives: number) {
  // Fetch current best_score to maintain data integrity
  const { best_score } = await getPlayerStats(wallet);
  
  const { error } = await supabase
    .from('player_stats')
    .upsert({ 
      wallet: wallet.toLowerCase(), 
      lives, 
      best_score,
      updated_at: new Date().toISOString()
    });
    
  if (error) throw error;
}

// Set best score without session verification
export async function setBestScore(wallet: string, best_score: number) {
  // Fetch current lives to maintain data integrity
  const { lives } = await getPlayerStats(wallet);
  
  const { error } = await supabase
    .from('player_stats')
    .upsert({ 
      wallet: wallet.toLowerCase(), 
      lives, 
      best_score,
      updated_at: new Date().toISOString()
    });
    
  if (error) throw error;
}

// Decrement lives without session verification
export async function decrementLives(wallet: string) {
  const { lives, best_score } = await getPlayerStats(wallet);
  
  if (lives > 0) {
    const { error } = await supabase
      .from('player_stats')
      .upsert({ 
        wallet: wallet.toLowerCase(), 
        lives: lives - 1, 
        best_score,
        updated_at: new Date().toISOString()
      });
      
    if (error) throw error;
  }
}

// Public leaderboard (no verification needed for reading)
export async function getLeaderboard(limit = 10) {
  try {
    console.log('Attempting to get leaderboard with limit:', limit);
    const { data, error } = await supabase
      .from('player_stats')
      .select('wallet, best_score')
      .order('best_score', { ascending: false })
      .limit(limit);
      
    console.log('Leaderboard result:', { data, error });
    
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

// Get player rank in leaderboard
export async function getPlayerRank(wallet: string): Promise<{ rank: number; best_score: number } | null> {
  try {
    // Get player's best score
    const { best_score } = await getPlayerStats(wallet);
    
    if (best_score === 0) {
      return null; // No score yet
    }
    
    // Count how many players have higher scores
    const { count, error } = await supabase
      .from('player_stats')
      .select('*', { count: 'exact', head: true })
      .gt('best_score', best_score);
      
    if (error) throw error;
    
    // Rank is count + 1 (1-based ranking)
    const rank = (count || 0) + 1;
    
    return { rank, best_score };
  } catch (error) {
    console.error('Failed to get player rank:', error);
    return null;
  }
}

// Get unlocked themes from server (secure)
export async function getUnlockedThemes(wallet: string): Promise<string[]> {
  try {
    // Only Classic is unlocked - all others are locked
    const unlockedThemes: string[] = ['classic'];
    
    // TODO: Add your custom unlock conditions here in the future
    // Example:
    // if (someCustomCondition) {
    //   unlockedThemes.push('sunset');
    // }
    
    return unlockedThemes;
  } catch (error) {
    return ['classic']; // Fallback to only classic
  }
} 