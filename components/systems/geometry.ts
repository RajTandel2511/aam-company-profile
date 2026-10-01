/**
 * Parametric geometry for the systems section drawing. Everything routes off
 * these numbers, and the flowing particles reuse the exact path strings the
 * drawing strokes, so air and data always travel inside their own ducts and lines.
 * Units are SVG user units in an 880 x 672 viewBox.
 */

export const VB_W = 880;
export const VB_H = 672;

export const GROUND = 590;
export const ROOF = 190;
export const PARAPET_TOP = 166;
export const SLAB_T = 7;
export const WALL_L = 150; // wall centre lines (walls are 10 thick)
export const WALL_R = 730;
export const IN_L = WALL_L + 5; // inner faces
export const IN_R = WALL_R - 5;
/** Column grid, A..E. The end lines are the exterior walls. */
export const GRID = [150, 295, 440, 585, 730];
export const COLS = GRID.slice(1, -1);
/** Mechanical shaft walls; the supply and return trunks drop through it. */
export const SHAFT = [194, 240] as const;

/** Storeys, top first. `ceil` is the top of the slab above, `floor` the slab below. */
export const FLOORS = [
  { id: "L4", ceil: 190, floor: 290 },
  { id: "L3", ceil: 290, floor: 390 },
  { id: "L2", ceil: 390, floor: 490 },
  { id: "L1", ceil: 490, floor: 590 },
] as const;

/* ---------------------------------------------------------------- HVAC -- */

export const RTU = { x: 170, y: 140, w: 120, h: 44 }; // on a curb, roof at 190
const RTU_BASE = RTU.y + RTU.h;
export const SUPPLY_X = 226;
export const RETURN_X = 206;
export const SUP_END = 592;
export const RET_START = 556;
export const DIFFUSERS = [330, 450, 570];
const R = 10; // elbow radius

export const supY = (ceil: number) => ceil + 31;
export const retY = (ceil: number) => ceil + 17;
const quarter = (Math.PI / 2) * R;

export const supplyTrunk = `M ${SUPPLY_X} ${RTU_BASE} V ${supY(490) - R}`;
export const returnTrunk = `M ${RETURN_X} ${RTU_BASE} V ${retY(490) - R}`;

const supElbow = (y: number) => `Q ${SUPPLY_X} ${y} ${SUPPLY_X + R} ${y} H ${SUP_END}`;
const retElbow = (y: number) => `Q ${RETURN_X} ${y} ${RETURN_X + R} ${y} H ${RET_START}`;

/** Drawn branch: from the trunk out along the ceiling. */
export const supplyBranch = (ceil: number) => `M ${SUPPLY_X} ${supY(ceil) - R} ${supElbow(supY(ceil))}`;
export const returnBranch = (ceil: number) => `M ${RETURN_X} ${retY(ceil) - R} ${retElbow(retY(ceil))}`;

/** Particle routes: unit -> down the shaft -> out to the last diffuser, and back. */
export const supplyFlow = (ceil: number) => `M ${SUPPLY_X} ${RTU_BASE} V ${supY(ceil) - R} ${supElbow(supY(ceil))}`;
export const returnFlow = (ceil: number) => {
  const y = retY(ceil);
  return `M ${RET_START} ${y} H ${RETURN_X + R} Q ${RETURN_X} ${y} ${RETURN_X} ${y - R} V ${RTU_BASE}`;
};
export const supplyLen = (ceil: number) => supY(ceil) - R - RTU_BASE + quarter + (SUP_END - SUPPLY_X - R);
export const returnLen = (ceil: number) => retY(ceil) - R - RTU_BASE + quarter + (RET_START - RETURN_X - R);

/* ----------------------------------------------- EXHAUST & OUTSIDE AIR -- */

/** Exhaust riser by the east wall, clear of the controls riser (x 610) and the counter-flashing. */
export const EXH_X = 688;
export const GRILLE_X = 646;
/** Up-blast exhaust fan over the riser: curb top, housing top, windband rim. Roof at 190. */
export const FAN = { x: EXH_X, curb: 180, base: 164, top: 140 };
/** Tip of the discharge arrow above the windband; the plume particles fade out here. */
export const PLUME_TOP = 104;

