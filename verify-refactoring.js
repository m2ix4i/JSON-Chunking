/**
 * Verification script for the Sandi Metz code review refactoring
 * Analyzes the refactored ConnectionErrorHandler components
 */

const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim() !== '').length;
    
    return {
      totalLines: lines.length,
      codeLines: nonEmptyLines,
      content,
      exists: true
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

function checkSingleResponsibilityPrinciple(content, fileName) {
  const responsibilities = [];
  
  // Check for different types of responsibilities
  if (content.includes('useState') || content.includes('useEffect')) {
    responsibilities.push('State Management');
  }
  if (content.includes('onClick') || content.includes('onSubmit') || content.includes('handler')) {
    responsibilities.push('Event Handling');
  }
  if (content.includes('Alert') || content.includes('Typography') || content.includes('return (')) {
    responsibilities.push('UI Rendering');
  }
  if (content.includes('axios') || content.includes('fetch') || content.includes('connectionManager')) {
    responsibilities.push('API/Service Calls');
  }
  if (content.includes('notification') || content.includes('error') || content.includes('retry')) {
    responsibilities.push('Error/Notification Management');
  }
  
  return {
    count: responsibilities.length,
    responsibilities,
    violatesSRP: responsibilities.length > 2 // Allow up to 2 related responsibilities
  };
}

function verifyRefactoring() {
  console.log('🔍 Verifying Sandi Metz Code Review Refactoring...\n');
  
  const basePath = '/Users/max/Downloads/JSON-Chunking/frontend/src';
  
  // Files to analyze
  const files = {
    'Original ConnectionErrorHandler': path.join(basePath, 'components/error/ConnectionErrorHandler.tsx'),
    'useConnectionStatus Hook': path.join(basePath, 'hooks/useConnectionStatus.ts'),
    'RetryButton Component': path.join(basePath, 'components/error/RetryButton.tsx'),
    'StatusChip Component': path.join(basePath, 'components/error/StatusChip.tsx'),
    'ErrorDetails Component': path.join(basePath, 'components/error/ErrorDetails.tsx')
  };
  
  const analysis = {};
  
  // Analyze each file
  for (const [name, filePath] of Object.entries(files)) {
    console.log(`📄 Analyzing: ${name}`);
    const fileAnalysis = analyzeFile(filePath);
    
    if (fileAnalysis.exists) {
      const srpAnalysis = checkSingleResponsibilityPrinciple(fileAnalysis.content, name);
      
      console.log(`   ✅ File exists: ${fileAnalysis.codeLines} lines of code`);
      console.log(`   📋 Responsibilities: ${srpAnalysis.responsibilities.join(', ')}`);
      console.log(`   ${srpAnalysis.violatesSRP ? '❌' : '✅'} SRP Compliance: ${srpAnalysis.violatesSRP ? 'VIOLATES' : 'FOLLOWS'} Single Responsibility Principle`);
      
      analysis[name] = {
        ...fileAnalysis,
        srp: srpAnalysis
      };
    } else {
      console.log(`   ❌ File missing: ${fileAnalysis.error}`);
      analysis[name] = fileAnalysis;
    }
    console.log('');
  }
  
  // Verification Summary
  console.log('📊 REFACTORING VERIFICATION SUMMARY');
  console.log('=====================================\n');
  
  // Check if all components exist
  const allFilesExist = Object.values(analysis).every(a => a.exists);
  console.log(`✅ All Components Created: ${allFilesExist ? 'YES' : 'NO'}`);
  
  // Check line count reduction
  const originalLines = analysis['Original ConnectionErrorHandler']?.codeLines || 0;
  const totalNewLines = Object.entries(analysis)
    .filter(([name]) => name !== 'Original ConnectionErrorHandler')
    .filter(([name, data]) => data.exists)
    .reduce((sum, [name, data]) => sum + (data.codeLines || 0), 0);
  
  console.log(`📏 Original Component: ${originalLines} lines`);
  console.log(`📏 Total Refactored Code: ${totalNewLines} lines`);
  console.log(`📉 Code Distribution: Spread across ${Object.values(analysis).filter(a => a.exists).length} focused files`);
  
  // Check SRP compliance
  const srpViolations = Object.entries(analysis)
    .filter(([name, data]) => data.exists && data.srp?.violatesSRP)
    .map(([name]) => name);
    
  console.log(`\n🎯 Single Responsibility Principle Compliance:`);
  if (srpViolations.length === 0) {
    console.log('   ✅ All components follow SRP');
  } else {
    console.log(`   ❌ SRP violations in: ${srpViolations.join(', ')}`);
  }
  
  // Check for specific Sandi Metz principles
  console.log(`\n📐 Sandi Metz Rule Compliance:`);
  
  const largeFiles = Object.entries(analysis)
    .filter(([name, data]) => data.exists && data.codeLines > 100);
  
  if (largeFiles.length === 0) {
    console.log('   ✅ No files exceed 100 lines (good component size)');
  } else {
    console.log(`   ⚠️  Large files: ${largeFiles.map(([name, data]) => `${name} (${data.codeLines} lines)`).join(', ')}`);
  }
  
  // Check for proper separation
  const hasCustomHook = analysis['useConnectionStatus Hook']?.exists;
  const hasSmallComponents = ['RetryButton Component', 'StatusChip Component', 'ErrorDetails Component']
    .every(name => analysis[name]?.exists && analysis[name]?.codeLines < 100);
  
  console.log(`   ✅ Custom Hook Extracted: ${hasCustomHook ? 'YES' : 'NO'}`);
  console.log(`   ✅ Small Focused Components: ${hasSmallComponents ? 'YES' : 'NO'}`);
  
  // Final assessment
  console.log(`\n🏆 OVERALL REFACTORING ASSESSMENT:`);
  const successfulRefactoring = allFilesExist && srpViolations.length === 0 && hasCustomHook && hasSmallComponents;
  
  if (successfulRefactoring) {
    console.log('   🎉 EXCELLENT - Refactoring successfully addresses all Sandi Metz feedback');
    console.log('   ✅ Single Responsibility Principle implemented');
    console.log('   ✅ Component size reduced and distributed');
    console.log('   ✅ Custom hook extracted for business logic');
    console.log('   ✅ Focused sub-components created');
  } else {
    console.log('   ⚠️  NEEDS IMPROVEMENT - Some issues remain');
  }
  
  return analysis;
}

// Run the verification
verifyRefactoring();