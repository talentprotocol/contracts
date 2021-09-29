import { deployToken } from "./shared";

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
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
