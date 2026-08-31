"use client";

import { useEffect, useState } from "react";

let cached = null;
let promise = null;

export function useCatalog() {
  const [cat, setCat] = useState(cached);
  useEffect(() => {
    if (cached) return;
    if (!promise) {
      promise = fetch("/api/catalog")
        .then((r) => r.json())
        .then((d) => {
          cached = d;
          return d;
        });
    }
    promise.then(setCat);
  }, []);
  // expose on window for quick lookups if needed
  if (typeof window !== "undefined") window.__cwCatalog = cat || window.__cwCatalog;
  return cat;
}
