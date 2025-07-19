import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createMessage, createNotification } from '@/lib/database'
import { prisma } from '@/lib/prisma'
import { MessageType } from '@prisma/client'

const sendMessageSchema = z.object({
  dealId: z.string(),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  content: z.string().min(1).max(1000),
  type: z.enum(['TEXT', 'SYSTEM', 'DEAL_UPDATE', 'IMAGE', 'NFT_PREVIEW']).optional(),
  replyToId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = sendMessageSchema.parse(body)

    // Check if deal exists and sender is participant
    const deal = await prisma.deal.findUnique({
      where: { id: validatedData.dealId },
      include: {
        creator: true,
        counterparty: true,
      },
    })

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }

    // Verify sender is a participant in the deal
    const normalizedSenderAddress = validatedData.senderAddress.toLowerCase()
    const isParticipant = 
      deal.creatorAddress === normalizedSenderAddress ||
      deal.counterpartyAddress === normalizedSenderAddress

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You are not authorized to send messages in this deal' },
        { status: 403 }
      )
    }

    // Validate reply message exists if replyToId is provided
    if (validatedData.replyToId) {
      const replyMessage = await prisma.message.findUnique({
        where: { id: validatedData.replyToId },
      })

      if (!replyMessage || replyMessage.dealId !== validatedData.dealId) {
        return NextResponse.json(
          { error: 'Reply message not found or not in this deal' },
          { status: 400 }
        )
      }
    }

    // Create the message
    const message = await createMessage({
      dealId: validatedData.dealId,
      senderAddress: normalizedSenderAddress,
      content: validatedData.content,
      type: validatedData.type as MessageType,
      replyToId: validatedData.replyToId,
    })

    // Create notification for the other participant
    const recipientAddress = 
      deal.creatorAddress === normalizedSenderAddress
        ? deal.counterpartyAddress
        : deal.creatorAddress

    if (recipientAddress) {
      await createNotification({
        userId: recipientAddress,
        dealId: validatedData.dealId,
        type: 'MESSAGE_RECEIVED',
        title: 'New Message',
        message: `You have a new message in your deal`,
        data: {
          dealId: validatedData.dealId,
          senderAddress: validatedData.senderAddress,
          messageId: message.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error) {
    console.error('Error sending message:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
} 