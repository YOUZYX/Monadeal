import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'

export interface User {
  id: string
  address: string
  ensName?: string
  ensChecked: boolean
  avatar?: string
  avatarImage?: string
  username?: string
  bio?: string
  isOnline: boolean
  lastSeen?: Date
  createdAt: Date
  _count?: {
    dealsCreated: number
    dealsParticipant: number
  }
}

export interface UpdateUserData {
  ensName?: string
  ensChecked?: boolean
  avatar?: string
  avatarImage?: string
  username?: string
  bio?: string
  isOnline?: boolean
}

const fetchUser = async (address: string): Promise<User | null> => {
  const response = await fetch(`/api/user/${address}`)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  const data = await response.json()
  return data.user
}

const registerUser = async (address: string): Promise<User> => {
  const response = await fetch('/api/user/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  })
  if (!response.ok) {
    throw new Error('Failed to register user')
  }
  const data = await response.json()
  return data.user
}

const updateUser = async (address: string, userData: UpdateUserData): Promise<User> => {
  const response = await fetch(`/api/user/${address}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })
  if (!response.ok) {
    throw new Error('Failed to update user')
  }
  const data = await response.json()
  return data.user
}

const uploadAvatar = async (address: string, file: File): Promise<User> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const imageData = event.target?.result as string
        const response = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            imageData,
            mimeType: file.type,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to upload avatar')
        }
        
        const data = await response.json()
        resolve(data.user)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

const removeAvatar = async (address: string): Promise<User> => {
  const response = await fetch(`/api/user/avatar?address=${address}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Failed to remove avatar')
  }
  const data = await response.json()
  return data.user
}

const refreshEns = async (address: string): Promise<{ user: User; hasNewEns: boolean; message: string }> => {
  const response = await fetch('/api/user/refresh-ens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  })
  if (!response.ok) {
    throw new Error('Failed to refresh ENS')
  }
  const data = await response.json()
  return data
}

export const useUser = (address?: string) => {
  const { address: connectedAddress } = useAccount()
  const queryClient = useQueryClient()
  const [isRegistering, setIsRegistering] = useState(false)
  
  const userAddress = address || connectedAddress

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user', userAddress],
    queryFn: () => fetchUser(userAddress!),
    enabled: !!userAddress,
    retry: false,
  })

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (newUser) => {
      queryClient.setQueryData(['user', userAddress], newUser)
      setIsRegistering(false)
    },
    onError: (error) => {
      console.error('Registration failed:', error)
      setIsRegistering(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ address, userData }: { address: string; userData: UpdateUserData }) =>
      updateUser(address, userData),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user', userAddress], updatedUser)
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ address, file }: { address: string; file: File }) =>
      uploadAvatar(address, file),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user', userAddress], updatedUser)
    },
  })

  const removeAvatarMutation = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user', userAddress], updatedUser)
    },
  })

  const refreshEnsMutation = useMutation({
    mutationFn: refreshEns,
    onSuccess: (data) => {
      queryClient.setQueryData(['user', userAddress], data.user)
    },
  })

  const handleRegister = async () => {
    if (!userAddress || isRegistering) return
    
    setIsRegistering(true)
    try {
      await registerMutation.mutateAsync(userAddress)
    } catch (error) {
      console.error('Registration error:', error)
      setIsRegistering(false)
    }
  }

  const handleUpdate = async (userData: UpdateUserData) => {
    if (!userAddress) return
    
    return updateMutation.mutateAsync({ address: userAddress, userData })
  }

  const handleUploadAvatar = async (file: File) => {
    if (!userAddress) return
    
    return uploadAvatarMutation.mutateAsync({ address: userAddress, file })
  }

  const handleRemoveAvatar = async () => {
    if (!userAddress) return
    
    return removeAvatarMutation.mutateAsync(userAddress)
  }

  const handleRefreshEns = async () => {
    if (!userAddress) return
    
    return refreshEnsMutation.mutateAsync(userAddress)
  }

  // Auto-register when user connects wallet and doesn't exist
  // Also try to fetch ENS name once if not already checked
  useEffect(() => {
    if (userAddress && !isLoading && !isRegistering) {
      if (!user && !error) {
        // User doesn't exist, register them
        console.log('New user detected, registering...')
        handleRegister()
      } else if (user && !user.ensChecked) {
        // User exists but we haven't checked for ENS name yet, try once
        console.log('User exists but ENS not checked, trying to fetch ENS name...')
        handleRegister()
      }
    }
  }, [userAddress, isLoading, user, error, isRegistering])

  return {
    user,
    isLoading: isLoading || isRegistering,
    error,
    isRegistering,
    isUpdating: updateMutation.isPending,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    isRemovingAvatar: removeAvatarMutation.isPending,
    isRefreshingEns: refreshEnsMutation.isPending,
    updateUser: handleUpdate,
    uploadAvatar: handleUploadAvatar,
    removeAvatar: handleRemoveAvatar,
    refreshEns: handleRefreshEns,
    refetch,
    registerUser: handleRegister,
  }
}

export const useCurrentUser = () => {
  const { address } = useAccount()
  return useUser(address)
} 