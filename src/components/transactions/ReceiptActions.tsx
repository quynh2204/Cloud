"use client";

import { useRef, useState } from "react";
import { voidSaleAction, refundSaleAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";

type ReceiptActionsProps = {
  saleId: string;
  saleTotalCents: number;
};

export function ReceiptActions({ saleId, saleTotalCents }: ReceiptActionsProps) {
  const voidFormRef = useRef<HTMLFormElement>(null);
  const refundFormRef = useRef<HTMLFormElement>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  return (
    <div className="mt-6 space-y-6 border-t border-[color:var(--border)] pt-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Void receipt</h3>
        <p className="mt-1 text-xs text-white/60">
          Keep the receipt in history, restore stock, and mark it as VOID.
        </p>
        <Button type="button" variant="danger" className="mt-3" onClick={() => setVoidOpen(true)}>
          Void
        </Button>

        <form ref={voidFormRef} action={voidSaleAction} className="hidden">
          <input type="hidden" name="saleId" value={saleId} />
          <input type="hidden" name="reason" value={voidReason} />
        </form>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">Refund</h3>
        <p className="mt-1 text-xs text-white/60">
          Issue a refund after the sale is settled. This will restore stock and record a refund transaction for the full receipt amount.
        </p>
        <Button type="button" className="mt-3" onClick={() => setRefundOpen(true)}>
          Refund
        </Button>

        <form ref={refundFormRef} action={refundSaleAction} className="hidden">
          <input type="hidden" name="saleId" value={saleId} />
          <input type="hidden" name="reason" value={refundReason} />
        </form>
      </div>

      <ConfirmModal
        open={voidOpen}
        title="Void this receipt?"
        description="This will keep the receipt for history, restore stock, and mark the sale as VOIDED."
        confirmLabel="Void receipt"
        confirmVariant="danger"
        onCancel={() => setVoidOpen(false)}
        onConfirm={() => {
          setVoidOpen(false);
          queueMicrotask(() => voidFormRef.current?.requestSubmit());
        }}
      >
        <div className="space-y-3">
          <Input value={voidReason} onChange={(event) => setVoidReason(event.target.value)} placeholder="Reason (optional)" />
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={refundOpen}
        title="Issue refund"
        description="This will restore stock and create a refund transaction for the full receipt total."
        confirmLabel="Issue refund"
        confirmVariant="danger"
        onCancel={() => setRefundOpen(false)}
        onConfirm={() => {
          setRefundOpen(false);
          queueMicrotask(() => refundFormRef.current?.requestSubmit());
        }}
      >
        <div className="space-y-3">
          <Input value={`${saleTotalCents}`} disabled placeholder="Receipt total in cents" />
          <Input value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="Reason (optional)" />
        </div>
      </ConfirmModal>

      {/* Replacement invoices are hidden in this phase per product owner decision. */}
    </div>
  );
}
