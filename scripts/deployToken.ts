import { deployToken, deployFactory, deployStaking } from "./shared";

import type { TalentProtocol__factory } from "../typechain";

const { exit } = process;

async function main() {
  const { address } = await deployToken();

  console.log(`
  TAL Token: ${address}
  `);

  // set staking TAL
  // send TAL to staking
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
