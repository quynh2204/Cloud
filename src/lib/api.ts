/**
 * Client-side API utilities
 * Use these to call API routes from client components
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || "API request failed"
    );
  }

  return data as T;
}

/**
 * Email API endpoints
 */
export const emailApi = {
  /**
   * Send receipt email for a sale
   * POST /api/emails/send
   */
  async sendReceipt(saleId: string, customerEmail: string) {
    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, customerEmail }),
    });

    return handleResponse<{ success: boolean; message: string }>(response);
  },
};

/**
 * Sales API endpoints
 */
export const salesApi = {
  /**
   * Create a new sale
   * POST /api/sales/create
   */
  async create(
    items: Array<{ productId: string; quantity: number }>,
    customerEmail?: string
  ) {
    const response = await fetch("/api/sales/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, customerEmail }),
    });

    return handleResponse<{
      id: string;
      tenantId: string;
      userId: string;
      subtotalCents: number;
      totalCents: number;
      customerEmail: string | null;
      createdAt: string;
    }>(response);
  },

  /**
   * Get sale details
   * GET /api/sales/[id]
   */
  async getById(id: string) {
    const response = await fetch(`/api/sales/${id}`);
    return handleResponse(response);
  },
};
