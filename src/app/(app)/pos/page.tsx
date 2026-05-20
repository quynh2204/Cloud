import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { PosClient } from "@/app/(app)/pos/pos-client";

const errorMessages: Record<string, string> = {
  EmptyCart: "Add at least one item before checkout.",
  MissingProduct: "Some products were not found. Try again.",
  InvalidCart: "Cart data was invalid. Try again.",
};

export default async function PosPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const session = await requireSession();
  const products = await prisma.product.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
  });

  const error = searchParams?.error
    ? errorMessages[searchParams.error]
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
      <PosClient products={products} error={error} />
    </div>
  );
}
