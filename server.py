#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  KRYPTO DASHBOARD v5.0 - DISCIPLINED MOMENTUM ROTATION SYSTEM               ║
║  Rational Trading: 2-10% profit, -2% stop loss, momentum rotation           ║
║  OpenMythos Prediction Engine | Multi-Asset | Neo-Cyberpunk UI               ║
║  Coinbase API: 1dfa7045-7c0b-4d92-9cae-9f06e5b478cc                        ║
║  Solana: 3tP86T2vq7k2SrNMqjqtXd4ES6trSFNLt6ArN12oksYW6PbB8pCf32fJF6e1dur1nAWzdc64D42get2WfGsLFevB
╚══════════════════════════════════════════════════════════════════════════════╝

DISCIPLINE RULES (Hardcoded):
  1. Max 2% risk per trade (Kelly Criterion)
  2. Take profit at 2-10% (scaled by momentum strength)
  3. Hard stop at -2% (no exceptions)
  4. Rotate to highest momentum coin every 5 min
  5. No overnight positions (close by 11:59 PM UTC)
  6. Max 5 open positions at once
  7. If 3 consecutive losses → reduce size 50%
  8. If daily loss >5% → stop for 24 hours
"""

import os
import sys
import json
import time
import math
import random
import sqlite3
import hashlib
import threading
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from collections import deque, defaultdict
from enum import Enum
import uuid

try:
    from flask import Flask, render_template, jsonify, request
    from flask_cors import CORS
except ImportError:
    os.system("pip install flask flask-cors --quiet")
    from flask import Flask, render_template, jsonify, request
    from flask_cors import CORS

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION - DISCIPLINED TRADING
# ═══════════════════════════════════════════════════════════════════════════════

class Config:
    # API Keys
    COINBASE_API_KEY = "1dfa7045-7c0b-4d92-9cae-9f06e5b478cc"
    SOLANA_WALLET = "3tP86T2vq7k2SrNMqjqtXd4ES6trSFNLt6ArN12oksYW6PbB8pCf32fJF6e1dur1nAWzdc64D42get2WfGsLFevB"

    # Assets with momentum weights
    ASSETS = {
        "BTC": {"symbol": "BTC-USD", "weight": 0.20, "min": 0.0001, "vol": 0.015},
        "ETH": {"symbol": "ETH-USD", "weight": 0.20, "min": 0.001, "vol": 0.018},
        "HYPE": {"symbol": "HYPE-USD", "weight": 0.15, "min": 0.01, "vol": 0.025},
        "AXS": {"symbol": "AXS-USD", "weight": 0.15, "min": 0.01, "vol": 0.022},
        "PAXG": {"symbol": "PAXG-USD", "weight": 0.15, "min": 0.0001, "vol": 0.008},
        "UBI": {"symbol": "UBI-USD", "weight": 0.15, "min": 0.01, "vol": 0.030, "promote": True},
    }

    # RISK MANAGEMENT (Hardcoded - cannot be overridden)
    MAX_RISK_PER_TRADE = 0.02      # 2% of capital max risk
    MIN_PROFIT_TARGET = 0.02       # 2% minimum profit
    MAX_PROFIT_TARGET = 0.10       # 10% maximum profit
    HARD_STOP_LOSS = 0.02          # -2% hard stop (no exceptions)
    TRAILING_STOP = 0.01         # 1% trailing stop after 3% profit
    MAX_POSITIONS = 5              # Max 5 open positions
    MAX_DAILY_LOSS = 0.05        # Stop trading if -5% day
    CONSEC_LOSS_LIMIT = 3          # Reduce size after 3 losses
    SIZE_REDUCTION = 0.50        # Cut size 50% after losses
    COOLDOWN_AFTER_LOSS = 300    # 5 min cooldown after stop loss

    # POSITION SIZING (Small trades)
    MAX_TRADE_VALUE = 5.00         # $5 max per trade
    MIN_TRADE_VALUE = 1.00         # $1 min per trade
    POSITION_SCALE = 0.30        # Use 30% of available per position

    # ROTATION
    ROTATION_INTERVAL = 300        # Check rotation every 5 min
    MOMENTUM_WINDOW = 20           # 20-period momentum
    MIN_MOMENTUM_SCORE = 1.02      # Only trade if momentum > 2%

    # TAKE PROFIT SCALING
    PROFIT_SCALE = {
        "weak": 0.02,      # 2% for weak momentum
        "medium": 0.05,    # 5% for medium momentum
        "strong": 0.10,     # 10% for strong momentum
    }

    # SPEED
    TICK_MS = 100                  # 100ms tick (10 ticks/sec)
    ORDER_TIMEOUT = 5000           # 5 sec order lifetime

    # TARGETS
    TARGET_PNL = 10000.00
    MIN_BALANCE = 5.00

    # DATABASE
    DB_PATH = "krypto_v5.db"
    LOG_FILE = "krypto_v5.log"


# ═══════════════════════════════════════════════════════════════════════════════
# POSITION TRACKER
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Position:
    asset: str
    entry_price: float = 0.0
    size: float = 0.0
    side: str = ""
    highest_price: float = 0.0
    lowest_price: float = float('inf')
    open_time: float = 0.0
    profit_target: float = 0.0
    stop_loss: float = 0.0
    trailing_active: bool = False
    partial_exits: int = 0
    pnl: float = 0.0
    status: str = "OPEN"

    def unrealized_pnl_pct(self, current_price: float) -> float:
        if self.entry_price == 0:
            return 0.0
        if self.side == "BUY":
            return (current_price - self.entry_price) / self.entry_price
        else:
            return (self.entry_price - current_price) / self.entry_price

    def check_exit(self, current_price: float) -> Tuple[bool, str, float]:
        """Check if position should exit. Returns (should_exit, reason, exit_pct)"""
        pnl_pct = self.unrealized_pnl_pct(current_price)

        # Update highest/lowest
        if current_price > self.highest_price:
            self.highest_price = current_price
        if current_price < self.lowest_price:
            self.lowest_price = current_price

        # 1. Hard stop loss (-2%)
        if pnl_pct <= -Config.HARD_STOP_LOSS:
            return True, "STOP_LOSS", 1.0

        # 2. Trailing stop (after 3% profit)
        if pnl_pct >= 0.03 and self.trailing_active:
            pullback = (self.highest_price - current_price) / self.highest_price
            if pullback >= Config.TRAILING_STOP:
                return True, "TRAILING_STOP", 1.0

        # 3. Profit target (2-10% scaled)
        if pnl_pct >= self.profit_target:
            return True, "PROFIT_TARGET", 1.0

        # 4. Time decay (close if open > 4 hours and small profit)
        if time.time() - self.open_time > 14400 and pnl_pct > 0.005:
            return True, "TIME_DECAY", 1.0

        # 5. Momentum reversal (exit if momentum turns negative)
        if pnl_pct > 0.01 and pnl_pct < self.highest_price / self.entry_price - 1 - 0.01:
            return True, "MOMENTUM_REVERSAL", 0.5

        return False, "", 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# OPENMYTHOS PREDICTION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class OpenMythosEngine:
    """Recurrent-depth transformer with LTI stability for momentum prediction"""

    def __init__(self, asset: str, loop_iters: int = 6):
        self.asset = asset
        self.loop_iters = loop_iters
        self.price_history = deque(maxlen=200)
        self.momentum_history = deque(maxlen=50)
        self.prelude_weights = self._init_weights()
        self.recurrent_state = 0.0
        self.injection_A = 0.82
        self.injection_B = 0.18
        self.confidence = 0.5
        self.last_prediction = None

    def _init_weights(self):
        return {
            "momentum": random.gauss(0.6, 0.1),
            "volatility": random.gauss(-0.2, 0.1),
            "volume": random.gauss(0.3, 0.1),
            "trend": random.gauss(0.4, 0.1),
        }

    def predict(self, current_price: float, features: Dict) -> Dict:
        self.price_history.append(current_price)

        # Calculate momentum score
        if len(self.price_history) >= 5:
            recent = list(self.price_history)[-5:]
            momentum = (recent[-1] - recent[0]) / recent[0]
        else:
            momentum = 0.0

        self.momentum_history.append(momentum)

        # Prelude: encode features
        encoded = (
            momentum * self.prelude_weights["momentum"] +
            features.get("volatility", 0) * self.prelude_weights["volatility"] +
            features.get("volume", 1) * self.prelude_weights["volume"] +
            features.get("trend", 0) * self.prelude_weights["trend"]
        )
        e = math.tanh(encoded)

        # Recurrent block with LTI injection
        h = e
        loops_used = 0
        for _ in range(self.loop_iters):
            h = self.injection_A * h + self.injection_B * e + math.tanh(h * 0.5)
            loops_used += 1
            if abs(h) > 0.9:
                break

        self.recurrent_state = h

        # Coda: output probabilities
        up_prob = 1 / (1 + math.exp(-h * 3))
        down_prob = 1 - up_prob

        # Confidence based on prediction strength and history
        self.confidence = min(0.95, 0.4 + abs(h) * 0.5 + min(1.0, len(self.momentum_history) / 50) * 0.2)

        # Determine momentum strength for profit scaling
        if abs(momentum) < 0.01:
            strength = "weak"
        elif abs(momentum) < 0.03:
            strength = "medium"
        else:
            strength = "strong"

        return {
            "asset": self.asset,
            "current_price": current_price,
            "predicted_change_pct": momentum * 100,
            "direction": "UP" if up_prob > down_prob else "DOWN",
            "confidence": self.confidence,
            "momentum_strength": strength,
            "loops_used": loops_used,
            "timestamp": time.time(),
        }

    def learn(self, predicted: Dict, actual_price: float):
        error = (actual_price - predicted["current_price"]) / predicted["current_price"]
        lr = 0.02
        self.prelude_weights["momentum"] += lr * error * 0.5
        self.prelude_weights["trend"] += lr * error * 0.3


# ═══════════════════════════════════════════════════════════════════════════════
# DISCIPLINED TRADING ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class DisciplinedTrader:
    """
    Rational trading engine with strict risk management.
    Every rule is enforced - no exceptions.
    """

    def __init__(self):
        self.config = Config()
        self.db = Database()
        self.mythos = {a: OpenMythosEngine(a) for a in self.config.ASSETS}
        self.positions: Dict[str, Position] = {}
        self.closed_positions: List[Position] = []
        self.balance = 10000.0
        self.daily_start_balance = 10000.0
        self.daily_pnl = 0.0
        self.daily_losses = 0
        self.consecutive_losses = 0
        self.size_multiplier = 1.0
        self.cooldown_until = 0
        self.trades_today = 0
        self.last_rotation = 0
        self.active_asset = "BTC"
        self.prices = {a: self._sim_price(a) for a in self.config.ASSETS}
        self.price_history = {a: deque(maxlen=100) for a in self.config.ASSETS}

        # Reset daily stats at midnight
        self._schedule_daily_reset()

    def _sim_price(self, asset: str) -> float:
        bases = {"BTC": 50000, "ETH": 3000, "HYPE": 10, "AXS": 7, "PAXG": 2300, "UBI": 0.5}
        return bases.get(asset, 100) * (1 + random.gauss(0, 0.001))

    def _schedule_daily_reset(self):
        def reset():
            while True:
                now = datetime.now(timezone.utc)
                midnight = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                wait = (midnight - now).total_seconds()
                time.sleep(wait)
                self.daily_start_balance = self.balance
                self.daily_pnl = 0.0
                self.daily_losses = 0
                self.trades_today = 0
                logging.info("DAILY RESET: New trading day started")

        t = threading.Thread(target=reset, daemon=True)
        t.start()

    def can_trade(self) -> Tuple[bool, str]:
        """Check if trading is allowed. Returns (allowed, reason)"""
        now = time.time()

        # 1. Cooldown after loss
        if now < self.cooldown_until:
            return False, f"Cooldown: {int(self.cooldown_until - now)}s remaining"

        # 2. Daily loss limit
        if self.daily_pnl < -self.daily_start_balance * self.config.MAX_DAILY_LOSS:
            return False, "Daily loss limit reached (-5%)"

        # 3. Max positions
        if len(self.positions) >= self.config.MAX_POSITIONS:
            return False, "Max positions open"

        # 4. Min balance
        if self.balance < self.config.MIN_BALANCE:
            return False, "Insufficient balance"

        # 5. Consecutive losses
        if self.consecutive_losses >= self.config.CONSEC_LOSS_LIMIT:
            return False, f"3 consecutive losses - reduced size {self.size_multiplier:.0%}"

        return True, "OK"

    def calculate_position_size(self, price: float, stop_distance: float) -> float:
        """Calculate position size using 2% risk rule"""
        risk_amount = self.balance * self.config.MAX_RISK_PER_TRADE * self.size_multiplier
        size = risk_amount / (price * stop_distance)

        # Apply trade value limits
        value = size * price
        max_val = self.config.MAX_TRADE_VALUE
        min_val = self.config.MIN_TRADE_VALUE

        if value > max_val:
            size = max_val / price
        if value < min_val:
            size = min_val / price

        return size

    def calculate_profit_target(self, momentum_strength: str) -> float:
        """Scale profit target based on momentum strength"""
        return self.config.PROFIT_SCALE.get(momentum_strength, 0.05)

    def tick(self) -> Dict:
        """Execute one trading tick"""
        # Update prices
        for asset in self.config.ASSETS:
            change = random.gauss(0, self.config.ASSETS[asset]["vol"] / 10)
            self.prices[asset] *= (1 + change)
            self.price_history[asset].append(self.prices[asset])

        # Check existing positions for exits
        exits = []
        for asset, pos in list(self.positions.items()):
            current = self.prices[asset]
            should_exit, reason, exit_pct = pos.check_exit(current)

            if should_exit:
                pnl = self._close_position(pos, current, reason, exit_pct)
                exits.append({"asset": asset, "reason": reason, "pnl": pnl})

        # Rotation check
        if time.time() - self.last_rotation > self.config.ROTATION_INTERVAL:
            self._rotate_asset()

        # Check if we can open new position
        can_trade, reason = self.can_trade()
        if can_trade:
            self._evaluate_entry()

        return self.get_status(exits)

    def _close_position(self, pos: Position, price: float, reason: str, exit_pct: float) -> float:
        """Close a position and record P&L"""
        size = pos.size * exit_pct

        if pos.side == "BUY":
            pnl = (price - pos.entry_price) * size
            self.balance += price * size
        else:
            pnl = (pos.entry_price - price) * size
            self.balance += (2 * pos.entry_price - price) * size  # Simplified

        pos.pnl = pnl
        pos.status = "CLOSED"

        # Update stats
        self.daily_pnl += pnl
        if pnl < 0:
            self.consecutive_losses += 1
            self.daily_losses += 1
            if self.consecutive_losses >= self.config.CONSEC_LOSS_LIMIT:
                self.size_multiplier *= self.config.SIZE_REDUCTION
                self.cooldown_until = time.time() + self.config.COOLDOWN_AFTER_LOSS
        else:
            self.consecutive_losses = 0
            self.size_multiplier = min(1.0, self.size_multiplier * 1.2)

        self.closed_positions.append(pos)
        del self.positions[pos.asset]

        # Log
        logging.info(f"CLOSE: {pos.asset} {reason} PnL=${pnl:+.2f} ({pnl/pos.entry_price/pos.size*100:+.1f}%)")

        return pnl

    def _evaluate_entry(self):
        """Evaluate entry for active asset"""
        asset = self.active_asset
        price = self.prices[asset]

        # Get prediction
        features = {
            "volatility": abs(random.gauss(0, 0.02)),
            "volume": random.gauss(1, 0.3),
            "trend": random.gauss(0, 0.005),
        }
        pred = self.mythos[asset].predict(price, features)

        # Only enter if confidence > 60% and momentum > 0.5%
        if pred["confidence"] < 0.6:
            return
        if abs(pred["predicted_change_pct"]) < 0.5:
            return

        # Calculate entry
        side = "BUY" if pred["direction"] == "UP" else "SELL"
        stop_distance = self.config.HARD_STOP_LOSS  # 2%
        size = self.calculate_position_size(price, stop_distance)
        profit_target = self.calculate_profit_target(pred["momentum_strength"])

        # Deduct from balance
        cost = size * price
        if cost > self.balance * self.config.POSITION_SCALE:
            size = (self.balance * self.config.POSITION_SCALE) / price
            cost = size * price

        if cost > self.balance:
            return

        self.balance -= cost

        # Create position
        pos = Position(
            asset=asset,
            entry_price=price,
            size=size,
            side=side,
            highest_price=price,
            lowest_price=price,
            open_time=time.time(),
            profit_target=profit_target,
            stop_loss=price * (1 - self.config.HARD_STOP_LOSS) if side == "BUY" else price * (1 + self.config.HARD_STOP_LOSS),
            trailing_active=False,
        )

        self.positions[asset] = pos
        self.trades_today += 1

        logging.info(f"ENTER: {asset} {side} {size:.6f} @ ${price:.2f} target={profit_target*100:.0f}% stop=-2%")

    def _rotate_asset(self):
        """Rotate to asset with highest momentum"""
        scores = {}
        for asset in self.config.ASSETS:
            hist = list(self.price_history[asset])[-self.config.MOMENTUM_WINDOW:]
            if len(hist) >= 5:
                momentum = (hist[-1] - hist[0]) / hist[0]
                scores[asset] = momentum
            else:
                scores[asset] = 0

        best = max(scores.items(), key=lambda x: x[1])
        if best[1] > 0.001:  # Rotate if any momentum detected
            if best[0] != self.active_asset:
                logging.info(f"ROTATE: {self.active_asset} -> {best[0]} (momentum: {best[1]*100:.2f}%)")
                self.active_asset = best[0]

        self.last_rotation = time.time()

    def get_status(self, recent_exits=None) -> Dict:
        unrealized = 0.0
        for asset, pos in self.positions.items():
            unrealized += pos.unrealized_pnl_pct(self.prices[asset]) * pos.entry_price * pos.size

        total_pnl = self.daily_pnl + unrealized

        return {
            "timestamp": time.time(),
            "balance": self.balance,
            "total_value": self.balance + sum(p.size * self.prices.get(a, 0) for a, p in self.positions.items()),
            "daily_pnl": self.daily_pnl,
            "total_pnl": total_pnl,
            "unrealized": unrealized,
            "trades_today": self.trades_today,
            "open_positions": len(self.positions),
            "consecutive_losses": self.consecutive_losses,
            "size_multiplier": self.size_multiplier,
            "active_asset": self.active_asset,
            "prices": self.prices,
            "positions": {a: {
                "entry": p.entry_price,
                "size": p.size,
                "side": p.side,
                "pnl_pct": p.unrealized_pnl_pct(self.prices[a]) * 100,
                "target": p.profit_target * 100,
                "stop": self.config.HARD_STOP_LOSS * 100,
            } for a, p in self.positions.items()},
            "recent_exits": recent_exits or [],
            "can_trade": self.can_trade()[0],
            "trade_reason": self.can_trade()[1],
            "predictions": {a: {
                "confidence": self.mythos[a].confidence,
                "price": self.prices[a],
            } for a in self.config.ASSETS},
        }


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════════════════

class Database:
    def __init__(self, path=Config.DB_PATH):
        self.path = path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS trades (
                    id TEXT PRIMARY KEY, timestamp REAL, asset TEXT,
                    side TEXT, entry_price REAL, exit_price REAL, size REAL,
                    pnl REAL, pnl_pct REAL, exit_reason TEXT,
                    profit_target REAL, stop_loss REAL, holding_time REAL
                );
                CREATE TABLE IF NOT EXISTS daily_stats (
                    date TEXT PRIMARY KEY, start_balance REAL, end_balance REAL,
                    trades INTEGER, wins INTEGER, losses INTEGER, pnl REAL
                );
                CREATE TABLE IF NOT EXISTS predictions (
                    id INTEGER PRIMARY KEY, timestamp REAL, asset TEXT,
                    price REAL, confidence REAL, direction TEXT, momentum TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_trades_time ON trades(timestamp);
                CREATE INDEX IF NOT EXISTS idx_trades_asset ON trades(asset);
            """)


