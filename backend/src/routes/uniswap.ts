import { Router } from 'express';
import { getQuote, getTokenPrice, getAvailableTokens } from '../uniswap.js';

const router = Router();

router.get('/uniswap/tokens', (_req, res) => {
  res.json(getAvailableTokens());
});

router.post('/uniswap/quote', async (req, res) => {
  const { tokenIn, tokenOut, amount } = req.body;

  if (!tokenIn || !tokenOut || !amount) {
    res.status(400).json({ error: 'tokenIn, tokenOut, and amount required' });
    return;
  }

  try {
    const quote = await getQuote(tokenIn, tokenOut, amount);
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/uniswap/price/:symbol', async (req, res) => {
  const { symbol } = req.params;
  try {
    const price = await getTokenPrice(symbol);
    res.json({
      symbol: symbol.toUpperCase(),
      priceUsd: price,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
