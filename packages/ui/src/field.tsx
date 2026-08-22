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
  children: ReactElement<FieldControlProps>;
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
  const child = Children.only(children);

  if (!isValidElement<FieldControlProps>(child)) {
    throw new Error("Field children must be a form control element");
  }

  const callerDescribedBy = child.props["aria-describedby"]
    ?.trim()
    .split(/\s+/u)
    .filter(Boolean);
  const generatedDescribedBy = error
    ? errorId
    : description
      ? descriptionId
      : null;
  const describedBy = [generatedDescribedBy, ...(callerDescribedBy ?? [])]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" ");
  const controlId = child.props.id ?? id;
  const control = cloneElement(child, {
    id: controlId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": error ? true : child.props["aria-invalid"],
    "aria-required": required || child.props["aria-required"] || undefined,
  });

  return (
    <div
      {...props}
      className={[styles.field, className].filter(Boolean).join(" ")}
    >
      <label className={styles.fieldLabel} htmlFor={controlId}>
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
