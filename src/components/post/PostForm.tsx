import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { createPost } from '../../store/slices/postSlice';

interface PostFormProps {
  onSuccess?: () => void;
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 4px;
  resize: vertical;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const MediaPreview = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PreviewImage = styled.div<{ url: string }>`
  width: 100px;
  height: 100px;
  border-radius: 4px;
  background-image: url(${props => props.url});
  background-size: cover;
  background-position: center;
  position: relative;
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Controls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const MediaInput = styled.input`
  display: none;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.primary};
  
  &:hover {
    color: ${props => props.theme.colors.primaryDark};
  }
`;

const SubmitButton = styled.button<{ disabled: boolean }>`
  padding: 0.75rem 1.5rem;
  background-color: ${props => 
    props.disabled ? props.theme.colors.disabled : props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.primaryDark};
  }
`;

const CharacterCount = styled.span<{ isNearLimit: boolean }>`
  color: ${props => props.isNearLimit ? props.theme.colors.warning : props.theme.colors.text};
  font-size: 0.875rem;
`;

export const PostForm: React.FC<PostFormProps> = ({ onSuccess }) => {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  const MAX_CONTENT_LENGTH = 280;
  const MAX_MEDIA_FILES = 4;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CONTENT_LENGTH) {
      setContent(text);
    }
  };

  const handleMediaSelect = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (mediaFiles.length + files.length > MAX_MEDIA_FILES) {
      alert(`You can only upload up to ${MAX_MEDIA_FILES} files`);
      return;
    }

    setMediaFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const url = URL.createObjectURL(file);
      setMediaUrls(prev => [...prev, url]);
    });
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(mediaUrls[index]);
    setMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      mediaFiles.forEach(file => formData.append('media', file));
      if (isDraft) formData.append('isDraft', 'true');
      if (scheduledFor) formData.append('scheduledFor', scheduledFor);

      await dispatch(createPost(formData));
      setContent('');
      setMediaFiles([]);
      setMediaUrls([]);
      setIsDraft(false);
      setScheduledFor('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const charactersLeft = MAX_CONTENT_LENGTH - content.length;
  const isNearLimit = charactersLeft <= 20;
  const canSubmit = (content.trim() || mediaFiles.length > 0) && !isSubmitting;

  return (
    <Form onSubmit={handleSubmit}>
      <TextArea
        value={content}
        onChange={handleContentChange}
        placeholder="What's happening?"
        disabled={isSubmitting}
      />

      {mediaUrls.length > 0 && (
        <MediaPreview>
          {mediaUrls.map((url, index) => (
            <PreviewImage key={url} url={url}>
              <RemoveButton
                onClick={() => removeMedia(index)}
                type="button"
                aria-label="Remove media"
              >
                ×
              </RemoveButton>
            </PreviewImage>
          ))}
        </MediaPreview>
      )}

      <Controls>
        <div>
          <IconButton
            type="button"
            onClick={handleMediaSelect}
            disabled={isSubmitting || mediaFiles.length >= MAX_MEDIA_FILES}
            aria-label="Add media"
          >
            📷
          </IconButton>
          <MediaInput
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleMediaChange}
          />
          <IconButton
            type="button"
            onClick={() => setIsDraft(!isDraft)}
            disabled={isSubmitting}
            aria-label={isDraft ? 'Convert to post' : 'Save as draft'}
          >
            {isDraft ? '📝' : '💾'}
          </IconButton>
          <IconButton
            type="button"
            onClick={() => setScheduledFor(scheduledFor ? '' : new Date().toISOString())}
            disabled={isSubmitting}
            aria-label="Schedule post"
          >
            ⏰
          </IconButton>
        </div>

        <div>
          <CharacterCount isNearLimit={isNearLimit}>
            {charactersLeft} characters left
          </CharacterCount>
          <SubmitButton type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Posting...' : isDraft ? 'Save Draft' : 'Post'}
          </SubmitButton>
        </div>
      </Controls>

      {scheduledFor && (
        <input
          type="datetime-local"
          value={scheduledFor.slice(0, 16)}
          onChange={e => setScheduledFor(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
      )}
    </Form>
  );
};
