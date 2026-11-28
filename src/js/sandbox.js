export function createSandbox() {
  let active = false;

  return {
    start() { active = true; },
    stop() { active = false; },
    isActive: () => active,
    update(deltaSeconds) {
      if (!active) return;
      // Scene simulation hooks will be added here.
      void deltaSeconds;
    },
  };
}
