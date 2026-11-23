/**
 * Частицы огня на canvas.
 *
 * Чем отличается от варианта в старом arsh-party.html (там каждые 300 мс
 * в DOM добавлялся новый div):
 * - один <canvas> и один цикл requestAnimationFrame, без создания элементов;
 * - число частиц ограничено: 26 на телефоне, 48 на десктопе;
 * - анимация стоит на паузе, когда hero не виден или вкладка свёрнута;
 * - при «Уменьшить движение» в настройках системы частиц нет совсем;
 * - мягкая искра рисуется один раз в спрайт и дальше только копируется.
 */

type Particle = {
  x: number;
  y: number;
  driftX: number;
  speedY: number;
  size: number;
  age: number;
  lifetime: number;
  swayAmplitude: number;
  swayPhase: number;
};

export type FireParticlesController = {
  /** Перекрасить частицы, например при выборе другой звезды. */
  setColor: (color: string) => void;
  /** Остановить анимацию и снять все обработчики. */
  destroy: () => void;
};

const SPRITE_SIZE = 64;

/** Круглая мягкая искра заданного цвета, нарисованная один раз. */
function createSprite(color: string): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const context = sprite.getContext("2d");
  if (!context) return sprite;

  const half = SPRITE_SIZE / 2;
  const gradient = context.createRadialGradient(half, half * 1.15, 0, half, half, half);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.35, "rgba(0,0,0,0.85)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);

  // Окрашиваем маску нужным цветом, сохраняя прозрачность краёв.
  context.globalCompositeOperation = "source-in";
  context.fillStyle = color;
  context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  return sprite;
}

export function startFireParticles(canvas: HTMLCanvasElement, initialColor: string): FireParticlesController {
  const noop: FireParticlesController = { setColor: () => {}, destroy: () => {} };
  const context = canvas.getContext("2d");
  if (!context) return noop;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const particles: Particle[] = [];
  let sprite = createSprite(initialColor);
  let width = 0;
  let height = 0;
  let frameId = 0;
  let lastTime = 0;
  let spawnBudget = 0;
  let isVisible = true;
  let isRunning = false;

  const isNarrow = () => width < 640;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function spawn() {
    // На широком экране hero выше: искры крупнее и летят быстрее, чтобы подняться до заголовка.
    const scale = isNarrow() ? 1 : 1.5;
    particles.push({
      x: width * (0.04 + Math.random() * 0.92),
      y: height + 12,
      driftX: (Math.random() - 0.5) * 14,
      speedY: (30 + Math.random() * 52) * scale,
      size: (4 + Math.random() * 9) * scale,
      age: 0,
      lifetime: 2.4 + Math.random() * 2.8,
      swayAmplitude: 6 + Math.random() * 18,
      swayPhase: Math.random() * Math.PI * 2,
    });
  }

  function frame(time: number) {
    if (!isRunning) return;
    // Ограничение шага: после паузы частицы не «прыгают».
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const maxParticles = isNarrow() ? 26 : 48;
    spawnBudget += delta * (isNarrow() ? 6 : 10);
    while (spawnBudget >= 1) {
      spawnBudget -= 1;
      if (particles.length < maxParticles) spawn();
    }

    context!.clearRect(0, 0, width, height);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.age += delta;
      if (particle.age >= particle.lifetime || particle.y < -20) {
        particles.splice(index, 1);
        continue;
      }

      const sway = Math.sin(particle.swayPhase + particle.age * 2.4) * particle.swayAmplitude;
      particle.x += (particle.driftX + sway) * delta;
      particle.y -= particle.speedY * delta;

      // Быстро разгорается, медленно гаснет и уменьшается, как искра.
      const progress = particle.age / particle.lifetime;
      const opacity = progress < 0.15 ? progress / 0.15 : 1 - (progress - 0.15) / 0.85;
      const radius = particle.size * (1 - progress * 0.55);

      context!.globalAlpha = Math.max(0, opacity) * 0.8;
      context!.drawImage(sprite, particle.x - radius * 0.7, particle.y - radius, radius * 1.4, radius * 2);
    }

    context!.globalAlpha = 1;
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (isRunning || reducedMotion.matches || !isVisible || document.hidden) return;
    isRunning = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    isRunning = false;
    cancelAnimationFrame(frameId);
  }

  function clear() {
    particles.length = 0;
    context!.clearRect(0, 0, width, height);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) start();
    else stop();
  });
  visibilityObserver.observe(canvas);

  const onTabVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onTabVisibility);

  const onMotionPreference = () => {
    if (reducedMotion.matches) {
      stop();
      clear();
    } else {
      start();
    }
  };
  reducedMotion.addEventListener("change", onMotionPreference);

  resize();
  start();

  return {
    setColor(color: string) {
      sprite = createSprite(color);
    },
    destroy() {
      stop();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", onTabVisibility);
      reducedMotion.removeEventListener("change", onMotionPreference);
    },
  };
}

