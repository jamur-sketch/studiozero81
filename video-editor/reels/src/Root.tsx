import React from "react";
import { Composition } from "remotion";
import { getDuration, Reel } from "./Reel";
import { completo } from "./edits/completo";
import { toqan } from "./edits/toqan";
import type { EditConfig } from "./types";

// One entry per Reels. Render with: node render.mjs video <id>
export const EDITS: EditConfig[] = [completo, toqan];

export const Root: React.FC = () => (
  <>
    {EDITS.map((edit) => (
      <Composition
        key={edit.id}
        id={edit.id}
        component={Reel}
        defaultProps={{ edit }}
        durationInFrames={getDuration(edit)}
        fps={30}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
