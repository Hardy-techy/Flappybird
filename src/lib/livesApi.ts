import { supabase } from './supabaseClient';

// Get both lives and best_score
export async function getPlayerStats(wallet: string): Promise<{ lives: number, best_score: number }> {
  const { data, error, status } = await supabase
    .from('player_stats')
    .select('lives, best_score')
    .eq('wallet', wallet)
    .maybeSingle();
  if (error && status !== 406) throw error;
  return { lives: data?.lives ?? 0, best_score: data?.best_score ?? 0 };
}

export async function setLives(wallet: string, lives: number) {
  // Fetch current best_score, or default to 0
  const { best_score } = await getPlayerStats(wallet);
  const { error } = await supabase
    .from('player_stats')
    .upsert({ wallet, lives, best_score });
  if (error) throw error;
}

export async function setBestScore(wallet: string, best_score: number) {
  const { lives } = await getPlayerStats(wallet);
  const { error } = await supabase
    .from('player_stats')
    .upsert({ wallet, lives, best_score });
  if (error) throw error;
}

export async function decrementLives(wallet: string) {
  const { lives, best_score } = await getPlayerStats(wallet);
  if (lives > 0) {
    const { error } = await supabase
      .from('player_stats')
      .upsert({ wallet, lives: lives - 1, best_score });
    if (error) throw error;
  }
}

export async function getLeaderboard(limit = 10) {
  const { data, error } = await supabase
    .from('player_stats')
    .select('wallet, best_score')
    .order('best_score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
} 