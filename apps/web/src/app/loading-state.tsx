import { LoadingState } from "@/components/loading-state";

export default function Loading(): React.JSX.Element {
  return (
    <LoadingState
      title="Loading categories"
      description="Getting your letter designs ready."
    />
  );
}
