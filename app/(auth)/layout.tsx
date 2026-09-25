import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen w-full flex flex-col justify-center items-center relative overflow-hidden bg-neutral-100 dark:bg-neutral-950 text-foreground">
            {children}
        </div>
    );
}
