import { LoadingState } from "../src/components/loading-state";

export default function Loading(): React.JSX.Element {
  return (
    <LoadingState
      title="Loading categories"
      description="Getting your letter designs ready."
    />
  );
}
