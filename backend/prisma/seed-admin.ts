/**
 * Creates or updates the first administrator, and nothing else.
 *
 * The full seed also uploads the site's starter images, which means it needs a
 * configured storage driver. On a fresh production deployment that is an
 * awkward dependency: getting anyone signed in should not require the Blob
 * credentials to be on hand, and running the full seed without them would write
 * the images to whichever machine ran the command and store unreachable URLs in
 * the production database.
 *
 * This entry point exists for exactly that case. It reuses `seedAdmin` from the
 * main seed rather than reimplementing the password hashing, so there is one
 * definition of how an administrator is created.
 *
 * Run the full seed afterwards, with the storage variables set, to add the
 * starter content.
 *
 *   npm run db:seed:admin
 */
import { prisma } from '../src/lib/prisma';
import { seedAdmin } from './seed';

async function main() {
  console.log('\nCreating the first administrator\n');

  const admin = await seedAdmin();

  if (!admin) {
    console.log(
      '\nNothing was created. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD and run this again.\n',
    );
    return;
  }

  console.log('\nDone. Sign in, then change this password from Profile in the dashboard.\n');
}

main()
  .catch((error) => {
    console.error('\nFailed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
