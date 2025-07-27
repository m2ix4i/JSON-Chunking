#!/usr/bin/env ruby

# Simple Ruby test runner for Sandi Metz compliance
require 'json'

class SandiMetzComplianceValidator
  def initialize
    @frontend_path = File.join(__dir__, 'frontend/src/components/analytics')
    @results = { passed: 0, failed: 0, errors: [] }
  end

  def run_all_tests
    puts "🧪 Running Sandi Metz Compliance Tests for Frontend Performance Optimization"
    puts "=" * 80
    
    test_chart_widget_compliance
    test_trend_analysis_compliance  
    test_processing_time_chart_compliance
    test_overall_code_quality
    
    print_summary
  end

  private

  def test_chart_widget_compliance
    puts "\n📊 Testing ChartWidget Component Compliance..."
    chart_widget_file = File.join(@frontend_path, 'ChartWidget.tsx')
    
    unless File.exist?(chart_widget_file)
      add_error("ChartWidget.tsx file not found")
      return
    end
    
    content = File.read(chart_widget_file)
    
    # Test 1: renderChart method is simplified
    if content.include?("const renderChart = () => {") && 
       content.match(/const renderChart = \(\) => \{(.*?)\};/m)
      render_chart_method = content.match(/const renderChart = \(\) => \{(.*?)\};/m)[1]
      lines = render_chart_method.split("\n").reject(&:empty?).map(&:strip).reject { |line| line.start_with?('//') }
      
      if lines.length <= 8
        pass_test("✅ renderChart method follows 5-8 line rule (#{lines.length} lines)")
      else
        add_error("❌ renderChart method too long: #{lines.length} lines")
      end
    else
      add_error("❌ renderChart method not found")
    end
    
    # Test 2: Chart type renderers exist
    chart_renderers = ['renderLineChart', 'renderAreaChart', 'renderBarChart', 'renderPieChart']
    chart_renderers.each do |renderer|
      if content.include?("const #{renderer} = ()")
        pass_test("✅ #{renderer} method extracted")
      else
        add_error("❌ #{renderer} method missing")
      end
    end
    
    # Test 3: Common configuration helper
    if content.include?("const getChartConfig = ()")
      pass_test("✅ getChartConfig helper method present")
    else
      add_error("❌ getChartConfig helper method missing")
    end
  end

  def test_trend_analysis_compliance
    puts "\n📈 Testing TrendAnalysis Component Compliance..."
    trend_analysis_file = File.join(@frontend_path, 'TrendAnalysis.tsx')
    
    unless File.exist?(trend_analysis_file)
      add_error("TrendAnalysis.tsx file not found")
      return
    end
    
    content = File.read(trend_analysis_file)
    
    # Test 1: Analysis functions extracted
    analysis_functions = ['analyzeFileUploadTrends', 'analyzeQueryPerformanceTrends', 'analyzeSuccessRate']
    analysis_functions.each do |func|
      if content.include?("const #{func} = (")
        pass_test("✅ #{func} function extracted")
      else
        add_error("❌ #{func} function missing")
      end
    end
    
    # Test 2: generateInsights is simplified
    if content.match(/const generateInsights = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)
      insights_method = content.match(/const generateInsights = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)[1]
      if insights_method.include?('.filter(Boolean)')
        pass_test("✅ generateInsights uses filter(Boolean) pattern")
      else
        add_error("❌ generateInsights doesn't use filter(Boolean) pattern")
      end
    else
      add_error("❌ generateInsights method not found")
    end
    
    # Test 3: Data transformation functions
    transform_functions = ['transformFileUploadData', 'transformQueryVolumeData', 'transformProcessingTimeData', 'sortCombinedDataByDate']
    transform_functions.each do |func|
      if content.include?("const #{func} = (")
        pass_test("✅ #{func} function extracted")
      else
        add_error("❌ #{func} function missing")
      end
    end
  end

  def test_processing_time_chart_compliance
    puts "\n⏱️  Testing ProcessingTimeChart Component Compliance..."
    processing_chart_file = File.join(@frontend_path, 'ProcessingTimeChart.tsx')
    
    unless File.exist?(processing_chart_file)
      add_error("ProcessingTimeChart.tsx file not found")
      return
    end
    
    content = File.read(processing_chart_file)
    
    # Test 1: Statistical calculation functions extracted
    calculation_functions = ['calculateTotalQueries', 'calculateAverageProcessingTime', 'calculateMaxProcessingTime', 'calculateMinProcessingTime']
    calculation_functions.each do |func|
      if content.include?("const #{func} = (")
        pass_test("✅ #{func} function extracted")
      else
        add_error("❌ #{func} function missing")
      end
    end
    
    # Test 2: summaryStats uses extracted functions
    if content.match(/const summaryStats = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)
      summary_stats_method = content.match(/const summaryStats = React\.useMemo\(\(\) => \{(.*?)\}, \[data\]\);/m)[1]
      
      calculation_functions.each do |func|
        if summary_stats_method.include?("#{func}(data)")
          pass_test("✅ summaryStats uses #{func}")
        else
          add_error("❌ summaryStats doesn't use #{func}")
        end
      end
      
      lines = summary_stats_method.split("\n").reject(&:empty?).map(&:strip).reject { |line| line.start_with?('//') }
      if lines.length <= 10
        pass_test("✅ summaryStats method is reasonably sized (#{lines.length} lines)")
      else
        add_error("❌ summaryStats method too long: #{lines.length} lines")
      end
    else
      add_error("❌ summaryStats method not found")
    end
  end

  def test_overall_code_quality
    puts "\n🔍 Testing Overall Code Quality..."
    
    analytics_files = Dir.glob(File.join(@frontend_path, "*.tsx"))
    
    if analytics_files.length >= 3
      pass_test("✅ Found #{analytics_files.length} analytics components")
    else
      add_error("❌ Expected at least 3 analytics components, found #{analytics_files.length}")
    end
    
    # Test for consistent TypeScript usage
    all_content = analytics_files.map { |file| File.read(file) }.join("\n")
    
    if all_content.include?("React.FC<") && all_content.include?("interface")
      pass_test("✅ Consistent TypeScript typing found")
    else
      add_error("❌ Inconsistent TypeScript typing")
    end
    
    if all_content.include?("React.useMemo")
      pass_test("✅ Performance optimizations (useMemo) present")
    else
      add_error("❌ Missing performance optimizations")
    end
  end

  def pass_test(message)
    puts message
    @results[:passed] += 1
  end

  def add_error(message)
    puts message
    @results[:failed] += 1
    @results[:errors] << message
  end

  def print_summary
    puts "\n" + "=" * 80
    puts "🎯 Test Summary:"
    puts "✅ Passed: #{@results[:passed]}"
    puts "❌ Failed: #{@results[:failed]}"
    puts "📊 Success Rate: #{(@results[:passed].to_f / (@results[:passed] + @results[:failed]) * 100).round(1)}%"
    
    if @results[:failed] > 0
      puts "\n❌ Failed Tests:"
      @results[:errors].each { |error| puts "  - #{error}" }
    else
      puts "\n🎉 All Sandi Metz compliance tests passed!"
    end
    
    if @results[:passed] >= 15 && @results[:failed] == 0
      puts "\n✨ Excellent! Code quality meets all Sandi Metz principles."
    elsif @results[:failed] == 0
      puts "\n👍 Good! All tests passed with high code quality."
    else
      puts "\n⚠️  Some improvements needed to fully comply with Sandi Metz principles."
    end
  end
end

# Run the tests
if __FILE__ == $0
  validator = SandiMetzComplianceValidator.new
  validator.run_all_tests
end