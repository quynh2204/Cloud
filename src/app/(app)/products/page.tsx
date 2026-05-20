import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export default async function ProductsPage() {
  const session = await requireSession();
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
          </div>
          <Button type="submit" className="w-fit">
            Save product
          </Button>
        </form>
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {product.name}
                </h3>
                <p className="text-sm text-white/50">
                  {product.category || "Uncategorized"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Price
                </p>
                <p className="text-lg font-semibold text-white">
                  {formatMoney(product.priceCents)}
                </p>
              </div>
            </div>

            <form
              action={updateProductAction}
              className="mt-6 grid gap-4 md:grid-cols-2"
            >
              <input type="hidden" name="id" value={product.id} />
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
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Category
                </label>
                <Input name="category" defaultValue={product.category || ""} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-white/50">
                  Description
                </label>
                <Textarea
                  name="description"
                  defaultValue={product.description || ""}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button type="submit" variant="outline">
                  Update
                </Button>
              </div>
            </form>
            <form action={deleteProductAction} className="mt-3">
              <input type="hidden" name="id" value={product.id} />
              <Button type="submit" variant="danger">
                Delete product
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
