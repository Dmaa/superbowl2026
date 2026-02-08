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
  noPosition?: Position;
  lockedShares: number;
  noLockedShares: number;
  pendingOrders: LimitOrder[];
  isExpanded: boolean;
  onToggle: () => void;
  onBuy: (marketId: string, marketName: string, shares: number, price: number) => Promise<boolean>;
  onSell: (marketId: string, sharesToSell: number, currentPrice: number) => Promise<boolean>;
  onPlaceBuyLimit: (marketId: string, marketName: string, shares: number, limitPrice: number) => Promise<boolean>;
  onPlaceSellLimit: (marketId: string, marketName: string, shares: number, limitPrice: number) => Promise<boolean>;
  onDeleteOrder: (orderId: string) => Promise<boolean>;
}

const CompactMarketRow = ({
  market,
  balance,
  position,
  noPosition,
  lockedShares,
  noLockedShares,
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
  const [sellYesShares, setSellYesShares] = useState("");
  const [sellNoShares, setSellNoShares] = useState("");
  const [orderTab, setOrderTab] = useState<"market" | "limit">("market");
  const [buySide, setBuySide] = useState<"yes" | "no">("yes");

  const label = market.groupItemTitle || market.question;
  const yesPrice = parseFloat(market.outcomePrices[0]);
  const noPrice = parseFloat(market.outcomePrices[1] ?? "0");
  const yesCents = Math.round(yesPrice * 100);
  const noCents = Math.round(noPrice * 100);

  const activePrice = buySide === "yes" ? yesPrice : noPrice;

  // Yes sell
  const availableYes = position ? position.shares - lockedShares : 0;
  const effectiveSellYes = sellYesShares === "" && position ? availableYes : parseFloat(sellYesShares);
  const sellYesProceeds = effectiveSellYes * yesPrice;
  const sellYesDisabled =
    !position || isNaN(effectiveSellYes) || effectiveSellYes <= 0 || effectiveSellYes > availableYes;

  // No sell
  const availableNo = noPosition ? noPosition.shares - noLockedShares : 0;
  const effectiveSellNo = sellNoShares === "" && noPosition ? availableNo : parseFloat(sellNoShares);
  const sellNoProceeds = effectiveSellNo * noPrice;
  const sellNoDisabled =
    !noPosition || isNaN(effectiveSellNo) || effectiveSellNo <= 0 || effectiveSellNo > availableNo;

  // Buy
  const parsedBuyShares = parseFloat(buyShares);
  const buyCost = parsedBuyShares * activePrice;
  const buyDisabled = isNaN(parsedBuyShares) || parsedBuyShares <= 0 || buyCost > balance;

  const handleBuy = async () => {
    if (buyDisabled) return;
    const marketId = buySide === "yes" ? market.id : `${market.id}_no`;
    const name = buySide === "yes" ? label : `${label} (No)`;
    await onBuy(marketId, name, parsedBuyShares, activePrice);
  };

  const handleSellYes = async () => {
    if (sellYesDisabled || !position) return;
    await onSell(market.id, effectiveSellYes, yesPrice);
    setSellYesShares("");
  };

  const handleSellNo = async () => {
    if (sellNoDisabled || !noPosition) return;
    await onSell(`${market.id}_no`, effectiveSellNo, noPrice);
    setSellNoShares("");
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
            {position.shares % 1 === 0 ? position.shares : position.shares.toFixed(1)} Yes
          </span>
        )}
        {noPosition && (
          <span className="shrink-0 rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-400">
            {noPosition.shares % 1 === 0 ? noPosition.shares : noPosition.shares.toFixed(1)} No
          </span>
        )}
        <div className="ml-auto shrink-0 flex items-center gap-2 font-mono text-xs font-semibold">
          <span className="text-green-400">Yes {yesCents}¢</span>
          <span className="text-red-400">No {noCents}¢</span>
        </div>
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/20 ml-5">
          {/* Position info */}
          {position && (
            <div className="text-xs text-muted-foreground">
              <span className="text-green-400 font-medium">Yes:</span>{" "}
              {position.shares % 1 === 0 ? position.shares : position.shares.toFixed(1)} shares @ {Math.round(position.avgEntryPrice * 100)}¢ avg
              {lockedShares > 0 && <span className="text-yellow-400 ml-1">({lockedShares} locked)</span>}
            </div>
          )}
          {noPosition && (
            <div className="text-xs text-muted-foreground">
              <span className="text-red-400 font-medium">No:</span>{" "}
              {noPosition.shares % 1 === 0 ? noPosition.shares : noPosition.shares.toFixed(1)} shares @ {Math.round(noPosition.avgEntryPrice * 100)}¢ avg
              {noLockedShares > 0 && <span className="text-yellow-400 ml-1">({noLockedShares} locked)</span>}
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
            <div className="space-y-2">
              {/* Yes / No side toggle */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBuySide("yes")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                    buySide === "yes"
                      ? "bg-green-600 text-white"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yes {yesCents}¢
                </button>
                <button
                  onClick={() => setBuySide("no")}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                    buySide === "no"
                      ? "bg-red-600 text-white"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  No {noCents}¢
                </button>
              </div>

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
                  className={`h-8 font-semibold ml-auto ${
                    buySide === "yes"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  BUY {buySide === "yes" ? "YES" : "NO"}
                </Button>
              </div>

              {/* Sell Yes row */}
              {position && availableYes > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                  <span className="text-xs text-green-400 font-medium w-7">Yes</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={`${availableYes.toFixed(1)}`}
                    value={sellYesShares}
                    onChange={(e) => setSellYesShares(e.target.value)}
                    className="w-16 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    = ${!isNaN(sellYesProceeds) && sellYesProceeds > 0 ? sellYesProceeds.toFixed(2) : "0.00"}
                  </span>
                  <Button
                    onClick={handleSellYes}
                    disabled={sellYesDisabled}
                    size="sm"
                    variant="destructive"
                    className="h-8 font-semibold ml-auto"
                  >
                    SELL YES
                  </Button>
                </div>
              )}

              {/* Sell No row */}
              {noPosition && availableNo > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                  <span className="text-xs text-red-400 font-medium w-7">No</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={`${availableNo.toFixed(1)}`}
                    value={sellNoShares}
                    onChange={(e) => setSellNoShares(e.target.value)}
                    className="w-16 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    = ${!isNaN(sellNoProceeds) && sellNoProceeds > 0 ? sellNoProceeds.toFixed(2) : "0.00"}
                  </span>
                  <Button
                    onClick={handleSellNo}
                    disabled={sellNoDisabled}
                    size="sm"
                    variant="destructive"
                    className="h-8 font-semibold ml-auto"
                  >
                    SELL NO
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <LimitOrderForm
              market={market}
              balance={balance}
              position={position}
              noPosition={noPosition}
              lockedShares={lockedShares}
              noLockedShares={noLockedShares}
              pendingOrders={pendingOrders}
              buySide={buySide}
              onBuySideChange={setBuySide}
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
