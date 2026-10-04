export const nativeBackEvent = "sajag:native-back";

/** Android Back closes an overlay first, then returns every app section Home. */
export function consumeNativeBack(
  event: Event,
  pathname: string,
  navigateHome: () => void,
  surface: Pick<Document, "querySelector"> = document,
): void {
  const dialog = surface.querySelector<HTMLDialogElement>("dialog[open]");
  if (dialog) {
    event.preventDefault();
    // Use the same cancel handler as Escape, so React clears the modal state.
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    return;
  }
  const menuCloser = surface.querySelector<HTMLButtonElement>(
    "button.sidebar-backdrop",
  );
  if (menuCloser) {
    event.preventDefault();
    menuCloser.click();
    return;
  }
  if (pathname !== "/") {
    event.preventDefault();
    navigateHome();
  }
}
