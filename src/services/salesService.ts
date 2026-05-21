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
  taxRate?: number;
  discountCents?: number;
};

type VoidSaleInput = {
  saleId: string;
  tenantId: string;
  status: "VOIDED"; // normalized to VOIDED per spec
  reason?: string;
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

    // Merge duplicate product lines so stock checks and updates are accurate.
    const normalizedItems = Object.values(
      input.items.reduce<Record<string, { productId: string; quantity: number }>>(
        (acc, item) => {
          const key = item.productId;
          if (!acc[key]) {
            acc[key] = { productId: item.productId, quantity: 0 };
          }
          acc[key].quantity += item.quantity;
          return acc;
        },
        {}
      )
    );

    // Get products and calculate totals
    const productIds = normalizedItems.map((item) => item.productId);
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
    const saleItems = normalizedItems.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const lineTotalCents = product.priceCents * item.quantity;
      subtotalCents += lineTotalCents;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents,
      };
    });

    const safeTaxRate = Math.max(0, input.taxRate || 0);
    const safeDiscount = Math.max(0, input.discountCents || 0);
    const taxAmountCents = Math.round((subtotalCents * safeTaxRate) / 100);
    const totalCents = Math.max(0, subtotalCents + taxAmountCents - safeDiscount);

    // Create sale and decrement stock atomically.
    const sale = await prisma.$transaction(async (tx) => {
      for (const item of normalizedItems) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            tenantId: input.tenantId,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (updated.count !== 1) {
          throw new Error("Stock changed during checkout. Please retry.");
        }
      }

      return tx.sale.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          subtotalCents,
          taxRate: safeTaxRate,
          taxAmountCents,
          discountCents: safeDiscount,
          totalCents,
          status: "COMPLETED",
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
      where: {
        tenantId,
        status: { notIn: ["VOIDED", "REFUNDED"] },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return sales;
  },

  async voidSale(input: VoidSaleInput) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          id: input.saleId,
          tenantId: input.tenantId,
        },
        include: { items: true },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (sale.status === "VOIDED" || sale.status === "REFUNDED") {
        throw new Error("Sale is already voided/refunded");
      }

      for (const item of sale.items) {
        await tx.product.updateMany({
          where: { id: item.productId, tenantId: input.tenantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      const notes = input.reason
        ? `${sale.notes ? `${sale.notes}\n` : ""}VOIDED: ${input.reason}`
        : sale.notes;

      return tx.sale.update({
        where: { id: sale.id },
        data: {
          status: "VOIDED",
          notes,
        },
      });
    });
  },

  async refundSale(input: { saleId: string; tenantId: string; userId: string; reason?: string }) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id: input.saleId, tenantId: input.tenantId }, include: { items: true } });

      if (!sale) throw new Error("Sale not found");
      if (sale.status !== "COMPLETED") throw new Error("Only completed sales can be refunded");

      for (const item of sale.items) {
        await tx.product.updateMany({ where: { id: item.productId, tenantId: input.tenantId }, data: { stockQuantity: { increment: item.quantity } } });
      }

      const notes = input.reason ? `${sale.notes ? `${sale.notes}\n` : ""}REFUNDED: ${input.reason}` : sale.notes;
      const refundAmountCents = sale.totalCents;

      await tx.sale.update({ where: { id: sale.id }, data: { status: "REFUNDED", notes } });

      const refund = await tx.sale.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          subtotalCents: -Math.abs(refundAmountCents),
          taxRate: 0,
          taxAmountCents: 0,
          discountCents: 0,
          totalCents: -Math.abs(refundAmountCents),
          status: "REFUND",
          customerEmail: sale.customerEmail,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          paymentMethod: sale.paymentMethod,
          amountReceivedCents: -Math.abs(refundAmountCents),
          notes: input.reason || `Refund for sale ${sale.id}`,
        },
      });

      return refund;
    });
  },

};
