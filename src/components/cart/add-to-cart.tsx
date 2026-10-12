"use client";

import { useState } from "react";
import Link from "next/link";
import { addToCart } from "@/lib/cart/storage";

export function AddToCart({ id }: { id: string }) {
  const [added, setAdded] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  return <div className="mt-5 flex items-center gap-4">
    <button type="button" onClick={() => { setNotSaved(!addToCart(id)); setAdded(true); }} className="min-h-12 rounded-lg bg-honey px-5 font-medium text-white hover:bg-honey-dark">Ajouter au panier</button>
    {added ? <Link href="/panier" className="text-sm text-honey-dark underline">Voir le panier</Link> : null}
    {notSaved ? <span role="status" className="text-sm text-red-700">Le panier ne sera pas conservé après fermeture du navigateur.</span> : null}
  </div>;
}
