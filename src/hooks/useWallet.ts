import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

export function useWallet() {
  const { address, isConnected, isConnecting, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()

  const connectWallet = () => {
    if (openConnectModal) {
      openConnectModal()
    }
  }

  const disconnectWallet = () => {
    disconnect()
  }

  return {
    address,
    isConnected,
    isConnecting,
    chain,
    connectWallet,
    disconnectWallet,
    connectors,
  }
} 