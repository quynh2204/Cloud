import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PosClient, type PosProduct } from "@/app/(app)/pos/pos-client";

const errorMessages: Record<string, string> = {
  EmptyCart: "Add at least one item before checkout.",
  MissingProduct: "Some products were not found. Try again.",
  InvalidCart: "Cart data was invalid. Try again.",
};

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  // Map Prisma products to PosProduct type
  const posProducts: PosProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    category: p.category,
    description: p.description,
    imageUrl: p.imageUrl,
  }));

  const params = await searchParams;
  const error = params?.error
    ? errorMessages[params.error]
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/50">PoS</p>
        <h1 className="text-3xl font-semibold text-white">New transaction</h1>
        <p className="text-sm text-muted">
          Add scarves to the cart and send receipts instantly.
        </p>
      </div>
      <PosClient products={posProducts} error={error} />
    </div>
  );
}
