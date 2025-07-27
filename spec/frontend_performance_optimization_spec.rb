# spec/frontend_performance_optimization_spec.rb
# RSpec tests for Frontend Performance Optimization PR #65
# Tests expected behavior following performance optimization and Sandi Metz principles

require 'rails_helper'

RSpec.describe 'Frontend Performance Optimization', type: :feature do
  describe 'React Lazy Loading Implementation' do
    it 'should implement React.lazy() for all route components in App.tsx' do
      app_file = Rails.root.join('frontend/src/App.tsx')
      expect(File.exist?(app_file)).to be true
      
      app_content = File.read(app_file)
      
      # Check for lazy imports
      expect(app_content).to include('const Dashboard = lazy(() => import(')
      expect(app_content).to include('const UploadPage = lazy(() => import(')
      expect(app_content).to include('const QueryPage = lazy(() => import(')
      expect(app_content).to include('const ResultsPage = lazy(() => import(')
      expect(app_content).to include('const HistoryPage = lazy(() => import(')
      expect(app_content).to include('const SettingsPage = lazy(() => import(')
      expect(app_content).to include('const DocumentationPage = lazy(() => import(')
      
      # Check for Suspense wrapper
      expect(app_content).to include('<Suspense fallback={<PageLoadingFallback />}>')
      expect(app_content).to include('PageLoadingFallback')
    end

    it 'should have loading fallback component with proper UI elements' do
      app_content = File.read(Rails.root.join('frontend/src/App.tsx'))
      
      # Check for loading fallback implementation
      expect(app_content).to include('PageLoadingFallback')
      expect(app_content).to include('CircularProgress')
      expect(app_content).to include('Skeleton')
      expect(app_content).to include('minHeight: \'60vh\'')
    end

    it 'should maintain all route definitions with lazy components' do
      app_content = File.read(Rails.root.join('frontend/src/App.tsx'))
      
      # Verify all routes are still defined
      expect(app_content).to include('<Route path="/dashboard" element={<Dashboard />} />')
      expect(app_content).to include('<Route path="/upload" element={<UploadPage />} />')
      expect(app_content).to include('<Route path="/query" element={<QueryPage />} />')
      expect(app_content).to include('<Route path="/results" element={<ResultsPage />} />')
      expect(app_content).to include('<Route path="/history" element={<HistoryPage />} />')
      expect(app_content).to include('<Route path="/settings" element={<SettingsPage />} />')
      expect(app_content).to include('<Route path="/docs" element={<DocumentationPage />} />')
    end
  end

  describe 'Performance Monitoring Implementation' do
    it 'should create performance monitoring utility' do
      perf_file = Rails.root.join('frontend/src/utils/performance.ts')
      expect(File.exist?(perf_file)).to be true
      
      perf_content = File.read(perf_file)
      
      # Check for Web Vitals integration
      expect(perf_content).to include('getCLS, getFCP, getFID, getLCP, getTTFB, getINP')
      expect(perf_content).to include('from \'web-vitals\'')
      
      # Check for performance metrics interface
      expect(perf_content).to include('interface PerformanceMetrics')
      expect(perf_content).to include('LCP?: number')
      expect(perf_content).to include('FCP?: number')
      expect(perf_content).to include('CLS?: number')
      expect(perf_content).to include('FID?: number')
      expect(perf_content).to include('INP?: number')
      expect(perf_content).to include('TTFB?: number')
      
      # Check for thresholds
      expect(perf_content).to include('PERFORMANCE_THRESHOLDS')
      expect(perf_content).to include('good: 2500, needs_improvement: 4000') # LCP
      expect(perf_content).to include('good: 1800, needs_improvement: 3000') # FCP
    end

    it 'should create PerformanceIndicator component for development' do
      indicator_file = Rails.root.join('frontend/src/components/common/PerformanceIndicator.tsx')
      expect(File.exist?(indicator_file)).to be true
      
      indicator_content = File.read(indicator_file)
      
      # Check for performance monitoring features
      expect(indicator_content).to include('PerformanceIndicator')
      expect(indicator_content).to include('subscribeToPerformance')
      expect(indicator_content).to include('getPerformanceScore')
      expect(indicator_content).to include('showDetailedMetrics')
      
      # Check for development-only rendering
      expect(indicator_content).to include('import.meta.env.DEV')
    end

    it 'should integrate performance monitoring in main.tsx' do
      main_file = Rails.root.join('frontend/src/main.tsx')
      expect(File.exist?(main_file)).to be true
      
      main_content = File.read(main_file)
      
      # Check for PerformanceIndicator integration
      expect(main_content).to include('import.meta.env.DEV && <PerformanceIndicator')
    end

    it 'should include performance dependencies in package.json' do
      package_file = Rails.root.join('frontend/package.json')
      expect(File.exist?(package_file)).to be true
      
      package_content = File.read(package_file)
      
      # Check for web-vitals dependency
      expect(package_content).to include('"web-vitals"')
      expect(package_content).to include('"vite-plugin-pwa"')
    end
  end

  describe 'Service Worker Implementation' do
    it 'should create service worker utility' do
      sw_file = Rails.root.join('frontend/src/services/serviceWorker.ts')
      expect(File.exist?(sw_file)).to be true
      
      sw_content = File.read(sw_file)
      
      # Check for Workbox integration
      expect(sw_content).to include('import { Workbox } from \'workbox-window\'')
      expect(sw_content).to include('interface ServiceWorkerConfig')
      expect(sw_content).to include('onSuccess?')
      expect(sw_content).to include('onUpdate?')
      expect(sw_content).to include('onOfflineReady?')
      
      # Check for service worker management functions
      expect(sw_content).to include('registerServiceWorker')
      expect(sw_content).to include('unregisterServiceWorker')
      expect(sw_content).to include('skipWaitingAndReload')
      expect(sw_content).to include('checkOfflineCapability')
    end

    it 'should create actual service worker file' do
      sw_public_file = Rails.root.join('frontend/public/sw.js')
      expect(File.exist?(sw_public_file)).to be true
      
      sw_content = File.read(sw_public_file)
      
      # Check for Workbox service worker implementation
      expect(sw_content).to include('workbox')
      expect(sw_content).to include('precaching')
      expect(sw_content).to include('caching')
    end

    it 'should register service worker in production' do
      main_content = File.read(Rails.root.join('frontend/src/main.tsx'))
      
      # Check for production-only service worker registration
      expect(main_content).to include('if (import.meta.env.PROD)')
      expect(main_content).to include('registerServiceWorker')
      expect(main_content).to include('onSuccess')
      expect(main_content).to include('onUpdate')
      expect(main_content).to include('onOfflineReady')
    end
  end

  describe 'Lazy Component Wrappers' do
    it 'should create LazyFileDropzone component' do
      lazy_dropzone = Rails.root.join('frontend/src/components/upload/LazyFileDropzone.tsx')
      expect(File.exist?(lazy_dropzone)).to be true
      
      dropzone_content = File.read(lazy_dropzone)
      
      # Check for lazy loading implementation
      expect(dropzone_content).to include('const FileDropzone = lazy(() => import(\'./FileDropzone\'))')
      expect(dropzone_content).to include('<Suspense fallback={<FileDropzoneLoadingFallback />}>')
      expect(dropzone_content).to include('FileDropzoneLoadingFallback')
      expect(dropzone_content).to include('CloudUpload as UploadIcon')
    end

    it 'should create LazyCharts component' do
      lazy_charts = Rails.root.join('frontend/src/components/analytics/LazyCharts.tsx')
      expect(File.exist?(lazy_charts)).to be true
      
      charts_content = File.read(lazy_charts)
      
      # Check for analytics lazy loading
      expect(charts_content).to include('lazy(() => import')
      expect(charts_content).to include('Suspense')
      expect(charts_content).to include('Skeleton')
    end

    it 'should create LazyFileSelector component' do
      lazy_selector = Rails.root.join('frontend/src/components/files/LazyFileSelector.tsx')
      expect(File.exist?(lazy_selector)).to be true
      
      selector_content = File.read(lazy_selector)
      
      # Check for file selector lazy loading
      expect(selector_content).to include('lazy(() => import')
      expect(selector_content).to include('Suspense')
      expect(selector_content).to include('loading')
    end
  end
