import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import {
  createProductAction,
  updateProductAction,
} from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DeleteProductForm } from "@/components/products/DeleteProductForm";
import { getCurrentUserAccess } from "@/lib/access";

export default async function ProductsPage() {
  const session = await requireSession();
  const access = await getCurrentUserAccess(session);
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-white/50">Products</p>
        <h1 className="text-3xl font-semibold text-white">Catalog</h1>
        <p className="text-sm text-muted">
          Manage scarf inventory per tenant.
        </p>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
        <h2 className="text-lg font-semibold text-white">Add product</h2>
        {access.canManageProducts ? (
          <form action={createProductAction} className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Product name
                </label>
                <Input name="name" placeholder="Silk scarf" required />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Price (VND)
                </label>
                <Input
                  name="price"
                  type="number"
                  placeholder="250000"
                  required
                />
              </div>
              {access.isOwner && (
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50">
                    Cost (VND)
                  </label>
                  <Input name="cost" type="number" placeholder="180000" />
                </div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Category
                </label>
                <Input name="category" placeholder="Premium" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Description
                </label>
                <Input name="description" placeholder="Handmade silk" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Image URL
                </label>
                <Input name="imageUrl" placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Stock quantity
                </label>
                <Input name="stockQuantity" type="number" min="0" placeholder="0" required />
              </div>
            </div>
            <Button type="submit" className="w-fit">
              Save product
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            You can view products only. Ask the owner to grant product add/update access.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {products.length === 0 && (
          <p className="text-sm text-white/50">
            No products yet. Add your first scarf above.
          </p>
        )}
        {products.map((product) => (
          <div
            key={product.id}
            className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                {product.imageUrl ? (
                  <div className="mb-4 h-32 w-32 overflow-hidden rounded-lg bg-gray-700">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-lg bg-gray-700 text-xs text-white/50">
                    No image
                  </div>
                )}
                <h3 className="text-lg font-semibold text-white">
                  {product.name}
                </h3>
                <p className="text-sm text-white/50">
                  {product.category || "Uncategorized"}
                </p>
                {product.description && (
                  <p className="mt-2 text-sm text-white/70">{product.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Price
                </p>
                <p className="text-lg font-semibold text-white">
                  {formatMoney(product.priceCents)}
                </p>
                <p className="text-sm text-white/60">Stock: {product.stockQuantity}</p>
              </div>
            </div>

            {access.canManageProducts ? (
              <form action={updateProductAction} className="mt-6 grid gap-4">
              <input type="hidden" name="id" value={product.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50">
                    Name
                  </label>
                  <Input name="name" defaultValue={product.name} required />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50">
                    Price (VND)
                  </label>
                  <Input
                    name="price"
                    type="number"
                    defaultValue={product.priceCents.toString()}
                    required
                  />
                </div>
                {access.isOwner && (
                  <div>
                    <label className="text-xs uppercase tracking-wide text-white/50">
                      Cost (VND)
                    </label>
                    <Input
                      name="cost"
                      type="number"
                      defaultValue={product.costCents.toString()}
                      placeholder="180000"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50">
                    Stock quantity
                  </label>
                  <Input
                    name="stockQuantity"
                    type="number"
                    min="0"
                    defaultValue={product.stockQuantity.toString()}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50">
                    Category
                  </label>
                  <Input name="category" defaultValue={product.category || ""} />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-white/50">
                    Image URL
                  </label>
                  <Input
                    name="imageUrl"
                    defaultValue={product.imageUrl || ""}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Description
                </label>
                <Textarea
                  name="description"
                  defaultValue={product.description || ""}
                  rows={3}
                />
              </div>

              <Button type="submit" variant="outline" className="w-fit">
                Update
              </Button>
            </form>
            ) : (
              <div className="mt-6 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-white/60">
                Product editing is disabled for your account.
              </div>
            )}
            {access.isOwner && (
              <DeleteProductForm productId={product.id} productName={product.name} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
