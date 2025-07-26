# Issue #43 - Real-time Query Status Updates Implementation

**Issue Link**: https://github.com/m2ix4i/JSON-Chunking/issues/43

## Analysis Summary

### Current State
**✅ Infrastructure Available:**
- Frontend WebSocket service (`frontend/src/services/websocket.ts`) - Comprehensive implementation with reconnection logic
- Backend WebSocket router (`src/ifc_json_chunking/web_api/routers/websocket.py`) - API endpoints ready at `/api/ws/{query_id}`
- Backend WebSocket service (`src/ifc_json_chunking/web_api/services/websocket_service.py`) - Connection management and broadcasting
- TypeScript types for WebSocket messages already defined in `types/api.ts`

**❌ Missing Integration:**
- WebSocket service is not integrated with the Zustand queryStore
- QueryPage doesn't show real-time progress updates during submission
- ResultsPage doesn't use WebSocket for live status updates
- No visual progress indicators during query processing
- No connection status indicators for users

### Current Query Flow
1. User submits query via QueryPage → queryStore.submitQuery()
2. QueryStore uses polling (2-second intervals) to check status
3. Results displayed on ResultsPage when complete
4. **Problem**: No real-time feedback, delayed updates, poor UX for long queries

## Technical Requirements Analysis

### WebSocket Message Types (Already Implemented)
```typescript
// From types/api.ts
interface ProgressMessage {
  type: 'progress';
  progress_percentage: number;
  current_step: number;
  total_steps: number;
  step_name: string;
  query_id: string;
  timestamp: number;
}

interface ErrorMessage {
  type: 'error';
  error_code?: string;
  error_details?: string;
  query_id: string;
  timestamp: number;
}

interface CompletionMessage {
  type: 'completion';
  result: QueryResultResponse;
  query_id: string;
  timestamp: number;
}
```

### Backend WebSocket Endpoint
- **URL**: `ws://localhost:3001/api/ws/{query_id}` (or `wss://` for production)
- **Authentication**: No authentication required (query_id acts as session identifier)
- **Message Format**: JSON with German language support

## Implementation Plan

### Phase 1: Core WebSocket Integration (High Priority)

#### Step 1: Enhance QueryStore with WebSocket Support
**File**: `frontend/src/stores/queryStore.ts`
- Add WebSocket connection state management
- Integrate websocketService with query submission
- Replace polling mechanism with WebSocket-based status updates
- Add connection status tracking (`isConnected` state)

#### Step 2: WebSocket Connection Management  
**File**: `frontend/src/stores/queryStore.ts`
- Connect WebSocket immediately after query submission
- Handle connection errors with fallback to polling
- Implement automatic reconnection with exponential backoff
- Clean up connections on component unmount

### Phase 2: Visual Progress Indicators (Medium Priority)

#### Step 3: Create QueryProgress Component
**File**: `frontend/src/components/query/QueryProgress.tsx`
- Real-time progress bar with percentage display
- Current step indicator (e.g., "Analyzing chunks 3/10...")
- Estimated time remaining (if available)
- German language support for step descriptions
- Connection status indicator (connected/disconnected/error)

#### Step 4: Enhance QueryPage with Progress Display
**File**: `frontend/src/pages/QueryPage.tsx`
- Show QueryProgress component during submission
- Display real-time status updates without navigation
- Allow users to stay on QueryPage to watch progress
- Add cancel functionality via WebSocket

#### Step 5: Enhance ResultsPage with Live Updates
**File**: `frontend/src/pages/ResultsPage.tsx`
- Use WebSocket for live status updates instead of polling
- Show progress during processing if arriving before completion
- Handle WebSocket connection for URL-direct access
- Auto-refresh results when completion message received

### Phase 3: Advanced Features (Medium Priority)

#### Step 6: Connection Status Indicators
**Files**: Various components
- Add visual indicators for WebSocket connection status
- Show reconnection attempts and retry logic
- Provide user feedback when connection is lost
- Implement fallback messaging when WebSocket fails

#### Step 7: Error Handling and Fallback Systems
**File**: `frontend/src/stores/queryStore.ts`
- Graceful degradation to polling when WebSocket fails
- User notifications for connection issues
- Retry mechanisms with user controls
- Comprehensive error logging and reporting

### Phase 4: Testing and Validation (Medium Priority)

#### Step 8: E2E Testing
**File**: `test-websocket-real-time-issue43.js`
- Test WebSocket connection establishment
- Validate real-time progress updates
- Test connection error handling and fallback
- Verify completion flow and navigation

## Detailed Implementation Strategy

### 1. WebSocket Integration Architecture

```typescript
// Enhanced QueryStore with WebSocket
interface QueryStore {
  // ... existing properties
  
  // WebSocket state
  websocketConnection: WebSocketConnection | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastProgressUpdate: ProgressMessage | null;
  
  // Enhanced actions
  connectWebSocket: (queryId: string) => Promise<void>;
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  disconnectWebSocket: () => void;
}
```

