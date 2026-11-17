import '@testing-library/jest-dom'

// jsdom doesn't implement the modal <dialog> API.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom hides [popover] via its UA stylesheet but has no showPopover(), so
// nothing could ever open. Behave like a browser without popover support
// (the attribute is ignored) — the fallback path components already handle.
if (!('showPopover' in HTMLElement.prototype)) {
  const style = document.createElement('style')
  style.textContent = '[popover] { display: block !important; }'
  document.head.append(style)
}
