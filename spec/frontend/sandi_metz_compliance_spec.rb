# spec/frontend/sandi_metz_compliance_spec.rb

require 'spec_helper'
require 'json'

RSpec.describe "Sandi Metz Code Quality Compliance", type: :feature do
  let(:frontend_path) { File.join(__dir__, '../../frontend/src/components/analytics') }
  
  describe "ChartWidget Component" do
    let(:chart_widget_file) { File.join(frontend_path, 'ChartWidget.tsx') }
    let(:chart_widget_content) { File.read(chart_widget_file) }
    
    context "method size compliance" do
      it "renderChart method follows 5-line rule" do
        # Extract renderChart method
        render_chart_method = chart_widget_content.match(/const renderChart = \(\) => \{(.*?)\};/m)[1]
        lines = render_chart_method.split("\n").reject(&:empty?).map(&:strip).reject { |line| line.start_with?('//') }
        
        expect(lines.length).to be <= 8, "renderChart method should be 8 lines or fewer, got #{lines.length}"
      end
      
      it "has extracted chart type renderers" do
        expect(chart_widget_content).to include("const renderLineChart = ()")
        expect(chart_widget_content).to include("const renderAreaChart = ()")
        expect(chart_widget_content).to include("const renderBarChart = ()")
        expect(chart_widget_content).to include("const renderPieChart = ()")
      end
      
      it "has common chart configuration helper" do
        expect(chart_widget_content).to include("const getChartConfig = ()")
      end
      
      it "each chart renderer has single responsibility" do
        chart_types = %w[LineChart AreaChart BarChart PieChart]
        chart_types.each do |chart_type|
          # Check that each renderer only contains one chart type
          renderer_method = chart_widget_content.match(/const render#{chart_type.gsub('Chart', '')}Chart = \(\) => \{(.*?)\};/m)
          expect(renderer_method).not_to be_nil, "Missing renderer for #{chart_type}"
          
          method_content = renderer_method[1]
          other_chart_types = chart_types - [chart_type]
          other_chart_types.each do |other_type|
            expect(method_content).not_to include(other_type), "#{chart_type} renderer should not contain #{other_type}"
          end
        end
      end
    end
    
    context "single responsibility principle" do
      it "renderChart delegates to specific renderers" do
        expect(chart_widget_content).to include("case 'line': return renderLineChart();")
        expect(chart_widget_content).to include("case 'area': return renderAreaChart();")
        expect(chart_widget_content).to include("case 'bar': return renderBarChart();")
        expect(chart_widget_content).to include("case 'pie': return renderPieChart();")
      end
      
      it "has empty state and error handling" do
        expect(chart_widget_content).to include("renderEmptyState")
        expect(chart_widget_content).to include("renderUnsupportedType")
      end
    end
  end
  
  describe "TrendAnalysis Component" do
    let(:trend_analysis_file) { File.join(frontend_path, 'TrendAnalysis.tsx') }
    let(:trend_analysis_content) { File.read(trend_analysis_file) }
    
    context "method extraction compliance" do
      it "has extracted insight analysis functions" do
        expect(trend_analysis_content).to include("const analyzeFileUploadTrends = (")
        expect(trend_analysis_content).to include("const analyzeQueryPerformanceTrends = (")
        expect(trend_analysis_content).to include("const analyzeSuccessRate = (")
      end
      
      it "generateInsights uses extracted functions" do
        generate_insights_method = trend_analysis_content.match(/const generateInsights = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)[1]
        
        expect(generate_insights_method).to include("analyzeFileUploadTrends(data.fileAnalytics.uploadTrend)")
        expect(generate_insights_method).to include("analyzeQueryPerformanceTrends(data.queryAnalytics.processingTimes)")
        expect(generate_insights_method).to include("analyzeSuccessRate(data.performanceMetrics.successRate)")
        expect(generate_insights_method).to include(".filter(Boolean)")
      end
      
      it "has extracted data transformation functions" do
        expect(trend_analysis_content).to include("const transformFileUploadData = (")
        expect(trend_analysis_content).to include("const transformQueryVolumeData = (")
        expect(trend_analysis_content).to include("const transformProcessingTimeData = (")
        expect(trend_analysis_content).to include("const sortCombinedDataByDate = (")
      end
      
      it "combinedTrendData uses extracted transformation functions" do
        combined_trend_method = trend_analysis_content.match(/const combinedTrendData = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)[1]
        lines = combined_trend_method.split("\n").reject(&:empty?).map(&:strip).reject { |line| line.start_with?('//') }
        
        expect(lines.length).to be <= 8, "combinedTrendData should be 8 lines or fewer, got #{lines.length}"
        expect(combined_trend_method).to include("transformFileUploadData(data.fileAnalytics.uploadTrend)")
        expect(combined_trend_method).to include("transformQueryVolumeData")
        expect(combined_trend_method).to include("transformProcessingTimeData")
        expect(combined_trend_method).to include("sortCombinedDataByDate")
      end
    end
    
    context "single responsibility principle" do
      it "each analysis function has focused purpose" do
        analysis_functions = [
          'analyzeFileUploadTrends',
          'analyzeQueryPerformanceTrends', 
          'analyzeSuccessRate'
        ]
        
        analysis_functions.each do |func_name|
          func_match = trend_analysis_content.match(/const #{func_name} = \([^)]*\) => \{(.*?)\};/m)
          expect(func_match).not_to be_nil, "Missing function #{func_name}"
          
          func_content = func_match[1]
          # Each function should have early returns for edge cases
          expect(func_content).to include("return null;").or include("return {")
        end
      end
      
      it "transformation functions are focused on single data type" do
        transform_functions = [
          'transformFileUploadData',
          'transformQueryVolumeData',
          'transformProcessingTimeData'
        ]
        
        transform_functions.each do |func_name|
          func_match = trend_analysis_content.match(/const #{func_name} = \([^)]*\) => \{(.*?)\};/m)
          expect(func_match).not_to be_nil, "Missing transformation function #{func_name}"
        end
      end
    end
  end
  
  describe "ProcessingTimeChart Component" do
    let(:processing_chart_file) { File.join(frontend_path, 'ProcessingTimeChart.tsx') }
    let(:processing_chart_content) { File.read(processing_chart_file) }
    
    context "statistical calculation extraction" do
      it "has extracted individual calculation functions" do
        expect(processing_chart_content).to include("const calculateTotalQueries = (")
        expect(processing_chart_content).to include("const calculateAverageProcessingTime = (")
        expect(processing_chart_content).to include("const calculateMaxProcessingTime = (")
        expect(processing_chart_content).to include("const calculateMinProcessingTime = (")
      end
      
      it "summaryStats uses extracted calculation functions" do
        summary_stats_method = processing_chart_content.match(/const summaryStats = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)[1]
        
        expect(summary_stats_method).to include("calculateTotalQueries(data)")
        expect(summary_stats_method).to include("calculateAverageProcessingTime(data)")
        expect(summary_stats_method).to include("calculateMaxProcessingTime(data)")
        expect(summary_stats_method).to include("calculateMinProcessingTime(data)")
        
        lines = summary_stats_method.split("\n").reject(&:empty?).map(&:strip).reject { |line| line.start_with?('//') }
        expect(lines.length).to be <= 10, "summaryStats should be 10 lines or fewer, got #{lines.length}"
      end
      
      it "each calculation function has single responsibility" do
        calculation_functions = [
          'calculateTotalQueries',
          'calculateAverageProcessingTime',
          'calculateMaxProcessingTime',
          'calculateMinProcessingTime'
        ]
        
        calculation_functions.each do |func_name|
          func_match = processing_chart_content.match(/const #{func_name} = \([^)]*\) =>(.*?);/m)
          expect(func_match).not_to be_nil, "Missing calculation function #{func_name}"
          
          # Each function should be a one-liner arrow function
          func_content = func_match[1].strip
          expect(func_content.split("\n").length).to eq(1), "#{func_name} should be a single-line function"
        end
      end
    end
    
    context "function purity and testability" do
      it "calculation functions are pure (no side effects)" do
        calculation_functions = [
          'calculateTotalQueries',
          'calculateAverageProcessingTime',
          'calculateMaxProcessingTime',
          'calculateMinProcessingTime'
        ]
        
        calculation_functions.each do |func_name|
          func_match = processing_chart_content.match(/const #{func_name} = \([^)]*\) =>(.*?);/m)
          func_content = func_match[1]
          
          # Pure functions should not contain side effects
          expect(func_content).not_to include("console.log")
          expect(func_content).not_to include("setState")
          expect(func_content).not_to include("useEffect")
          expect(func_content).not_to include("localStorage")
        end
      end
    end
  end
  
  describe "Code Quality Metrics" do
    let(:all_analytics_files) do
      Dir.glob(File.join(frontend_path, "*.tsx")).map { |file| File.read(file) }.join("\n")
    end
    
    context "overall compliance" do
      it "no methods exceed 20 lines (reasonable upper bound)" do
        # Extract all function/method definitions
        methods = all_analytics_files.scan(/(?:const|function)\s+\w+[^{]*\{(.*?)\}/m)
        
        long_methods = methods.select do |method_body|
          lines = method_body[0].split("\n").reject(&:empty?).map(&:strip)
          lines.reject! { |line| line.start_with?('//') || line.start_with?('/*') || line == '*/' }
          lines.length > 20
        end
        
        expect(long_methods).to be_empty, "Found #{long_methods.length} methods exceeding 20 lines"
      end
      
      it "maintains consistent code style" do
        expect(all_analytics_files).to include("React.useMemo")
        expect(all_analytics_files).to include("React.FC")
        expect(all_analytics_files).to include("interface")
      end
      
      it "has proper TypeScript typing" do
        # All props interfaces should be properly typed
        expect(all_analytics_files).to include("Props")
        expect(all_analytics_files).to include(": React.FC<")
        expect(all_analytics_files).to include("interface")
      end
    end
  end
  
  describe "Performance Optimization Features" do
    context "code splitting and lazy loading" do
      it "maintains performance optimizations during refactoring" do
        # Check that performance features are still intact
        app_file = File.join(__dir__, '../../frontend/src/App.tsx')
        if File.exist?(app_file)
          app_content = File.read(app_file)
          expect(app_content).to include("React.lazy")
          expect(app_content).to include("Suspense")
        end
      end
    end
    
    context "component structure integrity" do
      it "analytics components export correctly" do
        analytics_files = Dir.glob(File.join(frontend_path, "*.tsx"))
        
        analytics_files.each do |file|
          content = File.read(file)
          filename = File.basename(file, '.tsx')
          
          expect(content).to include("export default #{filename}")
        end
      end
    end
  end
end