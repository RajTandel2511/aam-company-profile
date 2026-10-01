/**
 * FIG. 01 as a pure function of progress p: every piece posed (blank → brake folds →
 * Pittsburgh lock → into line), its panels shaded and painter-sorted, plus the floor
 * shadow, the joint hardware and the vanes.
 */
import { easeInOutCubic as io, seg } from "@/lib/motion";
import { EYE, apply, ccw, depth, dot, len, line, mul, onFloor, project, pt, shift, spin, steel, then, turn, type Face, type Group, type Mat, type SeamDraw, type V3 } from "./FitDuctRunMath";
import { CB, GAP, H, JOG, PIECES, SEAM_AT, SEAM_LEN, STEP, X, Y, ZE, ZT, type Piece } from "./FitDuctRunParts";
import { elbowInside, elbowReveal, joints, welds } from "./FitDuctRunJoints";
import { notes, type Note } from "./FitDuctRunNotes";

const SHORT = (16 * Math.PI) / 180; // a Pittsburgh lock waits this far open until the seam is closed
const TO_FLOOR: V3 = [-2.9, -H, 0.68]; // the takeoff is formed on the floor past the end of the run ...
const CAP_AT: V3 = [-0.8, 0, -0.14]; // ... and so is the end cap

export type Scene = { groups: Group[]; shadow: string; union: string; bends: number; bendsTotal: number; notes: Note[] };

type Posed = { pc: Piece; mats: Mat[]; prog: number[]; f: number };
const avg = (vs: V3[]) => vs.reduce((s, v) => s + depth(v), 0) / vs.length;
const tw = (p: number, [a, b]: readonly [number, number]) => io(seg(p, a, b));
const corners = ({ pc, mats }: Posed, i: number) => pc.panels[i].pts.map((v) => apply(mats[i], v));
const centre = (ps: Posed) => avg(ps.pc.panels.flatMap((_, i) => corners(ps, i)));

/** World offset of a piece still pulled back from its joints. */
function offsetOf(pc: Piece, p: number): V3 {
  const k = Math.round(len(pc.explode) / GAP);
  if (!k) return [0, 0, 0];
  const open = 1 - tw(p, STEP.inner) + (k > 1 ? 1 - tw(p, STEP.outer) : 0);
  return mul(pc.explode, open / k);
}

function rootOf(pc: Piece, p: number, f: number): Mat {
  const off = offsetOf(pc, p);
  if (pc.key === "takeoff") {
    // Formed standing on the floor behind the inlet, then carried over the run and set on the main.
    const edge: V3 = [JOG, H, ZT - CB / 2];
    const lay = spin(edge, X, (-Math.PI / 2) * (1 - io(seg(f, 0, 0.3))));
    const c = tw(p, STEP.lift);
    const k = 1 - c;
    const turned = then(spin(edge, Y, (Math.PI / 2) * k), lay);
    return then(shift([off[0] + TO_FLOOR[0] * k, off[1] + TO_FLOOR[1] * k + Math.sin(Math.PI * c) * 0.55, off[2] + TO_FLOOR[2] * k]), turned);
  }
  if (pc.key === "cap") {
    // A tray on the floor past the end of the main; it stands up and slips over the end.
    const lay = spin([0, 0, ZE], X, (-Math.PI / 2) * (1 - tw(p, STEP.stand)));
    const k = 1 - tw(p, STEP.slide);
    return then(shift([off[0] + CAP_AT[0] * k, off[1], off[2] + CAP_AT[2] * k]), lay);
  }
  return shift(off);
}

function pose(pc: Piece, p: number): Posed {
  const f = seg(p, pc.form[0], pc.form[1]);
  const at = SEAM_AT[pc.key];
  const closing = at === undefined ? 1 : io(seg(p, at, at + SEAM_LEN));
  const prog = pc.panels.map((pn, i) => {
    const t = io(seg(f, pn.win[0], pn.win[1]));
    if (i !== pc.seam.panel || at === undefined) return t;
    const s = Math.min(1, SHORT / Math.abs(pn.theta));
    return t * (1 - s) + closing * s;
  });
  const mats: Mat[] = [];
  pc.panels.forEach((pn, i) => {
    mats.push(pn.parent < 0 ? rootOf(pc, p, f) : then(mats[pn.parent], spin(pn.hp, pn.he, -pn.theta * (1 - prog[i]))));
  });
  return { pc, mats, prog, f };
}

