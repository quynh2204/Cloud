"use client";

import { useMemo, useState } from "react";
import { createSaleAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";

export type PosProduct = {
  id: string;
  name: string;
  priceCents: number;
  category: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
};

type PosClientProps = {
  products: PosProduct[];
  error?: string;
};

export function PosClient({ products, error }: PosClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState("");

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0
    );
    return {
      subtotal,
      total: subtotal,
    };
  }, [cart]);

  function addToCart(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity: 1,
        },
      ];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Products</h2>
          <span className="text-sm text-white/50">
            {products.length} items
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {products.length === 0 && (
            <p className="text-sm text-white/50">
              Add products to start a transaction.
            </p>
          )}
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4"
            >
              <p className="text-sm text-white/60">
                {product.category || "Scarf"}
              </p>
              <p className="text-base font-semibold text-white">
                {product.name}
              </p>
              <p className="mt-2 text-sm text-white/80">
                {formatMoney(product.priceCents)}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => addToCart(product)}
              >
                Add to cart
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Cart</h2>
        {error && (
          <div className="mt-4 rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-4 py-2 text-sm text-[color:var(--danger)]">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {cart.length === 0 && (
            <p className="text-sm text-white/50">No items yet.</p>
          )}
          {cart.map((item) => (
            <div
              key={item.productId}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-white/60">
                    {formatMoney(item.priceCents)}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-white/50 hover:text-white"
                  onClick={() => removeItem(item.productId)}
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.productId, -1)}
                >
                  -
                </Button>
                <span className="text-sm text-white">{item.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateQuantity(item.productId, 1)}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-[color:var(--border)] pt-4">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-base font-semibold text-white">
            <span>Total</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>

        <form action={createSaleAction} className="mt-6 space-y-4">
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              }))
            )}
          />
          <div>
            <label className="text-xs uppercase tracking-wide text-white/50">
              Customer email (optional)
            </label>
            <Input
              name="customerEmail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="customer@mail.com"
              type="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={cart.length === 0}>
            Complete sale
          </Button>
        </form>
      </div>
    </div>
  );
}
