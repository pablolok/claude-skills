# Direction from a few calibrated views: an orientation field

Status: published method (Wei et al. 2005, with the 2D recipe of Paris et al. 2004), adapted here to three painted
views. The arithmetic was checked on zone means only; growth through the field has not yet been run. Treat it as
the method to probe, with the go/no-go below.

## What it can and cannot do

- **Can:** give each strand segment a 3D direction where at least two non-coplanar views see the hair, replacing
  hand-set flow constants per zone.
- **Cannot:** give length, ends, tufts, partings, roots or density (the parts' job); fix the mouth surround; see
  the interior of the mass (diffused or prior there); carve concavities the hull misses.
- So: **parts plus the field**, each doing what the other cannot. One field serves every part; it is smoothed
  across soft borders and never across a hard parting (the lip line is a discontinuity).

## The steps

1. **2D orientation per view.** Oriented filters near the Nyquist rate at many angles (Paris: 64 angles, Gaussian
   profiles of 2, 4, 8 px, the filter chosen per pixel by the lowest variance of its response, then a bilateral
   spread weighted by that variance), or a structure tensor as a stand-in. Keep a confidence per pixel; discard
   low-confidence pixels.
2. **A plane per view.** In view j the 2D orientation is a line; its back-projected plane has normal
   `n_j = forward_j x o_j`, with `o_j` the 2D orientation expressed in the camera's right and up axes
   (orthographic cameras; use the ray through the pixel for perspective ones).
3. **Direction per cell.** `d` minimises `sum_j w_j (n_j . d)^2` with `|d| = 1` (the smallest singular vector),
   `w_j` = the view's confidence. The residual from three or more views measures where they disagree.
4. **Visibility.** A cell inside the volume takes the visibility of its nearest hull-surface point; drop views near
   grazing at the silhouette. Cells no view sees take a direction diffused from the surface, or the prior.
5. **Growth.** From roots on the skin, about one reference pixel per step; choose the sign that keeps the fibre
   smooth; a sharp turn keeps the previous direction; repeated failure, the volume's boundary or a maximum length
   ends the fibre; smooth high curvature afterwards, drop very short fibres.

## Pitfalls

- **The 180 degree ambiguity.** 2D orientation is undirected. Roots on the skin and smooth growth settle most of it;
  for facial hair use a reference direction blended from the surface normal and gravity (a recent beard-capture
  paper, Lee et al., uses a 0.7 blend): an end must lie within ~30 degrees of it, else trusted neighbours vote, else the
  reference decides. Hair that grows upward (some necks) breaks the rule: mark those regions.
- **Conditioning.** With all cameras looking horizontally, a strand near the horizontal plane projects to
  near-horizontal lines in every view and its azimuth is lost. In one simulated rig (three horizontal views, 5
  degrees of 2D noise) the 3D error stayed 4-5 degrees median for strands 15-80 degrees below horizontal and rose to
  14-34 degrees p90 under 10 degrees. Below that, the prior decides: under the jaw, a moustache's sideways tips,
  an upward-growing neck. A view from below or above fixes it if you can make one.
- **Painted strokes are not strands.** Painted views have no stroke-to-stroke correspondence, so every method that
  matches strands between views is out; only smoothed fields fuse. A wave gives each view its own phase: smooth the
  field over at least one wavelength, and keep the wave a property of the part.
- **The views may disagree.** Leave one view out and predict it from the best-conditioned pair (about 90 degrees
  apart). Where the prediction misses by more than your direction gate, declare the winning view or accept the
  compromise, and record which.
- **The checks become circular.** Once the field drives growth, flow rows read from the same pictures are no longer
  evidence that the field is right: they only show a part followed it. Prove the field on the reference itself
  (leave one view out), and judge the groom by eye and the non-flow rows, mass and length first: a regrow passed every
  flow cell while it lost its mass.
- **Carry the field across faces only where they differ.** Read the flow on the reference directly where the
  registration was measured; a field carried over doubled the left-right difference in one case.

## A first probe (go / no-go before any growth)

On the best-observed region (a cheek: three views, strands well below horizontal):
- orientation per view at two scales, lock scale and above the wave;
- triangulate every hull-surface cell that all views see; report **kept** (share of cells all views see), **bias**
  (each view's median residual) and **scatter** (p90 of each view's |residual - its median|), with a residual map;
- go: at the coarse scale, scatter within the direction gate in every view and most cells kept; a coherent bias in
  one view is not a no-go (declare the winner or accept the compromise);
- then grow a few hundred strands on the existing roots with only the direction replaced, and judge by eye.

## Sources

- Y. Wei, E. Ofek, L. Quan, H.-Y. Shum, "Modeling Hair from Multiple Views", SIGGRAPH 2005.
- S. Paris, H. Briceño, F. Sillion, "Capture of Hair Geometry from Multiple Images", SIGGRAPH 2004.
- Lee, Nam, Jarabo, Aliaga, "Wispy to Voluminous: Prior-free Multi-view Capture of Strand-level Facial Hair",
  arXiv 2606.08041 (the direction rule for beards).
- SideFX Houdini, Guide Advect ("Fill Velocity Field", Follow Skin, Stop on Collision): the same operation as a
  production tool.
- Learned single-image and video methods found (HairStep, Neural Haircut, GaussianHaircut, MonoHair, DiffLocks) were
  all non-commercial licences and trained on scalp hair at the time of reading: check before proposing one.
