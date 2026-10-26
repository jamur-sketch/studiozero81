import { useCallback, useEffect, useReducer } from "react";
import { sampleProject } from "../remotion/sample";
import type { Project } from "../types";
import { serializableProject } from "./ops";

const STORAGE_KEY = "studiozero-video-editor:project";
const HISTORY_LIMIT = 100;

type State = {
  past: Project[];
  present: Project;
  future: Project[];
  /** Consecutive updates with the same key (a drag, typing) become one undo step. */
  lastKey: string | null;
};

type Action =
  | { type: "update"; fn: (p: Project) => Project; key?: string }
  | { type: "replace"; project: Project }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "commit" };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "update": {
      const next = action.fn(state.present);
      if (next === state.present) return state;
      const merge = action.key !== undefined && action.key === state.lastKey;
      return {
        past: merge ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
        lastKey: action.key ?? null,
      };
    }
    case "replace":
      return { past: [], present: action.project, future: [], lastKey: null };
    case "undo": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        past: state.past.slice(0, -1),
        present: prev,
        future: [state.present, ...state.future],
        lastKey: null,
      };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { past: [...state.past, state.present], present: next, future: rest, lastKey: null };
    }
    case "commit":
      return state.lastKey === null ? state : { ...state, lastKey: null };
  }
};

const load = (): Project => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Project;
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return sampleProject;
};

export const useProjectStore = () => {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    past: [],
    present: load(),
    future: [],
    lastKey: null,
  }));

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableProject(state.present)));
      } catch {
        // Ignore quota errors; the project still lives in memory.
      }
    }, 400);
    return () => clearTimeout(t);
  }, [state.present]);

  const update = useCallback(
    (fn: (p: Project) => Project, key?: string) => dispatch({ type: "update", fn, key }),
    [],
  );

  return {
    project: state.present,
    update,
    replace: useCallback((project: Project) => dispatch({ type: "replace", project }), []),
    undo: useCallback(() => dispatch({ type: "undo" }), []),
    redo: useCallback(() => dispatch({ type: "redo" }), []),
    /** Ends the current coalesced edit (call on pointer up / blur). */
    commit: useCallback(() => dispatch({ type: "commit" }), []),
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
};

export type ProjectStore = ReturnType<typeof useProjectStore>;
