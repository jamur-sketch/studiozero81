import React from "react";
import { Composition } from "remotion";
import { getProjectDuration } from "../types";
import { Main, type MainProps } from "./Main";
import { sampleProject } from "./sample";

export const COMPOSITION_ID = "Editor";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={Main}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ project: sampleProject } satisfies MainProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: getProjectDuration(props.project),
        fps: props.project.fps,
        width: props.project.width,
        height: props.project.height,
      })}
    />
  );
};
