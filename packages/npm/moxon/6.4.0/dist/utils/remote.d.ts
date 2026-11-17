import type { LookupAddress } from 'node:dns';
import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http';
import { BlockList } from 'node:net';
export type RemoteFailure = 'blocked' | 'protocol' | 'size' | 'network' | 'timeout';
export interface RemoteHead {
    status: number;
    ok: boolean;
    contentType: string;
}
export interface RemoteOptions {
    maxBytes: number;
    timeout: number;
    redirects?: number;
    check?: (head: RemoteHead) => void;
    messages?: Partial<Record<RemoteFailure, string>>;
    blocklist?: BlockList;
    resolve?: (hostname: string) => Promise<LookupAddress[]>;
    request?: (url: URL, options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest;
}
export type RemoteFetcher = (url: string, options: RemoteOptions) => Promise<Buffer>;
/**
 * Tells whether an IP address belongs to a private, loopback or otherwise internal range.
 *
 * @param address - IPv4 or IPv6 address, optionally with an IPv6 zone index
 * @param blocklist - Ranges to reject, the internal ranges by default
 * @returns true when the address must not be contacted
 */
export declare function isPrivateAddress(address: string, blocklist?: BlockList): boolean;
/**
 * Fetches an HTTPS resource without letting the caller reach internal hosts.
 *
 * The host is resolved once, every address is checked against the internal ranges, and the
 * socket connects to those vetted addresses only. Redirects are followed by hand with the same
 * checks on each hop, the body is streamed and cut past maxBytes, and the whole exchange,
 * redirects and body included, must finish within the timeout.
 *
 * @param url - HTTPS URL to fetch
 * @param options - Size limit, timeout, response check and test seams
 * @returns The decoded response body
 * @throws Error if the URL is invalid or internal, the transfer fails, times out or is too large, or check throws
 */
export declare function fetchRemote(url: string, options: RemoteOptions): Promise<Buffer>;
