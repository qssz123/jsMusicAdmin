// src/utils/nftUtils.ts
import { Connection, clusterApiUrl } from '@solana/web3.js'
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js'
import { useUserStoreWithOut } from '@/store/modules/user'

// 获取 store 实例
const userStore = useUserStoreWithOut()
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY as string
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY as string

interface MetadataOptions {
  coverUrl: string
  musicUrl?: string
  name: string
  description: string
}

/* ------------------------------------------------------------------ */
/*  上传文件到 Pinata                                               */

/* ------------------------------------------------------------------ */
async function uploadToPinata(url: string, fileName = 'file'): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('下载文件失败')
  const blob = await res.blob()
  const file = new File([blob], fileName, { type: blob.type })

  const formData = new FormData()
  formData.append('file', file)

  const r = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_API_KEY
    },
    body: formData
  })

  const json = await r.json()
  if (!json.IpfsHash) throw new Error('Pinata 上传失败')
  return `ipfs://${json.IpfsHash}`
}

/* ------------------------------------------------------------------ */
/*  上传 metadata JSON 到 Pinata                                      */

/* ------------------------------------------------------------------ */
async function uploadMetadata(metadata: Record<string, any>): Promise<string> {
  const r = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_API_KEY
    },
    body: JSON.stringify(metadata)
  })
  const json = await r.json()
  if (!json.IpfsHash) throw new Error('Pinata metadata 上传失败')
  return `ipfs://${json.IpfsHash}`
}

/* ------------------------------------------------------------------ */
/*  生成 metadata 并上传                                             */

/* ------------------------------------------------------------------ */
async function generateMetadata({ coverUrl, musicUrl, name, description }: MetadataOptions) {
  console.log('🟡 正在上传封面图片...')
  userStore.setChainMessage(`🟡 正在上传封面图片...`)
  const coverIpfs = await uploadToPinata(coverUrl, 'cover.jpg')

  let musicIpfs: string | undefined
  if (musicUrl) {
    console.log('🟡 正在上传音乐文件...，')
    userStore.setChainMessage(`🟡 正在上传音乐文件...`)
    musicIpfs = await uploadToPinata(musicUrl, 'music.mp3')
  }

  const metadata = {
    name,
    description,
    image: coverIpfs,
    animation_url: musicIpfs,
    attributes: [
      { trait_type: 'Type', value: musicUrl ? 'Music' : 'Image' },
      { trait_type: 'Network', value: 'Devnet' }
    ]
  }

  console.log('🟡 正在上传 metadata JSON...')
  userStore.setChainMessage(`🟡 正在上传 metadata JSON...`)
  const metadataUri = await uploadMetadata(metadata)
  console.log('✅ metadata IPFS URI:', metadataUri)
  return metadataUri
}

/* ------------------------------------------------------------------ */
/*  连接 Phantom 钱包                                               */

/* ------------------------------------------------------------------ */
export async function connectWallet(): Promise<string> {
  const wallet = (window as any).solana
  if (!wallet || !wallet.isPhantom) throw new Error('未检测到 Phantom 钱包')
  if (!wallet.isConnected) await wallet.connect()
  userStore.setChainMessage(`✅ 钱包连接成功:', wallet.publicKey.toBase58()`)
  console.log('✅ 钱包连接成功:', wallet.publicKey.toBase58())
  return wallet.publicKey.toBase58()
}

/* ------------------------------------------------------------------ */
/*  铸造 NFT（Metaplex JS）                                          */

/* ------------------------------------------------------------------ */
export async function mintUrlsNFT({
  coverUrl,
  musicUrl,
  name,
  description
}: MetadataOptions): Promise<string> {
  console.log('🚀 开始 NFT 铸造流程')
  userStore.setChainMessage(`🚀 开始 NFT 铸造流程`)
  const wallet = (window as any).solana
  if (!wallet?.isPhantom) throw new Error('请安装 Phantom 钱包')

  if (!wallet.isConnected) await wallet.connect()

  // 1️⃣ 上传 metadata
  const metadataUri = await generateMetadata({ coverUrl, musicUrl, name, description })

  // 2️⃣ 连接 Devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

  // 3️⃣ 创建 Metaplex 实例
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet))

  // 4️⃣ 铸造 NFT
  console.log('🟡 铸造 NFT，钱包会弹窗确认...')
  userStore.setChainMessage(`🟡 开始铸造 NFT，钱包会弹窗确认...`)
  const { nft } = await metaplex.nfts().create({
    uri: metadataUri,
    name,
    symbol: 'NFT',
    sellerFeeBasisPoints: 500,
    maxSupply: 1
  })

  const mintAddress = nft.address.toBase58()
  const explorerUrl = `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`
  userStore.setChainMessage(`✅ NFT 铸造完成!`)
  console.log('✅ NFT 铸造完成!')
  console.log('   Mint 地址:', mintAddress)
  console.log('   Metadata URI:', nft.uri)
  console.log('   Explorer:', explorerUrl)

  // 🔔 弹窗显示（阻塞）
  // await showMintSuccessModal({
  //   mint: mintAddress,
  //   metadataUri: nft.uri,
  //   explorer: explorerUrl
  // })

  return nft.address.toBase58()
}

/* ------------------------------------------------------------------ */
/*  查询钱包余额                                                      */

/* ------------------------------------------------------------------ */
export async function getWalletBalance(): Promise<number> {
  const wallet = (window as any).solana
  if (!wallet?.isConnected) return 0

  const connection = new Connection(clusterApiUrl('devnet'))
  const balance = await connection.getBalance(wallet.publicKey)
  return balance / 1e9
}

/* ------------------------------------------------------------------ */
/*  NFT 铸造成功弹窗（阻塞式）                                        */

/* ------------------------------------------------------------------ */
function showMintSuccessModal(params: {
  mint: string
  metadataUri: string
  explorer: string
}): Promise<void> {
  return new Promise((resolve) => {
    const { mint, metadataUri, explorer } = params

    // 遮罩
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `

    // 弹窗
    const modal = document.createElement('div')
    modal.style.cssText = `
      width: 520px;
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      font-family: system-ui;
    `

    modal.innerHTML = `
      <h3 style="margin:0 0 12px;">🎉 NFT 铸造成功</h3>

      ${createRow('Mint 地址', mint)}
      ${createRow('Metadata URI', metadataUri)}
      ${createRow('Explorer', explorer, true)}

      <div style="text-align:right;margin-top:16px;">
        <button id="close-btn"
          style="
            padding: 8px 16px;
            background: #1677ff;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          ">
          复制完成，继续
        </button>
      </div>
    `

    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    // 复制逻辑
    modal.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = (btn as HTMLElement).dataset.copy!
        await navigator.clipboard.writeText(value)
        btn.textContent = '已复制'
        setTimeout(() => (btn.textContent = '复制'), 1500)
      })
    })

    // 关闭
    modal.querySelector('#close-btn')!.addEventListener('click', () => {
      document.body.removeChild(overlay)
      resolve()
    })
  })
}

function createRow(label: string, value: string, link = false) {
  const display = link ? `<a href="${value}" target="_blank">${value}</a>` : value

  return `
    <div style="margin-bottom:10px;">
      <div style="font-size:13px;color:#666;">${label}</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <div style="flex:1;word-break:break-all;font-size:14px;">
          ${display}
        </div>
        <button
          data-copy="${value}"
          style="
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
          ">
          复制
        </button>
      </div>
    </div>
  `
}