function facesOf(ps: Posed, open = 0): Face[] {
  const { pc, mats, prog, f } = ps;
  // Inside a closed duct is in shade; the opened elbow (top cheek removed) is lit again.
  const inside = 1 - 0.36 * f * (1 - open) - 0.2 * open;
  return pc.panels.map((pn, i) => {
    const q = corners(ps, i);
    const nIn = turn(mats[i], pn.n);
    const out = dot(nIn, EYE) < 0;
    let solid = "";
    let dashed = "";
    q.forEach((v, k) => {
      const ink = line([v, q[(k + 1) % q.length]]);
      const owner = pn.bends[k];
      if (owner >= 0 && prog[owner] < 0.12) dashed += ink;
      else solid += ink;
    });
    const pts = q.map(project);
    const fill = out ? steel(mul(nIn, -1), 1) : steel(nIn, inside);
    return { key: `${pc.key}-${pn.key}`, d: `M${pts.map(pt).join("L")}Z`, fill, solid, dashed, depth: avg(q), out, pts };
  });
}

/** Inner surfaces first, then outer ones; far to near within each. */
const order = (fs: Face[]) => [...fs].sort((a, b) => Number(a.out) - Number(b.out) || a.depth - b.depth);

function seamOf({ pc, mats }: Posed, p: number): SeamDraw | undefined {
  const at = SEAM_AT[pc.key];
  if (at === undefined || p < at || pc.seam.hidden) return undefined;
  const M = mats[pc.seam.panel];
  const [ix, iy, iz] = pc.seam.inset;
  const edge = pc.seam.path.map((v) => apply(M, v));
  const lip = pc.seam.path.map(([x, y, z]): V3 => apply(M, [x + ix * 0.032, y + iy * 0.032, z + iz * 0.032]));
  const band = [...edge, ...[...lip].reverse()].map(project);
  return { line: line(edge), inset: line(lip), band: `M${band.map(pt).join("L")}Z`, t: seg(p, at, at + SEAM_LEN) };
}

/** Panels that a brake bends (the readout counts these); the rest are seams, flanges and placements. */
const BRAKE = new Set(["front", "back", "top", "heel2", "side1", "side2", "lean", "fB", "fR", "fT", "fL"]);

export function scene(p: number): Scene {
  const posed = PIECES.map((pc) => pose(pc, p));
  const by = Object.fromEntries(posed.map((ps) => [ps.pc.key, ps]));
  const groups: Group[] = [];
  const all: Face[] = [];
  const capOn = p >= STEP.slide[0];
  for (const ps of posed) {
    const key = ps.pc.key;
    const fs = facesOf(ps, key === "elbow" ? elbowReveal(p) : 0);
    all.push(...fs);
    if (key === "cap" && capOn) {
      // Once it slips on, the cap's outer flanges wrap over the main; the rest stays behind it.
      const wraps = (x: Face) => x.out && !x.key.endsWith("plate");
      groups.push({ key: "cap-back", depth: centre(ps), faces: order(fs.filter((x) => !wraps(x))) });
      groups.push({ key, depth: centre(by.branch) + 0.005, faces: order(fs.filter(wraps)) });
      continue;
    }
    const faces = key === "elbow" ? elbowInside(ps.f, p, order(fs)) : order(fs);
    groups.push({ key, depth: centre(ps), faces, seam: seamOf(ps, p), spots: key === "takeoff" ? welds(ps.mats[0], p) : undefined });
  }
  groups.push(...joints(p, (k) => offsetOf(by[k].pc, p), (k) => centre(by[k])));
  groups.sort((a, b) => a.depth - b.depth);

  const shadow = posed.flatMap((ps) =>
    ps.pc.panels.flatMap((_, i) => {
      const q = corners(ps, i);
      if (Math.max(...q.map((v) => v[1])) < 0.004) return [];
      return [ccw(q.map((v) => project(onFloor([v[0], Math.max(0, v[1]), v[2]]))))];
    }),
  );
  let bends = 0;
  let bendsTotal = 0;
  for (const { pc, f } of posed) {
    for (const pn of pc.panels) {
      if (!BRAKE.has(pn.key)) continue;
      bendsTotal += Math.abs(pn.theta);
      bends += Math.abs(pn.theta) * io(seg(f, pn.win[0], pn.win[1]));
    }
  }
  const deg = (r: number) => Math.round((r * 180) / Math.PI);
  const metal = all.filter((x) => x.key !== "elbow-cheekT" || elbowReveal(p) < 0.5);
  return {
    groups,
    shadow: shadow.join(""),
    union: metal.map((x) => ccw(x.pts)).join(""),
    bends: deg(bends),
    bendsTotal: deg(bendsTotal),
    notes: notes(p, (k) => offsetOf(by[k].pc, p)),
  };
}
