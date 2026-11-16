# Value and colour per strand

## Data

- The groom gives each strand a **tone** (a scale on its colour, around 1, lower for dark strands and deep layers)
  and a **silver** amount (0 for most, high for the silver class). Export both per vertex in one UV channel; the
  renderer reads them only under a keyword so cards and older looks stay untouched.
- Check on import: one sample per distinct strand id, tone percentiles and the silver count match the groom's;
  report id collisions.

## Shading order

```
albedo = baseColour * rootShade * rankShade
tone   = spread(tone)                           // below
albedo = albedo * pow(tone, 1 / 2.2)            // if the tone is linear light and the project renders in gamma
albedo = lerp(albedo, silverColour * silverGain, saturate(silver))
```

- The DCC usually applies the tone in linear light. In a gamma-space project the same light ratio is the tone to
  1 / 2.2; skipping the conversion makes the dark strands darker than in the DCC.
- Keep the silver colour the groom's silver, encoded for the project's colour space.

## The value spread (salt-and-pepper)

```
spread(t) = min(t * (t / median)^(k - 1), max(t, cap))
```

- `median`: the imported tone's median over strand ids, a named constant.
- `k`: the contrast; 1 is neutral (the original tone exactly).
- `cap`: the groom's original maximum tone. Reason: uncapped, widening the spread gave regular strands bright tips;
  the light strands should be the silver class.
- `silverGain` brightens the silver without changing its hue.

In one case (a grey beard whose matte mass had strand contrast well under the reference's), lighting knobs could not
raise strand contrast without breaking the clump contrast or the median value; the spread (k = 4) with a silver gain
put strand contrast in band at all three views. The cost was a few very bright strands on the chin: read p99 and the
share over a high L* against the reference, not only p50 and p90.

The cap holds regular strands at the groom's own maximum, so it is only as tight as the groom's tone law. With a wide
law (regular tones up to about 1.1 and beyond, the point's strands lighter still) a higher contrast still gave
near-white tips over a mass that stayed dark. Narrowing the law in the groom (each class's range, the light zone's
scale) at the same `k` cut the point's near-white p90 by 9-12 L*; lowering `k` instead flattened the strands below
the contrast gate. The narrow law costs some strand contrast (about 1 in the close shot in that case): read it.

## Occlusion and shades

- Rank shade (draw order, deepest darker) and root shade (near the skin darker) give depth inside the mass.
- Depth occlusion `(1 - depth / D)^p` from the groom's volume: on a groom with a deep volume the deepest strands go
  black. Keep `p` low, or bound the term, and read the dark share (L* < 30) where the band forms (under the jaw, the
  lower lip). A floor before the power was swept once and not chosen; it is an option, not a rule.
- Do not reuse a card material's occlusion values on strands: sweep the strand material on its own.

## Hue

- Read a* and b* (or C* and h) against the reference in the same gauge. In one case every arm that did not touch the
  base colour read greyer than the reference (a* about half): warm the base and the silver together by small RGB
  factors and keep their ratio while a scalar sets the value.

## The under-layer

- What shows between strands is the shell or skin under them. Give the close shot its own copy of the shell's
  material: lighter albedo, a scatter or wrap term that lifts it where the key light is behind the surface, a
  neutral scatter colour (a warm one tinted the gaps yellow), never brighter than the strands.
- Check it through the head's turn: a scatter term depends on the light's direction (one case varied by 12 L* over
  30 degrees and stayed under the strands).
- Its density alternative, an under-coat of short strands, narrowed the gaps only a little; the material did more.
