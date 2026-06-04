import React from "react";
import { createRoot, type Root } from "react-dom/client";
import Search from "@/components/Search";

type SearchMountOptions = {
  placeholder?: string;
  maxResults?: number;
};

const searchRoots = new WeakMap<HTMLElement, Root>();

export async function mountLazySearch(
  container: HTMLElement,
  options: SearchMountOptions = {},
) {
  let root = searchRoots.get(container);

  if (!root) {
    root = createRoot(container);
    searchRoots.set(container, root);
  }

  root.render(
    React.createElement(Search, {
      placeholder: options.placeholder,
      maxResults: options.maxResults,
    }),
  );

  await Promise.resolve();
}
