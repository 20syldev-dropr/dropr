import type { ChallengeStorage } from '../../types/storage.js';
import type { ChallengeVerification } from '../../utils/challenge.js';
import type { CaptchaOptions } from '../v4/captcha.js';
export interface CaptchaChallenge {
    contentType: string;
    body: Buffer;
    token: string;
}
export interface CaptchaVerification {
    valid: boolean;
    reason?: ChallengeVerification['reason'] | 'weak';
}
/**
 * Generates a hardened captcha whose answer is bound to a signed token instead
 * of being returned in clear. The answer lives only inside the HMAC, so the
 * caller holds a token it cannot read the solution from. The token also
 * carries the answer length in clear, signed along with the answer, so the
 * verifying side can refuse a captcha generated too short to resist guessing.
 *
 * @param options - Captcha configuration options
 * @returns PNG buffer, content type, and the token to verify the answer against
 * @throws Error if the text is too long or any option is out of the accepted range
 */
export default function captchaChallenge(options: CaptchaOptions): CaptchaChallenge;
/**
 * Verifies a captcha answer against its token, then consumes the token. Only a
 * captcha token is accepted, and it is burnt after too many wrong answers.
 *
 * @param token - Token issued alongside the challenge image
 * @param answer - Answer read by the user, compared case-insensitively
 * @param storage - Store of already consumed nonces
 * @param minLength - Shortest answer accepted; a correct answer to a shorter captcha is refused as weak
 * @returns Verification result, with a reason when it fails
 */
export declare function verifyCaptcha(token: string, answer: string, storage: ChallengeStorage, minLength?: number): CaptchaVerification;
