import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

interface CookieConsentProps {
  onAccept: (preferences: CookiePreferences) => void;
  onDecline: () => void;
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const slideUp = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const Container = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: ${props => props.theme.colors.background};
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: 1.5rem;
  z-index: ${props => props.theme.zIndices.toast};
  animation: ${slideUp} 0.3s ease-out;
  box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h3`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1rem;
  font-size: ${props => props.theme.typography.fontSize.xl};
`;

const Text = styled.p`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1.5rem;
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
`;

const PreferencesSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const PreferenceItem = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.radii.md};
`;

const PreferenceTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

const PreferenceDescription = styled.p`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  margin-bottom: 0.5rem;
`;

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: ${props => props.theme.colors.primary};
  }

  &:checked + span:before {
    transform: translateX(24px);
  }

  &:disabled + span {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SwitchSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${props => props.theme.colors.border};
  transition: 0.4s;
  border-radius: 34px;

  &:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border-radius: ${props => props.theme.radii.md};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;

  ${props => props.variant === 'primary' ? `
    background-color: ${props.theme.colors.primary};
    color: white;
    border: none;

    &:hover {
      background-color: ${props.theme.colors.primaryDark};
    }
  ` : `
    background-color: transparent;
    color: ${props.theme.colors.text};
    border: 1px solid ${props.theme.colors.border};

    &:hover {
      background-color: ${props.theme.colors.backgroundHover};
    }
  `}
`;

export const CookieConsent: React.FC<CookieConsentProps> = ({
  onAccept,
  onDecline,
}) => {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false,
  });

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot toggle necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAcceptAll = () => {
    const allEnabled = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    setPreferences(allEnabled);
    onAccept(allEnabled);
  };

  const handleAcceptSelected = () => {
    onAccept(preferences);
  };

  return (
    <Container>
      <Content>
        <Title>Cookie Preferences</Title>
        <Text>
          We use cookies to enhance your browsing experience, serve personalized
          ads or content, and analyze our traffic. By clicking "Accept All", you
          consent to our use of cookies.
        </Text>

        <PreferencesSection>
          <PreferenceItem>
            <PreferenceTitle>
              Necessary
              <Switch>
                <SwitchInput
                  type="checkbox"
                  checked={preferences.necessary}
                  disabled
                />
                <SwitchSlider />
              </Switch>
            </PreferenceTitle>
            <PreferenceDescription>
              Required for the website to function properly. Cannot be disabled.
            </PreferenceDescription>
          </PreferenceItem>

          <PreferenceItem>
            <PreferenceTitle>
              Analytics
              <Switch>
                <SwitchInput
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={() => handleToggle('analytics')}
                />
                <SwitchSlider />
              </Switch>
            </PreferenceTitle>
            <PreferenceDescription>
              Help us understand how visitors interact with our website.
            </PreferenceDescription>
          </PreferenceItem>

          <PreferenceItem>
            <PreferenceTitle>
              Marketing
              <Switch>
                <SwitchInput
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={() => handleToggle('marketing')}
                />
                <SwitchSlider />
              </Switch>
            </PreferenceTitle>
            <PreferenceDescription>
              Used to deliver personalized advertisements.
            </PreferenceDescription>
          </PreferenceItem>

          <PreferenceItem>
            <PreferenceTitle>
              Preferences
              <Switch>
                <SwitchInput
                  type="checkbox"
                  checked={preferences.preferences}
                  onChange={() => handleToggle('preferences')}
                />
                <SwitchSlider />
              </Switch>
            </PreferenceTitle>
            <PreferenceDescription>
              Remember your settings and preferences.
            </PreferenceDescription>
          </PreferenceItem>
        </PreferencesSection>

        <ButtonGroup>
          <Button onClick={onDecline}>
            Decline All
          </Button>
          <Button onClick={handleAcceptSelected}>
            Accept Selected
          </Button>
          <Button variant="primary" onClick={handleAcceptAll}>
            Accept All
          </Button>
        </ButtonGroup>
      </Content>
    </Container>
  );
};
