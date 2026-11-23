"use client";

import { useEffect, useRef } from "react";
import type { StarColor } from "@/content/directions";
import { readStarColor } from "@/lib/accent";
import { startFireParticles, type FireParticlesController } from "@/lib/fire-particles";
import styles from "./FireParticles.module.css";

/** Искры, поднимающиеся снизу hero. Цвет следует за выбранной звездой. */
export function FireParticles({ star }: { star: StarColor }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<FireParticlesController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = startFireParticles(canvas, readStarColor(canvas, star));
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
    // Запускаем один раз; смену цвета обрабатывает эффект ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const recolor = () => controllerRef.current?.setColor(readStarColor(canvas, star));
    recolor();

    // Графитовая звезда в тёмной теме светлее: перекрашиваем при смене темы.
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", recolor);
    return () => scheme.removeEventListener("change", recolor);
  }, [star]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
