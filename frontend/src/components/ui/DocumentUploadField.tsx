import { useRef, useState, type ChangeEvent } from 'react';
import type { MasterDocument } from '../../types';
import { Button } from './Button';
import { Input } from './Input';
import './DocumentUploadField.css';

interface DocumentUploadFieldProps {
  documents: MasterDocument[];
  onChange: (documents: MasterDocument[]) => void;
  disabled?: boolean;
}

function openDocument(document: MasterDocument) {
  const link = window.document.createElement('a');
  link.href = document.fileData;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (!document.mimeType?.startsWith('image/') && document.mimeType !== 'application/pdf') {
    link.download = document.fileName;
  }
  link.click();
}

export function DocumentUploadField({
  documents,
  onChange,
  disabled = false,
}: DocumentUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docName, setDocName] = useState('');
  const [pendingFile, setPendingFile] = useState<{
    fileName: string;
    mimeType: string | null;
    fileData: string;
  } | null>(null);
  const [localError, setLocalError] = useState('');

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLocalError('');
    if (!file) return;
    if (file.size > 2_000_000) {
      setLocalError('Document must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setPendingFile({
        fileName: file.name,
        mimeType: file.type || null,
        fileData: reader.result,
      });
      if (!docName.trim()) {
        setDocName(file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const addDocument = () => {
    setLocalError('');
    if (!docName.trim()) {
      setLocalError('Enter document name');
      return;
    }
    if (!pendingFile) {
      setLocalError('Choose a file to upload');
      return;
    }
    onChange([
      ...documents,
      {
        name: docName.trim(),
        fileName: pendingFile.fileName,
        mimeType: pendingFile.mimeType,
        fileData: pendingFile.fileData,
      },
    ]);
    setDocName('');
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="doc-upload">
      <div className="doc-upload__composer">
        <Input
          label="Document Name"
          value={docName}
          disabled={disabled}
          onChange={(event) => setDocName(event.target.value)}
          placeholder="e.g. Registration Certificate"
        />
        <div className="ui-field">
          <span className="ui-field__label">File</span>
          <button
            type="button"
            className="doc-upload__file-btn"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            {pendingFile ? pendingFile.fileName : 'Choose File'}
          </button>
          <input
            ref={fileRef}
            className="doc-upload__hidden"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,image/*,application/pdf"
            onChange={onFileChange}
          />
        </div>
        <div className="ui-field">
          <span className="ui-field__label" aria-hidden="true">
            &nbsp;
          </span>
          <Button type="button" size="md" disabled={disabled} onClick={addDocument}>
            Add Document
          </Button>
        </div>
      </div>

      {localError ? <span className="ui-field__error">{localError}</span> : null}

      <div className="doc-upload__list">
        {documents.length ? (
          documents.map((document, index) => (
            <div key={`${document.name}-${document.fileName}-${index}`} className="doc-upload__row">
              <div className="doc-upload__meta">
                <div className="doc-upload__title">{document.name}</div>
                <div className="doc-upload__sub">{document.fileName}</div>
              </div>
              <div className="doc-upload__actions">
                <Button type="button" size="sm" variant="secondary" onClick={() => openDocument(document)}>
                  View
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => onChange(documents.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="doc-upload__empty">No documents uploaded</div>
        )}
      </div>
    </div>
  );
}

export function openMasterDocument(document: MasterDocument) {
  openDocument(document);
}
