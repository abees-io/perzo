export type PetState = "idle" | "thinking" | "responding";

export function Pet({ state, small = false }: { state: PetState; small?: boolean }) {
  return (
    <div className={`pet-scene ${small ? "pet-small" : ""}`} data-state={state} role="img" aria-label={`Perzo, a little green companion, is ${state}`}>
      <div className="pet-shadow" />
      <div className="pet-body">
        <div className="pet-leaf" />
        <div className="pet-ear pet-ear-left" /><div className="pet-ear pet-ear-right" />
        <div className="pet-face">
          <i className="pet-eye" /><i className="pet-eye" />
          <span className="pet-cheek cheek-left" /><span className="pet-cheek cheek-right" />
          <span className="pet-mouth" />
        </div>
        <div className="pet-foot foot-left" /><div className="pet-foot foot-right" />
      </div>
      {!small && <><span className="pet-spark spark-one">✧</span><span className="pet-spark spark-two">✧</span></>}
    </div>
  );
}
