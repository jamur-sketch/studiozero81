import React from "react";
import type { Graphic } from "../types";
import { ChatMock } from "./ChatMock";

export const GraphicView: React.FC<{ graphic: Graphic }> = ({ graphic }) => {
  switch (graphic.kind) {
    case "chat":
      return <ChatMock title={graphic.title} questions={graphic.questions} />;
  }
};
