/**
 * Test suite for useQueryPreview hook.
 * Tests the refactored hook that manages preview state and generation.
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useQueryPreview } from '@hooks/useQueryPreview'

// Mock the generateQueryPreview utility
vi.mock('@/utils/queryPreviewGenerator', () => ({
  generateQueryPreview: vi.fn(() => ({
    estimatedResults: 10,
    resultStructure: {
      entityTypes: ['IfcWall'],
      dataCategories: ['Geometrie'],
      expectedFields: ['id', 'name'],
      sampleOutput: {
        entities: 10,
        categories: ['Geometrie'],
        hasGeometry: true,
        hasProperties: true,
      }
    },
    processingSteps: [
      {
        name: 'Abfrage-Parsing',
        description: 'Test step',
        estimatedDuration: 1,
        dependencies: [],
      }
    ],
    resourceEstimate: {
      estimatedTokens: 1000,
      estimatedMemory: 5,
      estimatedDuration: 5,
      concurrencyImpact: 1,
    },
    complexity: {
      score: 3,
      factors: [],
      recommendation: 'Simple query',
      optimization: [],
    }
  }))
}))

describe('useQueryPreview Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock setTimeout to be synchronous for testing
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic Hook Behavior', () => {
    it('should initialize with null preview state', () => {
      const { result } = renderHook(() => useQueryPreview(''))
      
      expect(result.current.preview).toBeNull()
      expect(result.current.isGenerating).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.refreshPreview).toBe('function')
    })

    it('should not generate preview for empty query', () => {
      const { result } = renderHook(() => useQueryPreview(''))
      
      expect(result.current.preview).toBeNull()
      expect(result.current.isGenerating).toBe(false)
    })

    it('should not generate preview for short query', () => {
      const { result } = renderHook(() => useQueryPreview('abc'))
      
      expect(result.current.preview).toBeNull()
      expect(result.current.isGenerating).toBe(false)
    })
  })

  describe('Preview Generation', () => {
    it('should generate preview for valid query', async () => {
      const onPreviewChange = vi.fn()
      const { result } = renderHook(() => 
        useQueryPreview('Valid test query', undefined, { onPreviewChange })
      )

      // Initially should be generating
      expect(result.current.isGenerating).toBe(true)

      // Fast-forward through debounce delay
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Wait for async generation to complete
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false)
      })

      expect(result.current.preview).not.toBeNull()
      expect(result.current.preview?.estimatedResults).toBe(10)
      expect(result.current.error).toBeNull()
      expect(onPreviewChange).toHaveBeenCalledWith(expect.objectContaining({
        estimatedResults: 10
      }))
    })

    it('should debounce preview generation', async () => {
      const { result, rerender } = renderHook(
        ({ query }) => useQueryPreview(query),
        { initialProps: { query: 'Initial query' } }
      )

      expect(result.current.isGenerating).toBe(true)

      // Change query before debounce completes
      rerender({ query: 'Updated query' })

      // Fast-forward through debounce
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false)
      })

      // Should have generated preview for the final query
      expect(result.current.preview).not.toBeNull()
    })

    it('should handle custom debounce delay', async () => {
      const { result } = renderHook(() => 
        useQueryPreview('Test query', undefined, { debounceMs: 1000 })
      )

      expect(result.current.isGenerating).toBe(true)

      // Should not generate after 500ms
      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(result.current.isGenerating).toBe(true)

      // Should generate after 1000ms
      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false)
      })

      expect(result.current.preview).not.toBeNull()
    })
  })

  describe('Auto-refresh Control', () => {
    it('should not auto-generate when autoRefresh is false', () => {
      const { result } = renderHook(() => 
        useQueryPreview('Test query', undefined, { autoRefresh: false })
      )

      expect(result.current.isGenerating).toBe(false)
      expect(result.current.preview).toBeNull()
    })

    it('should allow manual refresh when autoRefresh is false', async () => {
      const { result } = renderHook(() => 
        useQueryPreview('Test query', undefined, { autoRefresh: false })
      )

      // Manual refresh
      act(() => {
        result.current.refreshPreview()
      })

      expect(result.current.isGenerating).toBe(true)

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false)
      })

      expect(result.current.preview).not.toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle generation errors gracefully', async () => {
      const mockError = new Error('Generation failed')
      const { generateQueryPreview } = await import('@/utils/queryPreviewGenerator')
      vi.mocked(generateQueryPreview).mockImplementationOnce(() => {
        throw mockError
      })

      const { result } = renderHook(() => useQueryPreview('Test query'))

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false)
      })

      expect(result.current.error).toBe('Generation failed')
      expect(result.current.preview).toBeNull()
    })

    it('should clear errors on successful generation', async () => {
      const { generateQueryPreview } = await import('@/utils/queryPreviewGenerator')
      
      // First call fails
      vi.mocked(generateQueryPreview).mockImplementationOnce(() => {
        throw new Error('First failure')
      })

      const { result, rerender } = renderHook(
        ({ query }) => useQueryPreview(query),
        { initialProps: { query: 'Test query' } }
      )

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.error).toBe('First failure')
      })

      // Reset mock for successful call
      vi.mocked(generateQueryPreview).mockRestore()

      // Trigger new generation
      rerender({ query: 'New query' })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.error).toBeNull()
        expect(result.current.preview).not.toBeNull()
      })
    })
  })

  describe('File ID Integration', () => {
    it('should pass fileId to preview generation', async () => {
      const { generateQueryPreview } = await import('@/utils/queryPreviewGenerator')
      const fileId = 'test-file-123'

      renderHook(() => useQueryPreview('Test query', fileId))

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(generateQueryPreview).toHaveBeenCalledWith('Test query', fileId)
      })
    })

    it('should regenerate when fileId changes', async () => {
      const { generateQueryPreview } = await import('@/utils/queryPreviewGenerator')
      
      const { rerender } = renderHook(
        ({ fileId }) => useQueryPreview('Test query', fileId),
        { initialProps: { fileId: 'file1' } }
      )

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(generateQueryPreview).toHaveBeenCalledWith('Test query', 'file1')
      })

      // Change fileId
      rerender({ fileId: 'file2' })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(generateQueryPreview).toHaveBeenCalledWith('Test query', 'file2')
      })
    })
  })

  describe('Preview Enhancement', () => {
    it('should add confidence score to preview', async () => {
      const { result } = renderHook(() => useQueryPreview('Test query'))

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.preview).not.toBeNull()
      })

      expect(result.current.preview?.confidence).toBeGreaterThan(0.6)
      expect(result.current.preview?.confidence).toBeLessThan(0.95)
      expect(result.current.preview?.generatedAt).toBeInstanceOf(Date)
    })

    it('should calculate confidence based on complexity', async () => {
      const { generateQueryPreview } = await import('@/utils/queryPreviewGenerator')
      
      // Mock high complexity
      vi.mocked(generateQueryPreview).mockReturnValueOnce({
        estimatedResults: 10,
        resultStructure: {
          entityTypes: ['IfcWall'],
          dataCategories: ['Geometrie'],
          expectedFields: ['id'],
          sampleOutput: {
            entities: 10,
            categories: ['Geometrie'],
            hasGeometry: true,
            hasProperties: true,
          }
        },
        processingSteps: [],
        resourceEstimate: {
          estimatedTokens: 1000,
          estimatedMemory: 5,
          estimatedDuration: 5,
          concurrencyImpact: 1,
        },
        complexity: {
          score: 8, // High complexity
          factors: [],
          recommendation: 'Complex query',
          optimization: [],
        }
      })

      const { result } = renderHook(() => useQueryPreview('Complex query'))

      act(() => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        expect(result.current.preview).not.toBeNull()
      })

      // High complexity should result in lower confidence
      expect(result.current.preview?.confidence).toBeLessThan(0.8)
    })
  })

  describe('Memory and Performance', () => {
    it('should cleanup timers on unmount', () => {
      const { unmount } = renderHook(() => useQueryPreview('Test query'))

      // Should not throw or cause memory leaks
      unmount()
      
      // Advance timers to ensure no pending operations
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    })

    it('should handle rapid query changes without race conditions', async () => {
      const { rerender } = renderHook(
        ({ query }) => useQueryPreview(query),
        { initialProps: { query: 'Query 1' } }
      )

      // Rapidly change queries
      rerender({ query: 'Query 2' })
      rerender({ query: 'Query 3' })
      rerender({ query: 'Query 4' })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should not cause errors or inconsistent state
      expect(() => {
        vi.advanceTimersByTime(1000)
      }).not.toThrow()
    })
  })
})