### 2. Progress Update Flow

```
1. User submits query → QueryStore.submitQuery()
2. Query submitted to backend → Receive queryId
3. Immediately connect WebSocket → websocketService.connect(queryId)
4. WebSocket receives progress messages → Update store state
5. Components react to store changes → Show real-time progress
6. Completion message received → Navigate to results + cleanup WebSocket
```

### 3. Fallback Strategy

```
1. WebSocket connection fails → Set connectionStatus to 'error'
2. Show user notification about connection issue
3. Automatically fallback to existing polling mechanism
4. Attempt WebSocket reconnection in background
5. Switch back to WebSocket when connection restored
```

### 4. German Language Support

**Progress Messages**:
- "Verbindung wird hergestellt..." (Connecting...)
- "Chunks analysieren: 3 von 10" (Analyzing chunks: 3 of 10)
- "Verarbeitung abgeschlossen" (Processing completed)
- "Verbindung unterbrochen - verwende Fallback" (Connection lost - using fallback)

## File Modifications Required

### New Files
- `frontend/src/components/query/QueryProgress.tsx` - Progress indicator component
- `frontend/src/hooks/useWebSocketQuery.ts` - Custom hook for WebSocket query management (optional)
- `test-websocket-real-time-issue43.js` - E2E test for WebSocket functionality

### Modified Files
- `frontend/src/stores/queryStore.ts` - Core WebSocket integration
- `frontend/src/pages/QueryPage.tsx` - Add progress indicators
- `frontend/src/pages/ResultsPage.tsx` - Use WebSocket for live updates
- `frontend/src/services/websocket.ts` - Minor enhancements if needed

## Error Handling Strategy

### WebSocket Connection Errors
1. **Initial Connection Failed**: Show error message, fallback to polling immediately
2. **Connection Lost During Processing**: Show reconnection indicator, attempt automatic reconnection
3. **Message Parsing Errors**: Log error, continue with existing status
4. **Backend WebSocket Service Down**: Graceful degradation to polling with user notification

### Recovery Mechanisms
- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s intervals for reconnection
- **Maximum Retry Attempts**: 5 attempts before permanent fallback
- **User Manual Retry**: Button to manually attempt reconnection
- **Status Persistence**: Maintain last known status during connection issues

## Performance Considerations

### Connection Management
- **Single Connection Per Query**: One WebSocket connection per active query
- **Connection Cleanup**: Automatic cleanup after completion or timeout
- **Connection Pooling**: Reuse connections for subsequent queries when possible
- **Memory Management**: Prevent memory leaks from unclosed connections

### Message Handling
- **Throttling**: Limit progress update frequency to avoid UI flooding
- **Debouncing**: Combine rapid successive updates for smoother UI
- **Selective Updates**: Only process relevant message types
- **Error Boundaries**: Prevent WebSocket errors from crashing application

## Success Criteria

### Must Have ✅
- [ ] WebSocket integration with queryStore replaces polling mechanism
- [ ] Real-time progress indicators show during query processing
- [ ] Connection status visible to users with appropriate messaging
- [ ] Graceful fallback to polling when WebSocket unavailable
- [ ] Automatic navigation to results on completion
- [ ] German language support for all status messages

### Should Have 🎯
- [ ] Visual progress bars with percentage and step information
- [ ] Connection retry logic with user feedback
- [ ] Cancel query functionality via WebSocket
- [ ] Estimated time remaining display when available

### Could Have 💡
- [ ] Connection health monitoring and diagnostics
- [ ] WebSocket message history for debugging
- [ ] Advanced reconnection strategies (different timeouts per error type)
- [ ] Multiple concurrent query support

## Implementation Timeline

**Day 1**: WebSocket integration with queryStore (Steps 1-2)
**Day 2**: Visual progress indicators and QueryProgress component (Steps 3-4)
**Day 3**: ResultsPage enhancement and error handling (Steps 5-7)
**Day 4**: Testing, refinement, and PR preparation (Step 8)

## Testing Strategy

### Unit Tests
- WebSocket connection establishment and cleanup
- Message handling and state updates
- Error scenarios and fallback mechanisms
- Progress indicator calculations and formatting

### Integration Tests
- Full query workflow with WebSocket updates
- Connection error handling and recovery
- Fallback to polling mechanism
- Navigation flow after completion

### E2E Tests
- Real-time progress display during actual query processing
- Connection interruption and recovery
- Multiple browser tab behavior
- Network failure scenarios

## Notes

- Existing WebSocket infrastructure is robust and well-implemented
- Focus on integration rather than rebuilding core functionality
- Maintain backward compatibility with existing polling mechanism
- Ensure graceful degradation for users with WebSocket restrictions
- Consider WebSocket connection limits and resource usage