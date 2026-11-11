import Link from "next/link";
import styles from "./not-found.module.css";

export default function RootNotFound(): React.JSX.Element {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Page not found</p>
      <h1>We could not find this page.</h1>
      <p>The link may have moved or no longer exists.</p>
      <Link href="/">Return to Letterly</Link>
    </main>
  );
}
