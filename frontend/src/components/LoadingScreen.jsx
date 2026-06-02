export default function LoadingScreen({ label = "LOADING TRACK..." }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-wheel" aria-hidden="true" />
      <div className="loading-text font-pixel flicker">{label}</div>
    </div>
  );
}
