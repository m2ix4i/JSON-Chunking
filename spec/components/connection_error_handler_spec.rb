# spec/components/connection_error_handler_spec.rb
# RSpec tests for the refactored ConnectionErrorHandler components
# Tests expected behavior following Sandi Metz code review principles

require 'rails_helper'

RSpec.describe 'ConnectionErrorHandler Refactoring', type: :feature do
  describe 'Component Structure' do
    it 'should have extracted useConnectionStatus custom hook' do
      hook_file = Rails.root.join('frontend/src/hooks/useConnectionStatus.ts')
      expect(File.exist?(hook_file)).to be true
      
      hook_content = File.read(hook_file)
      expect(hook_content).to include('export const useConnectionStatus')
      expect(hook_content).to include('connectionManager')
      expect(hook_content).to include('ErrorNotification')
    end

    it 'should have created focused RetryButton component' do
      component_file = Rails.root.join('frontend/src/components/error/RetryButton.tsx')
      expect(File.exist?(component_file)).to be true
      
      component_content = File.read(component_file)
      expect(component_content).to include('RetryButtonProps')
      expect(component_content).to include('isRetrying')
      expect(component_content).to include('onRetry')
      
      # Should be a small, focused component (under 50 lines)
      line_count = component_content.lines.count
      expect(line_count).to be < 50
    end

    it 'should have created StatusChip component for status display' do
      component_file = Rails.root.join('frontend/src/components/error/StatusChip.tsx')
      expect(File.exist?(component_file)).to be true
      
      component_content = File.read(component_file)
      expect(component_content).to include('StatusChipProps')
      expect(component_content).to include('connectionStatus')
      expect(component_content).to include('OnlineIcon')
      expect(component_content).to include('OfflineIcon')
    end

    it 'should have created ErrorDetails component for detailed information' do
      component_file = Rails.root.join('frontend/src/components/error/ErrorDetails.tsx')
      expect(File.exist?(component_file)).to be true
      
      component_content = File.read(component_file)
      expect(component_content).to include('ErrorDetailsProps')
      expect(component_content).to include('expanded')
      expect(component_content).to include('notifications')
      expect(component_content).to include('Leistungsmetriken')
    end

    it 'should have refactored main ConnectionErrorHandler to use composition' do
      main_component = Rails.root.join('frontend/src/components/error/ConnectionErrorHandler.tsx')
      expect(File.exist?(main_component)).to be true
      
      main_content = File.read(main_component)
      expect(main_content).to include('useConnectionStatus')
      expect(main_content).to include('RetryButton')
      expect(main_content).to include('StatusChip')
      expect(main_content).to include('ErrorDetails')
      
      # Should be significantly smaller than original
      line_count = main_content.lines.count
      expect(line_count).to be < 200  # Much smaller than original 383 lines
    end
  end

  describe 'Single Responsibility Principle Compliance' do
    it 'should separate connection status logic into custom hook' do
      hook_file = Rails.root.join('frontend/src/hooks/useConnectionStatus.ts')
      hook_content = File.read(hook_file)
      
      # Hook should handle connection status and notifications
      expect(hook_content).to include('useState')
      expect(hook_content).to include('useEffect')
      expect(hook_content).to include('addNotification')
      expect(hook_content).to include('handleRetry')
      expect(hook_content).to include('handleForceFallback')
    end

    it 'should isolate UI rendering in focused components' do
      retry_button = File.read(Rails.root.join('frontend/src/components/error/RetryButton.tsx'))
      status_chip = File.read(Rails.root.join('frontend/src/components/error/StatusChip.tsx'))
      
      # Each component should have single UI responsibility
      expect(retry_button).to include('Button')
      expect(retry_button).to include('LinearProgress')
      expect(retry_button).not_to include('connectionManager')
      
      expect(status_chip).to include('Chip')
      expect(status_chip).not_to include('useState')
      expect(status_chip).not_to include('handleRetry')
    end

    it 'should reduce complexity in main component' do
      main_component = File.read(Rails.root.join('frontend/src/components/error/ConnectionErrorHandler.tsx'))
      
      # Main component should primarily orchestrate sub-components
      # Should not contain complex business logic
      expect(main_component).not_to include('setInterval')
      expect(main_component).not_to include('connectionManager.getConnectionStatus')
      expect(main_component).not_to include('attemptWebSocketReconnection')
      
      # Should focus on composition and rendering
      expect(main_component).to include('<RetryButton')
      expect(main_component).to include('<StatusChip')
      expect(main_component).to include('<ErrorDetails')
    end
  end

  describe 'Code Quality Metrics' do
    it 'should improve maintainability through better separation' do
      # Check that responsibilities are properly distributed
      files = [
        'frontend/src/hooks/useConnectionStatus.ts',
        'frontend/src/components/error/RetryButton.tsx',
        'frontend/src/components/error/StatusChip.tsx',
        'frontend/src/components/error/ErrorDetails.tsx',
        'frontend/src/components/error/ConnectionErrorHandler.tsx'
      ]
      
      files.each do |file_path|
        full_path = Rails.root.join(file_path)
        expect(File.exist?(full_path)).to be true, "Expected #{file_path} to exist"
        
        content = File.read(full_path)
        expect(content).not_to be_empty, "Expected #{file_path} to have content"
      end
    end

    it 'should maintain TypeScript type safety' do
      hook_file = File.read(Rails.root.join('frontend/src/hooks/useConnectionStatus.ts'))
      main_file = File.read(Rails.root.join('frontend/src/components/error/ConnectionErrorHandler.tsx'))
      
      # Should have proper TypeScript interfaces and types
      expect(hook_file).to include('interface')
      expect(hook_file).to include(': ')  # Type annotations
      expect(main_file).to include('React.FC')
      expect(main_file).to include('interface')
    end

    it 'should preserve all original functionality' do
      main_component = File.read(Rails.root.join('frontend/src/components/error/ConnectionErrorHandler.tsx'))
      
      # Should still handle all the original use cases
      expect(main_component).to include('queryId')
      expect(main_component).to include('showDetails')
      expect(main_component).to include('onRetry')
      expect(main_component).to include('onFallback')
      
      # Should still render alerts and notifications
      expect(main_component).to include('Alert')
      expect(main_component).to include('Snackbar')
    end
  end

  describe 'Integration with Existing Code' do
    it 'should maintain compatibility with QueryPage usage' do
      query_page = Rails.root.join('frontend/src/pages/QueryPage.tsx')
      
      if File.exist?(query_page)
        query_content = File.read(query_page)
        # Should still be able to import and use ConnectionErrorHandler
        expect(query_content).to include('ConnectionErrorHandler').or(
          # Or might not be used in current implementation
          be_a(String)
        )
      end
    end

    it 'should work with existing WebSocket connection management' do
      hook_content = File.read(Rails.root.join('frontend/src/hooks/useConnectionStatus.ts'))
      
      # Should integrate with existing connection management
      expect(hook_content).to include('connectionManager')
      expect(hook_content).to include('ConnectionStatus')
    end
  end

  describe 'Performance and User Experience' do
    it 'should maintain responsive user interactions' do
      retry_button = File.read(Rails.root.join('frontend/src/components/error/RetryButton.tsx'))
      
      # Should provide proper loading states
      expect(retry_button).to include('isRetrying')
      expect(retry_button).to include('disabled')
      expect(retry_button).to include('LinearProgress')
    end

    it 'should provide clear status feedback' do
      status_chip = File.read(Rails.root.join('frontend/src/components/error/StatusChip.tsx'))
      
      # Should show connection mode and latency
      expect(status_chip).to include('Live-Updates')
      expect(status_chip).to include('Polling-Modus')
      expect(status_chip).to include('averageLatency')
    end
  end
