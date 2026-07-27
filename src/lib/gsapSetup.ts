import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers resize the viewport when the address bar shows/hides on
// scroll; without this, that resize triggers a ScrollTrigger recalculation
// that can desync pinned/scrubbed sections from their real scroll position.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
