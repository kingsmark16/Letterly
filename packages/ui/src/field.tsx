import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import styles from "./ui.module.css";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

export interface FieldProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  id: string;
  label: ReactNode;
  required?: boolean;
}

export function Field({
  children,
  className,
  description,
  error,
  id,
  label,
  required = false,
  ...props
}: FieldProps): React.JSX.Element {
  const generatedId = useId();
  const descriptionId = `${id}-${generatedId}-description`;
  const errorId = `${id}-${generatedId}-error`;
  const describedBy = [
    description ? descriptionId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");
  const child = Children.only(children);
  const control = isValidElement<FieldControlProps>(child)
    ? cloneElement(child as ReactElement<FieldControlProps>, {
        id: child.props.id ?? id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
      })
    : child;

  return (
    <div
      {...props}
      className={[styles.field, className].filter(Boolean).join(" ")}
    >
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <p className={styles.fieldDescription} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {control}
      {error ? (
        <p className={styles.fieldError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
