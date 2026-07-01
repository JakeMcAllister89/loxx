Implement the requested static camera change in `src/components/marketing/HeroCanvasDemo.tsx` only.

Plan:
1. Remove the dynamic camera code:
   - Remove `useRef` from the React import.
   - Remove `hasFitted`.
   - Remove `handleInit`.
   - Remove `onInit={handleInit}`.
   - Ensure no `useReactFlow` / `fitView` code remains.

2. Add fixed React Flow viewport props:
   - `defaultViewport={{ x: 100, y: 60, zoom: 0.7 }}`
   - `minZoom={0.7}`
   - `maxZoom={0.7}`

3. Verify in the live preview:
   - Watch the hero canvas from page load through the full reveal and reset loop.
   - Confirm the viewport transform stays static with no re-centering or jumping.
   - Confirm all 9 final nodes are visible and well-framed.
   - If needed, tune only the static `x`, `y`, and `zoom` values; do not reintroduce `fitView`, `onInit`, or dynamic viewport calculation.

4. Check for clean runtime/source state:
   - Confirm no console errors.
   - Confirm no leftover unused imports or dynamic viewport references.