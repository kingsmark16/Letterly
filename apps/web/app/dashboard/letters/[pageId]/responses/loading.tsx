export default function ResponsesLoading(): React.JSX.Element {
  return (
    <main
      className="grid min-h-screen place-items-center bg-canvas px-5 py-9 text-ink"
      aria-busy="true"
    >
      <p className="text-body-large text-ink-muted">
        Opening private responses...
      </p>
    </main>
  );
}
