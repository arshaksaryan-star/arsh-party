"use client";

import { useEffect, useRef } from "react";
import { ACCENT_EVENT, currentAccent, readStarColor } from "@/lib/accent";
import { startEdgeSparks } from "@/lib/fire-particles";
import styles from "./EdgeSparks.module.css";

/**
 * Искры у краёв экрана, которые сопровождают прокрутку.
 * Пока на экране hero с собственными искрами, новые не появляются.
 */
export function EdgeSparks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isActive = () => {
      const hero = document.querySelector("[data-hero]");
      if (!hero) return window.scrollY > window.innerHeight * 0.5;
      return hero.getBoundingClientRect().bottom < window.innerHeight * 0.35;
    };

    const controller = startEdgeSparks(canvas, readStarColor(canvas, currentAccent()), isActive);
    const recolor = () => controller.setColor(readStarColor(canvas, currentAccent()));
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");

    window.addEventListener(ACCENT_EVENT, recolor);
    scheme.addEventListener("change", recolor);
    return () => {
      controller.destroy();
      window.removeEventListener(ACCENT_EVENT, recolor);
      scheme.removeEventListener("change", recolor);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