end

RSpec.describe 'Sandi Metz Refactoring - Analytics Components', type: :feature do
  describe 'ChartWidget Component Refactoring' do
    it 'should extract chart type renderers into separate methods' do
      chart_widget = Rails.root.join('frontend/src/components/analytics/ChartWidget.tsx')
      expect(File.exist?(chart_widget)).to be true
      
      widget_content = File.read(chart_widget)
      
      # Check for extracted chart renderer methods
      expect(widget_content).to include('const renderLineChart = () => {')
      expect(widget_content).to include('const renderAreaChart = () => {')
      expect(widget_content).to include('const renderBarChart = () => {')
      expect(widget_content).to include('const renderPieChart = () => {')
      expect(widget_content).to include('const renderEmptyState = () => (')
      expect(widget_content).to include('const renderUnsupportedType = () => (')
      
      # Check for common configuration extraction
      expect(widget_content).to include('const getChartConfig = () => ({')
      expect(widget_content).to include('tooltipStyle:')
      expect(widget_content).to include('axisStyle:')
      expect(widget_content).to include('gridStyle:')
    end

    it 'should simplify main renderChart method' do
      widget_content = File.read(Rails.root.join('frontend/src/components/analytics/ChartWidget.tsx'))
      
      # Check for simplified main render method
      expect(widget_content).to include('const renderChart = () => {')
      expect(widget_content).to include('if (!data || data.length === 0) return renderEmptyState();')
      expect(widget_content).to include('case \'line\': return renderLineChart();')
      expect(widget_content).to include('case \'area\': return renderAreaChart();')
      expect(widget_content).to include('case \'bar\': return renderBarChart();')
      expect(widget_content).to include('case \'pie\': return renderPieChart();')
      expect(widget_content).to include('default: return renderUnsupportedType();')
      
      # Should be much shorter than original (under 10 lines)
      render_method_lines = widget_content.scan(/const renderChart = \(\) => \{.*?\};/m)[0]
      expect(render_method_lines).not_to be_nil
      expect(render_method_lines.lines.count).to be < 15
    end

    it 'should maintain all chart functionality after refactoring' do
      widget_content = File.read(Rails.root.join('frontend/src/components/analytics/ChartWidget.tsx'))
      
      # Should still support all chart types
      expect(widget_content).to include('LineChart')
      expect(widget_content).to include('AreaChart')
      expect(widget_content).to include('BarChart')
      expect(widget_content).to include('PieChart')
      expect(widget_content).to include('ResponsiveContainer')
      
      # Should maintain proper theming
      expect(widget_content).to include('theme.palette')
      expect(widget_content).to include('CHART_COLORS')
    end
  end

  describe 'TrendAnalysis Component Refactoring' do
    it 'should extract insight generation into focused analysis functions' do
      trend_analysis = Rails.root.join('frontend/src/components/analytics/TrendAnalysis.tsx')
      expect(File.exist?(trend_analysis)).to be true
      
      trend_content = File.read(trend_analysis)
      
      # Check for extracted analysis functions
      expect(trend_content).to include('const analyzeFileUploadTrends = (fileUploadTrend: FileUploadTrend[]) => {')
      expect(trend_content).to include('const analyzeQueryPerformanceTrends = (processingTimes: ProcessingTimeData[]) => {')
      expect(trend_content).to include('const analyzeSuccessRate = (successRate: number) => {')
      
      # Each function should have single responsibility
      expect(trend_content).to include('if (fileUploadTrend.length <= 1) return null;')
      expect(trend_content).to include('if (processingTimes.length <= 1) return null;')
      expect(trend_content).to include('return null;') # Early returns for invalid conditions
    end

    it 'should simplify main generateInsights method' do
      trend_content = File.read(Rails.root.join('frontend/src/components/analytics/TrendAnalysis.tsx'))
      
      # Check for simplified main function
      expect(trend_content).to include('const generateInsights = React.useMemo(() => {')
      expect(trend_content).to include('if (!data) return [];')
      expect(trend_content).to include('analyzeFileUploadTrends(data.fileAnalytics.uploadTrend),')
      expect(trend_content).to include('analyzeQueryPerformanceTrends(data.queryAnalytics.processingTimes),')
      expect(trend_content).to include('analyzeSuccessRate(data.performanceMetrics.successRate),')
      expect(trend_content).to include('].filter(Boolean);')
      
      # Should be much shorter (under 10 lines)
      generate_insights_match = trend_content.match(/const generateInsights = React\.useMemo\(\(\) => \{.*?\}, \[data\]\);/m)
      expect(generate_insights_match).not_to be_nil
      expect(generate_insights_match[0].lines.count).to be < 15
    end

    it 'should extract data transformation functions' do
      trend_content = File.read(Rails.root.join('frontend/src/components/analytics/TrendAnalysis.tsx'))
      
      # Check for separated data transformation concerns
      expect(trend_content).to include('const transformFileUploadData = (fileUploads: FileUploadTrend[]) => {')
      expect(trend_content).to include('const transformQueryVolumeData = (queryVolume: QueryVolumeData[], dataMap: Map<string, any>) => {')
      expect(trend_content).to include('const transformProcessingTimeData = (processingTimes: ProcessingTimeData[], dataMap: Map<string, any>) => {')
      expect(trend_content).to include('const sortCombinedDataByDate = (dataMap: Map<string, any>) => {')
      
      # Each transformation should have single purpose
      expect(trend_content).to include('const dataMap = new Map();')
      expect(trend_content).to include('return dataMap;')
      expect(trend_content).to include('return Array.from(dataMap.values()).sort')
    end

    it 'should simplify combinedTrendData method' do
      trend_content = File.read(Rails.root.join('frontend/src/components/analytics/TrendAnalysis.tsx'))
      
      # Check for simplified orchestration
      expect(trend_content).to include('const combinedTrendData = React.useMemo(() => {')
      expect(trend_content).to include('let combinedMap = transformFileUploadData')
      expect(trend_content).to include('combinedMap = transformQueryVolumeData')
      expect(trend_content).to include('combinedMap = transformProcessingTimeData')
      expect(trend_content).to include('return sortCombinedDataByDate(combinedMap);')
      
      # Should be much shorter than original
      combined_trend_match = trend_content.match(/const combinedTrendData = React\.useMemo\(\(\) => \{.*?\}, \[data\]\);/m)
      expect(combined_trend_match).not_to be_nil
      expect(combined_trend_match[0].lines.count).to be < 12
    end
  end

  describe 'ProcessingTimeChart Component Refactoring' do
    it 'should extract statistical calculations into individual functions' do
      processing_chart = Rails.root.join('frontend/src/components/analytics/ProcessingTimeChart.tsx')
      expect(File.exist?(processing_chart)).to be true
      
      chart_content = File.read(processing_chart)
      
      # Check for extracted calculation functions
      expect(chart_content).to include('const calculateTotalQueries = (data: ProcessingTimeData[]) =>')
      expect(chart_content).to include('const calculateAverageProcessingTime = (data: ProcessingTimeData[]) =>')
      expect(chart_content).to include('const calculateMaxProcessingTime = (data: ProcessingTimeData[]) =>')
      expect(chart_content).to include('const calculateMinProcessingTime = (data: ProcessingTimeData[]) =>')
      
      # Each function should have single responsibility
      expect(chart_content).to include('data.reduce((sum, item) => sum + item.queryCount, 0)')
      expect(chart_content).to include('data.reduce((sum, item) => sum + item.averageTime, 0) / data.length')
      expect(chart_content).to include('Math.max(...data.map(item => item.maxTime))')
      expect(chart_content).to include('Math.min(...data.map(item => item.minTime))')
    end

    it 'should simplify summaryStats useMemo' do
      chart_content = File.read(Rails.root.join('frontend/src/components/analytics/ProcessingTimeChart.tsx'))
      
      # Check for simplified useMemo
      expect(chart_content).to include('const summaryStats = React.useMemo(() => {')
      expect(chart_content).to include('if (!data || data.length === 0) return null;')
      expect(chart_content).to include('totalQueries: calculateTotalQueries(data),')
      expect(chart_content).to include('avgProcessingTime: calculateAverageProcessingTime(data),')
      expect(chart_content).to include('maxProcessingTime: calculateMaxProcessingTime(data),')
      expect(chart_content).to include('minProcessingTime: calculateMinProcessingTime(data),')
      
      # Should be much shorter (under 10 lines)
      summary_stats_match = chart_content.match(/const summaryStats = React\.useMemo\(\(\) => \{.*?\}, \[data\]\);/m)
      expect(summary_stats_match).not_to be_nil
      expect(summary_stats_match[0].lines.count).to be < 15
    end

    it 'should maintain chart functionality after refactoring' do
      chart_content = File.read(Rails.root.join('frontend/src/components/analytics/ProcessingTimeChart.tsx'))
      
      # Should still render charts and statistics
      expect(chart_content).to include('ChartWidget')
      expect(chart_content).to include('ComposedChart')
      expect(chart_content).to include('summaryStats')
      expect(chart_content).to include('ProcessingTimeData')
    end
  end

  describe 'Code Quality Compliance' do
    it 'should maintain clean import organization' do
      components = [
        'frontend/src/components/analytics/ChartWidget.tsx',
        'frontend/src/components/analytics/TrendAnalysis.tsx',
        'frontend/src/components/analytics/ProcessingTimeChart.tsx'
      ]
      
      components.each do |component_path|
        content = File.read(Rails.root.join(component_path))
        
        # Should have clean React imports
        expect(content).to include('import React')
        
        # Should have proper TypeScript types
        expect(content).to include('React.FC')
        expect(content).to include(': ')  # Type annotations
        
        # Should maintain existing functionality imports
        expect(content).to include('from \'@mui/material\'').or(include('from \'recharts\''))
      end
    end

    it 'should follow Single Responsibility Principle' do
      # Each extracted function should have a single, clear purpose
      chart_widget = File.read(Rails.root.join('frontend/src/components/analytics/ChartWidget.tsx'))
      
      # Chart renderers should only handle their specific chart type
      expect(chart_widget).to include('const renderLineChart').and(not_include('case \'area\''))
      expect(chart_widget).to include('const renderAreaChart').and(not_include('case \'bar\''))
      expect(chart_widget).to include('const renderBarChart').and(not_include('case \'pie\''))
    end

    it 'should improve maintainability through better organization' do
      # All refactored components should exist and be properly structured
      files = [
        'frontend/src/components/analytics/ChartWidget.tsx',
        'frontend/src/components/analytics/TrendAnalysis.tsx',
        'frontend/src/components/analytics/ProcessingTimeChart.tsx'
      ]
      
      files.each do |file_path|
        full_path = Rails.root.join(file_path)
        expect(File.exist?(full_path)).to be true
        
        content = File.read(full_path)
        expect(content).not_to be_empty
        
        # Should have reduced complexity compared to original violations
        # No single method should exceed reasonable length
        lines = content.lines
        max_consecutive_code_lines = 0
        current_consecutive = 0
        
        lines.each do |line|
          if line.strip.length > 0 && !line.strip.start_with?('//')
            current_consecutive += 1
            max_consecutive_code_lines = [max_consecutive_code_lines, current_consecutive].max
          else
            current_consecutive = 0
          end
        end
        
        # Should not have massive code blocks
        expect(max_consecutive_code_lines).to be < 80, "#{file_path} should not have massive code blocks"
      end
    end
  end
