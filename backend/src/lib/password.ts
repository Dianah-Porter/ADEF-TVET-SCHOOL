import * as argon2 from '@node-rs/argon2';

/**
 * argon2id rather than bcrypt: it is memory-hard, which makes large-scale
 * offline cracking on GPUs far more expensive if the database ever leaks.
 * Defaults from @node-rs/argon2 are the OWASP-recommended parameters.
 */
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    // A malformed hash in the database should read as "wrong password",
    // not crash the login route.
    return false;
  }
}

/**
 * A real argon2 hash of a value nobody can log in with.
 *
 * When an email does not exist we still run a verification against this, so a
 * missing account takes the same time as a wrong password. Without it, response
 * timing tells an attacker which email addresses are registered.
 */
let dummyHash: string | null = null;

export async function wasteTimeLikeAVerification(): Promise<void> {
  dummyHash ??= await argon2.hash('no-such-account-placeholder');
  await verifyPassword(dummyHash, 'definitely-not-the-password');
}
