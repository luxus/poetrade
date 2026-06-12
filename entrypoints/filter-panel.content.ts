import "~/lib/styles/enhancements.scss"

import { initFilterPanel } from "~/contents/filter-panel"

export default defineContentScript({
  // PoE1 + PoE2 trade (PoE2 lives under /trade2)
  matches: [
    "https://www.pathofexile.com/trade*",
    "https://*/trade2*",
  ],
  world: "MAIN",

  main() {
    initFilterPanel();
  },
});
