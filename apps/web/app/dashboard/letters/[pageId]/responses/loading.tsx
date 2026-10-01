import { LoadingState } from "../../../../../src/components/loading-state";

export default function ResponsesLoading(): React.JSX.Element {
  return (
    <LoadingState
      variant="page"
      id="dashboard-content"
      title="Loading responses"
      description="Opening your private inbox."
    />
  );
}
