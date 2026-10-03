"use client";
import { useEffect, useRef } from "react";
import { playMarkMotion } from "@/lib/markMotion";
import { FrameMark } from "./FrameMark";

/**
 * The large mark beside what it means, on the home page. Once the block is
 * mostly in view, after a beat (the eye reads the heading first), it plays
 * many views: the sentence beside it in motion. Once per visit; scrolling
 * back doesn't replay it.
 */
export function AboutMark() {
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const block = mark.current?.closest("section");
    const svg = mark.current?.querySelector("svg");
    if (!block || !svg) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(() => playMarkMotion(svg, "many"), 500);
      },
      { threshold: 0.6 },
    );
    observer.observe(block);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);
  return (
    <span ref={mark} className="about-mark-mark">
      <FrameMark />
    </span>
  );
}
