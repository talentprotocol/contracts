import fs from 'fs'
import { NFTStorage, File } from 'nft.storage'

const token = process.env.NFT_STORAGE_API_KEY || 'API_KEY'

async function uploadImage() {
  const storage = new NFTStorage({ token })

  const data = await fs.promises.readFile("images/User_NFT02.jpg");

  const metadata = await storage.store({
    name: 'Talent Protocol Community User NFT',
    description: 'Talent Protocol Community User level NFT. Owners of this NFT are considered users of Talent Protocol',
    image: new File(
      [
        data
      ],
      'User_NFT01.jpg',
      { type: 'image/jpg' }
    ),
    properties: {
      type: "image",
      season: "01",
    }
  })
  console.log('NFT data stored!')
  console.log('Metadata URI: ', metadata.url)
}

await uploadImage()