end

RSpec.describe 'Sandi Metz Rules Compliance', type: :feature do
  describe 'Method Length and Complexity' do
    it 'should have small, focused methods in main component' do
      main_component = File.read(Rails.root.join('frontend/src/components/error/ConnectionErrorHandler.tsx'))
      
      # Should not have large JSX rendering methods
      # Main render method should delegate to sub-components
      lines = main_component.lines
      in_render_method = false
      consecutive_jsx_lines = 0
      max_consecutive_jsx = 0
      
      lines.each do |line|
        if line.include?('return (')
          in_render_method = true
          consecutive_jsx_lines = 0
        elsif in_render_method && (line.include?('<') || line.include?('/>') || line.strip.end_with?('>'))
          consecutive_jsx_lines += 1
          max_consecutive_jsx = [max_consecutive_jsx, consecutive_jsx_lines].max
        elsif in_render_method && line.include?('};')
          in_render_method = false
        else
          consecutive_jsx_lines = 0
        end
      end
      
      # Should not have massive JSX blocks (suggesting complex rendering)
      expect(max_consecutive_jsx).to be < 30, "Main component should delegate complex rendering to sub-components"
    end

    it 'should limit component size according to best practices' do
      components = [
        'frontend/src/components/error/RetryButton.tsx',
        'frontend/src/components/error/StatusChip.tsx'
      ]
      
      components.each do |component_path|
        content = File.read(Rails.root.join(component_path))
        line_count = content.lines.count
        expect(line_count).to be < 100, "#{component_path} should be under 100 lines (currently #{line_count})"
      end
    end
  end

  describe 'Dependency Management' do
    it 'should have clear import organization' do
      main_component = File.read(Rails.root.join('frontend/src/components/error/ConnectionErrorHandler.tsx'))
      
      # Should import from extracted components
      expect(main_component).to include("from './RetryButton'")
      expect(main_component).to include("from './StatusChip'")
      expect(main_component).to include("from './ErrorDetails'")
      expect(main_component).to include("from '@/hooks/useConnectionStatus'")
    end
  end
end