"use client";

import { useRef, useState } from "react";
import { deleteProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type DeleteProductFormProps = {
  productId: string;
  productName: string;
};

export function DeleteProductForm({ productId, productName }: DeleteProductFormProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteProductAction} className="mt-3">
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="confirmation" value={confirmation} />
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Delete product
      </Button>

      <ConfirmModal
        open={open}
        title={`Delete ${productName}?`}
        description="This action will remove the product from the catalog. Confirm again to proceed."
        confirmLabel="Delete permanently"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setConfirmation("DELETE");
          setOpen(false);
          queueMicrotask(() => formRef.current?.requestSubmit());
        }}
      />
    </form>
  );
}
