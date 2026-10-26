"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function useTheme() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const isDark =
            document.documentElement.classList.contains("dark") ||
            localStorage.getItem("theme") === "dark" ||
            (!localStorage.getItem("theme") &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

        if (isDark) {
            document.documentElement.classList.add("dark");
            setTheme("dark");
        } else {
            document.documentElement.classList.remove("dark");
            setTheme("light");
        }

        const observer = new MutationObserver(() => {
            const currentDark = document.documentElement.classList.contains("dark");
            setTheme(currentDark ? "dark" : "light");
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        if (nextTheme === "dark") {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
        setTheme(nextTheme);
    };

    return { theme, isDark: theme === "dark", toggleTheme };
}

interface ThemeToggleProps {
    className?: string;
    showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={
                className ||
                "flex items-center gap-2 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer shadow-xs text-xs font-semibold"
            }
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Sun className="w-4.5 h-4.5 text-amber-400 shrink-0" />
            ) : (
                <Moon className="w-4.5 h-4.5 text-neutral-600 dark:text-neutral-400 shrink-0" />
            )}
            {showLabel && <span>{isDark ? "Modo Claro" : "Modo Oscuro"}</span>}
        </button>
    );
}
