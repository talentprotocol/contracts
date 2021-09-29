import { deployTestStable } from "./shared";

async function main() {
  const { address } = await deployTestStable();

  console.log(`
  cUSD Token: ${address}
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
