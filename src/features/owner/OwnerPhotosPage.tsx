import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { ApiError, apiClient } from '../../api/client';
import { PhotoItem } from '../../api/types';
import { ownerNavItems } from './ownerNav';
import './owner-photos.css';
import './owner-type.css';

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
      title="Workshop photos"
      navItems={ownerNavItems}
      actions={isLoading ? null : isEditing ? (
        <button className="owner-photos-primary" type="button" disabled={isUploading || isReordering} onClick={() => { setIsEditing(false); setConfirmRemoveId(null); setUploads([]); setNotice(null); }}>Done</button>
      ) : (
        <button className="owner-photos-primary" type="button" onClick={() => setIsEditing(true)}>Edit photos</button>
      )}
    >
      <main className="owner-photos-page">
        <header className="owner-photos-heading">
          <div><p className="owner-photos-eyebrow">PUBLIC GARAGE PROFILE</p><h1>Workshop photos</h1><p>Show riders what your workshop looks like before they arrive. Your first photo is the cover image on your listing.</p></div>
          <span className="owner-photos-count">{photos.length}<small> / {MAX_PHOTOS}</small></span>
        </header>

        {notice && <div role="alert" className="owner-photos-error">{notice}</div>}

        {isEditing && <>
          <div className={`owner-photos-dropzone ${isDragging ? 'is-dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); if (slotsLeft > 0) setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
            <input ref={fileInputRef} type="file" accept={ALLOWED_TYPES.join(',')} multiple onChange={handleFileInput} hidden />
            <div className="owner-photos-upload-mark" aria-hidden="true">↑</div>
            <div><h2>{isUploading ? 'Uploading your photos' : 'Add workshop photos'}</h2><p>{slotsLeft > 0 ? `Choose files or drop them here. JPEG, PNG or WebP · up to 5 MB each · ${slotsLeft} ${slotsLeft === 1 ? 'slot' : 'slots'} remaining.` : `You have reached the ${MAX_PHOTOS}-photo limit. Remove a photo to make room.`}</p></div>
            <button className="owner-photos-secondary" type="button" disabled={isUploading || slotsLeft <= 0} onClick={() => fileInputRef.current?.click()}>{isUploading ? 'Uploading…' : 'Choose files'}</button>
          </div>
          {uploads.length > 0 && <ul className="owner-photos-upload-list" aria-live="polite">{uploads.map((upload) => <li key={upload.id}><span title={upload.name}>{upload.name}</span><strong className={`is-${upload.status}`}>{upload.status === 'failed' ? upload.error : statusText[upload.status]}</strong></li>)}</ul>}
        </>}

        <section className="owner-photos-library" aria-labelledby="owner-photos-library-title">
          <div className="owner-photos-library-heading"><div><h2 id="owner-photos-library-title">Your photo library</h2><p>{isEditing ? 'Arrange the photos in the order riders should see them.' : 'These are the images currently shown on your public listing.'}</p></div>{isReordering && <span className="owner-photos-saving">Saving order…</span>}</div>
          {isLoading ? <div className="owner-photos-empty">Loading your photos…</div> : photos.length === 0 ? (
            <div className="owner-photos-empty"><strong>No workshop photos yet</strong><p>{isEditing ? 'Add a few clear shots of your entrance, service bays, and team.' : 'Add photos to make your public listing more useful to riders.'}</p>{!isEditing && <button className="owner-photos-secondary" type="button" onClick={() => setIsEditing(true)}>Add photos</button>}</div>
          ) : (
            <div className="owner-photos-grid">{photos.map((photo, index) => <article className="owner-photo-card" key={photo.id}>
              <div className="owner-photo-image">{photo.url ? <img src={photo.url} alt={photo.caption || `Workshop photo ${index + 1}`} loading="lazy" /> : <div className="owner-photo-missing">Photo unavailable</div>}{index === 0 && <span className="owner-photo-cover">Cover image</span>}</div>
              <div className="owner-photo-caption"><strong>{index === 0 ? 'Shown first' : `Photo ${index + 1}`}</strong><span>{photo.caption || 'Workshop view'}</span></div>
              {isEditing && <div className="owner-photo-actions">{confirmRemoveId === photo.id ? <><span className="owner-photo-confirm-copy">Remove this photo?</span><button className="is-remove-confirm" type="button" onClick={() => removePhoto(photo.id)}>Remove</button><button type="button" onClick={() => setConfirmRemoveId(null)}>Keep</button></> : <>
                <button type="button" aria-label={`Move photo ${index + 1} earlier`} disabled={isReordering || index === 0} onClick={() => movePhoto(index, -1)}>Move up</button>
                <button type="button" aria-label={`Move photo ${index + 1} later`} disabled={isReordering || index === photos.length - 1} onClick={() => movePhoto(index, 1)}>Move down</button>
                {index > 0 && <button type="button" disabled={isReordering} onClick={() => makeCover(index)}>Make cover</button>}
                <button className="is-remove" type="button" onClick={() => setConfirmRemoveId(photo.id)}>Remove</button>
              </>}</div>}
            </article>)}</div>
          )}
        </section>
      </main>
    </AppShell>
  );
};
