import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useGameContext } from '../../context/GameContext';

function JoinScreen() {
  const { socket, connected } = useSocket();
  const { profile, roomCode, room, setProfile, setRoomCode, updateRoomState } = useGameContext();
  
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('preferNot');
  const [lastRoom, setLastRoom] = useState<string | null>(null);
  const [step, setStep] = useState<'room' | 'login' | 'profile' | 'existing'>('room');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomValid, setRoomValid] = useState<boolean | null>(null);
  const [useGmail, setUseGmail] = useState<boolean | null>(null);
  const [searchUsername, setSearchUsername] = useState('');
  const [matchingProfiles, setMatchingProfiles] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get('oauth');
    const profileData = urlParams.get('profile');
    const oauthError = urlParams.get('error');
    
    if (oauthSuccess === 'success' && profileData) {
      try {
        // OAuth successful - profile data passed via URL
        const parsedProfile = JSON.parse(decodeURIComponent(profileData));
        setProfile(parsedProfile);
        localStorage.setItem('profile', JSON.stringify(parsedProfile));
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        // If they have a last room, auto-rejoin
        const savedLastRoom = localStorage.getItem('lastRoom');
        if (savedLastRoom && socket && connected) {
          handleRejoin(savedLastRoom, parsedProfile.id);
        } else {
          setStep('room');
        }
      } catch (e) {
        setError('Failed to process Gmail login. Please try again.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (oauthError) {
      setError('Gmail login failed. Please try again or continue without email.');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [socket, connected, setProfile]);

  // Load last room from localStorage
  useEffect(() => {
    const savedLastRoom = localStorage.getItem('lastRoom');
    const savedProfile = localStorage.getItem('profile');
    
    if (savedLastRoom) {
      setLastRoom(savedLastRoom);
    }
    
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
        // Auto-rejoin if profile exists
        if (savedLastRoom && socket && connected) {
          handleRejoin(savedLastRoom, parsedProfile.id);
        }
      } catch (e) {
        // Invalid profile data
      }
    }
  }, [socket, connected, setProfile]);

  // Listen for room updates
  useEffect(() => {
    if (!socket) return;

    socket.on('room_update', (roomData: any) => {
      updateRoomState(roomData);
    });

    return () => {
      socket.off('room_update');
    };
  }, [socket, updateRoomState]);

  const handleRejoin = (roomCode: string, profileId: string) => {
    if (!socket) return;
    
    setLoading(true);
    setError(null);
    
    socket.emit('reconnect', { roomCode, profileId }, (response: any) => {
      setLoading(false);
      if (response.success) {
        setRoomCode(roomCode);
        setProfile(response.player);
        updateRoomState(response.room);
      } else {
        // If profile not found, clear stored profile and show login
        if (response.error === 'Profile not found' || response.error?.includes('Profile not found')) {
          localStorage.removeItem('profile');
          localStorage.removeItem('lastRoom');
          setProfile(null);
          setStep('room');
          setError('Your session expired. Please log in again.');
        } else {
          setError(response.error || 'Failed to rejoin room');
        }
      }
    });
  };

  const validateRoom = () => {
    if (!socket || !roomCodeInput) return;
    
    setLoading(true);
    setError(null);
    
    socket.emit('validate_room', { roomCode: roomCodeInput.toUpperCase() }, (response: any) => {
      setLoading(false);
      if (response.success) {
        setRoomValid(response.exists);
        if (response.exists) {
          // If user already has a profile (logged in), join room directly
          if (profile && profile.id) {
            handleJoinRoom(profile.id);
          } else {
            // Otherwise, show login options
            setStep('login');
          }
        } else {
          setError('Room does not exist');
        }
      } else {
        setError(response.error || 'Failed to validate room');
        setRoomValid(false);
      }
    });
  };

  const handleCreateProfile = () => {
    if (!socket || !username || !name || !birthday || !gender) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    socket.emit('create_profile', {
      username,
      name,
      birthday,
      gender
    }, (response: any) => {
      if (response.success) {
        setProfile(response.profile);
        localStorage.setItem('profile', JSON.stringify(response.profile));
        handleJoinRoom(response.profile.id);
      } else {
        setLoading(false);
        setError(response.error || 'Failed to create profile');
      }
    });
  };

  const handleSearchProfiles = () => {
    if (!socket || !searchUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    setSearching(true);
    setError(null);
    setMatchingProfiles([]);

    socket.emit('search_profiles', { username: searchUsername.trim() }, (response: any) => {
      setSearching(false);
      if (response.success) {
        setMatchingProfiles(response.profiles || []);
        if (response.profiles.length === 0) {
          setError(`No profiles found with username "${searchUsername}". Create a new profile or try a different username.`);
        }
      } else {
        setError(response.error || 'Failed to search profiles');
      }
    });
  };

  const handleSelectProfile = (selectedProfile: any) => {
    // Get the full profile by ID and join the room
    setLoading(true);
    setError(null);
    
    // The search result has the profile ID, use it to join
    // The server will return the full player object when joining
    handleJoinRoom(selectedProfile.id);
  };

  const handleJoinRoom = (profileId: string) => {
    if (!socket || !roomCodeInput) return;

    socket.emit('join_room', {
      roomCode: roomCodeInput.toUpperCase(),
      profileId
    }, (response: any) => {
      setLoading(false);
      if (response.success) {
        setRoomCode(response.roomCode);
        setProfile(response.player);
        updateRoomState(response.room);
        localStorage.setItem('lastRoom', response.roomCode);
        // TODO: Navigate to game screen
      } else {
        // If profile not found, clear stored profile and show login
        if (response.error === 'Profile not found') {
          localStorage.removeItem('profile');
          setProfile(null);
          setStep('login');
          setError('Your session expired. Please log in again.');
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    });
  };

  const handleRoomCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.length === 6) {
      validateRoom();
    } else {
      setError('Room code must be 6 characters (4 letters + 2 numbers)');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateProfile();
  };

  if (!connected) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Connecting...</h1>
      </div>
    );
  }

  if (profile && roomCode) {
    // Check if current user is the host
    const currentPlayer = room?.players?.find((p: any) => p.profileId === profile.id);
    const isHost = currentPlayer?.isHost || (profile as any).isHost;
    
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Joined Room: {roomCode}</h1>
        <p>Welcome, {profile.name}!</p>
        {isHost && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            color: '#856404'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>
              🎮 You are the Host
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem' }}>
              You can start the game when ready
            </p>
          </div>
        )}
        {/* TODO: Navigate to game screen */}
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '500px', 
      margin: '0 auto',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Join PartyPort</h1>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          color: '#c00', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {step === 'login' && (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>How would you like to sign in?</h2>
          
          <button
            onClick={() => {
              // Redirect to Gmail OAuth (full URL for cross-origin)
              const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
              window.location.href = `${serverUrl}/auth/google`;
            }}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Login with Gmail
          </button>

          <button
            onClick={() => {
              setStep('existing');
              setError(null);
            }}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '15px'
            }}
          >
            Use existing profile
          </button>

          <button
            onClick={() => {
              setUseGmail(false);
              setStep('profile');
            }}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            Create new profile
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('room');
              setError(null);
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Back
          </button>
        </div>
      )}

      {step === 'existing' && (
        <div>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Find Your Profile</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Enter Username
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => {
                  setSearchUsername(e.target.value);
                  setError(null);
                  setMatchingProfiles([]);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchProfiles();
                  }
                }}
                placeholder="Type username..."
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '1rem',
                  border: '2px solid #ccc',
                  borderRadius: '8px'
                }}
                disabled={searching}
              />
              <button
                type="button"
                onClick={handleSearchProfiles}
                disabled={searching || !searchUsername.trim()}
                style={{
                  padding: '12px 20px',
                  fontSize: '1rem',
                  backgroundColor: searching || !searchUsername.trim() ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: searching || !searchUsername.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {matchingProfiles.length === 0 && !searching && searchUsername && !error && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#666',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0 }}>No profiles found. Profiles are created when users sign up.</p>
              <p style={{ margin: '10px 0 0 0' }}>If the server was restarted, profiles may have been cleared.</p>
            </div>
          )}

          {matchingProfiles.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px', fontSize: '1rem', color: '#666' }}>
                Found {matchingProfiles.length} profile{matchingProfiles.length > 1 ? 's' : ''}:
              </h3>
              {matchingProfiles.map((profileMatch) => (
                <div
                  key={profileMatch.id}
                  onClick={() => handleSelectProfile(profileMatch)}
                  style={{
                    padding: '15px',
                    marginBottom: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #dee2e6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e9ecef';
                    e.currentTarget.style.borderColor = '#007bff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#dee2e6';
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                    {profileMatch.username}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Name: {profileMatch.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Birthday: {profileMatch.birthday}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setStep('login');
              setError(null);
              setSearchUsername('');
              setMatchingProfiles([]);
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Back to Login Options
          </button>
        </div>
      )}

      {step === 'room' && (
        <form onSubmit={handleRoomCodeSubmit}>
          {profile && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Logged in as:</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#2e7d32' }}>
                {profile.name || profile.username}
                {profile.email && ` (${profile.email})`}
              </p>
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Enter Room Code
            </label>
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (value.length <= 6) {
                  setRoomCodeInput(value);
                  setError(null);
                  setRoomValid(null);
                }
              }}
              placeholder="ABCD42"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1.5rem',
                textAlign: 'center',
                letterSpacing: '4px',
                border: '2px solid #ccc',
                borderRadius: '8px',
                textTransform: 'uppercase'
              }}
              disabled={loading}
            />
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px', textAlign: 'center' }}>
              4 letters + 2 numbers
            </p>
          </div>

          {lastRoom && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              cursor: 'pointer'
            }} onClick={() => {
              setRoomCodeInput(lastRoom);
              validateRoom();
            }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Last room:</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>{lastRoom}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || roomCodeInput.length !== 6}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem',
              backgroundColor: loading || roomCodeInput.length !== 6 ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || roomCodeInput.length !== 6 ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Validating...' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'profile' && (
        <form onSubmit={handleProfileSubmit}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Create Profile</h2>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ccc',
                borderRadius: '6px'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ccc',
                borderRadius: '6px'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Birthday (YYYY-MM-DD) *
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => {
                const selectedDate = e.target.value;
                const today = new Date().toISOString().split('T')[0];
                if (selectedDate <= today) {
                  setBirthday(selectedDate);
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              required
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ccc',
                borderRadius: '6px'
              }}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Gender
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                border: '2px solid #ccc',
                borderRadius: '6px'
              }}
              disabled={loading}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="preferNot">Prefer not to say</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !name || !birthday}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '1.1rem',
              backgroundColor: loading || !username || !name || !birthday ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !username || !name || !birthday ? 'not-allowed' : 'pointer',
              marginBottom: '10px'
            }}
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep('room');
              setError(null);
            }}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '0.9rem',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ccc',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            disabled={loading}
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}

export default JoinScreen;

