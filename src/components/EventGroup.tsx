"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SuperBowlEvent, Market } from "@/hooks/useSuperBowlOdds";
import { Position } from "@/hooks/useWallet";
import CompactMarketRow from "@/components/CompactMarketRow";

interface EventGroupProps {
  event: SuperBowlEvent;
  balance: number;
  positions: Position[];
  onBuy: (marketId: string, marketName: string, shares: number, yesPrice: number) => Promise<boolean>;
  onSell: (marketId: string, sharesToSell: number, currentPrice: number) => Promise<boolean>;
  defaultOpen?: boolean;
}

const sortByPrice = (markets: Market[]): Market[] =>
  [...markets].sort((a, b) => {
    const priceA = parseFloat(a.outcomePrices[0]);
    const priceB = parseFloat(b.outcomePrices[0]);
    return priceB - priceA;
  });

const EventGroup = ({ event, balance, positions, onBuy, onSell, defaultOpen = false }: EventGroupProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);

  const sorted = sortByPrice(event.markets);
  const top3 = sorted.slice(0, 3);

  const previewLine = top3
    .map((m) => `${m.groupItemTitle || m.question} ${Math.round(parseFloat(m.outcomePrices[0]) * 100)}¢`)
    .join(" · ");

  return (
    <Card className="border-border/50 bg-card py-0 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{event.title}</span>
            <span className="text-xs text-muted-foreground shrink-0 ml-auto">
              {event.markets.length} market{event.markets.length !== 1 ? "s" : ""}
            </span>
          </div>
          {!isOpen && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {previewLine}
            </p>
          )}
        </div>
      </button>

      {/* Expanded market list */}
      {isOpen && (
        <div className="border-t border-border/30">
          {sorted.map((market: Market) => (
            <CompactMarketRow
              key={market.id}
              market={market}
              balance={balance}
              position={positions.find((p) => p.marketId === market.id)}
              isExpanded={expandedMarketId === market.id}
              onToggle={() =>
                setExpandedMarketId(expandedMarketId === market.id ? null : market.id)
              }
              onBuy={onBuy}
              onSell={onSell}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default EventGroup;
