import { LoadingState } from "../../src/components/loading-state";

export default function Loading(): React.JSX.Element {
  return (
    <LoadingState
      variant="page"
      id="dashboard-content"
      title="Opening your workspace"
    />
  );
}
