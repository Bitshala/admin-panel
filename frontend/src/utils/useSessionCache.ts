// utils/useSessionCache.ts
export async function useSessionCache<T>(
  key: string,
  getter: () => Promise<T>,      
  maxAgeMs = 50 * 60_000        
): Promise<T> {
  const cached = sessionStorage.getItem(key);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < maxAgeMs) return data as T;   // still fresh
  }

  const data = await getter();                 // go to the network
  sessionStorage.setItem(
    key,
    JSON.stringify({ timestamp: Date.now(), data })
  );
  return data as T;
}
