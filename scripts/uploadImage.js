import fs from 'fs'
import { NFTStorage, File } from 'nft.storage'

const token = process.env.TOKEN;

async function uploadImage() {
  const storage = new NFTStorage({ token })

  const data = await fs.promises.readFile("images/Member_NFT02.jpg");

  const metadata = await storage.store({
    name: 'Talent Protocol Community Member NFT',
    description: 'Talent Protocol Community Member level NFT. Owners of this NFT are considered members of Talent Protocol',
    image: new File(
      [
        data
      ],
      'Member_NFT02.jpg',
      { type: 'image/jpg' }
    ),
    properties: {
      type: "image",
      season: "02",
    }
  })
  console.log('NFT data stored!')
  console.log('Metadata URI: ', metadata.url)
}

await uploadImage()
