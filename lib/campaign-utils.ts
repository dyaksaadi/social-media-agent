import insforge from '@/lib/insforge-client'

export async function getUserCampaign(userId: string) {
  try {
    const { data, error } = await insforge.database
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      // No campaign found is not an error
      return null
    }

    return data
  } catch (err) {
    console.error('Failed to fetch user campaign:', err)
    return null
  }
}
