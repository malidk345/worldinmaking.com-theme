import React from "react";
import { Composition } from "remotion";
import { MainDemo } from "./scenes/MainDemo";
import "./styles/global.css";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="WorldInMakingDemo"
        component={MainDemo}
        durationInFrames={1800} // 30 seconds at 60 fps
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
