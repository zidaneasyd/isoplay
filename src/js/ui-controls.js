export function attachInspectorControls({
  panel,
  panelToggle,
  worldToggle,
  worldInspectors,
  stepper,
  decrementButton,
  incrementButton,
  sizeInput,
  sizeLabel,
}) {
  if (![panel, panelToggle, worldToggle, worldInspectors, stepper, decrementButton,
    incrementButton, sizeInput, sizeLabel].every(Boolean)) return { dispose() {} };

  const removers = [];
  const listen = (target, name, listener, options) => {
    if (!target?.addEventListener) return;
    target.addEventListener(name, listener, options);
    removers.push(() => target.removeEventListener?.(name, listener, options));
  };

  function togglePanel() {
    const nextOpen = panelToggle.getAttribute("aria-expanded") !== "true";
    panelToggle.setAttribute("aria-expanded", String(nextOpen));
    panelToggle.classList.toggle("is-panel-hidden", !nextOpen);
    panel.classList.toggle("is-hidden", !nextOpen);
    const label = nextOpen ? "Sembunyikan panel pengaturan" : "Tampilkan panel pengaturan";
    panelToggle.setAttribute("aria-label", label);
    panelToggle.setAttribute("title", label);
  }

  function toggleWorld() {
    const expanded = worldToggle.getAttribute("aria-expanded") !== "true";
    worldToggle.setAttribute("aria-expanded", String(expanded));
    worldInspectors.classList.toggle("is-collapsed", !expanded);
  }

  listen(panelToggle, "click", togglePanel);
  listen(worldToggle, "click", toggleWorld);

  let currentSize = 9;
  function syncSize() {
    const requested = Number(sizeInput.value);
    const clamped = Number.isFinite(requested) ? Math.min(99, Math.max(9, requested)) : 9;
    currentSize = Math.min(99, 9 + 2 * Math.round((clamped - 9) / 2));
    sizeInput.value = String(currentSize);
    sizeLabel.textContent = `${currentSize}*`;
    decrementButton.disabled = currentSize <= 9;
    incrementButton.disabled = currentSize >= 99;
  }

  function setSize(nextSize) {
    const previous = currentSize;
    sizeInput.value = String(nextSize);
    syncSize();
    if (currentSize === previous) return;
    sizeInput.dispatchEvent(new Event("input", { bubbles: true }));
  }

  listen(sizeInput, "input", syncSize);
  listen(stepper, "wheel", (event) => {
    event.preventDefault();
    setSize(currentSize + (event.deltaY < 0 ? 2 : -2));
  }, { passive: false });
  listen(stepper, "keydown", (event) => {
    if (["ArrowUp", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      setSize(currentSize + 2);
    } else if (["ArrowDown", "ArrowLeft"].includes(event.key)) {
      event.preventDefault();
      setSize(currentSize - 2);
    }
  });

  function bindHold(button, delta) {
    let timeout = null;
    let interval = null;
    let suppressClick = false;
    const stop = () => {
      clearTimeout(timeout);
      clearInterval(interval);
      timeout = null;
      interval = null;
    };
    const down = (event) => {
      if (event.button !== 0 || button.disabled) return;
      setSize(currentSize + delta);
      timeout = setTimeout(() => {
        suppressClick = true;
        interval = setInterval(() => {
          if (button.disabled) stop();
          else setSize(currentSize + delta);
        }, 70);
      }, 320);
    };
    const click = (event) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
      } else if (event.detail === 0) {
        setSize(currentSize + delta);
      }
    };
    listen(button, "pointerdown", down);
    listen(button, "click", click);
    for (const name of ["pointerup", "pointerleave", "pointercancel", "blur"]) listen(button, name, stop);
  }

  bindHold(decrementButton, -2);
  bindHold(incrementButton, 2);
  syncSize();

  return {
    dispose() { for (const remove of removers) remove(); },
  };
}
