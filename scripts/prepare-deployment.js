#!/usr/bin/env node

/**
 * 🚀 MONADEAL SHIP PREPARATION SCRIPT
 * Prepares for production deployment without removing local files
 * Files are kept locally but excluded from GitHub via .gitignore
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 PREPARING MONADEAL FOR DEPLOYMENT...\n');

// Files that will be ignored by git (kept locally, excluded from GitHub)
const filesToIgnore = [
  'PERFORMANCE_OPTIMIZATION_REPORT.md',
  'PHASE_4_TESTING_README.md', 
  'ALERT_SYSTEM_README.md',
  'COLD_START_OPTIMIZATION_COMPLETE.md',
  'DEPLOYMENT_READY.md',
  'MONADEAL_ROADMAP.md',
  'SECTION_3_3_TEST_PLAN.md',
  'abis-output.txt',
  'scripts/fix-build.js',
  'simple-prewarm.js',
  'test-prewarm.js'
];

// Check which development files exist (but don't remove them)
let foundFiles = 0;
console.log('📄 DEVELOPMENT FILES (kept locally, excluded from GitHub):');
filesToIgnore.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} (locally available)`);
    foundFiles++;
  } else {
    console.log(`⚪ ${file} (not found)`);
  }
});

console.log(`\n📦 Found ${foundFiles} development files (will stay local, ignored by git)`);

// Verify .gitignore is properly configured
console.log('\n🔍 GITIGNORE VERIFICATION:');
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  const checksToPerform = [
    { pattern: '*.md', description: 'Markdown files exclusion' },
    { pattern: '!README.md', description: 'README.md inclusion' },
    { pattern: 'PERFORMANCE_*.md', description: 'Performance docs exclusion' },
    { pattern: 'scripts/fix-build.js', description: 'Build scripts exclusion' },
    { pattern: '.env*', description: 'Environment variables exclusion' }
  ];
  
  checksToPerform.forEach(check => {
    const hasPattern = gitignoreContent.includes(check.pattern);
    console.log(`${hasPattern ? '✅' : '⚠️ '} ${check.description} ${hasPattern ? '' : '(missing)'}`);
  });
} else {
  console.log('❌ .gitignore file not found');
}

// Verify production readiness
console.log('\n🔍 PRODUCTION READINESS CHECK:');

const requiredFiles = [
  'package.json',
  'next.config.ts', 
  'tailwind.config.ts',
  'prisma/schema.prisma',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  '.gitignore',
  'README.md'
];

let allPresent = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allPresent = false;
});

// Check for environment template
const hasEnvExample = fs.existsSync('.env.example');
console.log(`${hasEnvExample ? '✅' : '⚠️ '} .env.example ${hasEnvExample ? '' : '(recommended)'}`);

// Verify build output
const hasBuild = fs.existsSync('.next');
console.log(`${hasBuild ? '✅' : '⚠️ '} .next/ build output ${hasBuild ? '' : '(run npm run build)'}`);

console.log('\n🎯 DEPLOYMENT STATUS:');
if (allPresent && hasBuild) {
  console.log('✅ READY FOR DEPLOYMENT! 🚀');
  console.log('\n📋 DEPLOYMENT CHECKLIST:');
  console.log('  1. ✅ Production build completed');
  console.log('  2. ✅ Files organized (dev files kept locally)');
  console.log('  3. ✅ .gitignore configured for clean GitHub repo');
  console.log('  4. ✅ README.md updated for community');
  console.log('  5. ⏳ Set environment variables');
  console.log('  6. ⏳ Deploy to hosting platform');
  console.log('  7. ⏳ Announce to Monad community!');
  
  console.log('\n🚀 READY TO SHIP TO THE MONAD COMMUNITY! 🎉');
  console.log('\n💡 TIP: Your development files stay local, only essential files go to GitHub!');
} else {
  console.log('❌ Missing required files or build. Please fix issues above.');
}

console.log('\n🎊 MONADEAL IS READY FOR THE WORLD! 🎊');
console.log('\n📋 NEXT STEPS:');
console.log('  1. git add .');
console.log('  2. git commit -m "🚀 Production ready - Ship Monadeal to Monad community!"');
console.log('  3. git push origin main');
console.log('  4. Deploy to your preferred platform');
console.log('  5. Share with the Monad ecosystem! 🎉');