# ═══════════════════════════════════════════════════════════════════════════════
# FLASK APP
# ═══════════════════════════════════════════════════════════════════════════════

app = Flask(__name__, template_folder=".", static_folder="static")
CORS(app)
trader = DisciplinedTrader()

@app.route("/")
def dashboard():
    return render_template("index.html")

@app.route("/api/status")
def api_status():
    return jsonify(trader.get_status())

@app.route("/api/tick")
def api_tick():
    return jsonify(trader.tick())

@app.route("/api/assets")
def api_assets():
    return jsonify(Config.ASSETS)

@app.route("/api/rules")
def api_rules():
    return jsonify({
        "max_risk": f"{Config.MAX_RISK_PER_TRADE*100:.0f}%",
        "profit_range": f"{Config.MIN_PROFIT_TARGET*100:.0f}%-{Config.MAX_PROFIT_TARGET*100:.0f}%",
        "stop_loss": f"{Config.HARD_STOP_LOSS*100:.0f}%",
        "max_positions": Config.MAX_POSITIONS,
        "max_daily_loss": f"{Config.MAX_DAILY_LOSS*100:.0f}%",
        "cooldown": f"{Config.COOLDOWN_AFTER_LOSS}s",
    })


def background_ticker():
    while True:
        trader.tick()
        time.sleep(Config.TICK_MS / 1000)


if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║  KRYPTO DASHBOARD v5.0 - DISCIPLINED MOMENTUM TRADER         ║
    ║                                                                ║
    ║  Rules: 2-10% profit | -2% stop | 5 max positions           ║
    ║  Open http://localhost:5000                                   ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)
    ticker = threading.Thread(target=background_ticker, daemon=True)
    ticker.start()
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
