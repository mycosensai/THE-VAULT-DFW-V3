# KRYPTO DASHBOARD v5.0 - DISCIPLINED MOMENTUM TRADER

## Philosophy
**Rationality over greed. Discipline over emotion.**

This bot enforces strict risk management that cannot be overridden:
- 2% max risk per trade
- 2-10% profit targets (scaled by momentum)
- -2% hard stop loss (no exceptions)
- Max 5 positions
- 5min cooldown after 3 consecutive losses

## Quick Start
```bash
cd krypto_dashboard
pip install flask flask-cors
python server.py
```
Open http://localhost:5000

## Trading Rules (Hardcoded)
| Rule | Value | Rationale |
|------|-------|-----------|
| Risk/Trade | 2% | Kelly Criterion optimal |
| Min Profit | 2% | Covers fees + spread |
| Max Profit | 10% | Strong momentum only |
| Stop Loss | -2% | Preserves capital |
| Trailing Stop | 1% | Protects gains after 3% |
| Max Positions | 5 | Diversification limit |
| Daily Loss Limit | -5% | Stop trading for day |
| Consec Losses | 3 | Reduce size 50% |
| Cooldown | 5min | Emotional reset |
| Rotation | 5min | Chase momentum |

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│  NEO-CYBERPUNK DASHBOARD (HTML/CSS/JS)                  │
├─────────────────────────────────────────────────────────┤
│  Flask Server                                           │
│  ├─ DisciplinedTrader (risk management)               │
│  ├─ OpenMythos Engine (momentum prediction)             │
│  ├─ Position Tracker (P&L, stops, targets)            │
│  └─ SQLite DB (trades, stats)                          │
├─────────────────────────────────────────────────────────┤
│  Coinbase API | Solana Wallet                          │
└─────────────────────────────────────────────────────────┘
```

## Momentum Rotation
Every 5 minutes, the bot:
1. Calculates 20-period momentum for all 6 assets
2. Ranks by momentum strength
3. Rotates to highest momentum asset
4. Scales profit target: weak=2%, medium=5%, strong=10%

## Exit Triggers
1. **Profit Target** - Scale: 2/5/10% based on momentum
2. **Trailing Stop** - 1% pullback after 3% profit
3. **Hard Stop** - -2% (immediate, no exceptions)
4. **Time Decay** - Close if >4h and small profit
5. **Momentum Reversal** - Exit 50% if trend turns

## API Keys
- Coinbase: `1dfa7045-7c0b-4d92-9cae-9f06e5b478cc`
- Solana: `3tP86T2vq7k2SrNMqjqtXd4ES6trSFNLt6ArN12oksYW6PbB8pCf32fJF6e1dur1nAWzdc64D42get2WfGsLFevB`
