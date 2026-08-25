import { BatteryCharging, CircleHelp, Disc, Fuel, Truck, Wrench } from "lucide-react-native";
import { IssueType } from "@motiq/types";

/** Maps Ch2's breakdown taxonomy to a real icon instead of a bare label —
 * scannable at a glance during a stressful roadside moment (Ch2's own
 * stated context for this app), not just readable. */
export const ISSUE_ICONS: Record<IssueType, typeof Truck> = {
  [IssueType.TOW]: Truck,
  [IssueType.REPAIR]: Wrench,
  [IssueType.FUEL]: Fuel,
  [IssueType.FLAT_TYRE]: Disc,
  [IssueType.BATTERY_JUMP]: BatteryCharging,
  [IssueType.OTHER]: CircleHelp,
};
