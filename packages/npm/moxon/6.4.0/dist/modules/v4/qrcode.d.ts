import { type RemoteFetcher } from '../../utils/remote.js';
export interface QRCodeOptions {
    url: string;
    size?: number;
    margin?: number;
    correction?: 'L' | 'M' | 'Q' | 'H';
    dark?: string;
    light?: string;
    icon?: string;
    iconSize?: number;
    iconPadding?: number;
    iconRadius?: number;
    format?: 'png' | 'base64';
}
export interface QRCodeResult {
    contentType: string;
    body: Buffer | string;
}
/**
 * Generates a QR code image for a given URL, with optional icon overlay and color customization.
 *
 * @param options - QR code generation options including URL, size, margin, correction level, colors, and optional icon
 * @returns Object containing the QR code as a PNG buffer or Base64 string, and the content type
 * @throws Error if the URL is missing, any option is invalid, or the icon URL cannot be fetched
 */
export default function qrcode(options: QRCodeOptions): Promise<QRCodeResult>;
/**
 * Same as qrcode, with the remote fetch implementation passed in so tests can replace it.
 *
 * @param options - QR code generation options including URL, size, margin, correction level, colors, and optional icon
 * @param fetcher - Remote fetch implementation used for the icon, fetchRemote in production
 * @returns Object containing the QR code as a PNG buffer or Base64 string, and the content type
 * @throws Error if the URL is missing, any option is invalid, or the icon cannot be fetched or is too large
 */
export declare function generateQRCode(options: QRCodeOptions, fetcher: RemoteFetcher): Promise<QRCodeResult>;
