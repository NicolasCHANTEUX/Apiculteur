"use client";

import { useEffect } from "react";
import { writeCart } from "@/lib/cart/storage";

/** Vide le panier une fois la demande enregistrée. */
export function ClearCart() {
  useEffect(() => {
    writeCart([]);
  }, []);
  return null;
}
