import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { ApiError, apiClient } from '../../api/client';
import { PhotoItem } from '../../api/types';
import { ownerNavItems } from './ownerNav';

const MAX_PHOTOS = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type UploadStatus = 'waiting' | 'uploading' | 'done' | 'failed';

interface UploadItem {
  id: string;
  name: string;
  status: UploadStatus;
  error?: string;
}

const smallButton: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 'var(--step-small)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  backgroundColor: 'var(--card)',
  cursor: 'pointer',
};

export const OwnerPhotosPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await apiClient<PhotoItem[]>('/owner/garage/photos');
      setPhotos([...res].sort((a, b) => a.display_order - b.display_order));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        navigate('/owner/registration', { replace: true });
        return;
      }
      setNotice(err instanceof Error ? err.message : 'Could not load your photos.');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const slotsLeft = MAX_PHOTOS - photos.length;

  const patchUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0 || isUploading) return;

    setNotice(null);
    const batch = Date.now();
    const queue: Array<{ item: UploadItem; file: File | null }> = [];
    let accepted = 0;

    files.forEach((file, index) => {
      const item: UploadItem = { id: `${batch}-${index}`, name: file.name, status: 'waiting' };
      if (!ALLOWED_TYPES.includes(file.type)) {
        queue.push({ item: { ...item, status: 'failed', error: 'Only JPEG, PNG or WebP images are allowed.' }, file: null });
      } else if (file.size > MAX_BYTES) {
        queue.push({ item: { ...item, status: 'failed', error: 'This photo is larger than 5 MB.' }, file: null });
      } else if (accepted >= slotsLeft) {
        queue.push({ item: { ...item, status: 'failed', error: `You can have at most ${MAX_PHOTOS} photos.` }, file: null });
      } else {
        accepted += 1;
        queue.push({ item, file });
      }
    });

    setUploads(queue.map((q) => q.item));
    if (accepted === 0) return;

    setIsUploading(true);
    for (const { item, file } of queue) {
      if (!file) continue;
      patchUpload(item.id, { status: 'uploading' });
      try {
        const form = new FormData();
        form.append('file', file);
        await apiClient<PhotoItem>('/owner/garage/photos', {
          method: 'POST',
          body: form,
        });
        patchUpload(item.id, { status: 'done' });
      } catch (err: unknown) {
        patchUpload(item.id, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed.',
        });
      }
    }
    setIsUploading(false);
    await loadPhotos();
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) uploadFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (slotsLeft > 0) uploadFiles(event.dataTransfer.files);
  };

  const applyOrder = async (next: PhotoItem[]) => {
    setIsReordering(true);
    setPhotos(next);
    try {
      await apiClient('/owner/garage/photos/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ ordered_photo_ids: next.map((p) => p.id) }),
      });
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Could not change the photo order.');
    } finally {
      setIsReordering(false);
      await loadPhotos();
    }
  };

  const movePhoto = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    applyOrder(next);
  };

  const makeCover = (index: number) => {
    const next = [...photos];
    const [chosen] = next.splice(index, 1);
    next.unshift(chosen);
    applyOrder(next);
  };

  const removePhoto = async (id: string) => {
    setConfirmRemoveId(null);
    setNotice(null);
    try {
      await apiClient(`/owner/garage/photos/${id}`, { method: 'DELETE' });
    } catch (err: unknown) {
      setNotice(err instanceof Error ? err.message : 'Could not remove the photo.');
    }
    await loadPhotos();
  };

  const statusText: Record<UploadStatus, string> = {
    waiting: 'Waiting',
    uploading: 'Uploading…',
    done: 'Uploaded',
    failed: 'Failed',
  };

  return (
    <AppShell
      title="Workshop Photos"
      navItems={ownerNavItems}
      actions={
        isLoading ? null : isEditing ? (
          <button
            type="button"
            disabled={isUploading || isReordering}
            onClick={() => {
              setIsEditing(false);
              setConfirmRemoveId(null);
              setUploads([]);
              setNotice(null);
            }}
            style={{ ...smallButton, padding: '6px 12px', fontWeight: 500, color: 'var(--on-dark)', backgroundColor: 'var(--ink)', borderColor: 'var(--ink)' }}
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            style={{ ...smallButton, padding: '6px 12px', fontWeight: 500, color: 'var(--on-dark)', backgroundColor: 'var(--ink)', borderColor: 'var(--ink)' }}
          >
            Edit photos
          </button>
        )
      }
    >
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '20px' }}>
          {isEditing
            ? 'Add photos of your workshop so customers know what to expect. The first photo is your cover and shows in search results. You can upload several at once. Changes apply as soon as you make them.'
            : 'These photos appear on your public listing. Click Edit photos to add, remove or reorder them.'}
        </p>

        {notice && (
          <div
            role="alert"
            style={{
              padding: '12px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger-ink)',
              fontSize: 'var(--step-small)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
            }}
          >
            {notice}
          </div>
        )}

        {isEditing && (
          <>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (slotsLeft > 0) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
            backgroundColor: isDragging ? 'var(--accent-light)' : 'var(--card)',
            borderRadius: 'var(--radius-md)',
            padding: '28px 20px',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            disabled={isUploading || slotsLeft <= 0}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 20px',
              backgroundColor: slotsLeft <= 0 ? 'var(--muted)' : 'var(--ink)',
              color: 'var(--on-dark)',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: 'var(--step-caption)',
              cursor: isUploading || slotsLeft <= 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploading ? 'Uploading…' : 'Choose photos'}
          </button>
          <p style={{ marginTop: '10px', fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
            {slotsLeft > 0
              ? `or drag photos here. JPEG, PNG or WebP, up to 5 MB each. You can add ${slotsLeft} more.`
              : `You have reached the maximum of ${MAX_PHOTOS} photos. Remove one to add another.`}
          </p>
        </div>

        {uploads.length > 0 && (
          <ul
            aria-live="polite"
            style={{
              listStyle: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--card)',
              marginBottom: '24px',
            }}
          >
            {uploads.map((u) => (
              <li
                key={u.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '8px 12px',
                  fontSize: 'var(--step-small)',
                  borderTop: '1px solid var(--rule)',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                <span
                  style={{
                    flexShrink: 0,
                    color:
                      u.status === 'failed'
                        ? 'var(--status-danger-ink)'
                        : u.status === 'done'
                          ? 'var(--status-open-ink)'
                          : 'var(--muted)',
                  }}
                >
                  {u.status === 'failed' ? u.error : statusText[u.status]}
                </span>
              </li>
            ))}
          </ul>
        )}

          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Your photos</h2>
          <span className="tabular-nums" style={{ fontSize: 'var(--step-small)', color: 'var(--muted)' }}>
            {photos.length} of {MAX_PHOTOS}
          </span>
        </div>

        {isLoading ? (
          <div style={{ color: 'var(--muted)' }}>Loading photos…</div>
        ) : photos.length === 0 ? (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--card)',
            }}
          >
            {isEditing ? 'No photos yet. Click “Choose photos” to add your first one.' : 'No photos yet. Click Edit photos to add your first one.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px' }}>
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--card)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '4 / 3', backgroundColor: 'var(--surface)' }}>
                  <img
                    src={photo.url}
                    alt={photo.caption || `Workshop photo ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {index === 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        padding: '2px 8px',
                        fontSize: 'var(--step-small)',
                        fontWeight: 600,
                        color: 'var(--on-dark)',
                        backgroundColor: 'var(--ink)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Cover
                    </span>
                  )}
                </div>
                {isEditing && (
                <div style={{ padding: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {confirmRemoveId === photo.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        style={{ ...smallButton, color: 'var(--on-dark)', backgroundColor: 'var(--status-danger-ink)', borderColor: 'transparent' }}
                      >
                        Yes, remove
                      </button>
                      <button type="button" onClick={() => setConfirmRemoveId(null)} style={smallButton}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label="Move earlier"
                        disabled={isReordering || index === 0}
                        onClick={() => movePhoto(index, -1)}
                        style={smallButton}
                      >
                        &larr;
                      </button>
                      <button
                        type="button"
                        aria-label="Move later"
                        disabled={isReordering || index === photos.length - 1}
                        onClick={() => movePhoto(index, 1)}
                        style={smallButton}
                      >
                        &rarr;
                      </button>
                      {index > 0 && (
                        <button type="button" disabled={isReordering} onClick={() => makeCover(index)} style={smallButton}>
                          Make cover
                        </button>
                      )}
                      <button type="button" onClick={() => setConfirmRemoveId(photo.id)} style={smallButton}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};
