type Namespace = 'eip155' | 'solana'

export interface VaultWalletState {
  address: string
  chainId?: number | string
  isConnected: boolean
  providerType?: string
}

const LOCALHOST_PROJECT_ID = 'b56e18d47c72ab683b10814fe9495694'
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || LOCALHOST_PROJECT_ID

let appKitPromise: Promise<any> | null = null

const remoteImport = (url: string) => import(/* @vite-ignore */ url)

function getMetadata() {
  const origin = window.location.origin

  return {
    name: 'The Vault',
    description: 'The Vault collector marketplace crypto checkout',
    url: origin,
    icons: [`${origin}/favicon.ico`],
  }
}

function readWalletState(appKit: any): VaultWalletState {
  return {
    address: appKit.getAddress?.() || '',
    chainId: appKit.getChainId?.(),
    isConnected: Boolean(appKit.getIsConnected?.()),
    providerType: appKit.getWalletProviderType?.(),
  }
}

export async function getVaultAppKit() {
  if (appKitPromise) return appKitPromise

  appKitPromise = (async () => {
    const [{ createAppKit }, { WagmiAdapter }, { SolanaAdapter }, networks] = await Promise.all([
      remoteImport('https://esm.sh/@reown/appkit@latest'),
      remoteImport('https://esm.sh/@reown/appkit-adapter-wagmi@latest'),
      remoteImport('https://esm.sh/@reown/appkit-adapter-solana@latest'),
      remoteImport('https://esm.sh/@reown/appkit@latest/networks'),
    ])

    const evmNetworks = [
      networks.mainnet,
      networks.base,
      networks.polygon,
      networks.arbitrum,
    ].filter(Boolean)
    const supportedNetworks = [
      ...evmNetworks,
      networks.solana,
      networks.solanaDevnet,
    ].filter(Boolean)

    const wagmiAdapter = new WagmiAdapter({
      projectId,
      networks: evmNetworks,
    })

    const solanaAdapter = new SolanaAdapter()

    const appKit = createAppKit({
      adapters: [wagmiAdapter, solanaAdapter],
      networks: supportedNetworks,
      projectId,
      metadata: getMetadata(),
      enableWallets: true,
      enableNetworkSwitch: true,
      enableReconnect: true,
      termsConditionsUrl: `${window.location.origin}/terms`,
      privacyPolicyUrl: `${window.location.origin}/privacy`,
      defaultAccountTypes: { eip155: 'eoa', solana: 'eoa' },
      features: {
        analytics: false,
        connectMethodsOrder: ['wallet'],
        email: false,
        socials: false,
        swaps: false,
      },
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#C9A84C',
        '--w3m-color-mix': '#080808',
        '--w3m-color-mix-strength': 40,
      },
    })

    return appKit
  })()

  return appKitPromise
}

export async function openVaultWallet(namespace: Namespace = 'solana') {
  const appKit = await getVaultAppKit()
  await appKit.open({ view: 'Connect', namespace })
  return readWalletState(appKit)
}

export async function openVaultWalletSend() {
  const appKit = await getVaultAppKit()
  await appKit.open({ view: 'WalletSend' })
  return readWalletState(appKit)
}

export async function subscribeVaultWallet(listener: (state: VaultWalletState) => void) {
  const appKit = await getVaultAppKit()
  listener(readWalletState(appKit))

  const unsubscribeProvider = appKit.subscribeProvider?.((state: any) => {
    listener({
      address: state?.address || appKit.getAddress?.() || '',
      chainId: state?.chainId || appKit.getChainId?.(),
      isConnected: Boolean(state?.isConnected ?? appKit.getIsConnected?.()),
      providerType: state?.providerType || appKit.getWalletProviderType?.(),
    })
  })

  const unsubscribeState = appKit.subscribeState?.(() => listener(readWalletState(appKit)))

  return () => {
    unsubscribeProvider?.()
    unsubscribeState?.()
  }
}
