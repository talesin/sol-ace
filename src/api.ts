export async function getSolPrice(): Promise<number | undefined> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    )
    if (!response.ok) {
      throw new Error('Failed to fetch SOL price')
    }
    const data = await response.json()
    return data.solana.usd
  } catch (error) {
    console.error(error)
    return undefined
  }
}
