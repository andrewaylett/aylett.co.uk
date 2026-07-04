import {
  type DetailedHTMLProps,
  type InputHTMLAttributes,
  type JSX,
  useEffect,
  useRef,
} from 'react';

export function BoundEditableInput(
  props: DetailedHTMLProps<
    InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >,
): JSX.Element {
  const { onChange, value, children, ref: outerRef, ...rest } = props;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If we update the value, the browser will reset the cursor position.
    // So don't do that if it's not actually changed.
    if (inputRef.current) {
      const newValue = value?.toString() ?? '';
      if (inputRef.current.value !== newValue) {
        const selectionStart = inputRef.current.selectionStart;
        const selectionEnd = inputRef.current.selectionEnd;
        const oldLength = inputRef.current.value.length;
        const oldSelection =
          selectionStart == null || selectionEnd == null
            ? ''
            : inputRef.current.value.slice(selectionStart, selectionEnd);
        const oldSuffix =
          selectionEnd == null
            ? ''
            : inputRef.current.value.slice(selectionEnd);
        const oldPrefix =
          selectionStart == null
            ? ''
            : inputRef.current.value.slice(0, selectionStart);

        inputRef.current.value = newValue;

        if (selectionStart !== null && selectionEnd !== null) {
          const lengthChange = newValue.length - oldLength;
          if (oldSelection.length > 0) {
            if (oldSelection === newValue.slice(selectionStart, selectionEnd)) {
              inputRef.current.setSelectionRange(selectionStart, selectionEnd);
            } else if (
              oldSelection ===
              newValue.slice(
                selectionStart + lengthChange,
                selectionEnd + lengthChange,
              )
            ) {
              inputRef.current.setSelectionRange(
                selectionStart + lengthChange,
                selectionEnd + lengthChange,
              );
            } else {
              inputRef.current.setSelectionRange(
                selectionStart,
                selectionEnd + lengthChange,
              );
            }
          } else {
            const newPrefix = newValue.slice(0, selectionStart);
            const newSuffix = newValue.slice(selectionEnd + lengthChange);
            if (oldPrefix === newPrefix && oldSuffix === newSuffix) {
              inputRef.current.setSelectionRange(
                selectionStart,
                selectionEnd + lengthChange,
              );
            } else if (oldSuffix === newSuffix) {
              inputRef.current.setSelectionRange(
                selectionStart + lengthChange,
                selectionEnd + lengthChange,
              );
            } else {
              inputRef.current.setSelectionRange(selectionStart, selectionEnd);
            }
          }
        }
      }
    }
  }, [value]);

  return (
    <input
      ref={(instance) => {
        inputRef.current = instance;
        if (outerRef) {
          if (typeof outerRef === 'function') {
            const fn = outerRef(instance);
            return () => {
              inputRef.current = null;
              if (fn) {
                fn();
              }
            };
          } else {
            outerRef.current = instance;
            return () => {
              inputRef.current = null;
              outerRef.current = null;
            };
          }
        }
      }}
      onChange={(event) => {
        if (inputRef.current === globalThis.document.activeElement) {
          onChange?.(event);
        }
      }}
      {...rest}
    >
      {children}
    </input>
  );
}
