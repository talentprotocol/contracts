import fs from 'fs'
import { NFTStorage, File } from 'nft.storage'

const token = process.env.NFT_STORAGE_API_KEY || 'API_KEY'

function main() {

  const storage = new NFTStorage({ token })

  const data = await fs.promises.readFile(args.image);

  const metadata = await storage.store({
    name: 'Talent Protocol Community Level One',
    description: 'Talent Protocol Community Level One NFT badge',
    image: new File(
      [
        data
      ],
      'community_level_one.jpg',
      { type: 'image/jpg' }
    ),
  })
  console.log(metadata.url)
}

main()