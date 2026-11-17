export interface BadgeOptions {
    label: string;
    icon?: string;
    trail?: string;
    start?: string;
    end?: string;
    ink?: string;
    message?: string;
    messageStart?: string;
    messageEnd?: string;
    messageInk?: string;
    border?: string;
    size?: string;
    font?: string;
    weight?: string;
    lift?: number;
    radius?: number;
    angle?: number;
}
export interface BadgeResult {
    contentType: string;
    body: string;
}
/**
 * Builds a badge as a standalone SVG: an optional leading icon, a label and an optional trailing icon on a
 * gradient background, with an optional second part holding a message.
 *
 * @param options - Badge options; only the label is required
 * @returns The content type and the SVG markup
 * @throws Error if a text, a color, an icon name, the size, the font, the weight, the lift, the radius or the angle
 * is invalid
 */
export default function badge(options: BadgeOptions): BadgeResult;
