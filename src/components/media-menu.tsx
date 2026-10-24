"use client";
import { useId, useRef } from "react";
import { Icon } from "./icon";

export function MediaMenu({
  disabled,
  photosEnabled,
  onPhoto,
  onCamera,
}: {
  disabled: boolean;
  photosEnabled: boolean;
  onPhoto: () => void;
  onCamera: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  function choose(action: () => void) {
    dialog.current?.close();
    action();
  }
  function open() {
    if (!dialog.current || !button.current) return;
    const rect = button.current.getBoundingClientRect();
    dialog.current.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 284))}px`;
    dialog.current.style.bottom = `${Math.max(12, Math.min(window.innerHeight - 260, window.innerHeight - rect.top + 10))}px`;
    dialog.current.showModal();
  }
  return (
    <div className="attachment-control">
      <button
        ref={button}
        type="button"
        className="composer-add"
        onClick={open}
        disabled={disabled}
        aria-label="Add media"
        aria-haspopup="dialog"
      >
        <Icon name="plus" size={22} />
      </button>
      <dialog
        ref={dialog}
        className="attachment-menu"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <h2 id={titleId}>Add to your conversation</h2>
        <button type="button" disabled={!photosEnabled} onClick={() => choose(onPhoto)}>
          <Icon name="image" />
          <span>
            Add photo<small>JPEG, PNG or WebP</small>
          </span>
        </button>
        <button type="button" disabled={!photosEnabled} onClick={() => choose(onCamera)}>
          <Icon name="camera" />
          <span>
            Take a photo<small>Use your camera</small>
          </span>
        </button>
        {!photosEnabled && <p>Choose a model marked Chat + photos to attach a photo.</p>}
      </dialog>
    </div>
  );
}
