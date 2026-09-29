/**
 * Parametric geometry for the systems section drawing. Everything routes off
 * these numbers, and the flowing particles reuse the exact path strings the
 * drawing strokes, so air and water always travel inside their own ducts/pipes.
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

/* ------------------------------------------------------------ PLUMBING -- */

export const MAIN = { x: 812, y: 626, r: 8 }; // water main in the street, in section
export const RISER_X = 704;
export const STACK_X = 630;
export const FIX_X = 664;
const SEWER_Y = 646;

export const waterY = (floor: number) => floor - 16;
export const drainY = (floor: number) => floor - 8;

export const waterService = `M ${MAIN.x - MAIN.r} ${MAIN.y} H ${RISER_X + R} Q ${RISER_X} ${MAIN.y} ${RISER_X} ${MAIN.y - R} V ${waterY(290)}`;
export const waterServiceLen = MAIN.x - MAIN.r - RISER_X - R + quarter + (MAIN.y - R - waterY(290));
/** Riser -> under the counter -> up through it into the spout. */
export const waterBranch = (floor: number) =>
  `M ${RISER_X} ${waterY(floor)} H ${FIX_X + 15} V ${floor - 40} H ${FIX_X + 4} V ${floor - 35}`;
export const drainBranch = (floor: number) => `M ${FIX_X} ${floor - 21} V ${drainY(floor)} H ${STACK_X}`;
export const vent = `M ${STACK_X} 170 V ${drainY(290)}`;
export const wasteStack = `M ${STACK_X} ${drainY(290)} V ${SEWER_Y - 16} Q ${STACK_X} ${SEWER_Y} ${STACK_X + 16} ${SEWER_Y} H 856`;
export const wasteLen = SEWER_Y - 16 - drainY(290) + (Math.PI / 2) * 16 + (856 - STACK_X - 16);

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

/** Inspection stops: where the ring visits, when, and where its tick lands. */
export const STOPS = [
  { x: 230, y: 162, a: 0.8, b: 0.84, tx: 362, ty: 136 },
  { x: RISER_X, y: 440, a: 0.87, b: 0.905, tx: 792, ty: 440 },
  { x: DATA_X, y: 553, a: 0.93, b: 0.965, tx: 670, ty: 520 },
] as const;
