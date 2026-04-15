import SignClient from '@walletconnect/sign-client'

let client: InstanceType<typeof SignClient> | null = null

export async function getSignClient() {
  if (client) return client

  client = await SignClient.init({
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
    metadata: {
      name: 'ConnectWallet',
      description: 'Connect your TrustWallet',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      icons: [],
    },
  })

  return client
}
