import { deployToken } from "./shared";

const { exit } = process;

async function main() {
  const { address } = await deployToken();

  console.log(`
  TAL Token: ${address}
  `);
}

main()
  .then(() => exit(0))
  .catch((error) => {
    console.error(error);
    exit(1);
  });
