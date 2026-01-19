/**
 * Generates a deterministic conversation ID from two user IDs
 * Formula: [userId1, userId2].sort().join('_')
 * This ensures User A -> User B and User B -> User A always produce the same conversationId
 */
export function generateConversationId(userId1: string, userId2: string): string {
  if (!userId1 || !userId2) {
    throw new Error('Both user IDs are required');
  }

  if (userId1 === userId2) {
    throw new Error('Cannot create a conversation with yourself');
  }

  return [userId1, userId2].sort().join('_');
}

/**
 * Extracts user IDs from a conversation ID
 */
export function extractUserIdsFromConversation(conversationId: string): [string, string] {
  const parts = conversationId.split('_');
  if (parts.length !== 2) {
    throw new Error('Invalid conversation ID format');
  }
  return [parts[0], parts[1]];
}
