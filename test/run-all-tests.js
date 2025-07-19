#!/usr/bin/env node

/**
 * MONADEAL PHASE 4 TEST RUNNER
 * Comprehensive test suite execution with real data
 */

const { spawn, exec } = require('child_process')
const path = require('path')
const fs = require('fs')

// Test configuration
const TEST_CONFIG = {
  timeout: 300000, // 5 minutes per test suite
  maxRetries: 2,
  testSuites: [
    {
      name: 'Smart Contract Tests',
      command: 'npx hardhat test',
      description: 'Runs the existing smart contract unit tests (27 tests)',
      required: true
    },
    {
      name: 'API Integration Tests',
      command: 'npx jest test/api-integration.test.js',
      description: 'Tests all API endpoints with real database and NFT data',
      required: true
    },
    {
      name: 'Real-time Features Tests',
      command: 'npx jest test/realtime-features.test.js',
      description: 'Tests WebSocket connections and real-time messaging',
      required: true
    },
    {
      name: 'Blockchain Integration Tests',
      command: 'npx jest test/blockchain-integration.test.js',
      description: 'Tests real blockchain transactions on Monad testnet',
      required: true
    },
    {
      name: 'End-to-End Deal Flow Tests',
      command: 'npx jest test/e2e-deal-flow.test.js',
      description: 'Tests complete deal lifecycle from creation to completion',
      required: true
    }
  ]
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
}

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: []
}

