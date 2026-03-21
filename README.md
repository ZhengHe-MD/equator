## The Plan: Equator

> Most people overestimate what they can do in one year and underestimate what they can do in ten years. 

 [See](https://equator.vercel.app/) what I'm going to do in several decades.

The app now includes a constant-speed plan to finish the equator by December 31, 2048:

- it loads the local activity snapshot at build time
- it projects a fixed pace from the configured plan start date
- it shows milestone dates, cumulative actual vs. plan, and year-by-year monthly tracking

The planning configuration lives in [src/lib/planConfig.js](./src/lib/planConfig.js).
