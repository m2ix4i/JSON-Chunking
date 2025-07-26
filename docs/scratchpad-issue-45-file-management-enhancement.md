# Issue #45: File Management Enhancement - Implementation Plan

## Current Analysis & Findings

### ✅ Infrastructure Already Exists
1. **Store Layer (fileStore.ts:154-179)**: deleteFile functionality fully implemented
   - Calls `apiService.deleteFile(fileId)`
   - Proper state management and error handling
   - Success/error notifications already implemented

2. **Backend API**: Store assumes `apiService.deleteFile()` exists
   - Need to verify DELETE `/api/files/{file_id}` endpoint exists
   - If missing, this is blocking dependency

### 🚧 Current Issues
1. **Merge Conflicts in FileSelector.tsx**
   - Conflict between old basic version and new enhanced version
   - New version has radio button selection, status indicators, detailed metadata
   - Need to resolve and complete the enhanced version

2. **Missing UI Elements**
   - No delete button in file selector
   - No bulk operations UI
   - No file preview capability
   - No confirmation dialogs

### 📋 Implementation Plan

#### Phase 1: Resolve Merge Conflicts & Verify Backend
- [ ] Resolve merge conflicts in FileSelector.tsx (keep enhanced version)
- [ ] Verify backend DELETE endpoint exists
- [ ] Test existing deleteFile functionality

#### Phase 2: Enhance File Management UI
- [ ] Add delete button to file list items
- [ ] Implement confirmation dialog for deletion
- [ ] Add bulk selection checkboxes
- [ ] Remove any "zukünftiger Version" placeholder messages

#### Phase 3: File Preview & Metadata
- [ ] Create FilePreview component for JSON structure overview
- [ ] Create FileMetadata component for detailed file info
- [ ] Show processing status, chunk count, tokens, processing time
- [ ] Add file size and storage usage indicators

#### Phase 4: Bulk Operations
- [ ] Implement bulk file selection
- [ ] Add bulk delete functionality
- [ ] Add progress indicators for bulk operations

#### Phase 5: Additional Features
- [ ] File re-upload/replacement functionality
- [ ] File export/download capabilities
- [ ] Enhanced validation feedback

## Technical Implementation Details

### Files to Modify

#### 1. FileSelector.tsx - Primary Changes
```typescript
// Add delete button to file list items
<IconButton onClick={(e) => handleDeleteFile(e, file.file_id)}>
  <DeleteIcon />
</IconButton>

// Add bulk selection
const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

// Add confirmation dialog
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
```

#### 2. FileStore.ts - Bulk Operations
```typescript
// Add bulk delete method
deleteBulkFiles: async (fileIds: string[]) => Promise<void>

// Add bulk selection state
bulkSelection: string[];
setBulkSelection: (fileIds: string[]) => void;
```

#### 3. New Components
- `FilePreview.tsx` - JSON structure preview
- `FileMetadata.tsx` - Detailed file metadata display
- `FileDeleteConfirmDialog.tsx` - Deletion confirmation
- `BulkFileActions.tsx` - Bulk operation controls

### Backend Dependencies to Verify
- [ ] DELETE `/api/files/{file_id}` - Single file deletion
- [ ] GET `/api/files/{file_id}/preview` - File preview data
- [ ] POST `/api/files/bulk-delete` - Bulk deletion (if not exists, use multiple singles)

### Acceptance Criteria Mapping
- [x] Backend deletion functionality (already exists)
- [ ] UI deletion functionality (implement delete buttons)
- [ ] Confirmation dialogs (implement dialog component)
- [ ] File preview (implement FilePreview component)
- [ ] Detailed metadata display (enhance file list, implement FileMetadata)
- [ ] Bulk operations (implement selection and bulk actions)
- [ ] Validation feedback (enhance error handling)
- [ ] File size indicators (already partially exists, enhance)
- [ ] File replacement (implement re-upload)
- [ ] Export/download (implement download functionality)

## Risk Assessment
- **Low Risk**: Store layer already implemented, just need UI
- **Medium Risk**: Backend endpoints may need verification/implementation
- **Low Risk**: Merge conflicts are straightforward to resolve

## Estimated Time
- Phase 1: 4 hours (resolve conflicts, verify backend)
- Phase 2: 6 hours (basic UI enhancements)
- Phase 3: 4 hours (preview & metadata)
- Phase 4: 6 hours (bulk operations)
- Phase 5: 4 hours (additional features)
- **Total: ~24 hours (3 working days)**

## Next Steps
1. Create feature branch `feature/issue-45-file-management-enhancement`
2. Resolve merge conflicts in FileSelector.tsx
3. Verify backend DELETE endpoint exists
4. Implement delete UI and confirmation dialogs
5. Add bulk operations and preview functionality
6. Write comprehensive tests
7. Open PR with #45 reference

## Testing Strategy
- Unit tests for new store methods
- Component tests for new UI elements
- Integration tests for file operations
- E2E tests for complete file management workflow
- Test deletion confirmation flow
- Test bulk operations
- Test error handling scenarios