end

RSpec.describe 'Bundle Size and Performance Targets', type: :feature do
  describe 'Bundle Optimization' do
    it 'should have package.json configured for performance' do
      package_content = File.read(Rails.root.join('frontend/package.json'))
      
      # Should include performance monitoring dependencies
      expect(package_content).to include('"web-vitals"')
      expect(package_content).to include('"vite-plugin-pwa"')
      
      # Should have build scripts
      expect(package_content).to include('"build"')
      expect(package_content).to include('"preview"')
    end

    it 'should have React Query optimized for performance' do
      app_content = File.read(Rails.root.join('frontend/src/App.tsx'))
      
      # Should have optimized Query Client configuration
      expect(app_content).to include('QueryClient')
      expect(app_content).to include('staleTime: 5 * 60 * 1000') # 5 minutes
      expect(app_content).to include('retry: (failureCount, error: any)')
      expect(app_content).to include('error?.response?.status >= 400')
    end
  end

  describe 'PWA Configuration' do
    it 'should create offline.html for PWA' do
      offline_file = Rails.root.join('frontend/public/offline.html')
      expect(File.exist?(offline_file)).to be true
      
      offline_content = File.read(offline_file)
      expect(offline_content).to include('<html')
      expect(offline_content).to include('You are currently offline')
    end

    it 'should have proper error handling in main.tsx' do
      main_content = File.read(Rails.root.join('frontend/src/main.tsx'))
      
      # Should have global error handlers
      expect(main_content).to include('window.addEventListener(\'error\'')
      expect(main_content).to include('window.addEventListener(\'unhandledrejection\'')
      expect(main_content).to include('handleError')
    end
  end
end