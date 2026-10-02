let setConfirmState = null;
let resolveConfirm = null;

export function bindConfirmHost(setter) {
  setConfirmState = setter;
}

/** Custom confirm. Resolves true if confirmed, false if cancelled. */
export function askConfirm({
  title = "Are you sure?",
  message = "",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    if (resolveConfirm) {
      resolveConfirm(false);
      resolveConfirm = null;
    }
    resolveConfirm = resolve;
    if (!setConfirmState) {
      resolve(false);
      resolveConfirm = null;
      return;
    }
    setConfirmState({
      title,
      message,
      confirmLabel,
      cancelLabel,
      danger: !!danger,
    });
  });
}

export function settleConfirm(value) {
  const resolve = resolveConfirm;
  resolveConfirm = null;
  setConfirmState?.(null);
  resolve?.(!!value);
}
