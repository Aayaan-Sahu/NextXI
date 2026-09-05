import { Circle, Path, Svg } from "react-native-svg";
import { colors } from "@/lib/theme";

/**
 * The app's small stroked-glyph vocabulary — tab bar icons, search, back,
 * compose, and the composer's attach glyph. `mobile/AGENTS.md` carves this
 * out as the one contained exception to the web's "no icon vocabulary"
 * rule: exactly this small a set, ink or cream, never filled.
 */

type IconProps = { size?: number; color?: string; strokeWidth?: number };

export function HomeIcon({ size = 26, color = colors["ink-900"], strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M3.4 10.6L12 3.6l8.6 7"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <Path
        d="M5.6 9.6V20h12.8V9.6"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <Path
        d="M9.8 20v-5.6h4.4V20"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function ConnectionsIcon({ size = 26, color = colors["ink-900"], strokeWidth = 2 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="10.6" cy="10.6" r="6.9" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M15.7 15.7l4.8 4.8" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function MessagesIcon({ size = 26, color = colors["ink-900"], strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 3.6c4.8 0 8.4 3.4 8.4 7.8s-3.6 7.8-8.4 7.8a10 10 0 0 1-2.9-.4l-4.2 1.6 1.3-3.6a7.4 7.4 0 0 1-2.6-5.4c0-4.4 3.6-7.8 8.4-7.8z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function BackChevronIcon({ size = 22, color = colors["ink-900"], strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M14.5 5l-7 7 7 7"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function SearchIcon({ size = 16, color = colors["ink-600"], strokeWidth = 2.1 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="10.8" cy="10.8" r="6.8" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M16 16l4.5 4.5" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ComposeIcon({ size = 25, color = colors["ink-900"], strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M20 12.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19V6.2c0-.9.7-1.6 1.6-1.6h6.6"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <Path
        d="M15.6 4.2l4.2 4.2-6.3 6.3-4.4.9.9-4.4z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

export function PersonAddIcon({ size = 24, color = colors["ink-900"], strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="10" cy="8" r="3.6" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M4 19.5c0-3.2 2.7-5 6-5 1.4 0 2.7.3 3.7.9"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
      <Path d="M17.5 14v6M14.5 17h6" stroke={color} strokeLinecap="round" strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** The dismiss glyph — the roster's "remove this connection" affordance. */
export function CloseIcon({ size = 18, color = colors["ink-600"], strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M6.5 6.5l11 11M17.5 6.5l-11 11"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

