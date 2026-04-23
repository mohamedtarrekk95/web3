/**
 * Binance WebSocket Price Stream Client
 *
 * Provides real-time crypto prices via Binance WebSocket streams.
 * Maintains connection with auto-reconnect and heartbeat.
 */

type PriceUpdateCallback = (symbol: string, price: number, change24h: number) => void;

interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  lastUpdate: number;
}

// Binance WebSocket stream names for supported pairs
const SYMBOL_STREAMS: Record<string, string> = {
  BTCUSDT: 'btcusdt@ticker',
  ETHUSDT: 'ethusdt@ticker',
  BNBUSDT: 'bnbusdt@ticker',
  SOLUSDT: 'solusdt@ticker',
  ADAUSDT: 'adausdt@ticker',
  XRPUSDT: 'xrpusdt@ticker',
  DOGEUSDT: 'dogeusdt@ticker',
  AVAXUSDT: 'avaxusdt@ticker',
  MATICUSDT: 'maticusdt@ticker',
  DOTUSDT: 'dotusdt@ticker',
  LTCUSDT: 'ltcusdt@ticker',
  TRXUSDT: 'trxusdt@ticker',
  BCHUSDT: 'bchusdt@ticker',
  LINKUSDT: 'linkusdt@ticker',
  UNIUSDT: 'uniusdt@ticker',
};

const WEBSOCKET_URL = 'wss://stream.binance.com:9443/ws';
const RECONNECT_DELAY_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

class PriceSocket {
  private ws: WebSocket | null = null;
  private callbacks: Set<PriceUpdateCallback> = new Set();
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = {
    connected: false,
    reconnecting: false,
    lastUpdate: 0,
  };

  // Live price map - updated on every WebSocket message
  private livePrices: Map<string, { price: number; change24h: number; timestamp: number }> = new Map();

  // Last known prices for fallback when disconnected
  private fallbackPrices: Map<string, number> = new Map();

  getState(): ConnectionState {
    return { ...this.state };
  }

  getLivePrice(symbol: string): number | null {
    const data = this.livePrices.get(symbol);
    return data?.price ?? null;
  }

  getAllLivePrices(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [symbol, data] of this.livePrices.entries()) {
      result[symbol] = data.price;
    }
    return result;
  }

  getFallbackPrice(symbol: string): number | null {
    return this.fallbackPrices.get(symbol) ?? null;
  }

  /**
   * Subscribe to price updates
   */
  subscribe(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Connect to Binance WebSocket and subscribe to all streams
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const streams = Object.values(SYMBOL_STREAMS);
    const url = `${WEBSOCKET_URL}/${streams.join('/')}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.state.connected = true;
        this.state.reconnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        console.log('[PriceSocket] Connected to Binance WebSocket');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.warn('[PriceSocket] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        this.state.connected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('[PriceSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.connected = false;
    this.state.reconnecting = false;
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const msg = JSON.parse(data);

      // Binance ticker message format
      if (msg.e === '24hrTicker') {
        const symbol = msg.s; // e.g., 'BTCUSDT'
        const price = parseFloat(msg.c); // Current price
        const change24h = parseFloat(msg.P); // Percent change 24h

        if (Number.isFinite(price) && price > 0) {
          this.updatePrice(symbol, price, change24h);
        }
      }
    } catch (error) {
      // Ignore parse errors for non-ticker messages
    }
  }

  /**
   * Update price and notify subscribers
   */
  private updatePrice(symbol: string, price: number, change24h: number): void {
    this.state.lastUpdate = Date.now();
    this.livePrices.set(symbol, { price, change24h, timestamp: Date.now() });
    this.fallbackPrices.set(symbol, price);

    // Notify all subscribers immediately
    for (const callback of this.callbacks) {
      callback(symbol, price, change24h);
    }
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      if (this.state.lastUpdate > 0 && now - this.state.lastUpdate > HEARTBEAT_INTERVAL_MS * 2) {
        console.warn('[PriceSocket] Heartbeat timeout - reconnecting...');
        this.ws?.close();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[PriceSocket] Max reconnection attempts reached');
      return;
    }

    this.state.reconnecting = true;
    this.reconnectAttempts++;

    console.log(`[PriceSocket] Reconnecting in ${RECONNECT_DELAY_MS}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }
}

// Singleton instance
export const priceSocket = new PriceSocket();

// Symbol conversion utilities
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/\s+/g, '');
}

export function toBinanceSymbol(symbol: string): string {
  return normalizeSymbol(symbol);
}

export function fromBinanceSymbol(binanceSymbol: string): string {
  return normalizeSymbol(binanceSymbol);
}
