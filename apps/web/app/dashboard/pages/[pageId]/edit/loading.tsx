import styles from "../../../../not-found.module.css";

export default function EditLoading(): React.JSX.Element {
  return (
    <main className={styles.page} id="dashboard-content" aria-busy="true">
      <p>Opening your private page…</p>
    </main>
  );
}
