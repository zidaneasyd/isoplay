export function preventBrowserZoom() {
  window.addEventListener("wheel", (event) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault();
  }, { passive: false, capture: true });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && ["+", "=", "-", "_", "0"].includes(event.key)) {
      event.preventDefault();
    }
  }, true);

  for (const gesture of ["gesturestart", "gesturechange", "gestureend"]) {
    window.addEventListener(gesture, (event) => event.preventDefault(), { passive: false });
  }
}
