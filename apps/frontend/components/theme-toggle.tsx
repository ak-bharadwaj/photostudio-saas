'use client';

import { useTheme } from "./theme-provider";
import { Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 text-foreground/50 hover:text-foreground transition-all duration-500 rounded-none border border-foreground/5 hover:border-foreground relative group overflow-hidden"
        >
            <div className="relative z-10">
                {theme === "light" ? (
                    <Moon size={16} className="animate-scale-in text-slate-700" />
                ) : (
                    <Sun size={16} className="animate-scale-in text-amber-500" />
                )}
            </div>
            <div className="absolute inset-0 bg-foreground/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
        </Button>
    );
}
