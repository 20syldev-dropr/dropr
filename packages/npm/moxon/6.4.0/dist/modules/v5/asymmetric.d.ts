export interface KeygenResult {
    action: string;
    algorithm: string;
    modulusLength: number;
    publicKey: string;
    privateKey: string;
}
export interface AsymmetricCryptResult {
    action: string;
    algorithm: string;
    result: string;
}
/**
 * RSA asymmetric key generation, encryption and decryption.
 *
 * @param action - "keygen", "encrypt", or "decrypt"
 * @param options - Options object with text, publicKey, privateKey, modulusLength, algorithm
 * @returns Keygen or crypt result object
 */
export default function asymmetric(action: string, options?: {
    text?: string;
    publicKey?: string;
    privateKey?: string;
    modulusLength?: number;
    algorithm?: string;
}): KeygenResult | AsymmetricCryptResult;
/**
 * Same as asymmetric, but generates RSA key pairs on the libuv threadpool instead of the calling thread,
 * at most MAX_CONCURRENT_KEYGENS at a time.
 *
 * @param action - "keygen", "encrypt", or "decrypt"
 * @param options - Options object with text, publicKey, privateKey, modulusLength, algorithm
 * @returns Promise of the keygen or crypt result object, identical to what asymmetric returns
 */
export declare function asymmetricAsync(action: string, options?: {
    text?: string;
    publicKey?: string;
    privateKey?: string;
    modulusLength?: number;
    algorithm?: string;
}): Promise<KeygenResult | AsymmetricCryptResult>;
