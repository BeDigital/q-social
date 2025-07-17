import React, { useState } from 'react';
import styled from 'styled-components';
import { DataPrivacyService } from '../../services/dataPrivacyService';
import { Button } from '../common/Button/Button';
import { LoadingSpinner } from '../common/LoadingSpinner/LoadingSpinner';

interface DataExportProps {
  userId: number;
}

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1.5rem;
`;

const Section = styled.section`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: ${props => props.theme.colors.backgroundAlt};
  border-radius: ${props => props.theme.radii.lg};
`;

const Text = styled.p`
  color: ${props => props.theme.colors.text};
  margin-bottom: 1rem;
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 4px;
  background-color: ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.radii.full};
  margin: 1rem 0;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => props.progress}%;
    height: 100%;
    background-color: ${props => props.theme.colors.primary};
    transition: width 0.3s ease;
  }
`;

const Status = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textLight};
  margin-top: 0.5rem;
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  margin-top: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.error}10;
  border-radius: ${props => props.theme.radii.md};
`;

export const DataExport: React.FC<DataExportProps> = ({ userId }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportedData, setExportedData] = useState<any>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Export user data
      const data = await DataPrivacyService.exportUserData(userId);

      clearInterval(progressInterval);
      setProgress(100);
      setExportedData(data);

      // Log the export
      await DataPrivacyService.logDataProcessing(userId, 'data_export', {
        timestamp: new Date(),
        success: true,
      });

      // Prepare download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user_data_export_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
      await DataPrivacyService.logDataProcessing(userId, 'data_export', {
        timestamp: new Date(),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )) {
      return;
    }

    try {
      setIsExporting(true);
      setError(null);
      setProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Delete user data
      await DataPrivacyService.deleteUserData(userId);

      clearInterval(progressInterval);
      setProgress(100);

      // Log the deletion
      await DataPrivacyService.logDataProcessing(userId, 'account_deletion', {
        timestamp: new Date(),
        success: true,
      });

      // Redirect to logout
      window.location.href = '/logout';

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      await DataPrivacyService.logDataProcessing(userId, 'account_deletion', {
        timestamp: new Date(),
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Container>
      <Title>Data Privacy Controls</Title>

      <Section>
        <Text>
          You can export all your personal data in a machine-readable format.
          This includes your profile information, posts, comments, and other data
          associated with your account.
        </Text>

        {isExporting && (
          <>
            <ProgressBar progress={progress} />
            <Status>Exporting data... {progress}%</Status>
          </>
        )}

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            leftIcon={isExporting ? <LoadingSpinner size="sm" /> : undefined}
          >
            {isExporting ? 'Exporting...' : 'Export My Data'}
          </Button>
        </ButtonGroup>
      </Section>

      <Section>
        <Text>
          You have the right to be forgotten. You can delete your account and all
          associated data. This action cannot be undone.
        </Text>

        <ButtonGroup>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isExporting}
          >
            Delete My Account
          </Button>
        </ButtonGroup>
      </Section>
    </Container>
  );
};
