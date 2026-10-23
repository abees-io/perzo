"use client";
import { useRef } from "react";
import { AVAILABLE_MODELS, getModel } from "@/lib/models";
import { Icon } from "./icon";

export function ModelPicker({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const model = getModel(value)!;
  return <div className="composer-model-row">
    <button className="model-badge-btn" type="button" aria-haspopup="dialog" aria-label={`Choose model. Current: ${model.name}`} disabled={disabled} onClick={() => dialog.current?.showModal()}><span aria-hidden="true">{model.icon}</span><span>{model.name}</span><Icon name="chevron" size={14} /></button>
    <span className="composer-model-kind">{model.tag}</span>
    <dialog ref={dialog} className="model-dialog" aria-labelledby="models-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="model-dialog-heading"><div><h2 id="models-title">Choose your model</h2><p>Choose how Perzo answers</p></div><button className="icon-button" type="button" onClick={() => dialog.current?.close()} aria-label="Close model picker"><Icon name="close" /></button></div>
      <div className="model-list">{AVAILABLE_MODELS.map(option => <button type="button" key={option.id} className={`model-option ${value === option.id ? "is-active" : ""}`} aria-pressed={value === option.id} onClick={() => { onChange(option.id); dialog.current?.close(); }}>
        <span className="model-option-top"><span className="model-option-title">{option.name}</span><span className="model-tag-pill">{option.tag}</span></span><span className="model-option-desc">{option.description}</span>
      </button>)}</div>
      <p className="model-access-note">Availability and limits depend on your NVIDIA account. Text-only models don’t receive photo attachments.</p>
    </dialog>
  </div>;
}
