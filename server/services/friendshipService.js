import supabase from '../supabase.js';

/**
 * Send a friend request
 */
export async function sendFriendRequest(requesterId, addresseeId) {
  try {
    // Check if users exist
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .in('id', [requesterId, addresseeId]);
    
    if (userError) throw userError;
    if (!users || users.length !== 2) {
      throw new Error('One or both users not found');
    }

    // Check if friendship already exists in either direction
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${requesterId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${requesterId})`);

    if (existingFriendship && existingFriendship.length > 0) {
      const friendship = existingFriendship[0];
      if (friendship.status === 'accepted') {
        throw new Error('Already friends');
      } else if (friendship.status === 'pending') {
        throw new Error('Friend request already sent');
      } else if (friendship.status === 'blocked') {
        throw new Error('Cannot send friend request');
      }
    }

    // Create friend request
    const { data: newFriendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({ 
        requester_id: requesterId, 
        addressee_id: addresseeId, 
        status: 'pending' 
      })
      .select()
      .single();

    if (friendshipError) throw friendshipError;

    // Get requester name for notification
    const { data: requester } = await supabase
      .from('users')
      .select('name')
      .eq('id', requesterId)
      .single();

    // Create notification for addressee
    await supabase
      .from('notifications')
      .insert({
        user_id: addresseeId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${requester?.name || 'Someone'} sent you a friend request`,
        is_read: false,
        metadata: { friendship_id: newFriendship.id, requester_id: requesterId }
      });

    return { success: true, friendship: newFriendship };
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(friendshipId, userId) {
  try {
    // Verify user is the addressee
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !friendship) {
      throw new Error('Friend request not found or already processed');
    }

    const requesterId = friendship.requester_id;

    // Update friendship status
    const { data: updatedFriendship, error: updateError } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Get accepter name for notification
    const { data: accepter } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    // Create notification for requester
    await supabase
      .from('notifications')
      .insert({
        user_id: requesterId,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: `${accepter?.name || 'Someone'} accepted your friend request`,
        is_read: false
      });

    return { success: true, friendship: updatedFriendship };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(friendshipId, userId) {
  try {
    // Verify user is the addressee
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !friendship) {
      throw new Error('Friend request not found or already processed');
    }

    // Delete the friend request
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
}

/**
 * Remove a friend (unfriend)
 */
export async function removeFriend(friendshipId, userId) {
  try {
    // Verify user is part of the friendship
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('*')
      .eq('id', friendshipId)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .single();

    if (fetchError || !friendship) {
      throw new Error('Friendship not found');
    }

    // Delete friendship
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

/**
 * Get user's friends list
 */
export async function getFriends(userId) {
  try {
    // Get friendships where user is either requester or addressee
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        requester_id,
        addressee_id,
        requester:users!friendships_requester_id_fkey(id, name, email, avatar_url, student_id),
        addressee:users!friendships_addressee_id_fkey(id, name, email, avatar_url, student_id)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to return friend info
    const friends = friendships?.map(f => {
      const friend = f.requester_id === userId ? f.addressee : f.requester;
      return {
        friendship_id: f.id,
        friends_since: f.created_at,
        friend_id: friend.id,
        friend_name: friend.name,
        friend_email: friend.email,
        friend_avatar: friend.avatar_url,
        friend_identifier: friend.student_id
      };
    }) || [];

    return friends;
  } catch (error) {
    console.error('Error getting friends:', error);
    throw error;
  }
}

/**
 * Get pending friend requests (received)
 */
export async function getPendingRequests(userId) {
  try {
    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        requester:users!friendships_requester_id_fkey(id, name, email, avatar_url, student_id)
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data
    const pendingRequests = requests?.map(r => ({
      friendship_id: r.id,
      created_at: r.created_at,
      requester_id: r.requester.id,
      requester_name: r.requester.name,
      requester_email: r.requester.email,
      requester_avatar: r.requester.avatar_url,
      requester_identifier: r.requester.student_id
    })) || [];

    return pendingRequests;
  } catch (error) {
    console.error('Error getting pending requests:', error);
    throw error;
  }
}

/**
 * Get sent friend requests (pending)
 */
export async function getSentRequests(userId) {
  try {
    const { data: requests, error } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        addressee:users!friendships_addressee_id_fkey(id, name, email, avatar_url, student_id)
      `)
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data
    const sentRequests = requests?.map(r => ({
      friendship_id: r.id,
      created_at: r.created_at,
      addressee_id: r.addressee.id,
      addressee_name: r.addressee.name,
      addressee_email: r.addressee.email,
      addressee_avatar: r.addressee.avatar_url,
      addressee_identifier: r.addressee.student_id
    })) || [];

    return sentRequests;
  } catch (error) {
    console.error('Error getting sent requests:', error);
    throw error;
  }
}

/**
 * Search users (for adding friends)
 */
export async function searchUsers(searchTerm, currentUserId, limit = 20) {
  try {
    // First, get all users matching the search term (excluding current user)
    const { data: users, error: searchError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, student_id')
      .neq('id', currentUserId)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%`)
      .order('name')
      .limit(limit);

    if (searchError) throw searchError;

    if (!users || users.length === 0) {
      return [];
    }

    // Get friendship statuses for all found users
    const userIds = users.map(u => u.id);
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`and(requester_id.eq.${currentUserId},addressee_id.in.(${userIds.join(',')})),and(requester_id.in.(${userIds.join(',')}),addressee_id.eq.${currentUserId})`);

    // Create a map of friendship statuses
    const friendshipMap = {};
    friendships?.forEach(f => {
      const otherId = f.requester_id === currentUserId ? f.addressee_id : f.requester_id;
      if (f.status === 'accepted') {
        friendshipMap[otherId] = 'friends';
      } else if (f.status === 'pending') {
        friendshipMap[otherId] = f.requester_id === currentUserId ? 'request_sent' : 'request_received';
      }
    });

    // Add friendship status to each user
    const usersWithStatus = users.map(u => ({
      ...u,
      friendship_status: friendshipMap[u.id] || 'none'
    }));

    return usersWithStatus;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Get friendship status between two users
 */
export async function getFriendshipStatus(userId1, userId2) {
  try {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status, requester_id, addressee_id')
      .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`)
      .single();

    if (!friendship) {
      return { status: 'none' };
    }

    if (friendship.status === 'accepted') {
      return { status: 'friends' };
    } else if (friendship.status === 'pending') {
      if (friendship.requester_id === userId1) {
        return { status: 'request_sent' };
      } else {
        return { status: 'request_received' };
      }
    }

    return { status: friendship.status };
  } catch (error) {
    console.error('Error getting friendship status:', error);
    throw error;
  }
}
