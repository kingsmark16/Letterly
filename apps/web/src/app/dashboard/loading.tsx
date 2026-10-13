import { LoadingState } from "@/components/loading-state";

export default function Loading(): React.JSX.Element {
  return (
    <LoadingState
      variant="page"
      id="dashboard-content"
      title="Opening your workspace"
    />
  );
}
