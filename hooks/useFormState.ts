import { useState } from "react";

type FormErrors<T> = Partial<Record<keyof T | "message", string[]>>;

export function useFormState<T extends object>(initialValues: T) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrorsState] = useState<FormErrors<T>>({});

    const setErrors = (
        input?:
            | FormErrors<T>
            | Record<string, any>
            | ((prev: FormErrors<T>) => FormErrors<T>)
    ) => {
        if (!input) {
            setErrorsState({});
            return;
        }
        if (typeof input === "function") {
            setErrorsState((prev) => {
                const res = input(prev);
                if (!res || typeof res !== "object") return {};
                const clean: FormErrors<T> = {};
                for (const [k, v] of Object.entries(res)) {
                    if (Array.isArray(v) && v.length > 0) {
                        clean[k as keyof T] = v.map(String);
                    } else if (typeof v === "string" && v.length > 0) {
                        clean[k as keyof T] = [v];
                    }
                }
                return clean;
            });
            return;
        }
        const rawInput = input as Record<string, any>;
        const errObj = rawInput.errors && typeof rawInput.errors === "object" ? rawInput.errors : rawInput;
        const normalized: FormErrors<T> = {};
        for (const [key, val] of Object.entries(errObj)) {
            if (Array.isArray(val) && val.length > 0) {
                normalized[key as keyof T] = val.map(String);
            } else if (typeof val === "string" && val.length > 0) {
                normalized[key as keyof T] = [val];
            } else if (val) {
                normalized[key as keyof T] = [String(val)];
            }
        }
        setErrorsState(normalized);
    };

    const setField = <K extends keyof T>(field: K, value: T[K]) => {
        setValues((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrorsState((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const reset = () => {
        setValues(initialValues);
        setErrorsState({});
    };

    return {
        values,
        setValues,
        errors,
        setErrors,
        setField,
        reset,
    };
}