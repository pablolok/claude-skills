# The adult human skeleton: a reference to audit a 3D body

Part of `anatomy-study`, and its worked example. An adult male, standing height **H = 1.8 m**: scale by H for
another height. Every number is something a modeller or rigger can measure on the model (a bone's end, a joint's
centre, a rig bone's head). Sources are at the end; values marked *est.* are derived (stated how) rather than read
from a source.

**How to read it against a model.**
- Joint heights are for a *living* body standing barefoot. A bare skeleton has no heel pad (~1.5–2 cm) nor forefoot
  pad (~1 cm): standing on its bones, every joint sits ~1.5 cm lower than the table, or the feet float.
- A style that exaggerates a part (a bigger skull) fails that part's checks by design: declare it, and judge the
  limbs by their *ratios* (thigh : shank, upper arm : forearm : hand), not only by absolute heights.
- Two "shoulder" heights exist: the **acromion top** (D&C's 0.818 H) and the **glenohumeral (GH) centre**, ~3–5 cm
  lower (~0.79–0.80 H). A rig's upper-arm head is the GH centre. A base rig may put it lower: decide the target
  before logging it as an error.

---

## 1. Proportions

### 1.1 Heights from the floor (Drillis & Contini 1966, via Winter Fig. 4.1)

Tolerance for a pass: ±0.01 H (±1.8 cm) unless stated.

| landmark | × H | m (H = 1.8) | what exactly |
|---|---|---|---|
| vertex (top of skull) | 1.000 | 1.800 | |
| eye (orbit centre) | 0.936 | 1.685 | ~ half the head's height |
| chin (menton) | 0.870 | 1.566 | head height vertex→menton = 0.130 H |
| sternal notch | ≈0.82 | ≈1.47 | *est.* (ANSUR suprasternale ≈ 0.82 H); at the T2–T3 level, **below** C7–T1 |
| acromion / shoulder | 0.818 | 1.472 | D&C "shoulder"; GH centre ≈ 0.79–0.80 H (1.42–1.44 m) *est.* |
| chest (nipple line) | 0.720 | 1.296 | D&C bracket; ≈ 4th–5th rib in front |
| elbow (arm hanging) | 0.630 | 1.134 | flexion axis |
| iliac crest top | ≈0.60 | ≈1.07 | *est.* (ANSUR iliocristale); ≈ L4 level |
| greater trochanter tip | 0.530 | 0.954 | **hip joint centre at the same height** (±1 cm) |
| wrist (arm hanging) | 0.485 | 0.873 | radiocarpal joint |
| crotch / ischial tuberosity | 0.480 | 0.864 | vertex→crotch = 0.520 H (D&C sitting-height bracket) |
| middle fingertip (arm hanging) | 0.377 | 0.679 | mid-thigh |
| knee | 0.285 | 0.513 | joint line; flexion axis (epicondyles) ~1.5–2 cm higher |
| ankle | 0.039 | 0.070 | lateral malleolus; the axis is just **below** both malleolar tips |

Check by sums: 0.818 − 0.186 − 0.146 − 0.108 = 0.378 (fingertip); 0.530 − 0.285 = 0.245 (thigh);
0.285 − 0.039 = 0.246 (shank).

### 1.2 Segment lengths and widths

| segment | D&C × H | m | skeleton/bone value | m | note |
|---|---|---|---|---|---|
| head height (vertex→menton) | 0.130 | 0.234 | skull bone ≈ 0.12 H | ≈0.22 | with flesh vs bone |
| head width | — | — | skull max breadth ≈ 0.078 H; bizygomatic ≈ 0.072 H | ≈0.14 / 0.13 | *est.* craniometric norms |
| skull length (glabella→back) | — | — | ≈ 0.10–0.105 H | 0.18–0.19 | *est.* |
| shoulder width | 0.259 | 0.466 | biacromial ≈ 0.22–0.23 H; GH centres ≈ 0.21 H apart | 0.40–0.41 / 0.37–0.39 | D&C is a stick figure with flesh; joint centres are narrower |
| midline → shoulder joint | 0.129 | 0.232 | ≈ 0.105 H to the GH centre | ≈0.19 | |
| clavicle length | — | — | ≈ 0.085 H | ≈0.15–0.16 | sternal notch → AC joint |
| chest width | 0.174 | 0.313 | ribcage (bone) ≈ 0.15–0.16 H, widest at ribs 7–9 | 0.27–0.29 | *est.* |
| ribcage depth | — | — | ≈ 0.72 × its width (thoracic index) | ≈0.20 | *est.*; a barrel, deeper below than above |
| hip width | 0.191 | 0.344 | bitrochanteric ≈ 0.19 H; bi-iliac (crests) ≈ 0.16 H | 0.34 / 0.28–0.29 | |
| hip joint centres apart | — | — | ≈ 0.10 H (0.72 × the ASIS–ASIS distance) | 0.17–0.19 | Bell et al. regression |
| upper arm (GH → elbow axis) | 0.186 | 0.335 | humerus max length 0.198 H | 0.356 | Trotter (white male) |
| forearm (elbow → wrist) | 0.146 | 0.263 | radius 0.148 H; ulna 0.159 H | 0.267 / 0.286 | ulna longer: olecranon above the elbow axis |
| hand (wrist → middle tip) | 0.108 | 0.194 | palm ≈ 0.57, middle finger ≈ 0.43 of it | 0.11 / 0.085 | the hand is **shorter** than the forearm (~0.74×) |
| thigh (GT → knee) | 0.245 | 0.441 | femur max length 0.277 H | 0.498 | the femur is the longest bone |
| shank (knee → ankle) | 0.246 | 0.443 | tibia 0.223 H; fibula ≈ 0.224 H | 0.402 / 0.40 | femur : tibia ≈ 1.24 |
| foot length | 0.152 | 0.274 | heel → ankle axis ≈ 0.20–0.25 FL *est.* | 0.055–0.07 | |
| foot breadth | 0.055 | 0.099 | across the metatarsal heads | | |
| 1st MTP (ball) from heel | — | — | ≈ 0.72–0.73 FL; 5th MTP ≈ 0.63–0.65 FL *est.* | 0.20 / 0.175 | the "ball" line is oblique |
| toes beyond the 1st MTP | — | — | ≈ 0.27 FL | ≈0.07 | |

Arm span ≈ 1.03–1.06 H; with the arm hanging, the fingertip reaches mid-thigh (0.377 H), the wrist the
greater trochanter's level minus ~8 cm, the elbow the lowest rib / navel region.

Dempster segment definitions (Winter Table 4.1), for placing rig bones: upper arm = GH axis → elbow axis;
forearm = elbow axis → ulnar styloid; hand = wrist axis → knuckle II of the middle finger; thigh = greater trochanter
→ femoral condyles; leg = femoral condyles → medial malleolus; foot = lateral malleolus → head of metatarsal II.

---

## 2. Bone by bone

Counts of an adult: 206 bones; 7 cervical, 12 thoracic, 5 lumbar vertebrae; sacrum (5 fused) + coccyx (3–5);
12 pairs of ribs; per hand 8 carpals + 5 metacarpals + 14 phalanges; per foot 7 tarsals + 5 metatarsals + 14 phalanges.
Thumb and big toe: **2** phalanges; the other digits: **3**.

| bone | upper / proximal end | lower / distal end | articulates with | common mistakes |
|---|---|---|---|---|
| **skull** | vault; foramen magnum + occipital condyles near the **centre** of the base, just behind the midpoint | maxilla with the upper teeth; zygomatic arches at ear-canal height | atlas (occipital condyles); mandible (TMJ) | spine plugged into the back of the skull; eye sockets too small/round; no ear canal behind the TMJ |
| **mandible** | two condyles in the mandibular fossae, just **in front of** the ear canals; coronoid under the zygomatic arch | chin; lower teeth meeting the upper | temporal bones (TMJ) | hinge placed at the jaw angle or under the ear lobe; jaw rotating with no forward slide |
| **cervical vertebrae** C1–C7 | C1 a ring with no body; C2 with the dens | C7 with a long, non-bifid spinous process (vertebra prominens) | skull, each other, T1 | neck as one cylinder; neck straight or bent forward instead of a gentle lordosis |
| **thoracic** T1–T12 | heart-shaped bodies, growing downward | long spinous processes slanted steeply down, overlapping | ribs (each body + transverse process) | spinous processes horizontal like lumbar ones |
| **lumbar** L1–L5 | large kidney-shaped bodies, the largest of the spine | short horizontal hatchet-shaped spinous processes | each other, sacrum | lumbar bodies as small as thoracic; spine drawn along the back surface instead of through the bodies |
| **ribs** (12 pairs) | head on the vertebral bodies, behind | 1–7 to the sternum by their own cartilage; 8–10 to the cartilage above (costal arch); 11–12 floating | vertebrae, sternum (via cartilage) | ribs horizontal (they slope down-forward: the front end is 3–4 vertebrae lower than the back end); bony ribs reaching the sternum (the last 5–10 cm are cartilage); ribcage as an egg instead of a barrel |
| **sternum** | manubrium with the jugular notch (T2–T3) and clavicle facets | body to the xiphoid (≈ T9–T10); ~17–20 cm in all | clavicles, ribs 1–7 | vertical: it leans with the lower end forward (~20° from vertical) |
| **clavicle** | sternal end, thick, on the manubrium | acromial end, flat, on the acromion | sternum (SC), scapula (AC) | straight rod; sloping down to the shoulder; in the frontal plane (it runs ~20° backward) |
| **scapula** | superior angle at T2; spine of the scapula at T3; acromion over the shoulder | inferior angle at T7–T8 | clavicle (AC), humerus (glenoid), sliding on ribs 2–7 | flat in the frontal plane; glenoid facing straight sideways; floating off the ribcage |
| **humerus** | head (a half-sphere, radius ≈ 2.2–2.5 cm) facing medially-up-back; greater tubercle lateral | trochlea (spool, medial) + capitulum (ball, lateral); medial epicondyle prominent; the condyles project forward of the shaft | glenoid; ulna + radius | head on the top like a femur; elbow end symmetric; epicondyles missing |
| **ulna** | **large**: olecranon + trochlear notch gripping the trochlea | **small** head + styloid; does not reach the carpals (a disc between) | humerus, radius | ulna and radius equally thick; ulna touching the carpals |
| **radius** | **small** disc-shaped head on the capitulum | **large**: broad articular end + radial styloid, ~1 cm lower than the ulna's | capitulum, ulna (both ends), scaphoid + lunate | radius medial; radius and ulna crossed in the rest pose (they cross only in pronation, the radius over the ulna) |
| **carpals** (8) | proximal row: scaphoid, lunate, triquetrum, pisiform | distal row: trapezium, trapezoid, capitate, hamate | radius; metacarpals | carpus flat (it is an arch, the palm side concave); carpus as one long block (≈ 3 cm long) |
| **metacarpals** (5) | bases on the distal carpals (I on the trapezium) | heads = the knuckles; heads II–III most distal, V ~1.5–2 cm behind | carpals; proximal phalanges | palm too short (metacarpal III ≈ 6.5–7 cm); knuckles in a straight line |
| **phalanges** (14) | bases | heads with two condyles (pulley) | each other | three phalanges in the thumb; equal phalanx lengths (proximal : middle : distal ≈ 1 : 0.6–0.7 : 0.45–0.5); thumb in the plane of the fingers |
| **pelvis** (hip bones + sacrum) | iliac crests ≈ L4; ASIS in front | ischial tuberosities (sitting); pubic symphysis in front | sacrum (SI, nearly rigid), femurs (acetabulum), L5 | a bowl with a horizontal rim (the inlet is tilted ~50–60° forward); acetabula facing straight sideways (they face lateral, ~45° down, ~15–20° forward) |
| **sacrum / coccyx** | base with the promontory under L5 | apex; coccyx curving forward | L5, ilia, coccyx | sacrum vertical (its top slopes ~35–45° forward-down) |
| **femur** | head (sphere, Ø ≈ 4.5–5 cm) on a neck at ~125° to the shaft, neck turned 8–15° forward (anteversion); greater trochanter lateral, at the head's centre height | medial + lateral condyles behind, trochlear groove in front; epicondyles on the sides | acetabulum; tibia; patella | shaft vertical from the head (the shaft starts at the trochanter and converges toward the knee); neck at 90°; condyles under the shaft rather than behind it |
| **patella** | base up | apex down, ~1 cm above the joint line in extension | femoral trochlea only | on the tibia or the joint line; a disc floating in front of the knee |
| **tibia** | plateau (two condyles), tuberosity in front | flat **plafond** + **medial malleolus**; no ball | femur; fibula; talus | a ball at the ankle; round shaft (it is triangular, sharp crest in front); centred under the femur's head |
| **fibula** | head **below** the lateral tibial condyle, behind-lateral; not part of the knee | **lateral malleolus**: ~1 cm lower and more posterior than the medial | tibia (both ends); talus | joining the femur; ending at the same height as the medial malleolus; as thick as the tibia |
| **talus** | **trochlea**: a dome, wider in front, inside the mortise | head forward-medial onto the navicular | tibia, fibula, calcaneus, navicular | missing (foot hung from the tibia); a sphere |
| **calcaneus** | under the talus; sustentaculum tali medially | tuber behind, touching the ground | talus, cuboid | heel as a ball under the ankle; heel too short (it extends ~5–7 cm behind the ankle axis) |
| **navicular, cuboid, 3 cuneiforms** | — | — | talus/calcaneus; metatarsals | a flat block on the ground (they form the arch's keystones, off the ground) |
| **metatarsals** (5) | bases at the tarsals, high (the arch) | heads on the ground; I thick, with 2 sesamoids under it | tarsals, phalanges | horizontal metatarsals (MT1 declines ~20–25°, MT5 ~5°); heads in a line square to the foot |
| **toe phalanges** (14) | bases | tips touching the ground | each other | toes fanned out (they lie parallel, forward, hallux in line with MT1 within 15°); toes as long as fingers (the lesser toes are short and curled) |

---

## 3. Joint by joint

Range of motion (ROM) in degrees from neutral. **AAOS** = the AAOS 1965 values as tabled in Norkin & White (*from
the literature, not re-read from the primary source*); **CDC** = the measured mean of 674 healthy subjects
(Soucie et al. 2011). Where a source disagrees, the range is given. For a game skeleton, keep clips inside the
AAOS column; the CDC column shows what real people actually reach.

| joint | type | centre / axis — where to put the pivot | motions: AAOS (CDC mean) |
|---|---|---|---|
| **TMJ** | hinge + glide | the mandibular condyle, just in front of and slightly below the ear canal | opening 40–50 mm at the incisors ≈ 25–30° of rotation *est.*, the first ~12–15° pure rotation then the condyle slides forward; protrusion ~8–10 mm; side shift ~10 mm |
| **atlanto-occipital** (C0–C1) | condyloid | occipital condyles, at about the mastoid tip, ~1–2 cm below the ear canal | nod (flex/ext) ~15–25°; little else |
| **atlanto-axial** (C1–C2) | pivot | around the dens | rotation ~40° each side — about half of the neck's |
| **cervical spine** (whole) | intervertebral | centres in the vertebral bodies | flexion 45, extension 45, lateral flexion 45, rotation 60 (AAOS) |
| **thoracolumbar** (whole) | intervertebral | centres in the posterior half of each disc/body, ~6–8 cm in front of the lumbar spinous tips | flexion 80, extension 20–25, lateral flexion 35, rotation 45 (AAOS); the lumbar spine rotates only ~1–2° per level: rotation lives in the thorax, flexion in the lumbar |
| **SI joint, pubic symphysis** | near-rigid | — | ~2°: the pelvis + sacrum are one rigid piece |
| **sternoclavicular** | saddle | the clavicle's sternal end at the jugular notch | elevation ~45, depression ~10, protraction/retraction ~30, the clavicle's axial (backward) roll ~40–50 *est.* |
| **acromioclavicular** | plane | the clavicle's lateral end on the acromion | small: lets the scapula follow the ribcage |
| **scapulothoracic** | not a joint (sliding) | the scapula on ribs 2–7 | upward rotation up to ~60° with the arm overhead (≈ 2:1 GH : scapula above 30° of abduction) |
| **glenohumeral** | ball and socket | humeral head centre ≈ 2.5 cm medial to the greater tubercle's surface, ≈ 3–5 cm below the acromion top; the glenoid faces forward-lateral in the scapular plane (~30–35° to the frontal plane) | flexion 180, extension 60, abduction 180, internal rot. 70, external rot. 90 (CDC shoulder flexion 170) — these whole-shoulder values include the scapula's share |
| **elbow** (humeroulnar + humeroradial) | hinge | through the centres of the trochlea and capitulum: passes through the lateral epicondyle and ~1 cm below the medial epicondyle's tip; ~1 cm **in front of** the humeral shaft's axis; at ~84° to the shaft (→ the carrying angle) | flexion 150 (CDC 148; AMA 140), extension 0 (CDC hyperext. mean ~4, up to 22) |
| **radioulnar** (proximal + distal) | pivot | one oblique line: the radial head's centre → the ulnar head (fovea); the ulna stays, the radius turns around it | pronation 80 (CDC 80), supination 80 (CDC 87); mid-position = thumb up |
| **wrist** (radiocarpal + midcarpal) | condyloid | centre in the head of the capitate, ~1–1.5 cm beyond the radius's articular surface | flexion 80, extension 70, radial deviation 20, ulnar deviation 30 (AAOS; AMA gives 60/60 for flex/ext); no axial twist — that is the forearm |
| **CMC II–III / IV–V** | plane | metacarpal bases | II–III ~0; IV ~10–15, V ~20–30 (the palm cups) *est.* |
| **thumb CMC** | **saddle** | trapezium–MC I, ~1.5–2.5 cm beyond the radial styloid, on the **palm side** of the index metacarpal's plane | abduction 70, flexion 15, extension 20, opposition (tip to the little finger's base) |
| **thumb MCP / IP** | hinge (MCP slightly condyloid) | heads of MC I / proximal phalanx | MCP flexion 50; IP flexion 80, hyperextension 20 |
| **finger MCP** | condyloid | metacarpal heads = the dorsal knuckles, **~2 cm proximal** to the finger-base crease and the web | flexion 90, hyperextension 45, abduction/adduction ~20 |
| **PIP / DIP** | hinge | heads of the proximal / middle phalanx | PIP flexion 100; DIP flexion 90, extension 10 |
| **hip** | ball and socket | femoral head centre in the acetabulum, at the greater trochanter tip's height; from the ASIS ≈ 30 % of the ASIS–ASIS width down, 14 % medial, 22 % back (Bell) | flexion 120 (CDC 132), extension 30 (CDC 19), abduction 45 (AMA 40), adduction 30, internal rot. 45, external rot. 45 |
| **knee** (tibiofemoral) | modified hinge | flexion axis through the femoral epicondyles = the centres of the posterior condyles' circles: ~1.5–2.5 cm above the joint line, in the **back half** of the knee in side view | flexion 135 (CDC 140; AMA 150), extension 0 (hyperext. up to ~10; CDC mean 2); axial rotation only when flexed (~30 ext. / ~20 int. at 90° *est.*); ~5–10° external screw-home at full extension |
| **patellofemoral** | gliding | — | the patella slides ~7 cm up/down the trochlea |
| **ankle** (talocrural) | hinge | Inman: the axis passes **5 mm below the medial malleolus tip** and **3 mm below, 8 mm in front of the lateral tip** — through the talus; ~80–83° to the tibia (lateral end lower); turned ~20–30° outward relative to the knee axis | dorsiflexion 20 (CDC 15), plantarflexion 50 (CDC 57) |
| **subtalar** (talocalcaneal) | gliding about one oblique axis | from the heel's back-lateral corner up-forward-medial through the talar neck: ~42° up from the ground, ~23° medial to the foot's long axis | inversion 35, eversion 15 (AAOS foot values) |
| **midtarsal** (Chopart: talonavicular + calcaneocuboid) | compound | across the midfoot | adds to inversion/eversion; locks the arch at push-off |
| **toe MTP** | condyloid | the metatarsal heads, along an **oblique** line (the metatarsal break) at ~50–70° (mean ~62°) to the foot's long axis; MTP II most distal | hallux: flexion 45, extension 70 (~50–60 used at toe-off); lesser toes: flexion 40, extension 40 |
| **toe IP** | hinge | heads of the phalanges | hallux IP flexion 90; lesser PIP flexion 35; DIP flexion 60, extension 30 |

---

## 4. Posture of a standing skeleton

| part | fact | numbers |
|---|---|---|
| plumb line (side view) | ear canal → through the cervical bodies → just in front of the shoulder joint → through the lumbar bodies → just behind the hip centre → just in front of the knee axis → ~5 cm in front of the lateral malleolus | C7's plumb line falls on the back-top corner of S1 (±5 cm) |
| spinal curves | cervical lordosis, thoracic kyphosis, lumbar lordosis — an S, never a straight column | cervical ~20–40°; thoracic kyphosis 20–45° (mean ~33); lumbar lordosis 30–60° (mean ~49, ≈ pelvic incidence + 9 ± 9) |
| pelvis | anterior tilt: the ASIS and the pubic symphysis in one vertical plane; the PSIS higher than the ASIS | ASIS–PSIS line ~7–15° from horizontal; sacral slope ~36–40°; pelvic incidence ~52–55 (33–85); the inlet ~50–60° from horizontal |
| head | Frankfort plane (ear-canal top → orbit floor) level; the ear canal above the shoulder joint in side view | |
| scapula | on the back of the ribcage, ribs 2–7; medial border ~5–7.5 cm from the spinous processes, near-parallel to them | superior angle T2, spine T3, inferior angle T7–T8; ~30–35° internal rotation (scapular plane), ~5–10° upward rotation, ~10° anterior tilt |
| clavicle | almost horizontal, the lateral end **level with or higher than** the medial end; running backward from the sternum | elevation ~5–10° *est.*; retraction ~20° from the frontal plane; S-curve: medial 2/3 convex forward, lateral 1/3 concave forward |
| arms at rest | hanging slightly in front of the trunk's midline plane, palms facing the thighs (forearm mid-prone), thumbs forward | anatomical position (palms forward) is a convention, not rest |
| elbow carrying angle | the forearm angled away from the body with the elbow extended and supinated; it vanishes in flexion and pronation | men ~11°, women ~14° (range 5–19) |
| femur / knee | femoral shafts converge from the trochanters toward the knees; tibiae near vertical; knee joint line ~level | femoral anatomical axis ~5–7° valgus to the tibia; mechanical axis (hip centre → ankle centre) through or just medial to the knee centre (0–3° varus); femoral neck 125°, anteversion 8–15°; tibial torsion 18–23° external |
| foot arch | medial longitudinal arch: talus, navicular, cuneiforms off the ground; a transverse dome across the midfoot, the lateral border lower | calcaneal pitch 18–30° (mean 24 ± 5 in young men); Meary angle (talus axis vs MT I axis) 0 ± 4°: collinear; MT I declination ~20–25°, MT V ~5° |
| what touches the ground (bare bones) | the calcaneal tuber's processes; the five metatarsal heads (the 1st through its two sesamoids); the tips of the distal phalanges | nothing else: not the navicular, cuboid, talus or the MT shafts. A fleshed foot adds the lateral border's soft tissue |
| toes | lying forward on the ground, parallel; their proximal phalanges extended at the MTP by about the metatarsal's declination | hallux MTP ~15–25° extended *est.* |
| feet | slightly turned out | foot progression ~5–15° out each, from tibial torsion |

---

## 5. Checklist — one measurable check per line

Measure on the rig's rest pose at H = 1.8 m (or ×H); "≈" = ±1.8 cm or ±5° unless stated. For a bare skeleton, allow
joint heights down to −1.5 cm (no heel pad).

1. Thigh bone head (hip centre) at 0.52–0.54 H (0.94–0.97 m), level with the greater trochanter tip ±1 cm.
2. Hip centres 0.17–0.19 m apart (≈0.10 H); wider only as a declared style choice.
3. Knee flexion axis at 0.29–0.30 H (≈0.52–0.54 m), through both femoral epicondyles, in the back half of the knee.
4. Ankle pivot at ~0.035–0.04 H (63–72 mm), 5 mm below the medial malleolus tip and 3 mm below / 8 mm in front of the lateral tip.
5. Lateral malleolus tip lower than the medial by 0.5–1.5 cm and ~1 cm further back.
6. |hip→knee − knee→ankle| ≤ 2 cm (D&C thigh 0.245 H vs shank 0.246 H); the femur *bone* longer than the tibia *bone* (≈1.24×).
7. Femur mesh shaft runs from the trochanter, ~5–7° off the hip-centre→knee line; neck-shaft angle 120–135°.
8. Fibula head below the tibial plateau on the back-lateral side; no contact with the femur.
9. Patella in front of the femoral trochlea, its apex ~1 cm above the knee joint line in extension.
10. Distal tibia ends in a flat plafond + medial malleolus wrapping the talus: no sphere at the ankle.
11. Talus present, its dome inside the tibia–fibula mortise; calcaneus under it, its tuber 5–7 cm behind the ankle axis.
12. Foot length 0.152 H (0.274 m) ±1.5 cm, heel back to the longest toe tip.
13. MTP pivots on an oblique line at 50–70° to the foot's long axis; MTP I at ~0.72 FL from the heel, MTP V at ~0.64 FL.
14. Toe phalanges point forward, parallel (hallux ≤ 15° off MT I); no fan.
15. In rest pose, only the calcaneal tuber, the 5 metatarsal heads/sesamoids and the toe tips are within 3 mm of Z = 0; the navicular is ≥ 2.5 cm above it.
16. Calcaneal pitch 18–30°; MT I declination 20–25°; the talus axis and MT I axis collinear ±4°.
17. Upper arm head (GH centre) at 0.79–0.80 H, 3–5 cm under the acromion top, ~2.5 cm inside the humeral head's lateral surface.
18. GH centres 0.37–0.39 m apart (≈0.21 H).
19. GH→elbow axis 0.17–0.186 H (0.31–0.335 m).
20. Elbow→wrist 0.146 H (0.263 m) ±1.5 cm.
21. Wrist→middle fingertip 0.108 H (0.194 m) ±1 cm, and **shorter than the forearm** (ratio 0.7–0.8).
22. Arm hanging: elbow at 0.63 H, wrist 0.485 H, fingertip 0.377 H (±0.015 H); fingertips below the hip centre by ~0.15 H.
23. Elbow axis through the trochlea–capitulum centres, ~1 cm in front of the humeral shaft's line, at ~84° to it (carrying angle 10–15° in extension + supination).
24. Forearm twist axis from the radial head to the ulnar head; the ulna mesh does not turn with pronation.
25. Radius thick at the wrist and thin at the elbow; ulna the reverse; at rest (palms to thighs) they do not cross.
26. Wrist pivot ~1–1.5 cm beyond the end of the radius (capitate head); the radial styloid ~1 cm lower than the ulnar.
27. Palm (wrist→MCP III) ≈ 0.57 of hand length; MCP pivots at the metacarpal heads, ~2 cm behind the finger-web crease.
28. Knuckle line oblique: MCP V 1.5–2 cm behind MCP III.
29. Each finger has 3 phalanges, thumb 2; phalanx ratio proximal : middle : distal ≈ 1 : 0.65 : 0.5.
30. Thumb CMC pivot at the trapezium, 1.5–2.5 cm beyond the radial styloid, palmar to the index metacarpal plane; thumb column rotated ~80–90° from the fingers (its nail faces sideways).
31. Clavicle mesh: medial end at the sternal notch, lateral end at the acromion, lateral end level or higher; runs ~20° backward; length ≈ 0.15–0.16 m.
32. Sternal notch at ~0.82 H, 4–6 cm below the C7–T1 level, in front of T2–T3.
33. Scapula on the ribcage's back: superior angle at T2, inferior angle at T7–T8, medial border 5–7.5 cm off the spine; plane ~30–35° to the frontal plane; glenoid facing forward-lateral.
34. Ribcage width : depth ≈ 1 : 0.72; widest at ribs 7–9; ribs sloping down-forward; costal cartilages to the sternum for ribs 1–7, the costal arch for 8–10, ribs 11–12 free.
35. Spine bones through the vertebral bodies, not along the spinous processes; S-curve present (cervical and lumbar lordosis, thoracic kyphosis within the §4 ranges).
36. Pelvis tilted: ASIS and pubic symphysis in one vertical plane ±1 cm; sacrum's top sloping 35–45°.
37. Iliac crest top ≈ 0.60 H; pubic symphysis ≈ greater trochanter height.
38. Skull balanced on C1 with the occipital condyles at ~45–55 % of the skull's front-to-back length from the front; head pivot 1–2 cm below the ear canal.
39. Jaw pivot at the condyle, just in front of the ear canal; opening ≤ 30° of rotation.
40. Clip limits inside the §3 AAOS column, for every joint; knee and elbow never hyperextend > 10°; no wrist or ankle twist about the limb's long axis. The AAOS column is the free range: a joint bearing weight goes further — the ankle under a lunge to 33–39° up (the weight-bearing lunge test), so a planted foot is judged on that, a foot in the air on 20/50. Checked per joint, per frame, on every clip after it is baked.


## Sources

- Winter, *Biomechanics and Motor Control of Human Movement* — Fig. 4.1 (Drillis & Contini 1966) and Table 4.1 (Dempster): [Anthro-Winter.pdf](https://courses.grainger.illinois.edu/me481/sp2021/Anthro-Winter.pdf)
- Soucie et al., CDC public-use dataset for normal joint range of motion (674 subjects): [cdc_153156_DS1.pdf](https://stacks.cdc.gov/view/cdc/153156/cdc_153156_DS1.pdf)
- Weight-bearing ankle dorsiflexion (the modified lunge test, normal 33–39°): [orthopt.org — A Proposed Modification to the Ankle Dorsiflexion test](https://www.orthopt.org/uploads/content_files/files/A%20Proposed%20Modication%20to%20the%20Ankle%20Dorsiflexion.pdf)
- AAOS ROM norms as tabled in Norkin & White, *Measurement of Joint Motion* ([6th ed.](https://ebookshop.ro/Norkin-and-White-s-Measurement-of-Joint-Motion-A-Guide-to-Goniometry)); ankle and foot: [Physiotutors AROM ankle/foot](https://book.physiotutors.com/?p=1149)
- Trotter & Gleser stature formulas (bone lengths at 180 cm): [Estimation of stature — Wikipedia](https://en.wikipedia.org/wiki/Estimation_of_stature), [Human Remains — RIT](https://www.rit.edu/academicaffairs/abuhureyra/human_remains_t8.php)
- Ankle axis (Inman 1976) and subtalar axis: [ISB 2013 award paper](https://media.isbweb.org/images/conferences/isb-congresses/2013/oral/award1.pdf), [Biomch-L: anatomical ankle axis](https://biomch-l.isbweb.org/forum/biomch-l-forums/biomch-l-1988-2010/2816-anatomical-ankle-axis), [Artificial Limbs 1969](https://oandplibrary.org/al/1969_01_059.asp)
- Ankle joint surfaces: [TeachMeAnatomy — The Ankle Joint](https://teachmeanatomy.info/lower-limb/joints/ankle-joint/); hand bones: [TeachMeAnatomy — Bones of the Hand](https://teachmeanatomy.info/upper-limb/bones/hand/)
- Carrying angle: [Radiopaedia — Carrying angle](https://radiopaedia.org/articles/carrying-angle)
- Scapula and shoulder girdle at rest: [Physiotutors — scapular alignment](https://book.physiotutors.com/?p=180), [Oyama 2010, 3D scapular and clavicular kinematics](https://chs.uky.edu/sites/default/files/2023-12/Oyama_2010_Three-Dimensional%20Scapular%20and%20Clavicular%20Kinematics.pdf)
- Femoral neck-shaft angle, anteversion, tibial torsion: [AMBOSS — Femoral neck abnormalities](https://www.amboss.com/us/knowledge/Femoral_neck_abnormalities), [Wheeless — femoral anteversion](https://www.wheelessonline.com/joints/hip/femoral-anteversion/)
- Calcaneal pitch, talus–first-metatarsal angle: [young Korean men, J Korean Foot Ankle Soc](https://search.bvsalud.org/gim/resource/en/wpr-26014)
- Spinal curves and pelvic parameters: [PMC4771498](https://pmc.ncbi.nlm.nih.gov/articles/PMC4771498), [PMC3610486](https://pmc.ncbi.nlm.nih.gov/articles/PMC3610486)
