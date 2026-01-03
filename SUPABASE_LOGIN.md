# Supabase Login Code Examples

## Frontend Login Implementation

### 1. Basic Email/Password Login

```javascript
import { supabase } from './services/supabaseClient';

// Login function
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password: password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
    token: data.session.access_token,
  };
};

// Usage
try {
  const result = await login('user@example.com', 'password123');
  console.log('Logged in:', result.user);
  localStorage.setItem('token', result.token);
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### 2. Sign Up (Registration)

```javascript
export const signup = async (email, password, fullName, phone) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password: password,
    options: {
      data: {
        full_name: fullName,
        phone: phone,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
  };
};

// Usage
try {
  const result = await signup(
    'user@example.com',
    'password123',
    'John Doe',
    '+1234567890'
  );
  console.log('Signed up:', result.user);
} catch (error) {
  console.error('Signup failed:', error.message);
}
```

### 3. Google OAuth Login

```javascript
export const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Usage
const handleGoogleLogin = async () => {
  try {
    await loginWithGoogle();
    // User will be redirected to Google, then back to /auth/callback
  } catch (error) {
    console.error('Google login failed:', error.message);
  }
};
```

### 4. Handle Auth Callback (OAuth)

```javascript
// In your callback page (e.g., /auth/callback)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './services/supabaseClient';

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth error:', error);
        navigate('/login?error=auth_failed');
        return;
      }

      if (data.session) {
        // Store token
        localStorage.setItem('token', data.session.access_token);
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <div>Authenticating...</div>;
};
```

### 5. Logout

```javascript
export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }

  // Clear local storage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  return true;
};

// Usage
const handleLogout = async () => {
  try {
    await logout();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error.message);
  }
};
```

### 6. Check Current Session

```javascript
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return session;
};

// Usage
const checkAuth = async () => {
  try {
    const session = await getCurrentSession();
    if (session) {
      console.log('User is logged in:', session.user);
    } else {
      console.log('No active session');
    }
  } catch (error) {
    console.error('Auth check failed:', error.message);
  }
};
```

### 7. Listen to Auth State Changes

```javascript
import { useEffect, useState } from 'react';
import { supabase } from './services/supabaseClient';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};

// Usage in component
const MyComponent = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.email}!</div>;
};
```

### 8. Reset Password

```javascript
// Request password reset
export const requestPasswordReset = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    email.toLowerCase().trim(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Update password (after clicking reset link)
export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
```

## Admin Login Implementation

### Admin Login with Supabase

```javascript
import { supabase } from './services/supabaseClient';
import apiClient from './services/apiClient';

export const adminLogin = async (email, password) => {
  // Step 1: Authenticate with Supabase
  const { data: supabaseData, error: supabaseError } =
    await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password,
    });

  if (supabaseError) {
    throw new Error(supabaseError.message);
  }

  if (!supabaseData.user) {
    throw new Error('Authentication failed');
  }

  // Step 2: Verify admin status
  try {
    const adminCheck = await apiClient('/admin/auth/me', {
      token: supabaseData.session.access_token,
    });

    if (!adminCheck || !adminCheck.admin) {
      await supabase.auth.signOut();
      throw new Error('Not authorized as admin');
    }

    return {
      admin: adminCheck.admin,
      token: supabaseData.session.access_token,
      type: 'supabase',
    };
  } catch (error) {
    await supabase.auth.signOut();
    throw new Error(error.message || 'Not authorized as admin');
  }
};
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Client Setup

```javascript
// services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

