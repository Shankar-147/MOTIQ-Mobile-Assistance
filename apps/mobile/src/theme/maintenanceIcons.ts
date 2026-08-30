import {
  Activity,
  BatteryCharging,
  CircleHelp,
  Disc,
  Droplet,
  Lightbulb,
  ShieldCheck,
  Thermometer,
  Wind,
  Wrench,
} from "lucide-react-native";
import { MaintenanceServiceType } from "@motiq/types";

/** Mirrors issueIcons.ts's pattern — one lucide icon per preventive-
 * maintenance category, so the Vehicle Health screen and service-record
 * form read as a real checklist, not a bare label list. */
export const MAINTENANCE_ICONS: Record<MaintenanceServiceType, typeof Wrench> = {
  [MaintenanceServiceType.OIL_CHANGE]: Droplet,
  [MaintenanceServiceType.TIRE_ROTATION]: Disc,
  [MaintenanceServiceType.BRAKE_SERVICE]: Disc,
  [MaintenanceServiceType.BATTERY_CHECK]: BatteryCharging,
  [MaintenanceServiceType.GENERAL_SERVICE]: Wrench,
  [MaintenanceServiceType.ENGINE_CHECK]: Activity,
  [MaintenanceServiceType.COOLANT_CHECK]: Thermometer,
  [MaintenanceServiceType.AIR_FILTER]: Wind,
  [MaintenanceServiceType.LIGHTS_CHECK]: Lightbulb,
  [MaintenanceServiceType.OVERALL_HEALTH_CHECK]: ShieldCheck,
  [MaintenanceServiceType.OTHER]: CircleHelp,
};
