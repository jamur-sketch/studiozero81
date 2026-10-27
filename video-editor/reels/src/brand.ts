import { Easing, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";

// Design system "Jamur".
export const FPS = 30;
export const GREEN = "#13342B";
export const GOLD = "#D2B26B";
export const CREAM = "#F2ECDF";
export const OFFWHITE = "#F4EFE6";
export const GREEN_92 = "rgba(19, 52, 43, 0.93)";
export const TITLE = "Playfair Display";
export const BODY = "Inter";

loadFont({ family: TITLE, url: staticFile("playfair-600.woff2"), weight: "600" });
loadFont({ family: BODY, url: staticFile("inter-400.woff2"), weight: "400" });
loadFont({ family: BODY, url: staticFile("inter-500.woff2"), weight: "500" });
loadFont({ family: BODY, url: staticFile("inter-600.woff2"), weight: "600" });

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
/** Seconds of the edited video to frames. */
export const f = (s: number) => Math.round(s * FPS);

// Safe areas on 1080x1920 (Instagram UI + the speaker's face in the middle).
export const CARD_TOP = 170;
export const CAPTION_TOP = 1440;
