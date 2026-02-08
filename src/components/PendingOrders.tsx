"use client";

import { Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LimitOrder } from "@/hooks/useLimitOrders";

interface PendingOrdersProps {
  orders: LimitOrder[];
  onDelete: (orderId: string) => Promise<boolean>;
}

const PendingOrders = ({ orders, onDelete }: PendingOrdersProps) => {
  const pending = orders.filter((o) => o.status === "PENDING");

  if (pending.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <h2 className="mb-3 text-lg font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4 text-yellow-400" />
        Pending Orders
      </h2>
      <div className="space-y-2">
        {pending.map((order) => {
          const isNo = order.marketId.endsWith("_no");
          return (
          <div
            key={order.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold ${
                  order.orderType === "BUY"
                    ? "bg-green-900/50 text-green-400"
                    : "bg-red-900/50 text-red-400"
                }`}
              >
                {order.orderType}
              </span>
              <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold ${
                isNo ? "bg-slate-700/60 text-slate-300" : "bg-yellow-900/50 text-yellow-400"
              }`}>
                {isNo ? "NO" : "YES"}
              </span>
              <span className="truncate">
                {order.shares}× {order.marketName}
              </span>
              <span className="text-muted-foreground shrink-0">
                @ {order.orderType === "BUY" ? "≤" : "≥"}
                {Math.round(order.limitPrice * 100)}¢
              </span>
              {order.escrowedAmount > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  (${order.escrowedAmount.toFixed(2)} escrowed)
                </span>
              )}
            </div>
            <Button
              onClick={() => onDelete(order.id)}
              size="sm"
              variant="ghost"
              className="h-7 px-2 shrink-0 text-muted-foreground hover:text-destructive text-xs gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              DELETE
            </Button>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingOrders;
