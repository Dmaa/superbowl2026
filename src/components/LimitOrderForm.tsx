"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Market } from "@/hooks/useSuperBowlOdds";
import { Position } from "@/hooks/useWallet";

interface LimitOrderFormProps {
  market: Market;
  balance: number;
  position?: Position;
  lockedShares: number;
  onPlaceBuy: (marketId: string, marketName: string, shares: number, limitPrice: number) => Promise<boolean>;
  onPlaceSell: (marketId: string, marketName: string, shares: number, limitPrice: number) => Promise<boolean>;
}

const LimitOrderForm = ({ market, balance, position, lockedShares, onPlaceBuy, onPlaceSell }: LimitOrderFormProps) => {
  const [buyShares, setBuyShares] = useState("10");
  const [buyPrice, setBuyPrice] = useState("");
  const [sellShares, setSellShares] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const label = market.groupItemTitle || market.question;
  const availableShares = position ? position.shares - lockedShares : 0;

  // Buy validation
  const parsedBuyShares = parseFloat(buyShares);
  const parsedBuyPrice = parseFloat(buyPrice) / 100; // cents → decimal
  const buyCost = parsedBuyShares * parsedBuyPrice;
  const buyValid =
    !isNaN(parsedBuyShares) &&
    parsedBuyShares > 0 &&
    !isNaN(parsedBuyPrice) &&
    parsedBuyPrice > 0 &&
    parsedBuyPrice < 1 &&
    buyCost <= balance;

  // Sell validation
  const effectiveSellShares = sellShares === "" && position ? availableShares : parseFloat(sellShares);
  const parsedSellPrice = parseFloat(sellPrice) / 100;
  const sellValid =
    availableShares > 0 &&
    !isNaN(effectiveSellShares) &&
    effectiveSellShares > 0 &&
    effectiveSellShares <= availableShares &&
    !isNaN(parsedSellPrice) &&
    parsedSellPrice > 0 &&
    parsedSellPrice < 1;

  const handlePlaceBuy = async () => {
    if (!buyValid || submitting) return;
    setSubmitting(true);
    const ok = await onPlaceBuy(market.id, label, parsedBuyShares, parsedBuyPrice);
    if (ok) {
      setBuyShares("10");
      setBuyPrice("");
    }
    setSubmitting(false);
  };

  const handlePlaceSell = async () => {
    if (!sellValid || submitting) return;
    setSubmitting(true);
    const ok = await onPlaceSell(market.id, label, effectiveSellShares, parsedSellPrice);
    if (ok) {
      setSellShares("");
      setSellPrice("");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-2">
      {/* Buy limit row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          type="number"
          min="1"
          step="1"
          value={buyShares}
          onChange={(e) => setBuyShares(e.target.value)}
          className="w-16 h-8 text-sm"
          placeholder="qty"
        />
        <span className="text-xs text-muted-foreground">@</span>
        <div className="flex items-center gap-0.5">
          <Input
            type="number"
            min="1"
            max="99"
            step="1"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className="w-16 h-8 text-sm"
            placeholder="price"
          />
          <span className="text-xs text-muted-foreground">¢</span>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          = ${!isNaN(buyCost) && buyCost > 0 ? buyCost.toFixed(2) : "0.00"}
        </span>
        <Button
          onClick={handlePlaceBuy}
          disabled={!buyValid || submitting}
          size="sm"
          className="h-8 bg-green-600 hover:bg-green-700 text-white font-semibold ml-auto text-xs"
        >
          BUY LIMIT
        </Button>
      </div>

      {/* Sell limit row */}
      {position && availableShares > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/20">
          <Input
            type="number"
            min="0"
            step="0.1"
            placeholder={`${availableShares.toFixed(1)}`}
            value={sellShares}
            onChange={(e) => setSellShares(e.target.value)}
            className="w-16 h-8 text-sm"
          />
          <span className="text-xs text-muted-foreground">@</span>
          <div className="flex items-center gap-0.5">
            <Input
              type="number"
              min="1"
              max="99"
              step="1"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="w-16 h-8 text-sm"
              placeholder="price"
            />
            <span className="text-xs text-muted-foreground">¢</span>
          </div>
          <Button
            onClick={handlePlaceSell}
            disabled={!sellValid || submitting}
            size="sm"
            variant="destructive"
            className="h-8 font-semibold ml-auto text-xs"
          >
            SELL LIMIT
          </Button>
        </div>
      )}
    </div>
  );
};

export default LimitOrderForm;
