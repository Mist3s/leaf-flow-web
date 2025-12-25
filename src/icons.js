export function applyIcons(scope = document) {
  if (window?.lucide?.createIcons) {
    window.lucide.createIcons({ attrs: { width: 18, height: 18 } }, scope);
  }
}
