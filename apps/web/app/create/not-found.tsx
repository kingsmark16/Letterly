import styles from "../not-found.module.css";
import Link from "next/link";

export default function CreateNotFound(): React.JSX.Element {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Template unavailable</p>
      <h1>We could not find that starting point.</h1>
      <p>Return to the template collection and choose a current template.</p>
      <Link href="/">Return to Letterly</Link>
    </main>
  );
}
