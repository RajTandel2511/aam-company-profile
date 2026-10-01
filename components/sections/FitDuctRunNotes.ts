/**
 * Drafting callouts for FIG. 01: each names a shop detail as it happens and stays.
 * Labels sit at fixed places in the frame; leaders run to the part wherever it is.
 */
import { seg } from "@/lib/motion";
import { add, project, type P2, type V3 } from "./FitDuctRunMath";
import { CB, CH, H, HALF, HF, JOG, SEAM_AT, STEP, W1, XB, ZC, ZE, ZT } from "./FitDuctRunParts";

/** at: the part; label: the text anchor; from: where the leader leaves the text. */
export type Note = { key: string; text: string; at: P2; label: P2; from: P2; end: boolean; op: number };

type Def = { key: string; text: string; piece: string; world: V3; label: P2; end?: boolean; from: number };
const DEFS: Def[] = [
  { key: "tdc", text: "TDC flange", piece: "reducer", world: [XB, H + HF * 0.6, -W1 / 2 - HF * 0.6], label: [-162, -150], from: STEP.bolts[0] + 0.03 },
  { key: "vanes", text: "Turning vanes", piece: "elbow", world: [-0.03, H * 0.62, -0.03], label: [-40, -170], from: STEP.window[0] + 0.03 },
  { key: "takeoff", text: "45° takeoff", piece: "takeoff", world: [JOG - 0.1, H + CH * 0.5, ZT + CB / 2 + CH * 0.5], label: [101, -142], end: true, from: STEP.lift[1] },
  { key: "cap", text: "End cap", piece: "cap", world: [JOG + HALF, H * 0.8, ZE + 0.03], label: [206, -112], end: true, from: STEP.slide[1] + 0.02 },
  { key: "pitts", text: "Pittsburgh lock", piece: "straight", world: [XB - 0.15, H, W1 / 2], label: [-166, 34], from: SEAM_AT.straight + 0.03 },
  { key: "sd", text: "S&D", piece: "offset", world: [HALF + 0.01, 0.02, ZC], label: [52, 36], from: STEP.drives[0] + 0.05 },
];

/** Label metrics, in frame units: the figure's mono face at 7.4 with 0.14em tracking. */
export const NOTE = { size: 7.4, advance: 7.4 * 0.74 };

/** Every callout that is up at p; `off` gives a piece's current world offset. */
export function notes(p: number, off: (piece: string) => V3): Note[] {
  return DEFS.filter((d) => p >= d.from).map((d) => {
    const at = project(add(d.world, off(d.piece)));
    const [lx, ly] = d.label;
    const w = d.text.length * NOTE.advance;
    const [x0, x1] = d.end ? [lx - w, lx] : [lx, lx + w];
    // Leave from the end of the text that faces the part; straight down or up when it is under it.
    const from: P2 = at[0] > x1 ? [x1 + 3, ly - 2.6] : at[0] < x0 ? [x0 - 3, ly - 2.6] : [at[0], at[1] < ly ? ly - 9.5 : ly + 3];
    return { key: d.key, text: d.text, at, label: d.label, from, end: !!d.end, op: seg(p, d.from, d.from + 0.03) };
  });
}
