"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Market } from "@/hooks/useSuperBowlOdds";
import { Position } from "@/hooks/useWallet";

interface BetCardProps {
  market: Market;
  balance: number;
  position?: Position;
  onBuy: (marketId: string, marketName: string, shares: number, yesPrice: number) => boolean;
  onSell: (marketId: string, sharesToSell: number, currentPrice: number) => boolean;
}

const BetCard = ({ market, balance, position, onBuy, onSell }: BetCardProps) => {
  const [buyShares, setBuyShares] = useState("10");
  const [sellShares, setSellShares] = useState("");

  const yesPrice = parseFloat(market.outcomePrices[0]);
  const yesCents = Math.round(yesPrice * 100);
  const impliedOdds = Math.round(yesPrice * 100);

  const parsedBuyShares = parseFloat(buyShares);
  const buyCost = parsedBuyShares * yesPrice;
  const buyDisabled =
    isNaN(parsedBuyShares) || parsedBuyShares <= 0 || buyCost > balance;

  const effectiveSellShares = sellShares === "" && position
    ? position.shares
    : parseFloat(sellShares);
  const sellProceeds = effectiveSellShares * yesPrice;
  const sellDisabled =
    !position ||
    isNaN(effectiveSellShares) ||
    effectiveSellShares <= 0 ||
    effectiveSellShares > (position?.shares ?? 0);

  const handleBuy = () => {
    if (buyDisabled) return;
    onBuy(market.id, market.groupItemTitle, parsedBuyShares, yesPrice);
  };

  const handleSell = () => {
    if (sellDisabled || !position) return;
    onSell(market.id, effectiveSellShares, yesPrice);
    setSellShares("");
  };

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="text-base">
          {market.groupItemTitle} to Win
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {impliedOdds}% implied odds
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Price display */}
        <div>
          <span className="text-2xl font-bold text-green-400">
            {yesCents}¢
          </span>
          <span className="ml-2 text-sm text-muted-foreground">per share</span>
        </div>

        {/* Buy row */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="1"
            value={buyShares}
            onChange={(e) => setBuyShares(e.target.value)}
            className="w-24"
            placeholder="shares"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            = ${!isNaN(buyCost) && buyCost > 0 ? buyCost.toFixed(2) : "0.00"}
          </span>
          <Button
            onClick={handleBuy}
            disabled={buyDisabled}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold ml-auto"
          >
            BUY YES
          </Button>
        </div>

        {/* Sell row — only when user has a position */}
        {position && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
            <Input
              type="number"
              min="0"
              step="0.1"
              placeholder={`${position.shares.toFixed(1)} (all)`}
              value={sellShares}
              onChange={(e) => setSellShares(e.target.value)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              = ${!isNaN(sellProceeds) && sellProceeds > 0 ? sellProceeds.toFixed(2) : "0.00"}
            </span>
            <Button
              onClick={handleSell}
              disabled={sellDisabled}
              variant="destructive"
              className="font-semibold ml-auto"
            >
              SELL
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BetCard;
