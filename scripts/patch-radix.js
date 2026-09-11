const fs = require('fs');
const path = require('path');

const patchedMjs = `import * as React from "react";

function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}

function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}

function useComposedRefs(...refs) {
  const lastNodeRef = React.useRef(null);
  const refsRef = React.useRef(refs);
  refsRef.current = refs;
  return React.useCallback((node) => {
    if (node !== lastNodeRef.current) {
      lastNodeRef.current = node;
      refsRef.current.forEach((ref) => setRef(ref, node));
    }
  }, []);
}

export {
  composeRefs,
  useComposedRefs
};
`;

const patchedJs = `"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isExecuteBase, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isExecuteBase || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

var compose_refs_exports = {};
__export(compose_refs_exports, {
  composeRefs: () => composeRefs,
  useComposedRefs: () => useComposedRefs
});
module.exports = __toCommonJS(compose_refs_exports);
var React = __toESM(require("react"));

function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}

function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}

function useComposedRefs(...refs) {
  const lastNodeRef = React.useRef(null);
  const refsRef = React.useRef(refs);
  refsRef.current = refs;
  return React.useCallback((node) => {
    if (node !== lastNodeRef.current) {
      lastNodeRef.current = node;
      refsRef.current.forEach((ref) => setRef(ref, node));
    }
  }, []);
}
`;

function patchAllInDir(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  let count = 0;
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch (e) {
      return;
    }
    entries.forEach(file => {
      const full = path.join(dir, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (file === 'react-compose-refs') {
            const distDir = path.join(full, 'dist');
            if (fs.existsSync(distDir)) {
              fs.writeFileSync(path.join(distDir, 'index.mjs'), patchedMjs);
              fs.writeFileSync(path.join(distDir, 'index.js'), patchedJs);
              count++;
              console.log('Patched react-compose-refs at:', distDir);
            }
          } else if (file !== '.next' && file !== '.git') {
            walk(full);
          }
        }
      } catch (e) {}
    });
  }
  walk(baseDir);
  console.log(`Total react-compose-refs packages patched in ${baseDir}: ${count}`);
}

const rootDirs = [
  path.join(__dirname, '../node_modules'),
  path.join(__dirname, '../../worldinmaking.com-theme/node_modules')
];

rootDirs.forEach(dir => patchAllInDir(dir));