// Utility functions
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`)
}

function logHeader(message) {
  console.log('\n' + '='.repeat(80))
  log(message, colors.bright + colors.cyan)
  console.log('='.repeat(80))
}

function logSection(message) {
  console.log('\n' + '-'.repeat(60))
  log(message, colors.bright + colors.blue)
  console.log('-'.repeat(60))
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green)
}

function logError(message) {
  log(`❌ ${message}`, colors.red)
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow)
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue)
}

// Check prerequisites
async function checkPrerequisites() {
  logSection('Checking Prerequisites')
  
  const checks = [
    {
      name: 'Node.js version',
      command: 'node --version',
      required: true
    },
    {
      name: 'npm version',
      command: 'npm --version',
      required: true
    },
    {
      name: 'Hardhat installation',
      command: 'npx hardhat --version',
      required: true
    },
    {
      name: 'Jest installation',
      command: 'npx jest --version',
      required: true
    }
  ]
  
  for (const check of checks) {
    try {
      const result = await execCommand(check.command)
      logSuccess(`${check.name}: ${result.trim()}`)
    } catch (error) {
      if (check.required) {
        logError(`${check.name}: Not found or invalid`)
        return false
      } else {
        logWarning(`${check.name}: Not found (optional)`)
      }
    }
  }
  
  return true
}

// Execute command with promise
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

// Run individual test suite
async function runTestSuite(suite) {
  logSection(`Running: ${suite.name}`)
  logInfo(suite.description)
  
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const testProcess = spawn('bash', ['-c', suite.command], {
      stdio: 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' }
    })
    
    let stdout = ''
    let stderr = ''
    
    testProcess.stdout.on('data', (data) => {
      const output = data.toString()
      stdout += output
      process.stdout.write(output)
    })
    
    testProcess.stderr.on('data', (data) => {
      const output = data.toString()
      stderr += output
      process.stderr.write(output)
    })
    
    testProcess.on('close', (code) => {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      const result = {
        name: suite.name,
        command: suite.command,
        code: code,
        duration: duration,
        stdout: stdout,
        stderr: stderr,
        passed: code === 0
      }
      
      if (code === 0) {
        logSuccess(`${suite.name} completed successfully (${duration}ms)`)
        testResults.passed++
      } else {
        logError(`${suite.name} failed with code ${code} (${duration}ms)`)
        testResults.failed++
      }
      
      testResults.suites.push(result)
      resolve(result)
    })
    
    // Handle timeout
    setTimeout(() => {
      testProcess.kill('SIGTERM')
      logError(`${suite.name} timed out after ${TEST_CONFIG.timeout}ms`)
      testResults.failed++
      resolve({
        name: suite.name,
        command: suite.command,
        code: -1,
        duration: TEST_CONFIG.timeout,
        stdout: '',
        stderr: 'Test timed out',
        passed: false
      })
    }, TEST_CONFIG.timeout)
  })
}

// Generate test report
function generateReport() {
  logHeader('TEST EXECUTION REPORT')
  
  console.log('\n📊 SUMMARY:')
  console.log(`   Total Suites: ${testResults.suites.length}`)
  logSuccess(`   Passed: ${testResults.passed}`)
  logError(`   Failed: ${testResults.failed}`)
  
  console.log('\n📋 DETAILED RESULTS:')
  
  testResults.suites.forEach((suite, index) => {
    const status = suite.passed ? '✅ PASSED' : '❌ FAILED'
    const duration = (suite.duration / 1000).toFixed(2)
    
    console.log(`\n${index + 1}. ${suite.name}`)
    console.log(`   Status: ${status}`)
    console.log(`   Duration: ${duration}s`)
    console.log(`   Command: ${suite.command}`)
    
    if (!suite.passed) {
      console.log(`   Error Code: ${suite.code}`)
      if (suite.stderr) {
        console.log(`   Error Output: ${suite.stderr.slice(0, 200)}...`)
      }
    }
  })
  
  // Calculate pass rate
  const passRate = testResults.suites.length > 0 
    ? ((testResults.passed / testResults.suites.length) * 100).toFixed(1)
    : 0
  
  console.log(`\n📈 PASS RATE: ${passRate}%`)
  
  // Success criteria
  const allPassed = testResults.failed === 0
  const minPassRate = 80
  const meetsMinimum = parseFloat(passRate) >= minPassRate
  
  console.log('\n🎯 PHASE 4 SUCCESS CRITERIA:')
  console.log(`   ✅ All tests passed: ${allPassed ? 'YES' : 'NO'}`)
  console.log(`   ✅ Minimum pass rate (${minPassRate}%): ${meetsMinimum ? 'YES' : 'NO'}`)
  
  if (allPassed && meetsMinimum) {
    logSuccess('\n🎉 PHASE 4: INTEGRATION & TESTING - COMPLETED SUCCESSFULLY!')
    logSuccess('✅ All integration tests passed with real data')
    logSuccess('✅ API endpoints working correctly')
    logSuccess('✅ Real-time features functioning properly')
    logSuccess('✅ Blockchain integration verified on Monad testnet')
    logSuccess('✅ End-to-end deal flow tested successfully')
  } else {
    logError('\n❌ PHASE 4: INTEGRATION & TESTING - NEEDS ATTENTION')
    logError('Some tests failed or minimum pass rate not met')
  }
}

// Save test results to file
function saveResults() {
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    configuration: TEST_CONFIG,
    results: testResults
  }
  
  const reportPath = path.join(__dirname, 'test-results.json')
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  
  logInfo(`Test results saved to: ${reportPath}`)
}

// Main execution function
async function main() {
  logHeader('🚀 MONADEAL PHASE 4 TEST EXECUTION')
  
  log('Phase 4: Integration & Testing', colors.bright + colors.magenta)
  log('Testing Strategy: REAL DATA ONLY - No mocks or fake data', colors.yellow)
  log('Network: Monad Testnet', colors.cyan)
  log('Explorer: https://testnet.monadexplorer.com/', colors.cyan)
  
  // Check prerequisites
  const prerequisitesOk = await checkPrerequisites()
  if (!prerequisitesOk) {
    logError('Prerequisites check failed. Please install missing dependencies.')
    process.exit(1)
  }
  
  // Run test suites
  logSection('Executing Test Suites')
  
  for (const suite of TEST_CONFIG.testSuites) {
    await runTestSuite(suite)
    
    // Small delay between test suites
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // Generate and save report
  generateReport()
  saveResults()
  
  // Exit with appropriate code
  const exitCode = testResults.failed > 0 ? 1 : 0
  process.exit(exitCode)
}

// Handle process signals
process.on('SIGINT', () => {
  logWarning('\nTest execution interrupted by user')
  generateReport()
  saveResults()
  process.exit(1)
})

process.on('SIGTERM', () => {
  logWarning('\nTest execution terminated')
  generateReport()
  saveResults()
  process.exit(1)
})

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
  generateReport()
  saveResults()
  process.exit(1)
})

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    logError(`Test execution failed: ${error.message}`)
    console.error(error)
    process.exit(1)
  })
}

module.exports = { runTestSuite, generateReport, TEST_CONFIG } 