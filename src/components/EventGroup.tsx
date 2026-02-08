"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SuperBowlEvent, Market } from "@/hooks/useSuperBowlOdds";
import { Position } from "@/hooks/useWallet";
import BetCard from "@/components/BetCard";

interface EventGroupProps {
  event: SuperBowlEvent;
  balance: number;
  positions: Position[];
  onBuy: (marketId: string, marketName: string, shares: number, yesPrice: number) => Promise<boolean>;
  onSell: (marketId: string, sharesToSell: number, currentPrice: number) => Promise<boolean>;
  defaultOpen?: boolean;
}

const EventGroup = ({ event, balance, positions, onBuy, onSell, defaultOpen = false }: EventGroupProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <h2 className="text-lg font-semibold truncate">{event.title}</h2>
        <span className="text-sm text-muted-foreground ml-auto shrink-0">
          {event.markets.length} market{event.markets.length !== 1 ? "s" : ""}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 pl-7">
          {event.markets.map((market: Market) => (
            <BetCard
              key={market.id}
              market={market}
              balance={balance}
              position={positions.find((p) => p.marketId === market.id)}
              onBuy={onBuy}
              onSell={onSell}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventGroup;
