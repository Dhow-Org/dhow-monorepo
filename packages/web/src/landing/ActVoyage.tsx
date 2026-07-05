import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { NauticalMap } from "./NauticalMap";
import { Counter } from "./Counter";

/**
 * The centerpiece: a pinned section where scroll draws the Jebel Ali → Shenzhen
 * route and sails the dhow along it, while the bank-vs-dhow counters race.
 */
export function ActVoyage() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const route = el.querySelector<SVGPathElement>("#voyage-route");
      if (route) gsap.set(route, { strokeDashoffset: 0 });
      return;
    }

    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
    const ctx = gsap.context(() => {
      const route = el.querySelector<SVGPathElement>("#voyage-route");
      if (!route) return;
      const len = route.getTotalLength();
      gsap.set(route, { strokeDasharray: len, strokeDashoffset: len });
      gsap.set("#voyage-dhow", { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=1400",
          scrub: 0.6,
          pin: true,
          anticipatePin: 1,
        },
      });
      tl.to("#voyage-dhow", { opacity: 1, duration: 0.05 }, 0);
      tl.to(route, { strokeDashoffset: 0, ease: "none" }, 0);
      tl.to(
        "#voyage-dhow",
        { motionPath: { path: "#voyage-route", align: "#voyage-route", alignOrigin: [0.5, 0.5], autoRotate: true }, ease: "none" },
        0,
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative flex min-h-screen flex-col justify-center overflow-hidden py-16">
      <div className="mx-auto w-full max-w-6xl px-5">
        <div className="eyebrow">Act III · Setting sail</div>
        <h2 className="mt-3 max-w-2xl font-display text-4xl sm:text-5xl">
          The moment you'd wait <span className="text-mist line-through decoration-teak/60">three days</span> for,
          in <span className="text-foam">eight seconds</span>.
        </h2>

        <div className="mt-8">
          <NauticalMap className="w-full" />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <div className="eyebrow">A bank</div>
            <div className="mt-2 flex items-baseline gap-3">
              <Counter value={4.2} suffix="%" decimals={1} className="font-mono text-3xl text-mist" />
              <span className="text-sm text-mist">fee · ~3 days</span>
            </div>
          </div>
          <div className="panel border-foam/20 p-5">
            <div className="eyebrow">Dhow</div>
            <div className="mt-2 flex items-baseline gap-3">
              <Counter value={0.3} suffix="%" decimals={1} className="font-mono text-3xl text-foam" />
              <span className="text-sm text-mist">fee · ~8 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
