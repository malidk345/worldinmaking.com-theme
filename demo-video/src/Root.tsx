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
        durationInFrames={1680}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
