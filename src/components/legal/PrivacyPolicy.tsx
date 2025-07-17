import React, { useState } from 'react';
import styled from 'styled-components';
import { DataPrivacyService } from '../../services/dataPrivacyService';

interface PrivacyPolicyProps {
  userId: number;
  currentVersion: string;
  onAccept: () => void;
}

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1.5rem;
`;

const Subtitle = styled.h2`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1rem;
  font-size: ${props => props.theme.typography.fontSize['2xl']};
`;

const Text = styled.p`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1rem;
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
`;

const List = styled.ul`
  margin-bottom: 1rem;
  padding-left: 1.5rem;
`;

const ListItem = styled.li`
  color: ${props => props.theme.colors.text};
  margin-bottom: 0.5rem;
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
`;

const ConsentSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.radii.lg};
`;

const ConsentOption = styled.div`
  margin-bottom: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
`;

const Checkbox = styled.input`
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
`;

const AcceptButton = styled.button<{ disabled: boolean }>`
  width: 100%;
  padding: 1rem;
  background-color: ${props => 
    props.disabled ? props.theme.colors.disabled : props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.radii.md};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const VersionInfo = styled.div`
  margin-top: 1rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  text-align: center;
`;

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  userId,
  currentVersion,
  onAccept,
}) => {
  const [consents, setConsents] = useState({
    marketing: false,
    analytics: false,
    thirdParty: false,
    policyAccepted: false,
  });

  const handleConsentChange = (field: keyof typeof consents) => {
    setConsents(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleAccept = async () => {
    try {
      // Update user consents
      await DataPrivacyService.updateUserConsent(userId, {
        marketing: consents.marketing,
        analytics: consents.analytics,
        thirdParty: consents.thirdParty,
      });

      // Update privacy policy acceptance
      await DataPrivacyService.updatePrivacyPolicyConsent(userId, currentVersion);

      // Log the acceptance
      await DataPrivacyService.logDataProcessing(userId, 'privacy_policy_accepted', {
        version: currentVersion,
        consents,
        timestamp: new Date(),
      });

      onAccept();
    } catch (error) {
      console.error('Failed to update privacy preferences:', error);
    }
  };

  return (
    <Container>
      <Title>Privacy Policy</Title>

      <Section>
        <Subtitle>1. Data Collection and Use</Subtitle>
        <Text>
          We collect and process your personal data to provide and improve our services.
          This includes:
        </Text>
        <List>
          <ListItem>Account information (username, email)</ListItem>
          <ListItem>Profile information (bio, profile picture)</ListItem>
          <ListItem>Content you create (posts, comments)</ListItem>
          <ListItem>Usage data (interactions, preferences)</ListItem>
        </List>
      </Section>

      <Section>
        <Subtitle>2. Your Rights</Subtitle>
        <Text>
          Under GDPR and CCPA, you have the following rights:
        </Text>
        <List>
          <ListItem>Right to access your personal data</ListItem>
          <ListItem>Right to rectification of incorrect data</ListItem>
          <ListItem>Right to erasure ("right to be forgotten")</ListItem>
          <ListItem>Right to restrict processing</ListItem>
          <ListItem>Right to data portability</ListItem>
          <ListItem>Right to object to processing</ListItem>
        </List>
      </Section>

      <Section>
        <Subtitle>3. Data Sharing</Subtitle>
        <Text>
          We may share your data with:
        </Text>
        <List>
          <ListItem>Service providers who assist in our operations</ListItem>
          <ListItem>Law enforcement when required by law</ListItem>
          <ListItem>Other users according to your privacy settings</ListItem>
        </List>
      </Section>

      <ConsentSection>
        <Subtitle>Your Privacy Choices</Subtitle>
        
        <ConsentOption>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={consents.marketing}
              onChange={() => handleConsentChange('marketing')}
            />
            I agree to receive marketing communications
          </CheckboxLabel>
        </ConsentOption>

        <ConsentOption>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={consents.analytics}
              onChange={() => handleConsentChange('analytics')}
            />
            I agree to the use of analytics cookies
          </CheckboxLabel>
        </ConsentOption>

        <ConsentOption>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={consents.thirdParty}
              onChange={() => handleConsentChange('thirdParty')}
            />
            I agree to third-party data sharing
          </CheckboxLabel>
        </ConsentOption>

        <ConsentOption>
          <CheckboxLabel>
            <Checkbox
              type="checkbox"
              checked={consents.policyAccepted}
              onChange={() => handleConsentChange('policyAccepted')}
            />
            I have read and accept the Privacy Policy
          </CheckboxLabel>
        </ConsentOption>

        <AcceptButton
          onClick={handleAccept}
          disabled={!consents.policyAccepted}
        >
          Accept Privacy Policy
        </AcceptButton>

        <VersionInfo>
          Privacy Policy Version: {currentVersion}
        </VersionInfo>
      </ConsentSection>
    </Container>
  );
};
