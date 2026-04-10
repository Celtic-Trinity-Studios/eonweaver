/**
 * Eon Weaver — Content Library View
 * Per-account file storage for maps, handouts, and world assets.
 * Supports drag-and-drop upload, thumbnails, and campaign scoping.
 */
import { showToast } from '../components/Toast.js';
import { apiGetUserFiles, apiDeleteUserFile, apiUploadContent } from '../api/content.js';

const FILE_TYPE_OPTIONS = [
    { value: 'map', label: '🗺️ Map', icon: '🗺️' },
    { value: 'handout', label: '📄 Handout', icon: '📄' },
    { value: 'asset', label: '🎨 Asset', icon: '🎨' },
    { value: 'document', label: '📝 Document', icon: '📝' },
];

export default function ContentLibraryView(container) {
    container.innerHTML = `
    <div class="view-content-library">
      <header class="view-header">
        <h1>📁 Content Library</h1>
        <p class="view-subtitle">Upload maps, handouts, and campaign assets. Files are stored in your personal account folder.</p>
      </header>

      <div class="cl-upload-area" id="cl-upload-area">
        <div class="cl-dropzone" id="cl-dropzone">
          <span class="cl-dropzone-icon">📤</span>
          <p class="cl-dropzone-text">Drag & drop files here, or click to browse</p>
          <p class="cl-dropzone-hint">Supports: JPG, PNG, WEBP, GIF, PDF, TXT, MD, JSON</p>
          <input type="file" id="cl-file-input" style="display:none;" multiple
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown,application/json">
        </div>
        <div class="cl-upload-options" id="cl-upload-options" style="display:none;">
          <div class="form-group">
            <label>File Type</label>
            <select class="form-select" id="cl-upload-type">
              ${FILE_TYPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Description <span class="muted">(optional)</span></label>
            <input class="form-input" id="cl-upload-desc" placeholder="Brief description of this file...">
          </div>
          <div class="cl-upload-actions">
            <button class="btn-primary btn-sm" id="cl-upload-btn">📤 Upload</button>
            <button class="btn-secondary btn-sm" id="cl-upload-cancel">Cancel</button>
          </div>
          <div id="cl-upload-progress" class="cl-upload-progress" style="display:none;">
            <div class="cl-progress-bar"><div class="cl-progress-fill" id="cl-progress-fill"></div></div>
          </div>
        </div>
      </div>

      <div class="cl-storage-info" id="cl-storage-info"></div>

      <div class="cl-files" id="cl-files">
        <div class="view-empty">Loading content library...</div>
      </div>
    </div>`;

    // Drag and drop
    const dropzone = container.querySelector('#cl-dropzone');
    const fileInput = container.querySelector('#cl-file-input');
    const uploadOptions = container.querySelector('#cl-upload-options');
    let pendingFiles = [];

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFileSelect(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => handleFileSelect(fileInput.files));

    function handleFileSelect(files) {
        if (!files || !files.length) return;
        pendingFiles = Array.from(files);
        dropzone.querySelector('.cl-dropzone-text').textContent = `${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''} selected: ${pendingFiles.map(f => f.name).join(', ')}`;
        uploadOptions.style.display = '';
    }

    container.querySelector('#cl-upload-cancel')?.addEventListener('click', () => {
        pendingFiles = [];
        uploadOptions.style.display = 'none';
        fileInput.value = '';
        dropzone.querySelector('.cl-dropzone-text').textContent = 'Drag & drop files here, or click to browse';
    });

    container.querySelector('#cl-upload-btn')?.addEventListener('click', async () => {
        if (!pendingFiles.length) return;
        const fileType = container.querySelector('#cl-upload-type').value;
        const description = container.querySelector('#cl-upload-desc').value.trim();
        const btn = container.querySelector('#cl-upload-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Uploading...';

        let successCount = 0;
        for (const file of pendingFiles) {
            try {
                await apiUploadContent(file, fileType, description);
                successCount++;
            } catch (e) {
                showToast(`Upload failed for "${file.name}": ${e.message}`, 'error');
            }
        }

        if (successCount > 0) {
            showToast(`${successCount} file${successCount > 1 ? 's' : ''} uploaded!`, 'success');
        }

        // Reset
        pendingFiles = [];
        uploadOptions.style.display = 'none';
        fileInput.value = '';
        dropzone.querySelector('.cl-dropzone-text').textContent = 'Drag & drop files here, or click to browse';
        btn.disabled = false;
        btn.textContent = '📤 Upload';
        container.querySelector('#cl-upload-desc').value = '';
        loadFiles(container);
    });

    loadFiles(container);
}

async function loadFiles(container) {
    const filesEl = container.querySelector('#cl-files');
    const storageEl = container.querySelector('#cl-storage-info');
    try {
        const res = await apiGetUserFiles();
        const files = res.files || [];
        const storageUsed = res.storage_used || 0;
        const storageLimit = res.storage_limit || 20 * 1024 * 1024;
        const fileCount = res.file_count || 0;
        const fileLimit = res.file_limit || 10;

        const usedMB = (storageUsed / (1024 * 1024)).toFixed(1);
        const limitMB = (storageLimit / (1024 * 1024)).toFixed(0);
        const pct = Math.min(100, (storageUsed / storageLimit) * 100);

        storageEl.innerHTML = `
        <div class="cl-storage-bar-container">
          <div class="cl-storage-label">
            <span>📊 ${fileCount} / ${fileLimit} files</span>
            <span>${usedMB} MB / ${limitMB} MB used</span>
          </div>
          <div class="cl-storage-bar">
            <div class="cl-storage-fill" style="width:${pct}%;${pct > 80 ? 'background:var(--danger)' : ''}"></div>
          </div>
        </div>`;

        if (files.length === 0) {
            filesEl.innerHTML = `
            <div class="cl-empty">
              <span class="cl-empty-icon">📁</span>
              <p>No files uploaded yet.</p>
              <p class="muted">Use the upload area above to add maps, handouts, and assets.</p>
            </div>`;
            return;
        }

        filesEl.innerHTML = `
        <div class="cl-grid">
          ${files.map(f => renderFileCard(f)).join('')}
        </div>`;

        // Delete buttons
        filesEl.querySelectorAll('.cl-file-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.dataset.id);
                const fname = btn.dataset.name;
                if (!confirm(`Delete "${fname}"?`)) return;
                try {
                    await apiDeleteUserFile(id);
                    showToast(`"${fname}" deleted.`, 'success');
                    loadFiles(container);
                } catch (e) {
                    showToast('Delete failed: ' + e.message, 'error');
                }
            });
        });

        // Copy URL buttons
        filesEl.querySelectorAll('.cl-file-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
                const fullUrl = window.location.origin + base + '/' + url;
                navigator.clipboard.writeText(fullUrl).then(() => {
                    showToast('URL copied!', 'success');
                }).catch(() => {
                    // Fallback
                    const ta = document.createElement('textarea');
                    ta.value = fullUrl;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                    showToast('URL copied!', 'success');
                });
            });
        });

    } catch (e) {
        filesEl.innerHTML = `<div class="view-empty"><p>Error: ${e.message}</p></div>`;
    }
}

