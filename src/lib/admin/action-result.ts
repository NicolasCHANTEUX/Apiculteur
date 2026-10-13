// Résultat renvoyé par les actions serveur de l'administration : affiché
// dans une notification au lieu de faire échouer toute la page.
export type ActionResult = { status: "idle" | "error" | "success"; message: string };

export const idleResult: ActionResult = { status: "idle", message: "" };

export function success(message: string): ActionResult {
  return { status: "success", message };
}

export function failure(message: string): ActionResult {
  return { status: "error", message };
}
