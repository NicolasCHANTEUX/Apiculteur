export type CartItem = { id: string; quantity: number };

const KEY = "apiculteur-cart-v1";
export const CART_EVENT = "apiculteur-cart-change";
let temporarySnapshot: string | null = null;
export function cartSnapshot() {
  if (temporarySnapshot !== null) return temporarySnapshot;
  try { return window.localStorage.getItem(KEY) ?? "[]"; }
  catch { return "[]"; }
}
export function subscribeCart(callback: () => void) {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(CART_EVENT, callback); window.removeEventListener("storage", callback); };
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  return parseCart(cartSnapshot());
}

export function parseCart(snapshot: string): CartItem[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CartItem =>
      typeof item === "object" && item !== null &&
      typeof item.id === "string" && item.id.length > 0 &&
      Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 999,
    );
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  const snapshot = JSON.stringify(items);
  let saved = true;
  try { window.localStorage.setItem(KEY, snapshot); temporarySnapshot = null; }
  catch { temporarySnapshot = snapshot; saved = false; }
  window.dispatchEvent(new Event(CART_EVENT));
  return saved;
}

export function addToCart(id: string, quantity = 1) {
  const items = readCart();
  const existing = items.find((item) => item.id === id);
  if (existing) existing.quantity = Math.min(999, existing.quantity + quantity);
  else items.push({ id, quantity });
  return writeCart(items);
}
