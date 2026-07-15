import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Users } from 'lucide-react';
import type { Friend, FriendRequest, FriendUser } from '../../types/profile';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5005';

export default function FriendsPanel() {
  const { getToken } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [friendActionMessage, setFriendActionMessage] = useState('');

  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = await getToken();

      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });
    },
    [getToken],
  );

  const loadFriends = useCallback(async () => {
    try {
      setIsFriendsLoading(true);
      setFriendActionMessage('');

      const [friendsResponse, requestsResponse] = await Promise.all([
        authFetch('/api/friends'),
        authFetch('/api/friends/requests'),
      ]);

      if (!friendsResponse.ok || !requestsResponse.ok) {
        throw new Error('Failed to load friends.');
      }

      const friendsData = await friendsResponse.json();
      const requestsData = await requestsResponse.json();

      setFriends(friendsData.friends ?? []);
      setFriendRequests(requestsData.requests ?? []);
    } catch (err) {
      console.error(err);
      setFriendActionMessage('Unable to load friends.');
    } finally {
      setIsFriendsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void loadFriends();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [loadFriends]);

  const handleSearchFriends = async (event: React.SyntheticEvent) => {
    event.preventDefault();

    const query = friendSearch.trim();

    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      setIsFriendsLoading(true);
      setFriendActionMessage('');

      const response = await authFetch(
        `/api/friends/search?username=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error('Failed to search users.');
      }

      const data = await response.json();
      setSearchResults(data.users ?? []);
    } catch (err) {
      console.error(err);
      setFriendActionMessage('Unable to search agents.');
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const handleSendFriendRequest = async (recipientId: string) => {
    try {
      setFriendActionMessage('');

      const response = await authFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ recipientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFriendActionMessage(data.error || 'Unable to send friend request.');
        return;
      }

      setFriendActionMessage('Friend request sent.');
      setSearchResults((current) =>
        current.filter((userResult) => userResult.id !== recipientId),
      );
    } catch (err) {
      console.error(err);
      setFriendActionMessage('Unable to send friend request.');
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      setFriendActionMessage('');

      const response = await authFetch('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendshipId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFriendActionMessage(data.error || 'Unable to accept request.');
        return;
      }

      setFriendActionMessage('Friend request accepted.');
      await loadFriends();
    } catch (err) {
      console.error(err);
      setFriendActionMessage('Unable to accept request.');
    }
  };

  const handleDeclineFriendRequest = async (friendshipId: string) => {
    try {
      setFriendActionMessage('');

      const response = await authFetch('/api/friends/decline', {
        method: 'POST',
        body: JSON.stringify({ friendshipId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFriendActionMessage(data.error || 'Unable to decline request.');
        return;
      }

      setFriendActionMessage('Friend request declined.');
      await loadFriends();
    } catch (err) {
      console.error(err);
      setFriendActionMessage('Unable to decline request.');
    }
  };

  return (
    <section className="space-y-6">
      <div className="p-6 rounded-2xl bg-[#11151C]/90 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <Users className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-black uppercase tracking-widest">
            Friends
          </h2>
        </div>

        <form onSubmit={handleSearchFriends} className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={friendSearch}
            onChange={(event) => setFriendSearch(event.target.value)}
            placeholder="Search agent username..."
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
          />

          <button
            type="submit"
            disabled={isFriendsLoading}
            className="px-6 py-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            {isFriendsLoading ? 'Loading...' : 'Search'}
          </button>

          <button
            type="button"
            onClick={() => {
              void loadFriends();
            }}
            disabled={isFriendsLoading}
            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-black uppercase tracking-widest disabled:opacity-50"
          >
            Refresh
          </button>
        </form>

        {friendActionMessage && (
          <p className="mt-4 text-sm text-cyan-300 font-bold">
            {friendActionMessage}
          </p>
        )}

        {searchResults.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
              Search Results
            </p>

            {searchResults.map((result) => (
              <div
                key={result.id}
                className="p-4 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-slate-200">
                    {result.username}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {result.stats.matchesPlayed} matches played
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendFriendRequest(result.id)}
                  className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-[10px] font-black uppercase tracking-widest"
                >
                  Add Friend
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-[#11151C]/90 border border-white/10 shadow-xl">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-4">
          Incoming Requests
        </h3>

        {friendRequests.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No pending friend requests.
          </p>
        ) : (
          <div className="space-y-3">
            {friendRequests.map((request) => (
              <div
                key={request.friendshipId}
                className="p-4 rounded-xl bg-black/30 border border-white/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-slate-200">
                    {request.requester.username}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {request.requester.stats.matchesPlayed} matches played
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptFriendRequest(request.friendshipId)}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest"
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeclineFriendRequest(request.friendshipId)}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-widest"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 rounded-2xl bg-[#11151C]/90 border border-white/10 shadow-xl">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 mb-4">
          Friend List
        </h3>

        {friends.length === 0 ? (
          <p className="text-slate-500 text-sm">
            No friends added yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <div
                key={friend.friendshipId}
                className="p-4 rounded-xl bg-black/30 border border-white/5"
              >
                <p className="text-sm font-black uppercase tracking-widest text-slate-200">
                  {friend.username}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500 uppercase tracking-widest font-bold">
                      Matches
                    </p>
                    <p className="text-cyan-300 font-black">
                      {friend.stats.matchesPlayed}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500 uppercase tracking-widest font-bold">
                      Wins
                    </p>
                    <p className="text-emerald-300 font-black">
                      {friend.stats.winsAsGood + friend.stats.winsAsEvil}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}