function renderFileCard(file) {
    const isImage = file.mime_type?.startsWith('image/');
    const base = (import.meta.env?.BASE_URL || '/').replace(/\/$/, '');
    const fileUrl = `${base}/${file.url}`;
    const sizeMB = (file.file_size / 1024).toFixed(1);
    const typeIcons = { map: '🗺️', handout: '📄', asset: '🎨', document: '📝' };
    const icon = typeIcons[file.file_type] || '📎';

    return `
    <div class="cl-file-card">
      <div class="cl-file-preview">
        ${isImage
          ? `<img src="${fileUrl}" alt="${file.original_name}" class="cl-file-thumb" loading="lazy">`
          : `<div class="cl-file-icon">${icon}</div>`
        }
      </div>
      <div class="cl-file-info">
        <div class="cl-file-name" title="${file.original_name}">${file.original_name}</div>
        <div class="cl-file-meta">
          <span class="cl-file-type-badge">${icon} ${file.file_type}</span>
          <span>${sizeMB} KB</span>
        </div>
        ${file.description ? `<div class="cl-file-desc">${file.description}</div>` : ''}
      </div>
      <div class="cl-file-actions">
        ${isImage ? `<a href="${fileUrl}" target="_blank" class="btn-sm btn-secondary" title="View full size">🔍</a>` : `<a href="${fileUrl}" target="_blank" class="btn-sm btn-secondary" title="Download">⬇️</a>`}
        <button class="btn-sm btn-secondary cl-file-copy" data-url="${file.url}" title="Copy URL">📋</button>
        <button class="btn-sm btn-danger cl-file-delete" data-id="${file.id}" data-name="${file.original_name}" title="Delete">🗑️</button>
      </div>
    </div>`;
}