/* ───────────────────────── Искры по краям экрана ───────────────────────── */

type EdgeSpark = {
  x: number;
  y: number;
  speedY: number;
  size: number;
  age: number;
  lifetime: number;
  flickerSpeed: number;
  flickerPhase: number;
};

/**
 * Искры, которые мерцают у левого и правого края экрана и сопровождают
 * посетителя при прокрутке. Рисуются на canvas, закреплённом поверх страницы
 * (pointer-events: none). Чем быстрее прокрутка, тем больше искр.
 *
 * @param isActive — когда false, новые искры не появляются (например, пока
 *   на экране hero со своими искрами); уже горящие спокойно догорают.
 */
export function startEdgeSparks(
  canvas: HTMLCanvasElement,
  initialColor: string,
  isActive: () => boolean,
): FireParticlesController {
  const noop: FireParticlesController = { setColor: () => {}, destroy: () => {} };
  const context = canvas.getContext("2d");
  if (!context) return noop;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sparks: EdgeSpark[] = [];
  let sprite = createSprite(initialColor);
  let width = 0;
  let height = 0;
  let frameId = 0;
  let lastTime = 0;
  let spawnBudget = 0;
  let lastScrollY = window.scrollY;
  let scrollEnergy = 0;
  let isRunning = false;

  const isNarrow = () => width < 640;

  function resize() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.max(1, Math.round(width * pixelRatio));
    canvas.height = Math.max(1, Math.round(height * pixelRatio));
    context!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function spawn() {
    // Полоса у края: на телефоне узкая, чтобы не лезть на текст.
    const band = isNarrow() ? Math.min(14, width * 0.04) : Math.min(120, width * 0.07);
    const leftSide = Math.random() < 0.5;
    const offset = Math.random() * band;
    sparks.push({
      x: leftSide ? offset : width - offset,
      y: height * (0.15 + Math.random() * 0.85),
      speedY: 12 + Math.random() * 30,
      size: (isNarrow() ? 3 : 4) + Math.random() * (isNarrow() ? 4 : 7),
      age: 0,
      lifetime: 1.6 + Math.random() * 2.2,
      flickerSpeed: 7 + Math.random() * 9,
      flickerPhase: Math.random() * Math.PI * 2,
    });
  }

  function onScroll() {
    const delta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    scrollEnergy = Math.min(scrollEnergy + Math.abs(delta) / 40, 12);
    // Искры чуть отстают от страницы — эффект сопровождения.
    for (const spark of sparks) spark.y -= delta * 0.35;
    start();
  }

  function frame(time: number) {
    if (!isRunning) return;
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const active = isActive();
    const maxSparks = isNarrow() ? 14 : 34;
    if (active) {
      // Тихое мерцание в покое плюс всплеск при прокрутке.
      spawnBudget += delta * ((isNarrow() ? 1.2 : 2.5) + scrollEnergy * 3);
      while (spawnBudget >= 1) {
        spawnBudget -= 1;
        if (sparks.length < maxSparks) spawn();
      }
    }
    scrollEnergy = Math.max(0, scrollEnergy - delta * 6);

    context!.clearRect(0, 0, width, height);
    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      spark.age += delta;
      if (spark.age >= spark.lifetime || spark.y < -20 || spark.y > height + 20) {
        sparks.splice(index, 1);
        continue;
      }
      spark.y -= spark.speedY * delta;
      const progress = spark.age / spark.lifetime;
      const envelope = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
      const flicker = 0.55 + 0.45 * Math.sin(spark.flickerPhase + spark.age * spark.flickerSpeed);
      const radius = spark.size * (1 - progress * 0.4);
      context!.globalAlpha = Math.max(0, envelope * flicker) * 0.85;
      context!.drawImage(sprite, spark.x - radius * 0.7, spark.y - radius, radius * 1.4, radius * 2);
    }
    context!.globalAlpha = 1;

    // Нечего рисовать и нечего рождать — засыпаем до следующей прокрутки.
    if (sparks.length === 0 && !active && scrollEnergy === 0) {
      isRunning = false;
      return;
    }
    frameId = requestAnimationFrame(frame);
  }

  function start() {
    if (isRunning || reducedMotion.matches || document.hidden) return;
    isRunning = true;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    isRunning = false;
    cancelAnimationFrame(frameId);
  }

  const onTabVisibility = () => (document.hidden ? stop() : start());
  const onMotionPreference = () => {
    if (reducedMotion.matches) {
      stop();
      sparks.length = 0;
      context!.clearRect(0, 0, width, height);
    } else {
      start();
    }
  };

  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onTabVisibility);
  reducedMotion.addEventListener("change", onMotionPreference);

  resize();
  start();

  return {
    setColor(color: string) {
      sprite = createSprite(color);
    },
    destroy() {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onTabVisibility);
      reducedMotion.removeEventListener("change", onMotionPreference);
    },
  };
}
