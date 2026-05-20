import prisma from "@/lib/db";

export type CreateSaleInput = {
  userId: string;
  tenantId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  amountReceivedCents?: number;
  notes?: string;
};

export type SaleResponse = {
  id: string;
  tenantId: string;
  userId: string;
  subtotalCents: number;
  totalCents: number;
  customerEmail: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  paymentMethod?: string;
  amountReceivedCents?: number | null;
  notes?: string | null;
  createdAt: Date;
};

/**
 * Sales service: handle all sales operations
 */
export const salesService = {
  /**
   * Create a new sale with items
   */
  async createSale(input: CreateSaleInput): Promise<SaleResponse> {
    if (!input.items || input.items.length === 0) {
      throw new Error("Sale must have at least one item");
    }

    // Get products and calculate totals
    const productIds = input.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new Error("One or more products not found");
    }

    // Verify all products belong to tenant
    if (products.some((p) => p.tenantId !== input.tenantId)) {
      throw new Error("One or more products do not belong to your tenant");
    }

    // Calculate totals
    let subtotalCents = 0;
    const saleItems = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const lineTotalCents = product.priceCents * item.quantity;
      subtotalCents += lineTotalCents;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents,
      };
    });

    // Create sale with items
    const sale = await prisma.sale.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        subtotalCents,
        totalCents: subtotalCents, // TODO: add tax/discount logic
        customerEmail: input.customerEmail || null,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        paymentMethod: input.paymentMethod || "cash",
        amountReceivedCents: input.amountReceivedCents || null,
        notes: input.notes || null,
        items: {
          create: saleItems,
        },
      },
    });

    return {
      id: sale.id,
      tenantId: sale.tenantId,
      userId: sale.userId,
      subtotalCents: sale.subtotalCents,
      totalCents: sale.totalCents,
      customerEmail: sale.customerEmail,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      paymentMethod: sale.paymentMethod,
      amountReceivedCents: sale.amountReceivedCents,
      notes: sale.notes,
      createdAt: sale.createdAt,
    };
  },

  /**
   * Get sale by ID with authorization check
   */
  async getSale(saleId: string, tenantId: string) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        tenant: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.tenantId !== tenantId) {
      throw new Error("Unauthorized: sale does not belong to your tenant");
    }

    return sale;
  },

  /**
   * Get all sales for a tenant
   */
  async getTenantSales(tenantId: string, limit = 50) {
    const sales = await prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return sales;
  },
};
