/**
 * Résolution de l'ID de la page courante depuis l'élément du widget.
 *
 * Dans la nouvelle UX Staffbase, le widget est rendu à l'intérieur d'une
 * shadow root, et l'attribut `data-installation-id` est posé sur la balise
 * `<html>` de l'app : `closest()` seul ne traverse pas les frontières de
 * shadow root et ne le verrait jamais.
 *
 * On remonte donc les ancêtres en traversant chaque shadow root vers son
 * host, jusqu'au DOM light, où un `closest()` final cherche jusqu'au document.
 */
export function resolveInstallationId(start: HTMLElement): string | undefined {
  let node: Element | null = start;
  while (node) {
    const hit = node.closest("[data-installation-id]");
    if (hit) {
      return hit.getAttribute("data-installation-id") ?? undefined;
    }
    const root = node.getRootNode();
    if (root instanceof ShadowRoot) {
      node = root.host;
    } else {
      // DOM light : closest a déjà cherché jusqu'au document
      return undefined;
    }
  }
  return undefined;
}
