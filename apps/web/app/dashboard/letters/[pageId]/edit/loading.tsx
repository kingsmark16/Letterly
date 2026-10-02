import { LoadingState } from "../../../../../src/components/loading-state";

export default function EditLoading(): React.JSX.Element {
  return (
    <LoadingState
      variant="page"
      id="dashboard-content"
      title="Opening your letter"
      description="Getting your private draft ready."
    />
  );
}
