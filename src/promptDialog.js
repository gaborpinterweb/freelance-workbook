let setPromptState = null;
let resolvePrompt = null;

export function bindPromptHost(setter) {
  setPromptState = setter;
}

/** Custom prompt. Resolves to the entered string, or null if cancelled. */
export function askPrompt({
  title = "Enter a value",
  message = "",
  defaultValue = "",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  placeholder = "",
} = {}) {
  return new Promise((resolve) => {
    if (resolvePrompt) {
      resolvePrompt(null);
      resolvePrompt = null;
    }
    resolvePrompt = resolve;
    if (!setPromptState) {
      resolve(null);
      resolvePrompt = null;
      return;
    }
    setPromptState({
      title,
      message,
      defaultValue: defaultValue == null ? "" : String(defaultValue),
      confirmLabel,
      cancelLabel,
      placeholder,
    });
  });
}

export function settlePrompt(value) {
  const resolve = resolvePrompt;
  resolvePrompt = null;
  setPromptState?.(null);
  resolve?.(value);
}
