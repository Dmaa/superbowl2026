"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Market } from "@/hooks/useSuperBowlOdds";
import { Position } from "@/hooks/useWallet";
import { LimitOrder } from "@/hooks/useLimitOrders";
import LimitOrderForm from "@/components/LimitOrderForm";

interface CompactMarketRowProps {
  market: Market;
  balance: number;
  position?: Position;
  lockedShares: number;
  pendingOrders: LimitOrder[];
  isExpanded: boolean;
  onToggle: () => void;
  onBuy: (marketId: string, marketName: string, shares: number, yesPrice: number) => Promise<boolean>;
  onSell: (marketId: string, sharesToSell: number, currentPrice: number) => Promise<boolean>;
  onPlaceBuyLimit: (marketId: string, marketName: string, shares: number, limitPrice: number) => Promise<boolean>;
  onPlaceSellLimit: (marketId: string, marketName: string, shares: number, limitPrice: number) => Promise<boolean>;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
}

const CompactMarketRow = ({
  market,
  balance,
  position,
  lockedShares,
  pendingOrders,
  isExpanded,
  onToggle,
  onBuy,
  onSell,
  onPlaceBuyLimit,
  onPlaceSellLimit,
  onDeleteOrder,
}: CompactMarketRowProps) => {
  const [buyShares, setBuyShares] = useState("10");
  const [sellShares, setSellShares] = useState("");
  const [orderTab, setOrderTab] = useState<"market" | "limit">("market");
  const label = market.groupItemTitle || market.question;
  const yesPrice = parseFloat(market.outcomePrices[0]);
  const yesCents = Math.round(yesPrice * 100);

  const availableShares = position ? position.shares - lockedShares : 0;

  const parsedBuyShares = parseFloat(buyShares);
  const buyCost = parsedBuyShares * yesPrice;
  const buyDisabled =
    isNaN(parsedBuyShares) || parsedBuyShares <= 0 || buyCost > balance;

  const effectiveSellShares =
    sellShares === "" && position ? availableShares : parseFloat(sellShares);
  const sellProceeds = effectiveSellShares * yesPrice;
  const sellDisabled =
    !position ||
    isNaN(effectiveSellShares) ||
    effectiveSellShares <= 0 ||
    effectiveSellShares > availableShares;

  const handleBuy = async () => {
    if (buyDisabled) return;
    await onBuy(market.id, label, parsedBuyShares, yesPrice);
  };

  const handleSell = async () => {
    if (sellDisabled || !position) return;
    await onSell(market.id, effectiveSellShares, yesPrice);
    setSellShares("");
  };

  return (
    <div>
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors text-sm"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="truncate font-medium">{label}</span>
        {position && (
          <span className="shrink-0 rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-400">
            {position.shares % 1 === 0 ? position.shares : position.shares.toFixed(1)} shares
          </span>
        )}
        <span className="ml-auto shrink-0 font-mono font-semibold text-green-400">
          {yesCents}¢
        </span>
      </button>

      {/* Expanded buy/sell form */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/20 ml-5">
          {/* Position info */}
          {position && (
            <div className="text-xs text-muted-foreground">
              You own <span className="text-green-400 font-medium">{position.shares % 1 === 0 ? position.shares : position.shares.toFixed(1)} shares</span> @ {Math.round(position.avgEntryPrice * 100)}¢ avg
              {lockedShares > 0 && (
                <span className="text-yellow-400 ml-1">({lockedShares} locked)</span>
              )}
            </div>
          )}

          {/* Market / Limit toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setOrderTab("market")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                orderTab === "market"
                  ? "bg-green-600 text-white"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderTab("limit")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                orderTab === "limit"
                  ? "bg-green-600 text-white"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Limit
            </button>
          </div>

          {orderTab === "market" ? (
            <>
              {/* Buy row */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={buyShares}
                  onChange={(e) => setBuyShares(e.target.value)}
                  className="w-20 h-8 text-sm"
                  placeholder="shares"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  = ${!isNaN(buyCost) && buyCost > 0 ? buyCost.toFixed(2) : "0.00"}
                </span>
                <Button
                  onClick={handleBuy}
                  disabled={buyDisabled}
                  size="sm"
                  className="h-8 bg-green-600 hover:bg-green-700 text-white font-semibold ml-auto"
                >
                  BUY
                </Button>
              </div>

              {/* Sell row */}
              {position && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={`${availableShares.toFixed(1)} (avail)`}
                    value={sellShares}
                    onChange={(e) => setSellShares(e.target.value)}
                    className="w-20 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    = ${!isNaN(sellProceeds) && sellProceeds > 0 ? sellProceeds.toFixed(2) : "0.00"}
                  </span>
                  <Button
                    onClick={handleSell}
                    disabled={sellDisabled}
                    size="sm"
                    variant="destructive"
                    className="h-8 font-semibold ml-auto"
                  >
                    SELL
                  </Button>
                </div>
              )}
            </>
          ) : (
            <LimitOrderForm
              market={market}
              balance={balance}
              position={position}
              lockedShares={lockedShares}
              pendingOrders={pendingOrders}
              onPlaceBuy={onPlaceBuyLimit}
              onPlaceSell={onPlaceSellLimit}
              onDelete={onDeleteOrder}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CompactMarketRow;
