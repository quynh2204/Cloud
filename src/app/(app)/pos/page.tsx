import prisma from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { PosClient, type PosProduct } from "@/app/(app)/pos/pos-client";
import type { TenantBankConfig } from "@/lib/bankQr";

const errorMessages: Record<string, string> = {
  EmptyCart: "Add at least one item before checkout.",
  MissingProduct: "Some products were not found. Try again.",
  InvalidCart: "Cart data was invalid. Try again.",
  CreateSaleFailed: "Could not complete sale. Please try again.",
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
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: {
      name: true,
      bankName: true,
      bankBin: true,
      bankAccountNumber: true,
      bankAccountName: true,
      transferNotePrefix: true,
    },
  });

  // Map Prisma products to PosProduct type
  const posProducts: PosProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    stockQuantity: p.stockQuantity,
    category: p.category,
    description: p.description,
    imageUrl: p.imageUrl,
  }));

  const params = await searchParams;
  const error = params?.error
    ? errorMessages[params.error] || decodeURIComponent(params.error)
    : undefined;
  const bankConfig: TenantBankConfig | null = tenant
    ? {
        bankName: tenant.bankName,
        bankBin: tenant.bankBin,
        accountNumber: tenant.bankAccountNumber,
        accountName: tenant.bankAccountName,
        transferNotePrefix: tenant.transferNotePrefix,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-white/50">PoS</p>
        <h1 className="text-3xl font-semibold text-white">New transaction</h1>
        <p className="text-sm text-muted">
          Add scarves to the cart and send receipts instantly.
        </p>
      </div>
      <PosClient
        products={posProducts}
        error={error}
        tenantName={tenant?.name ?? "Tenant"}
        bankConfig={bankConfig}
      />
    </div>
  );
}
