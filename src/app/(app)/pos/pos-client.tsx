"use client";

import { useMemo, useState, useEffect } from "react";
import { createSaleAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatMoney, toCents } from "@/lib/format";

export type PosProduct = {
  id: string;
  name: string;
  priceCents: number;
  category: string | null;
  description?: string | null;
  imageUrl?: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
};

type RecentSale = {
  id: string;
  customerEmail?: string;
  customerName?: string;
  totalCents: number;
  createdAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceCents: number;
  }>;
};

type PosClientProps = {
  products: PosProduct[];
  error?: string;
};

function isValidEmail(email: string): boolean {
  if (!email) return true; // email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function PosClient({ products, error }: PosClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch recent sales on mount
  useEffect(() => {
    const fetchRecentSales = async () => {
      try {
        const response = await fetch("/api/sales?limit=5");
        if (response.ok) {
          const data = await response.json();
          setRecentSales(data.sales || []);
        }
      } catch (error) {
        console.error("Failed to fetch recent sales:", error);
      }
    };
    fetchRecentSales();
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description &&
          product.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

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

  // Calculate change if payment method is cash
  const change = useMemo(() => {
    if (paymentMethod !== "cash" || !amountReceived) return 0;
    const amount = toCents(amountReceived);
    return Math.max(0, amount - totals.total);
  }, [paymentMethod, amountReceived, totals.total]);

  function handleEmailChange(value: string) {
    setEmail(value);
    if (emailError) setEmailError("");
  }

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

  function clearCart() {
    if (confirm("Clear cart? This cannot be undone.")) {
      setCart([]);
    }
  }

  function recreateOrder(sale: RecentSale) {
    const newCart: CartItem[] = sale.items.map((item) => {
      const product = products.find((p) => p.name === item.name);
      return {
        productId: product?.id || "",
        name: item.name,
        priceCents: item.unitPriceCents,
        quantity: item.quantity,
      };
    });
    setCart(newCart);
    setShowHistory(false);
    setCustomerName(sale.customerName || "");
    setEmail(sale.customerEmail || "");
  }

  return (
    <div className="space-y-6">
      {/* Product Search & Filter */}
      <div className="space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-white/50">
            Search products
          </label>
          <Input
            type="text"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {categories.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-wide text-white/50">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selectedCategory === null
                    ? "bg-white text-[color:var(--surface)]"
                    : "border border-[color:var(--border)] text-white/70 hover:text-white"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    selectedCategory === cat
                      ? "bg-white text-[color:var(--surface)]"
                      : "border border-[color:var(--border)] text-white/70 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Products Section */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Products</h2>
            <span className="text-sm text-white/50">
              {filteredProducts.length} items
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredProducts.length === 0 && (
              <p className="text-sm text-white/50">
                {searchQuery || selectedCategory
                  ? "No products found"
                  : "Add products to start a transaction"}
              </p>
            )}
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4"
              >
                {product.imageUrl && (
                  <div className="mb-3 h-32 w-full overflow-hidden rounded-lg">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <p className="text-sm text-white/60">
                  {product.category || "Product"}
                </p>
                <p className="text-base font-semibold text-white">
                  {product.name}
                </p>
                {product.description && (
                  <p className="mt-1 text-xs text-white/50">
                    {product.description}
                  </p>
                )}
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

        {/* Cart Section */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Cart</h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-white/50 hover:text-white"
                >
                  Clear all
                </button>
              )}
            </div>

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
                      <p className="text-sm font-semibold text-white">
                        {item.name}
                      </p>
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
          </div>

          {/* Quick History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            {showHistory ? "Hide" : "Show"} recent sales
          </button>
        </div>
      </div>

      {/* Recent Sales History */}
      {showHistory && recentSales.length > 0 && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-white">Recent Sales</h2>
          <div className="mt-4 space-y-3">
            {recentSales.map((sale: RecentSale) => (
              <div
                key={sale.id}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {sale.customerName || sale.customerEmail || "No name"}
                    </p>
                    <p className="text-xs text-white/50">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2 space-y-1">
                      {sale.items.map((item: any, idx: number) => (
                        <p key={idx} className="text-xs text-white/60">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatMoney(sale.totalCents)}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => recreateOrder(sale)}
                      className="mt-2"
                    >
                      Recreate
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checkout Form */}
      <form
        action={createSaleAction}
        onSubmit={(e) => {
          if (email && !isValidEmail(email)) {
            e.preventDefault();
            setEmailError("Invalid email address");
            return;
          }
        }}
        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
      >
        <h2 className="text-lg font-semibold text-white">Checkout</h2>

        {/* Customer Details */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-white/50">
              Customer name (optional)
            </label>
            <Input
              type="text"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-white/50">
              Customer phone (optional)
            </label>
            <Input
              type="tel"
              name="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+84 123 456 789"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-white/50">
              Customer email (optional)
            </label>
            <Input
              type="email"
              name="customerEmail"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="customer@mail.com"
            />
            {emailError && (
              <p className="mt-1 text-xs text-[color:var(--danger)]">
                {emailError}
              </p>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-6">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Payment method
          </label>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {["cash", "card", "transfer"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  paymentMethod === method
                    ? "bg-white text-[color:var(--surface)]"
                    : "border border-[color:var(--border)] text-white/70 hover:text-white"
                }`}
              >
                {method === "cash" && "💰 Cash"}
                {method === "card" && "💳 Card"}
                {method === "transfer" && "🏦 Transfer"}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Received (for cash only) */}
        {paymentMethod === "cash" && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Amount received
              </label>
              <Input
                type="number"
                name="amountReceived"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0"
                step="1"
                min="0"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-white/50">
                Change
              </label>
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-white">
                {formatMoney(change)}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Notes */}
        <div className="mt-6">
          <label className="text-xs uppercase tracking-wide text-white/50">
            Transaction notes (optional)
          </label>
          <Input
            type="text"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special requests, gift wrapping, etc."
          />
        </div>

        {/* Hidden Fields */}
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
        <input type="hidden" name="paymentMethod" value={paymentMethod} />
        {amountReceived && (
          <input
            type="hidden"
            name="amountReceivedCents"
            value={toCents(amountReceived)}
          />
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="mt-6 w-full"
          disabled={cart.length === 0}
        >
          Complete sale
        </Button>
      </form>
    </div>
  );
}
