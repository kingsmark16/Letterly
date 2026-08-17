import styles from "../../../../not-found.module.css";

export default function EditLoading(): React.JSX.Element {
  return (
    <main className={styles.page} aria-busy="true">
      <p>Opening your private draft...</p>
    </main>
  );
}
