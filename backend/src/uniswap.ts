const UNISWAP_API_URL = process.env.UNISWAP_API_URL || 'https://trading-api-labs.interface.gateway.uniswap.org/v1';
const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY || '';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '11155111');

// Token addresses — Sepolia defaults
const TOKEN_MAP: Record<string, { address: string; decimals: number }> = {
  ETH:  { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  WETH: { address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', decimals: 18 },
  USDC: { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
  UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 }
};

// Mainnet addresses (for fallback quotes)
const MAINNET_TOKEN_MAP: Record<string, { address: string; decimals: number }> = {
  ETH:  { address: '0x0000000000000000000000000000000000000000', decimals: 18 },
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  UNI:  { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 }
};

function getTokenAddress(symbol: string, mainnet = false): { address: string; decimals: number } | null {
  const map = mainnet ? MAINNET_TOKEN_MAP : TOKEN_MAP;
  return map[symbol.toUpperCase()] ?? null;
}

function parseAmount(amount: string, decimals: number): string {
  const parts = amount.split('.');
  const whole = parts[0];
  const fraction = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + fraction).toString();
}

export async function getQuote(tokenInSymbol: string, tokenOutSymbol: string, amount: string) {
  const tokenIn = getTokenAddress(tokenInSymbol);
  const tokenOut = getTokenAddress(tokenOutSymbol);

  if (!tokenIn || !tokenOut) {
    throw new Error(`Unknown token: ${!tokenIn ? tokenInSymbol : tokenOutSymbol}`);
  }

  // Use WETH address for ETH in quotes
  const inputAddress = tokenInSymbol.toUpperCase() === 'ETH' ? getTokenAddress('WETH')!.address : tokenIn.address;
  const outputAddress = tokenOutSymbol.toUpperCase() === 'ETH' ? getTokenAddress('WETH')!.address : tokenOut.address;

  const amountRaw = parseAmount(amount, tokenIn.decimals);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (UNISWAP_API_KEY) {
    headers['x-api-key'] = UNISWAP_API_KEY;
  }

  try {
    const res = await fetch(`${UNISWAP_API_URL}/quote`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'EXACT_INPUT',
        tokenInChainId: CHAIN_ID,
        tokenOutChainId: CHAIN_ID,
        tokenIn: inputAddress,
        tokenOut: outputAddress,
        amount: amountRaw,
        swapper: '0x0000000000000000000000000000000000000000',
        urgency: 'normal'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[uniswap] Quote API error (${res.status}):`, errText);
      // Return mock data for demo
      return getMockQuote(tokenInSymbol, tokenOutSymbol, amount);
    }

    const data = await res.json();
    return formatQuoteResponse(data, tokenInSymbol, tokenOutSymbol, amount);
  } catch (err) {
    console.warn('[uniswap] Quote fetch failed, using mock:', err);
    return getMockQuote(tokenInSymbol, tokenOutSymbol, amount);
  }
}

function formatQuoteResponse(data: any, tokenIn: string, tokenOut: string, amount: string) {
  const tokenOutInfo = getTokenAddress(tokenOut);
  const outputDecimals = tokenOutInfo?.decimals ?? 18;

  let amountOut = '0';
  if (data.quote?.amountOut) {
    const raw = BigInt(data.quote.amountOut);
    amountOut = (Number(raw) / Math.pow(10, outputDecimals)).toFixed(outputDecimals > 6 ? 6 : 2);
  }

  return {
    tokenIn: { address: getTokenAddress(tokenIn)?.address ?? '', symbol: tokenIn.toUpperCase(), name: tokenIn, decimals: getTokenAddress(tokenIn)?.decimals ?? 18 },
    tokenOut: { address: getTokenAddress(tokenOut)?.address ?? '', symbol: tokenOut.toUpperCase(), name: tokenOut, decimals: outputDecimals },
    amountIn: amount,
    amountOut,
    priceImpact: data.quote?.priceImpact ?? '< 0.01',
    gasEstimate: data.quote?.gasFee ?? '~0.001 ETH',
    route: data.quote?.route ?? `${tokenIn} → ${tokenOut}`,
    timestamp: new Date().toISOString()
  };
}

function getMockQuote(tokenIn: string, tokenOut: string, amount: string) {
  const prices: Record<string, number> = { ETH: 2400, WETH: 2400, USDC: 1, UNI: 7.5 };
  const inPrice = prices[tokenIn.toUpperCase()] ?? 1;
  const outPrice = prices[tokenOut.toUpperCase()] ?? 1;
  const amountOut = (parseFloat(amount) * inPrice / outPrice).toFixed(tokenOut.toUpperCase() === 'USDC' ? 2 : 6);

  return {
    tokenIn: { address: getTokenAddress(tokenIn)?.address ?? '', symbol: tokenIn.toUpperCase(), name: tokenIn, decimals: getTokenAddress(tokenIn)?.decimals ?? 18 },
    tokenOut: { address: getTokenAddress(tokenOut)?.address ?? '', symbol: tokenOut.toUpperCase(), name: tokenOut, decimals: getTokenAddress(tokenOut)?.decimals ?? 18 },
    amountIn: amount,
    amountOut,
    priceImpact: '< 0.01',
    gasEstimate: '~0.001 ETH',
    route: `${tokenIn.toUpperCase()} → ${tokenOut.toUpperCase()} (mock)`,
    timestamp: new Date().toISOString()
  };
}

// Cached prices for sidebar display
const priceCache = new Map<string, { price: number; timestamp: number }>();

export async function getTokenPrice(symbol: string): Promise<number> {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < 60_000) {
    return cached.price;
  }

  // Use a small quote to derive price
  try {
    const quote = await getQuote(symbol, 'USDC', '1');
    const price = parseFloat(quote.amountOut);
    priceCache.set(symbol, { price, timestamp: Date.now() });
    return price;
  } catch {
    // Fallback mock prices
    const mockPrices: Record<string, number> = { ETH: 2400, WETH: 2400, USDC: 1, UNI: 7.5 };
    return mockPrices[symbol.toUpperCase()] ?? 0;
  }
}

export function getAvailableTokens() {
  return Object.entries(TOKEN_MAP).map(([symbol, info]) => ({
    symbol,
    address: info.address,
    name: symbol,
    decimals: info.decimals
  }));
}
