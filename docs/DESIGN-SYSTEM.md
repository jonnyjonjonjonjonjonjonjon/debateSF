# Design System Integration
- Source JSON in `build files JH/` → copy to `design/debate-design-system.json`.
- tokens.ts: emit CSS vars (spacing, borders, sizes, clamp lines, typography); expose branchColor/counterColor (HSL base hues + depth attenuation).
- Visual constraints: no gaps, 90° corners; uniform closed height; expander min height; opening/resolved colors from JSON.