const exhY = (ceil: number) => ceil + 17; // same plenum height as the return
export const grilleY = (ceil: number) => ceil + 35; // grille face sits on the ceiling line (ceil + 42)

/** Riser, drawn bottom-up from the L1 takeoff to the curb. */
export const exhaustRiser = `M ${EXH_X} ${exhY(490) - R} V ${ROOF}`;
/** Drawn branch: from the riser out along the plenum and down into the ceiling grille. */
export const exhaustBranch = (ceil: number) => {
  const y = exhY(ceil);
  return `M ${EXH_X} ${y - R} Q ${EXH_X} ${y} ${EXH_X - R} ${y} H ${GRILLE_X + R} Q ${GRILLE_X} ${y} ${GRILLE_X} ${y + R} V ${grilleY(ceil)}`;
};
/** Particle route: grille -> branch -> up the riser -> through the fan -> out as a plume. */
export const exhaustFlow = (ceil: number) => {
  const y = exhY(ceil);
  return `M ${GRILLE_X} ${grilleY(ceil) + 3} V ${y + R} Q ${GRILLE_X} ${y} ${GRILLE_X + R} ${y} H ${EXH_X - R} Q ${EXH_X} ${y} ${EXH_X} ${y - R} V ${PLUME_TOP}`;
};
export const exhaustLen = (ceil: number) =>
  grilleY(ceil) + 3 - exhY(ceil) - R + 2 * quarter + (EXH_X - GRILLE_X - 2 * R) + (exhY(ceil) - R - PLUME_TOP);

/**
 * Outside-air hood on the RTU's east end with a louvred face. Fresh air comes straight in
 * at OA.y, well clear of the controls link (y 180); it vanishes under the hood and the unit.
 */
export const OA = { x: RTU.x + RTU.w, face: RTU.x + RTU.w + 18, y: 162, tail: 392 };
export const oaHood = `M ${OA.x} 146 L ${OA.face} 153 V 171 H ${OA.x}`;
export const oaFlow = `M ${OA.tail} ${OA.y} H ${OA.x - 12}`;
export const oaLen = OA.tail - OA.x + 12;

/* ------------------------------------------------------------ CONTROLS -- */

export const PANEL = { x: 600, y: 530, w: 20, h: 40 };
export const DATA_X = 610;
export const NODE_X = 514;
export const nodeY = (floor: number) => floor - 26;
const RTU_LINK_Y = 180;

/** One path per controlled point, panel outward. The RTU link comes first. */
export const dataRoutes = [
  `M ${DATA_X} ${PANEL.y} V ${RTU_LINK_Y} H ${RTU.x + RTU.w}`,
  ...FLOORS.map((f) =>
    f.floor === 590
      ? `M ${PANEL.x} ${nodeY(590)} H ${NODE_X + 6}`
      : `M ${DATA_X} ${PANEL.y} V ${nodeY(f.floor)} H ${NODE_X + 6}`,
  ),
];
export const dataRouteLens = [
  PANEL.y - RTU_LINK_Y + DATA_X - RTU.x - RTU.w,
  ...FLOORS.map((f) => (f.floor === 590 ? PANEL.x - NODE_X - 6 : PANEL.y - nodeY(f.floor) + DATA_X - NODE_X - 6)),
];

/* ------------------------------------------------------------- SERVICE -- */

/** Inspection stops: RTU, exhaust fan, controls — where the ring visits, when, and where its tick lands. */
export const STOPS = [
  { x: 230, y: 162, a: 0.8, b: 0.84, tx: 230, ty: 84 },
  { x: FAN.x, y: 162, a: 0.87, b: 0.905, tx: 790, ty: 100 },
  { x: DATA_X, y: 553, a: 0.93, b: 0.965, tx: 684, ty: 566 },
] as const;
