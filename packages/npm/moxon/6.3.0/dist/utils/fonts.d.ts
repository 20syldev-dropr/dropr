export type WidthRanges = [number, number[]][];
export declare const UNITS_PER_EM = 2048;
export declare const FALLBACK_WIDTH = 2048;
export declare const MONO_ADVANCE = 1233;
/**
 * Advance widths of the faces the badge text is measured with: DejaVu Sans, DejaVu Serif and DejaVu Sans Mono,
 * each in regular and bold. They are plain numeric metrics read from the fonts' horizontal metrics tables
 * (hmtx), not the fonts themselves. The soft hyphen is set to zero, as it is invisible unless a line breaks on it,
 * and a character the font lacks takes the width of its missing-glyph box. DejaVu is derived from Bitstream Vera
 * (Copyright (c) 2003 by Bitstream, Inc.; DejaVu changes are in the public domain).
 *
 * Each entry of a table is a first code point followed by the widths of the consecutive characters starting
 * there, in font units of 2048 per em: Basic Latin, Latin-1 Supplement up to Cyrillic and Armenian (U+00A0 to
 * U+052F), general punctuation, the euro sign, the trade mark sign and the four arrows. The combining marks
 * (U+0300 to U+036F and U+0483 to U+0487) have no width: a shaper stacks them on the letter before, even in a
 * face that lacks them. DejaVu Sans Mono gives the same advance to every other character of these ranges, so it
 * needs no table.
 */
export declare const SANS_REGULAR: WidthRanges;
export declare const SANS_BOLD: WidthRanges;
export declare const SERIF_REGULAR: WidthRanges;
export declare const SERIF_BOLD: WidthRanges;
