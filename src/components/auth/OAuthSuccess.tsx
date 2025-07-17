import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from '../../store/slices/authSlice';

export const OAuthSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      // Store tokens and update auth state
      dispatch(login({ accessToken, refreshToken }));
      
      // Redirect to home page
      navigate('/', { replace: true });
    } else {
      // Handle error case
      navigate('/login', {
        replace: true,
        state: { error: 'Authentication failed' },
      });
    }
  }, [searchParams, navigate, dispatch]);

  return (
    <div>
      <p>Completing authentication...</p>
    </div>
  );
};
